import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  allForms,
  allLinks,
  evidenceForRun,
  fail,
  notAssessed,
  pass,
  primaryNoticePage,
  warning,
} from "./helpers";

function noticeAvailability(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (page && page.ok && page.signals.noticeWordCount >= 80) {
    return pass("A substantive, reachable privacy-notice page was available.", {
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "privacy-notice", "Notice page and excerpt.", {
          finalUrl: page.finalUrl,
          title: page.title,
          wordCount: page.signals.noticeWordCount,
          excerpt: page.textExcerpt.slice(0, 2000),
        }),
      ],
    });
  }

  const pdfLinks = allLinks(context, "privacy").filter((link) =>
    /\.pdf(?:$|[?#])/i.test(link.href),
  );
  if (pdfLinks.length > 0) {
    return warning("A privacy notice appears to be available only as a PDF link; the PDF content was not parsed in this run.", {
      affectedUrls: pdfLinks.map((link) => link.href),
      evidence: [
        evidenceForRun(context, "privacy-pdf", "PDF privacy link discovered.", {
          links: pdfLinks.map((link) => ({ href: link.href, text: link.text })),
        }),
      ],
    });
  }

  if (allLinks(context, "privacy").length > 0) {
    return warning("A privacy link was discovered but no substantive notice page was successfully inspected.", {
      affectedUrls: allLinks(context, "privacy").map((link) => link.href),
      evidence: [
        evidenceForRun(context, "privacy-link", "Notice link without verified content.", {
          links: allLinks(context, "privacy").map((link) => ({
            href: link.href,
            text: link.text,
          })),
          limitations: context.limitations,
        }),
      ],
    });
  }

  return fail("No substantive privacy notice was available in the inspected scope.", {
    evidence: [
      evidenceForRun(context, "privacy-notice", "No notice page available.", {
        pagesInspected: context.crawlStats.pagesAttempted,
        limitations: context.limitations,
      }),
    ],
  });
}

function noticeReadability(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page || page.signals.noticeWordCount < 40) {
    return notAssessed("No substantive notice text was available for a readability signal.", {
      evidence: [
        evidenceForRun(context, "notice-readability", "Insufficient notice text.", {
          finalUrl: page?.finalUrl ?? null,
          wordCount: page?.signals.noticeWordCount ?? 0,
        }),
      ],
    });
  }
  const words = page.signals.noticeWordCount;
  const sentenceLength = page.signals.averageSentenceLength;
  if (words < 150 || sentenceLength > 35) {
    return warning(
      `The notice is ${words} words with an average sentence length of about ${sentenceLength}; clarity may need review.`,
      {
        affectedUrls: [page.finalUrl],
        evidence: [
          evidenceForRun(context, "notice-readability", "Readability metrics.", {
            wordCount: words,
            averageSentenceLength: sentenceLength,
          }),
        ],
      },
    );
  }
  return pass("The notice has a substantive length and no obvious sentence-complexity warning.", {
    confidence: "low",
    affectedUrls: [page.finalUrl],
    evidence: [
      evidenceForRun(context, "notice-readability", "Readability metrics.", {
        wordCount: words,
        averageSentenceLength: sentenceLength,
      }),
    ],
    limitations: "This is a rough heuristic, not a legal clarity or accessibility assessment.",
  });
}

function personalDataCategories(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page) {
    return notAssessed("No privacy-notice page was available to extract data categories.", {
      evidence: [evidenceForRun(context, "notice-categories", "No notice page.", {})],
    });
  }
  const categories = page.signals.personalDataCategories;
  if (categories.length >= 3) {
    return pass(`${categories.length} personal-data categories were referenced in the notice.`, {
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-categories", "Extracted categories.", {
          categories,
          matchMethod: "keyword extraction",
        }),
      ],
    });
  }
  return warning(
    categories.length === 0
      ? "No familiar personal-data category terms were found in the notice."
      : `Only ${categories.length} personal-data category term(s) were found; the notice may be incomplete or use different wording.`,
    {
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-categories", "Extracted categories.", {
          categories,
          excerpt: page.textExcerpt.slice(0, 2000),
        }),
      ],
      limitations: "Keyword extraction may miss categories expressed with different terminology.",
    },
  );
}

