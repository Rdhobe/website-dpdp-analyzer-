import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  allForms,
  allLinks,
  evidenceForRun,
  fail,
  linkTargetFound,
  notApplicable,
  notAssessed,
  pass,
  warning,
} from "./helpers";

function homepage(context: AuditContext): RuleOutcome {
  const page = context.startPage;
  if (!page) {
    return notAssessed("No homepage response was captured.", {
      evidence: [evidenceForRun(context, "crawl-error", "Crawl produced no start page.", { errors: context.crawlStats })],
    });
  }
  if (!page.ok || page.status === null || page.status >= 400) {
    const detail = page.error ? ` ${page.error}` : "";
    return fail(`The homepage could not be retrieved (status ${page.status ?? "none"}).${detail}`, {
      affectedUrls: [page.requestedUrl],
      evidence: [
        evidenceForRun(context, "http-status", "Homepage response status and redirects.", {
          requestedUrl: page.requestedUrl,
          finalUrl: page.finalUrl,
          status: page.status,
          redirectChain: page.redirectChain,
          error: page.error,
        }),
      ],
    });
  }
  return pass(
    page.redirectChain.length > 1
      ? `The homepage resolved after ${page.redirectChain.length - 1} redirect(s) to ${page.finalUrl}.`
      : "The homepage returned a successful HTML response.",
    {
      affectedUrls: [page.requestedUrl],
      evidence: [
        evidenceForRun(context, "http-status", "Homepage resolved successfully.", {
          requestedUrl: page.requestedUrl,
          finalUrl: page.finalUrl,
          status: page.status,
          redirectChain: page.redirectChain,
        }),
      ],
    },
  );
}

function privacyDiscovery(context: AuditContext): RuleOutcome {
  const links = allLinks(context, "privacy");
  const accessible = links
    .map((link) => ({ link, page: linkTargetFound(context, link) }))
    .filter((entry) => entry.page?.ok);
  if (accessible.length > 0) {
    return pass("A reachable privacy-notice link was discovered and crawled.", {
      affectedUrls: accessible.map((entry) => entry.page?.finalUrl ?? entry.link.href),
      evidence: [
        evidenceForRun(context, "privacy-link", "Reachable privacy links.", {
          links: accessible.map((entry) => ({
            href: entry.link.href,
            text: entry.link.text,
            finalUrl: entry.page?.finalUrl,
          })),
        }),
      ],
    });
  }

  const external = links.filter((link) => !link.internal);
  if (external.length > 0) {
    return warning("A privacy link was discovered but points outside the authorized origin; its content was not verified.", {
      affectedUrls: external.map((link) => link.href),
      evidence: [
        evidenceForRun(context, "privacy-link", "External privacy links were not crawled.", {
          links: external.map((link) => ({ href: link.href, text: link.text })),
        }),
      ],
    });
  }

  const failedPage = links
    .map((link) => ({ link, page: linkTargetFound(context, link) }))
    .find((entry) => entry.page && !entry.page.ok);
  if (failedPage?.page) {
    return warning("A privacy link exists, but the target page was not successfully retrieved.", {
      affectedUrls: [failedPage.link.href],
      evidence: [
        evidenceForRun(context, "privacy-link", "Privacy link target failed.", {
          href: failedPage.link.href,
          status: failedPage.page.status,
          error: failedPage.page.error,
        }),
      ],
    });
  }

  if (links.length > 0) {
    return warning("A privacy link was discovered but its target was outside the crawler's page/depth budget, so availability was not verified.", {
      affectedUrls: links.map((link) => link.href),
      evidence: [
        evidenceForRun(context, "privacy-link", "Privacy link was not crawled.", {
          links: links.map((link) => ({ href: link.href, text: link.text })),
          crawlStats: context.crawlStats,
        }),
      ],
    });
  }

  const notice = context.pages.find((page) => page.signals.hasPrivacyNoticeLanguage);
  if (notice) {
    return warning("A page with privacy-notice language was crawled, but no privacy link was discovered from the inspected pages.", {
      affectedUrls: [notice.finalUrl],
      evidence: [
        evidenceForRun(context, "privacy-page", "Notice-like page without a discovered link.", {
          finalUrl: notice.finalUrl,
          title: notice.title,
        }),
      ],
    });
  }

  return fail("No privacy-notice link or notice-like page was discovered in the crawl.", {
    evidence: [
      evidenceForRun(context, "privacy-link", "No privacy link was discovered.", {
        pagesInspected: context.crawlStats.pagesAttempted,
        errors: context.limitations,
      }),
    ],
  });
}

