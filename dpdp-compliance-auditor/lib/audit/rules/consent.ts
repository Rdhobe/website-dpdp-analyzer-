import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  allCookies,
  allForms,
  allLinks,
  evidenceForRun,
  fail,
  hasBrowser,
  notApplicable,
  notAssessed,
  pass,
  trackerRequests,
  warning,
} from "./helpers";

function staticControlState(context: AuditContext): {
  banner: boolean;
  accept: boolean;
  reject: boolean;
  withdraw: boolean;
  source: "browser" | "text";
} {
  if (hasBrowser(context)) {
    const snapshot = context.browser?.initial;
    return {
      banner: Boolean(snapshot?.bannerVisible),
      accept: Boolean(snapshot?.acceptVisible),
      reject: Boolean(snapshot?.rejectVisible),
      withdraw: Boolean(snapshot?.withdrawalVisible),
      source: "browser",
    };
  }
  const text = context.pages
    .map((page) => page.textExcerpt)
    .join("\n")
    .slice(0, 120000);
  return {
    banner: /(cookie|consent|privacy preference)/i.test(text),
    accept: /\b(accept|allow|agree|got it|ok)\b/i.test(text),
    reject: /\b(reject|decline|deny|necessary only|essential only)\b/i.test(text),
    withdraw: /\b(withdraw|manage preferences|change preferences|cookie settings)\b/i.test(text),
    source: "text",
  };
}

function anyTrackersObserved(context: AuditContext): boolean {
  if (context.browser?.initial) {
    return context.browser.initial.requests.some((request) => request.knownTracker);
  }
  return context.pages.some((page) =>
    page.thirdPartyHosts.some((host) =>
      /google-analytics|googletagmanager|doubleclick|facebook|hotjar|clarity|mixpanel|segment/i.test(host),
    ),
  );
}

function consentInterface(context: AuditContext): RuleOutcome {
  const state = staticControlState(context);
  if (!state.banner && !anyTrackersObserved(context) && !context.pages.some((page) => page.cookies.length > 0)) {
    return notApplicable("No consent interface, cookie, or known tracker was observed on the inspected pages.", {
      evidence: [
        evidenceForRun(context, "consent-interface", "No consent interface signal.", {
          source: state.source,
        }),
      ],
    });
  }
  if (state.banner) {
    return pass("A consent/cookie interface signal was detected.", {
      confidence: state.source === "browser" ? "high" : "medium",
      evidence: [
        evidenceForRun(context, "consent-interface", "Consent interface detected.", {
          source: state.source,
          acceptVisible: state.accept,
          rejectVisible: state.reject,
        }),
      ],
    });
  }
  return warning("Tracking or cookies were observed without a detected consent interface.", {
    evidence: [
      evidenceForRun(context, "consent-interface", "Tracking without detected interface.", {
        source: state.source,
        thirdPartyHosts: context.pages.flatMap((page) => page.thirdPartyHosts),
      }),
    ],
  });
}

function acceptRejectControls(context: AuditContext): RuleOutcome {
  const state = staticControlState(context);
  if (!state.banner) {
    if (anyTrackersObserved(context)) {
      return warning("No consent banner was detected, so accept/reject controls could not be evaluated.", {
        evidence: [
          evidenceForRun(context, "consent-controls", "No banner for control discovery.", {
            source: state.source,
          }),
        ],
      });
    }
    return notApplicable("No consent interface was applicable on the inspected pages.", {
      evidence: [evidenceForRun(context, "consent-controls", "No consent interface.", {})],
    });
  }
  if (state.accept && state.reject) {
    return pass("Both accept and reject/decline controls were detected.", {
      confidence: state.source === "browser" ? "high" : "medium",
      evidence: [
        evidenceForRun(context, "consent-controls", "Accept and reject controls.", {
          source: state.source,
          accept: state.accept,
          reject: state.reject,
        }),
      ],
    });
  }
  return warning(
    state.accept
      ? "An accept control was detected without a distinct reject/decline control."
      : "A consent interface was detected without a clear accept/reject control pair.",
    {
      evidence: [
        evidenceForRun(context, "consent-controls", "Incomplete control pair.", {
          source: state.source,
          accept: state.accept,
          reject: state.reject,
        }),
      ],
    },
  );
}

function prominence(context: AuditContext): RuleOutcome {
  return notAssessed("Relative visual prominence requires rendered layout measurement or manual visual review; this run did not measure it.", {
    evidence: [
      evidenceForRun(context, "consent-prominence", "Prominence not measured.", {
        browserAvailable: hasBrowser(context),
      }),
    ],
    humanReviewRequired: true,
  });
}