function purposes(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page) {
    return notAssessed("No privacy-notice page was available to extract purposes.", {
      evidence: [evidenceForRun(context, "notice-purposes", "No notice page.", {})],
    });
  }
  if (page.signals.purposes.length >= 2) {
    return pass(`${page.signals.purposes.length} processing-purpose categories were referenced.`, {
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-purposes", "Extracted purposes.", {
          purposes: page.signals.purposes,
        }),
      ],
    });
  }
  return warning("Fewer than two familiar processing-purpose categories were found; purpose clarity needs review.", {
    affectedUrls: [page.finalUrl],
    evidence: [
      evidenceForRun(context, "notice-purposes", "Extracted purposes.", {
        purposes: page.signals.purposes,
        excerpt: page.textExcerpt.slice(0, 2000),
      }),
    ],
  });
}

function statutoryNoticeElements(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page) {
    return notAssessed("No notice text was available to compare with the verified notice elements.", {
      evidence: [evidenceForRun(context, "notice-elements", "No notice page.", {})],
    });
  }
  const hasRights = page.signals.rightsCategories.length > 0;
  const elements = {
    dataCategories: page.signals.personalDataCategories.length > 0,
    purposes: page.signals.purposes.length > 0,
    rights: hasRights,
    contact: page.signals.hasEmail || page.signals.hasPhone || page.signals.hasContactLanguage,
    withdrawal:
      page.textExcerpt.toLowerCase().includes("withdraw") ||
      page.textExcerpt.toLowerCase().includes("consent"),
    complaint: /grievance|complaint|board/i.test(page.textExcerpt),
  };
  const present = Object.values(elements).filter(Boolean).length;
  if (present >= 5) {
    return pass(`${present} of 6 checked notice elements were present. The legal reference is not yet in force.`, {
      confidence: "medium",
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-elements", "Notice element checklist.", {
          elements,
          present,
          legalEffectiveStatus: "not_yet_effective",
          effectiveFrom: "2027-05-13",
        }),
      ],
      limitations: "This is a readiness comparison against Act s.5. The provision is not yet in force, and the check does not prove legal sufficiency.",
    });
  }
  return warning(`${present} of 6 checked notice elements were present; the notice may be incomplete. The legal reference is not yet in force.`, {
    affectedUrls: [page.finalUrl],
    evidence: [
      evidenceForRun(context, "notice-elements", "Notice element checklist.", {
        elements,
        present,
        legalEffectiveStatus: "not_yet_effective",
        effectiveFrom: "2027-05-13",
      }),
    ],
  });
}

function contactExtraction(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page) {
    return notAssessed("No notice page was available to extract contacts.", {
      evidence: [evidenceForRun(context, "notice-contact", "No notice page.", {})],
    });
  }
  const channels: string[] = [];
  if (page.signals.hasEmail) channels.push("email-like address (redacted)");
  if (page.signals.hasPhone) channels.push("phone-like number (redacted)");
  if (page.signals.hasContactLanguage) channels.push("contact/grievance language");
  if (channels.length > 0) {
    return pass("A privacy or grievance contact route was referenced in the notice.", {
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-contact", "Contact channels referenced.", {
          channels,
          note: "Actual contact values are redacted from stored evidence.",
        }),
      ],
    });
  }
  return warning("No email, phone, or contact/grievance language was found in the notice.", {
    affectedUrls: [page.finalUrl],
    evidence: [
      evidenceForRun(context, "notice-contact", "No contact signal.", {
        excerpt: page.textExcerpt.slice(0, 2000),
      }),
    ],
  });
}

function versionDate(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page) {
    return notAssessed("No notice page was available to inspect version/date information.", {
      evidence: [evidenceForRun(context, "notice-version", "No notice page.", {})],
    });
  }
  const hasVersionLanguage = /(version|last updated|effective date|updated on)/i.test(
    page.textExcerpt,
  );
  if (page.signals.dateStrings.length > 0 || hasVersionLanguage) {
    return pass("Notice version or date language was found.", {
      confidence: "medium",
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-version", "Version/date evidence.", {
          dates: page.signals.dateStrings,
          hasVersionLanguage,
        }),
      ],
    });
  }
  return warning("No notice version or date was found; freshness cannot be verified.", {
    affectedUrls: [page.finalUrl],
    evidence: [
      evidenceForRun(context, "notice-version", "No version/date evidence.", {
        hasVersionLanguage,
      }),
    ],
  });
}