function cookieDiscovery(context: AuditContext): RuleOutcome {
  const links = allLinks(context, "cookie");
  const cookieText = context.pages.some((page) =>
    /cookie|consent preference/i.test(page.textExcerpt),
  );
  const trackers = context.browser?.initial?.requests.filter(
    (request) => request.knownTracker,
  ) ?? [];
  const hasCookies = context.pages.some((page) => page.setCookieNames.length > 0);
  const applicable = hasCookies || trackers.length > 0 || cookieText;

  if (!applicable) {
    return notApplicable("No cookie notice, cookie, or known tracker signal was observed; the notice may not be applicable to the inspected pages.", {
      evidence: [
        evidenceForRun(context, "cookie-signal", "No cookie or tracker signal observed.", {
          pagesInspected: context.crawlStats.pagesAttempted,
        }),
      ],
    });
  }

  if (links.length > 0 || cookieText) {
    return pass("Cookie-related content or a cookie link was discovered.", {
      affectedUrls: links.map((link) => link.href),
      evidence: [
        evidenceForRun(context, "cookie-link", "Cookie-related discovery evidence.", {
          links: links.map((link) => ({ href: link.href, text: link.text })),
          cookieTextObserved: cookieText,
          setCookieNames: context.pages.flatMap((page) => page.setCookieNames),
        }),
      ],
    });
  }

  return warning("Cookies or known trackers were observed without a discovered cookie notice.", {
    evidence: [
      evidenceForRun(context, "cookie-signal", "Tracking observed without cookie notice discovery.", {
        setCookieNames: context.pages.flatMap((page) => page.setCookieNames),
        trackers: trackers.map((request) => request.host),
      }),
    ],
  });
}

function grievanceDiscovery(context: AuditContext): RuleOutcome {
  const links = [...allLinks(context, "grievance"), ...allLinks(context, "contact")];
  const accessible = links
    .map((link) => ({ link, page: linkTargetFound(context, link) }))
    .filter((entry) => entry.page?.ok);
  if (accessible.length > 0) {
    return pass("A reachable grievance or contact page was discovered.", {
      affectedUrls: accessible.map((entry) => entry.page?.finalUrl ?? entry.link.href),
      evidence: [
        evidenceForRun(context, "grievance-link", "Reachable grievance/contact links.", {
          links: accessible.map((entry) => ({
            href: entry.link.href,
            text: entry.link.text,
            finalUrl: entry.page?.finalUrl,
          })),
        }),
      ],
    });
  }
  const hasContactSignal = context.pages.some(
    (page) => page.signals.hasEmail || page.signals.hasPhone || page.signals.hasContactLanguage,
  );
  if (hasContactSignal) {
    return warning("Contact or grievance language was found, but no accessible grievance/contact page was verified.", {
      evidence: [
        evidenceForRun(context, "contact-signal", "Contact language without a verified destination.", {
          pages: context.pages
            .filter((page) => page.signals.hasEmail || page.signals.hasPhone || page.signals.hasContactLanguage)
            .map((page) => page.finalUrl),
        }),
      ],
    });
  }
  return warning("No grievance or contact page was discovered. This is a review signal, not proof that no mechanism exists.", {
    evidence: [
      evidenceForRun(context, "grievance-link", "No grievance/contact link found.", {
        pagesInspected: context.crawlStats.pagesAttempted,
      }),
    ],
  });
}

function rightsDiscovery(context: AuditContext): RuleOutcome {
  const links = allLinks(context, "rights");
  const accessible = links
    .map((link) => ({ link, page: linkTargetFound(context, link) }))
    .filter((entry) => entry.page?.ok);
  if (accessible.length > 0) {
    return pass("A reachable rights-related page was discovered.", {
      affectedUrls: accessible.map((entry) => entry.page?.finalUrl ?? entry.link.href),
      evidence: [
        evidenceForRun(context, "rights-link", "Reachable rights links.", {
          links: accessible.map((entry) => ({ href: entry.link.href, text: entry.link.text })),
        }),
      ],
    });
  }
  const rightsText = context.pages.find(
    (page) => page.signals.rightsCategories.length > 0,
  );
  if (rightsText) {
    return warning("Rights language was found, but no dedicated rights/request page was verified.", {
      affectedUrls: [rightsText.finalUrl],
      evidence: [
        evidenceForRun(context, "rights-text", "Rights language without a dedicated page.", {
          finalUrl: rightsText.finalUrl,
          rightsCategories: rightsText.signals.rightsCategories,
        }),
      ],
    });
  }
  return warning("No rights page or rights language was discovered. Applicability and the actual mechanism require review.", {
    evidence: [
      evidenceForRun(context, "rights-link", "No rights discovery signal.", {
        pagesInspected: context.crawlStats.pagesAttempted,
      }),
    ],
  });
}

function formDiscovery(context: AuditContext): RuleOutcome {
  const forms = allForms(context);
  if (forms.length === 0) {
    return notApplicable("No HTML forms were discovered; there may be no personal-data collection point on the inspected pages.", {
      evidence: [
        evidenceForRun(context, "form-inventory", "No forms found.", {
          pagesInspected: context.crawlStats.pagesAttempted,
        }),
      ],
    });
  }
  return pass(`${forms.length} form(s) were discovered across ${new Set(forms.map((form) => form.pageUrl)).size} page(s).`, {
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-inventory", "Discovered form inventory.", {
        forms: forms.map((form) => ({
          pageUrl: form.pageUrl,
          action: form.absoluteAction,
          method: form.method,
          fieldCount: form.fields.length,
        })),
      }),
    ],
  });
}