function preselectedConsent(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notAssessed("No forms were available to inspect for preselected consent controls.", {
      evidence: [evidenceForRun(context, "consent-preselected", "No forms.", {})],
    });
  }
  const stale = forms.flatMap((form) =>
    form.fields.filter(
      (field) =>
        field.type === "checkbox" &&
        field.checked &&
        !field.disabled &&
        /marketing|promotion|advertis|analytics|optional|newsletter/i.test(
          `${field.label ?? ""} ${field.name ?? ""}`,
        ),
    ),
  );
  if (stale.length > 0) {
    return fail("Pre-checked optional consent control(s) were detected.", {
      affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
      evidence: [
        evidenceForRun(context, "consent-preselected", "Preselected optional controls.", {
          controls: stale.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type,
            checked: field.checked,
          })),
        }),
      ],
    });
  }
  return pass("No pre-checked optional marketing/analytics consent control was detected in HTML forms.", {
    confidence: "medium",
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "consent-preselected", "Preselection check.", {
        checkboxCount: forms.flatMap((form) => form.fields).filter((field) => field.type === "checkbox").length,
      }),
    ],
    limitations: "JavaScript-rendered consent interfaces require browser evidence.",
  });
}

function initialTracking(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context)) {
    return notAssessed("Clean-browser initial tracking evidence was not collected.", {
      evidence: [
        evidenceForRun(context, "consent-initial", "Browser unavailable.", {
          limitations: context.browser?.limitations ?? context.limitations,
        }),
      ],
    });
  }
  const snapshot = context.browser?.initial;
  const browserState = {
    browserState: "initial (clean profile, before any consent action)",
    capturedAt: snapshot?.capturedAt ?? null,
    bannerVisible: Boolean(snapshot?.bannerVisible),
    acceptVisible: Boolean(snapshot?.acceptVisible),
    rejectVisible: Boolean(snapshot?.rejectVisible),
    withdrawalVisible: Boolean(snapshot?.withdrawalVisible),
  };
  const trackers = trackerRequests(context, "initial");
  if (trackers.length > 0) {
    const interfaceNote = snapshot?.bannerVisible
      ? "A consent interface was visible in this same context, so these requests fired before any consent action was taken."
      : "No consent interface was detected in this same context, so these requests fired without any opportunity to consent.";
    return fail(
      `Known third-party tracker request(s) fired before any consent action: ${trackers
        .map((tracker) => tracker.host)
        .join(", ")}. ${interfaceNote}`,
      {
        confidence: "high",
        evidence: [
          evidenceForRun(
            context,
            "consent-initial",
            "Pre-consent tracker requests in a clean browser context.",
            {
              ...browserState,
              classificationMethod:
                "Each request hostname is matched against a maintained tracker-domain list; the matched domain suffix and category are shown per request.",
              trackers,
              requestCount: snapshot?.requests.length ?? 0,
              cookies: snapshot?.cookies ?? [],
            },
          ),
        ],
      },
    );
  }
  return pass("No known third-party tracker request was observed in the initial clean-browser state.", {
    evidence: [
      evidenceForRun(context, "consent-initial", "Initial tracker inventory.", {
        ...browserState,
        requestCount: context.browser?.initial?.requests.length ?? 0,
        trackers: [],
        cookies: context.browser?.initial?.cookies ?? [],
      }),
    ],
    limitations: "Tracker classification uses a maintained domain list and may miss custom or first-party tracking.",
  });
}

function afterReject(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context) || !context.browser?.afterReject) {
    return notAssessed("No browser evidence was available for the reject-behaviour check.", {
      evidence: [evidenceForRun(context, "consent-reject", "Browser reject state unavailable.", {})],
    });
  }
  if (!context.browser.initial?.rejectVisible) {
    return notAssessed("No visible reject/decline control was found, so behaviour after rejection could not be tested.", {
      evidence: [
        evidenceForRun(context, "consent-reject", "No reject control.", {
          interactionLog: context.browser.interactionLog,
        }),
      ],
    });
  }
  const initial = trackerRequests(context, "initial");
  const after = trackerRequests(context, "afterReject");
  if (after.length === 0) {
    return pass("No known tracker requests were observed after the reject/decline action.", {
      evidence: [
        evidenceForRun(context, "consent-reject", "Tracker state after rejection.", {
          initial,
          afterReject: after,
          interactionLog: context.browser.interactionLog,
        }),
      ],
    });
  }
  if (initial.length > 0 && after.length >= initial.length) {
    return fail("Known tracker requests continued after the reject/decline action.", {
      evidence: [
        evidenceForRun(context, "consent-reject", "Tracker state after rejection.", {
          initial,
          afterReject: after,
          interactionLog: context.browser.interactionLog,
        }),
      ],
    });
  }
  return warning("Some known tracker requests remained after rejection; review whether they are necessary or misclassified.", {
    evidence: [
      evidenceForRun(context, "consent-reject", "Residual tracker state.", {
        initial,
        afterReject: after,
      }),
    ],
  });
}