function formNoticeComparison(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  const forms = allForms(context);
  if (!page) {
    return notAssessed("No notice page was available to compare with collection forms.", {
      evidence: [evidenceForRun(context, "form-notice", "No notice page.", {})],
    });
  }
  if (forms.length === 0) {
    return notAssessed("No forms were discovered, so there is no collection point to compare.", {
      evidence: [evidenceForRun(context, "form-notice", "No forms.", {})],
    });
  }
  const disclosed = new Set(page.signals.personalDataCategories);
  const observed = new Set(
    forms.flatMap((form) =>
      form.fields
        .map((field) => field.sensitiveCategory)
        .filter((category): category is string => Boolean(category)),
    ),
  );
  const unexplained = [...observed].filter((category) => !disclosed.has(category));
  if (unexplained.length > 0) {
    return warning(`Form fields include categories not found in the notice: ${unexplained.join(", ")}.`, {
      affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
      evidence: [
        evidenceForRun(context, "form-notice", "Observed versus disclosed categories.", {
          observed: [...observed],
          disclosed: [...disclosed],
          unexplained,
        }),
      ],
      limitations: "Notice wording may use synonyms; this is a review signal, not a finding of unlawful collection.",
    });
  }
  return pass("All classified form-field categories were also referenced in the notice.", {
    affectedUrls: [...new Set(forms.map((form) => form.pageUrl))],
    evidence: [
      evidenceForRun(context, "form-notice", "Observed versus disclosed categories.", {
        observed: [...observed],
        disclosed: [...disclosed],
        unexplained,
      }),
    ],
  });
}

function contradictoryStatements(context: AuditContext): RuleOutcome {
  const pages = context.pages.filter(
    (page) => page.ok && page.signals.hasPrivacyNoticeLanguage,
  );
  const flags = pages.flatMap((page) =>
    page.signals.contradictionFlags.map((flag) => ({ page: page.finalUrl, flag })),
  );
  if (flags.length === 0) {
    return pass("No obvious keyword-level privacy contradictions were detected in the inspected notice text.", {
      confidence: "low",
      evidence: [
        evidenceForRun(context, "notice-contradiction", "Contradiction scan.", {
          pagesInspected: pages.map((page) => page.finalUrl),
          flags: [],
        }),
      ],
      limitations: "Absence of a keyword contradiction is not proof that the notices are consistent; semantic review is required.",
    });
  }
  return warning("Potentially contradictory privacy statements were detected and need human review.", {
    affectedUrls: [...new Set(flags.map((entry) => entry.page))],
    evidence: [
      evidenceForRun(context, "notice-contradiction", "Contradiction flags.", {
        flags,
      }),
    ],
    humanReviewRequired: true,
  });
}

function accessibilityLanguage(context: AuditContext): RuleOutcome {
  const page = primaryNoticePage(context);
  if (!page) {
    return notAssessed("No notice page was available for accessibility/language checks.", {
      evidence: [evidenceForRun(context, "notice-accessibility", "No notice page.", {})],
    });
  }
  const hasLanguage = Boolean(page.language);
  const hasHeadings = page.headings.length > 0;
  const isPdfOnly =
    /\.pdf(?:$|[?#])/i.test(page.finalUrl) ||
    (allLinks(context, "privacy").some((link) => /\.pdf(?:$|[?#])/i.test(link.href)) &&
      page.signals.noticeWordCount < 80);
  if (!hasLanguage || !hasHeadings || isPdfOnly) {
    return warning("The notice has an accessibility/language review signal.", {
      affectedUrls: [page.finalUrl],
      evidence: [
        evidenceForRun(context, "notice-accessibility", "Notice accessibility signals.", {
          declaredLanguage: page.language,
          headingCount: page.headings.length,
          isPdfOnly,
        }),
      ],
      limitations: "This is not a WCAG audit; manual accessibility and translation review are required.",
    });
  }
  return pass("The notice declares a page language and contains headings in accessible HTML.", {
    confidence: "low",
    affectedUrls: [page.finalUrl],
    evidence: [
      evidenceForRun(context, "notice-accessibility", "Notice accessibility signals.", {
        declaredLanguage: page.language,
        headingCount: page.headings.length,
        isPdfOnly,
      }),
    ],
  });
}

export const NOTICE_RULES: Record<string, TestEvaluator> = {
  "NOTICE-001": noticeAvailability,
  "NOTICE-002": noticeReadability,
  "NOTICE-003": personalDataCategories,
  "NOTICE-004": purposes,
  "NOTICE-005": statutoryNoticeElements,
  "NOTICE-006": contactExtraction,
  "NOTICE-007": versionDate,
  "NOTICE-008": formNoticeComparison,
  "NOTICE-009": contradictoryStatements,
  "NOTICE-010": accessibilityLanguage,
};