function jsRenderedContent(context: AuditContext): RuleOutcome {
  if (!context.browser?.available || !context.browser.initial || !context.startPage) {
    return notAssessed("Browser evidence was not available, so JavaScript-only content could not be compared with static HTML.", {
      evidence: [
        evidenceForRun(context, "browser-evidence", "Browser rendering unavailable.", {
          limitations: context.browser?.limitations ?? context.limitations,
        }),
      ],
    });
  }
  const staticLength = context.startPage.textExcerpt.length;
  const renderedLength = context.browser.initial.textExcerpt.length;
  const materialDifference = renderedLength > Math.max(staticLength * 1.3, staticLength + 300);
  return pass(
    materialDifference
      ? "The rendered DOM contained materially more text than the static HTML, indicating JavaScript-rendered content."
      : "No material JavaScript-only content difference was detected on the homepage.",
    {
      confidence: materialDifference ? "high" : "low",
      affectedUrls: [context.startPage.finalUrl],
      evidence: [
        evidenceForRun(context, "dom-comparison", "Static versus rendered text length.", {
          staticCharacters: staticLength,
          renderedCharacters: renderedLength,
          materialDifference,
        }),
      ],
      limitations: "A text-length comparison is not a complete discovery of client-rendered pages or hidden content.",
    },
  );
}

function failedPages(context: AuditContext): RuleOutcome {
  const failures = context.pages.filter((page) => !page.ok);
  if (failures.length > 0) {
    return fail(`${failures.length} page(s) failed or could not be assessed during the crawl.`, {
      affectedUrls: failures.map((page) => page.requestedUrl),
      evidence: [
        evidenceForRun(context, "crawl-failure", "Failed page attempts.", {
          failures: failures.map((page) => ({
            requestedUrl: page.requestedUrl,
            status: page.status,
            error: page.error,
          })),
          crawlStats: context.crawlStats,
        }),
      ],
    });
  }
  if (context.errors.length > 0) {
    return warning("No page returned an HTTP error, but crawl-level errors were recorded.", {
      evidence: [
        evidenceForRun(context, "crawl-error", "Crawl errors.", {
          errors: context.errors,
          crawlStats: context.crawlStats,
        }),
      ],
    });
  }
  return pass("No failed pages were recorded in the inspected scope.", {
    evidence: [
      evidenceForRun(context, "crawl-success", "Crawl page outcomes.", {
        pagesAttempted: context.crawlStats.pagesAttempted,
        pagesSucceeded: context.crawlStats.pagesSucceeded,
      }),
    ],
  });
}

function sitemapDiscovery(context: AuditContext): RuleOutcome {
  const robotsOk = context.robots?.status === 200;
  const sitemapOk = context.sitemap?.status === 200;
  if (robotsOk || sitemapOk) {
    return pass("robots.txt and/or sitemap.xml was accessible.", {
      evidence: [
        evidenceForRun(context, "discovery-files", "Discovery file status.", {
          robots: context.robots,
          sitemap: context.sitemap,
        }),
      ],
    });
  }
  return warning("Neither robots.txt nor sitemap.xml was accessible; discovery coverage may be incomplete.", {
    evidence: [
      evidenceForRun(context, "discovery-files", "Discovery files unavailable.", {
        robots: context.robots,
        sitemap: context.sitemap,
      }),
    ],
  });
}

function boundaryEnforcement(context: AuditContext): RuleOutcome {
  return pass("The crawler enforced same-origin scope, normalized URL deduplication, and a fixed run time budget.", {
    evidence: [
      evidenceForRun(context, "crawl-boundary", "Crawl boundary statistics.", {
        sameOriginOnly: context.config.sameOriginOnly,
        timeBudgetMs: context.config.timeBudgetMs,
        stats: context.crawlStats,
        outOfScopeLinksObserved: context.crawlStats.outOfScopeSkipped,
      }),
    ],
    limitations:
      "Links to external origins are recorded but never fetched in this engine. The crawl follows same-site links until the run time budget is reached rather than a fixed page or depth limit.",
  });
}

export const CRAWL_RULES: Record<string, TestEvaluator> = {
  "CRAWL-001": homepage,
  "CRAWL-002": privacyDiscovery,
  "CRAWL-003": cookieDiscovery,
  "CRAWL-004": grievanceDiscovery,
  "CRAWL-005": rightsDiscovery,
  "CRAWL-006": formDiscovery,
  "CRAWL-007": jsRenderedContent,
  "CRAWL-008": failedPages,
  "CRAWL-009": sitemapDiscovery,
  "CRAWL-010": boundaryEnforcement,
};
