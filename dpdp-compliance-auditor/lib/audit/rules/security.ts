import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  allForms,
  evidenceForRun,
  fail,
  hasBrowser,
  notApplicable,
  notAssessed,
  pass,
  warning,
} from "./helpers";

function httpsAndMixedContent(context: AuditContext): RuleOutcome {
  const page = context.startPage;
  if (!page) {
    return notAssessed("No homepage response was available for HTTPS inspection.", {
      evidence: [evidenceForRun(context, "https-check", "No start page.", {})],
    });
  }
  if (!page.finalUrl.startsWith("https://")) {
    return fail("The inspected homepage is not served over HTTPS.", {
      affectedUrls: [page.finalUrl],
      evidence: [evidenceForRun(context, "https-check", "Homepage scheme.", { finalUrl: page.finalUrl })],
    });
  }
  const insecure = page.resources.filter((resource) => resource.insecure);
  if (insecure.length > 0) {
    return fail(`${insecure.length} resource(s) are referenced over HTTP on an HTTPS page.`, {
      affectedUrls: [page.finalUrl, ...insecure.map((resource) => resource.url)],
      evidence: [
        evidenceForRun(context, "https-check", "Insecure resources.", {
          resources: insecure,
        }),
      ],
    });
  }
  return pass("The homepage uses HTTPS and no HTTP resource reference was detected in the parsed HTML.", {
    affectedUrls: [page.finalUrl],
    evidence: [evidenceForRun(context, "https-check", "HTTPS and resource schemes.", { finalUrl: page.finalUrl })],
    limitations: "Runtime requests, redirects and subresources loaded by JavaScript may differ.",
  });
}

function headerCheck(
  context: AuditContext,
  headerName: string,
  label: string,
  validator?: (value: string) => boolean,
): RuleOutcome {
  const value = context.startPage?.headers[headerName] ?? null;
  if (!value) {
    return warning(`${label} header is absent. This is a technical signal, not an automatic statutory violation.`, {
      affectedUrls: context.startPage ? [context.startPage.finalUrl] : [],
      evidence: [evidenceForRun(context, "security-header", `${label} header.`, { headerName, value: null })],
    });
  }
  if (validator && !validator(value)) {
    return warning(`${label} header is present but did not meet the expected baseline.`, {
      affectedUrls: context.startPage ? [context.startPage.finalUrl] : [],
      evidence: [evidenceForRun(context, "security-header", `${label} header.`, { headerName, value })],
    });
  }
  return pass(`${label} header is present.`, {
    confidence: "low",
    affectedUrls: context.startPage ? [context.startPage.finalUrl] : [],
    evidence: [evidenceForRun(context, "security-header", `${label} header.`, { headerName, value })],
  });
}

function hsts(context: AuditContext): RuleOutcome {
  return headerCheck(context, "strict-transport-security", "HSTS", (value) => {
    const maxAge = /max-age=(\d+)/i.exec(value);
    return Boolean(maxAge && Number(maxAge[1]) >= 15552000);
  });
}

function csp(context: AuditContext): RuleOutcome {
  return headerCheck(context, "content-security-policy", "Content-Security-Policy");
}

function nosniff(context: AuditContext): RuleOutcome {
  return headerCheck(
    context,
    "x-content-type-options",
    "X-Content-Type-Options",
    (value) => value.toLowerCase().includes("nosniff"),
  );
}

function referrerPolicy(context: AuditContext): RuleOutcome {
  return headerCheck(context, "referrer-policy", "Referrer-Policy");
}

function publicDataExposure(context: AuditContext): RuleOutcome {
  const patterns = [...new Set(context.pages.flatMap((page) => page.signals.publicPersonalDataPatterns))];
  if (patterns.length === 0) {
    return pass("No obvious public personal-data pattern was detected in visible page text.", {
      confidence: "low",
      evidence: [evidenceForRun(context, "public-data", "No pattern matched.", {})],
      limitations: "The scan covers visible HTML text only and may miss images, PDFs, client-rendered content and encoded data.",
    });
  }
  const highRisk = patterns.filter((pattern) =>
    ["aadhaar-like-number", "pan-like-number", "long-number-sequence"].includes(pattern),
  );
  if (highRisk.length > 0) {
    return warning("Potential public exposure of high-risk personal-data patterns was detected; human review is required.", {
      evidence: [evidenceForRun(context, "public-data", "Potential public data patterns.", { patterns })],
      humanReviewRequired: true,
      severity: "high",
    });
  }
  return warning("Visible page text contains email/phone-like patterns. These may be intentional public contacts, but must be reviewed.", {
    evidence: [evidenceForRun(context, "public-data", "Contact-like public patterns.", { patterns })],
    humanReviewRequired: true,
  });
}