function afterAccept(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context) || !context.browser?.afterAccept) {
    return notAssessed("No browser evidence was available for the accept-behaviour check.", {
      evidence: [evidenceForRun(context, "consent-accept", "Browser accept state unavailable.", {})],
    });
  }
  if (!context.browser.initial?.acceptVisible) {
    return notAssessed("No visible accept control was found, so behaviour after acceptance could not be tested.", {
      evidence: [
        evidenceForRun(context, "consent-accept", "No accept control.", {
          interactionLog: context.browser.interactionLog,
        }),
      ],
    });
  }
  const after = trackerRequests(context, "afterAccept");
  return pass("The accept action was executed and the post-accept tracker state was recorded.", {
    evidence: [
      evidenceForRun(context, "consent-accept", "Tracker state after acceptance.", {
        initial: trackerRequests(context, "initial"),
        afterAccept: after,
        interactionLog: context.browser.interactionLog,
      }),
    ],
    limitations: "Observed tracker changes are descriptive; they do not prove that the consent was valid or sufficiently specific.",
  });
}

function persistence(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context) || !context.browser?.afterReload) {
    return notAssessed("No browser reload evidence was available for the persistence check.", {
      evidence: [evidenceForRun(context, "consent-persistence", "Reload state unavailable.", {})],
    });
  }
  if (context.browser.afterReload.bannerVisible) {
    return warning("The consent interface was visible again after reload; the choice may not persist.", {
      evidence: [
        evidenceForRun(context, "consent-persistence", "Reload state.", {
          bannerVisible: context.browser.afterReload.bannerVisible,
          cookies: context.browser.afterReload.cookies,
        }),
      ],
    });
  }
  return pass("The consent interface did not reappear after reload in the tested state.", {
    evidence: [
      evidenceForRun(context, "consent-persistence", "Reload state.", {
        bannerVisible: context.browser.afterReload.bannerVisible,
        localStorageKeys: context.browser.afterReload.localStorageKeys,
      }),
    ],
  });
}

function withdrawalDiscovery(context: AuditContext): RuleOutcome {
  const state = staticControlState(context);
  const links = allLinks(context, "cookie");
  if (state.withdraw) {
    return pass("A withdrawal or preference-management control was detected.", {
      confidence: state.source === "browser" ? "high" : "medium",
      evidence: [
        evidenceForRun(context, "consent-withdraw", "Withdrawal signal.", {
          source: state.source,
          links: links.map((link) => ({ href: link.href, text: link.text })),
        }),
      ],
    });
  }
  return warning("No withdrawal or preference-management control was detected.", {
    evidence: [
      evidenceForRun(context, "consent-withdraw", "No withdrawal control.", {
        source: state.source,
        cookieLinks: links.map((link) => ({ href: link.href, text: link.text })),
      }),
    ],
  });
}

function afterWithdrawal(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context) || !context.browser?.afterWithdraw) {
    return notAssessed("No browser evidence was available for the withdrawal-behaviour check.", {
      evidence: [evidenceForRun(context, "consent-withdraw-behaviour", "Withdrawal state unavailable.", {})],
    });
  }
  const withdrawalClicked = context.browser.interactionLog.some((entry) =>
    entry.toLowerCase().includes("withdrawal"),
  );
  if (!withdrawalClicked) {
    return notAssessed("No visible withdrawal control was found after acceptance, so post-withdrawal behaviour could not be tested.", {
      evidence: [
        evidenceForRun(context, "consent-withdraw-behaviour", "No withdrawal control after acceptance.", {
          interactionLog: context.browser.interactionLog,
        }),
      ],
    });
  }
  const accepted = trackerRequests(context, "afterAccept");
  const withdrawn = trackerRequests(context, "afterWithdraw");
  if (accepted.length > 0 && withdrawn.length >= accepted.length) {
    return fail("Known tracker requests continued at the same or greater level after an attempted withdrawal.", {
      evidence: [
        evidenceForRun(context, "consent-withdraw-behaviour", "Tracker state after withdrawal.", {
          accepted,
          afterWithdraw: withdrawn,
          interactionLog: context.browser.interactionLog,
        }),
      ],
    });
  }
  return pass("The attempted withdrawal reduced or did not increase known tracker requests in the tested state.", {
    evidence: [
      evidenceForRun(context, "consent-withdraw-behaviour", "Tracker state after withdrawal.", {
        accepted,
        afterWithdraw: withdrawn,
        interactionLog: context.browser.interactionLog,
      }),
    ],
    limitations: "A single withdrawal path was tested; other cookies, devices or backend processing may persist.",
  });
}