function insecureFormDestination(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notApplicable("No forms were discovered.", {
      evidence: [evidenceForRun(context, "form-destination", "No forms.", {})],
    });
  }
  const insecure = forms.filter((form) => form.absoluteAction.startsWith("http:"));
  if (insecure.length > 0) {
    return fail("At least one form submits to an HTTP destination.", {
      evidence: [
        evidenceForRun(context, "form-destination", "Insecure form actions.", {
          actions: insecure.map((form) => form.absoluteAction),
        }),
      ],
    });
  }
  const external = forms.filter((form) => form.externalDestination);
  if (external.length > 0) {
    return warning("At least one form submits to an external destination.", {
      evidence: [
        evidenceForRun(context, "form-destination", "External form actions.", {
          actions: external.map((form) => form.absoluteAction),
        }),
      ],
    });
  }
  return pass("All discovered form actions use HTTPS on the same origin.", {
    evidence: [evidenceForRun(context, "form-destination", "Form actions.", { actions: forms.map((form) => form.absoluteAction) })],
  });
}

function thirdPartyInventory(context: AuditContext): RuleOutcome {
  const hosts = [...new Set([
    ...context.pages.flatMap((page) => page.thirdPartyHosts),
    ...(context.browser?.initial?.requests
      .filter((request) => request.thirdParty)
      .map((request) => request.host) ?? []),
  ])];
  return pass(`Third-party destination inventory contains ${hosts.length} host(s).`, {
    evidence: [
      evidenceForRun(context, "third-party-inventory", "Third-party hosts.", {
        hosts,
        note: "Inventory is descriptive. Tracker classification and consent analysis are separate tests.",
      }),
    ],
  });
}

function browserSecurityErrors(context: AuditContext): RuleOutcome {
  if (!hasBrowser(context) || !context.browser?.initial) {
    return notAssessed("No browser evidence was available for browser security error inspection.", {
      evidence: [evidenceForRun(context, "browser-errors", "Browser unavailable.", {})],
    });
  }
  const errors = [
    ...(context.browser.initial.errors ?? []),
    ...(context.browser.afterAccept?.errors ?? []),
    ...(context.browser.afterReject?.errors ?? []),
  ];
  const serious = errors.filter((error) =>
    /(ssl|certificate|tls|mixed content|blocked|cors|refused)/i.test(error),
  );
  if (serious.length > 0) {
    return warning("Browser security/network errors were recorded.", {
      evidence: [evidenceForRun(context, "browser-errors", "Browser errors.", { errors: serious })],
    });
  }
  if (errors.length > 0) {
    return warning("Console/page errors were recorded; review whether they affect security or functionality.", {
      evidence: [evidenceForRun(context, "browser-errors", "Console/page errors.", { errors: errors.slice(0, 50) })],
    });
  }
  return pass("No browser security or console error was recorded in the tested states.", {
    evidence: [evidenceForRun(context, "browser-errors", "No browser errors.", {})],
  });
}

function coverageReporting(context: AuditContext): RuleOutcome {
  return pass("The run records attempted, successful, failed, blocked and out-of-scope crawl outcomes for coverage reporting.", {
    evidence: [
      evidenceForRun(context, "coverage", "Coverage counters.", {
        crawlStats: context.crawlStats,
        limitations: context.limitations,
      }),
    ],
  });
}

export const SECURITY_RULES: Record<string, TestEvaluator> = {
  "SEC-001": httpsAndMixedContent,
  "SEC-002": hsts,
  "SEC-003": csp,
  "SEC-004": nosniff,
  "SEC-005": referrerPolicy,
  "SEC-006": publicDataExposure,
  "SEC-007": insecureFormDestination,
  "SEC-008": thirdPartyInventory,
  "SEC-009": browserSecurityErrors,
  "SEC-010": coverageReporting,
};