function cookieAttributes(context: AuditContext): RuleOutcome {
  const cookies = allCookies(context);
  if (cookies.length === 0) {
    return notApplicable("No cookies were observed in headers or browser state.", {
      evidence: [evidenceForRun(context, "cookie-attributes", "No cookies.", {})],
    });
  }
  const concerns = cookies.filter(
    (cookie) =>
      (cookie.session && !cookie.secure) ||
      !cookie.sameSite ||
      (cookie.thirdParty && !cookie.secure),
  );
  const evidence = evidenceForRun(context, "cookie-attributes", "Observed cookie attributes.", {
    cookies,
    concerns: concerns.map((cookie) => cookie.name),
  });
  if (concerns.length > 0) {
    return warning(`${concerns.length} cookie(s) have missing or weak security attributes; review cookie purpose and context.`, {
      evidence: [evidence],
      affectedUrls: [context.targetUrl],
    });
  }
  return pass("Observed cookies have Secure/SameSite attributes in the inspected context.", {
    confidence: "medium",
    evidence: [evidence],
    limitations: "Not every cookie requires HttpOnly; this check does not assess necessity or consent.",
  });
}

function trackerClassification(context: AuditContext): RuleOutcome {
  const hosts = [
    ...context.pages.flatMap((page) => page.thirdPartyHosts),
    ...(context.browser?.initial?.requests
      .filter((request) => request.knownTracker)
      .map((request) => request.host) ?? []),
  ];
  const unique = [...new Set(hosts)];
  if (unique.length === 0) {
    return pass("No known third-party tracker host was observed.", {
      evidence: [evidenceForRun(context, "tracker-classification", "No known trackers.", {})],
    });
  }
  return warning("Known third-party tracker host(s) were observed; consent and purpose require review.", {
    evidence: [
      evidenceForRun(context, "tracker-classification", "Tracker hosts.", {
        hosts: unique,
        preConsent: trackerRequests(context, "initial"),
      }),
    ],
    affectedUrls: [context.targetUrl],
  });
}

function crossPageConsistency(context: AuditContext): RuleOutcome {
  const pages = context.pages.filter((page) => page.ok);
  if (pages.length < 2) {
    return notAssessed("Fewer than two successful pages were available for cross-page comparison.", {
      evidence: [evidenceForRun(context, "consent-consistency", "Insufficient pages.", { pages: pages.length })],
    });
  }
  const withCookieSignal = pages.filter((page) =>
    page.links.some((link) => link.kind === "cookie") ||
    /cookie|consent/i.test(page.textExcerpt),
  );
  if (withCookieSignal.length > 0 && withCookieSignal.length < pages.length) {
    return warning("Cookie/consent language was observed on some inspected pages but not others; consistency needs review.", {
      evidence: [
        evidenceForRun(context, "consent-consistency", "Cross-page consent signal.", {
          pagesWithSignal: withCookieSignal.map((page) => page.finalUrl),
          pagesInspected: pages.map((page) => page.finalUrl),
        }),
      ],
    });
  }
  return pass("Cookie/consent signals were consistent across the inspected pages, or were absent from all.", {
    confidence: "low",
    evidence: [
      evidenceForRun(context, "consent-consistency", "Cross-page consent signal.", {
        pagesWithSignal: withCookieSignal.map((page) => page.finalUrl),
        pagesInspected: pages.map((page) => page.finalUrl),
      }),
    ],
  });
}

function reproducibility(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context)) {
    return notAssessed("No browser session was available to verify a clean-profile consent test.", {
      evidence: [evidenceForRun(context, "consent-reproducibility", "No browser session.", {})],
    });
  }
  return pass("Consent checks ran in fresh browser contexts with logged interaction steps.", {
    evidence: [
      evidenceForRun(context, "consent-reproducibility", "Browser interaction log.", {
        contexts: 3,
        interactionLog: context.browser?.interactionLog ?? [],
        limitations: context.browser?.limitations ?? [],
      }),
    ],
    limitations: "Browser tests are reproducible in design but not bit-for-bit deterministic because third-party scripts and site behaviour can change.",
  });
}

export const CONSENT_RULES: Record<string, TestEvaluator> = {
  "CONSENT-001": consentInterface,
  "CONSENT-002": acceptRejectControls,
  "CONSENT-003": prominence,
  "CONSENT-004": preselectedConsent,
  "CONSENT-005": initialTracking,
  "CONSENT-006": afterReject,
  "CONSENT-007": afterAccept,
  "CONSENT-008": persistence,
  "CONSENT-009": withdrawalDiscovery,
  "CONSENT-010": afterWithdrawal,
  "CONSENT-011": cookieAttributes,
  "CONSENT-012": trackerClassification,
  "CONSENT-013": crossPageConsistency,
  "CONSENT-014": reproducibility,
};
