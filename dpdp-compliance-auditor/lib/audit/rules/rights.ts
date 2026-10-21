import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  allForms,
  allLinks,
  evidenceForRun,
  notAssessed,
  pass,
  primaryNoticePage,
  warning,
} from "./helpers";

function rightsInformation(context: AuditContext): RuleOutcome {
  const categories = [
    ...new Set(
      context.pages.flatMap((page) => page.signals.rightsCategories),
    ),
  ];
  if (categories.length >= 2) {
    return pass(`Multiple rights categories were referenced: ${categories.join(", ")}.`, {
      evidence: [
        evidenceForRun(context, "rights-information", "Rights categories.", {
          categories,
          pages: context.pages
            .filter((page) => page.signals.rightsCategories.length > 0)
            .map((page) => page.finalUrl),
        }),
      ],
    });
  }
  if (categories.length === 1) {
    return warning(`Only one rights category (${categories[0]}) was found; other rights may be undocumented.`, {
      evidence: [
        evidenceForRun(context, "rights-information", "Limited rights language.", {
          categories,
        }),
      ],
    });
  }
  return warning("No familiar rights language was found in the inspected pages.", {
    evidence: [
      evidenceForRun(context, "rights-information", "No rights language.", {
        pagesInspected: context.crawlStats.pagesAttempted,
      }),
    ],
  });
}

function rightsMechanism(context: AuditContext): RuleOutcome {
  const links = allLinks(context, "rights");
  const forms = allForms(context);
  const rightsFormFields = forms.flatMap((form) =>
    form.fields
      .filter((field) =>
        /access|correct|correction|erase|erasure|delete|remove|update|amend|request|my data|download|rights/i.test(
          `${field.label ?? ""} ${field.name ?? ""}`,
        ),
      )
      .map((field) => ({
        pageUrl: form.pageUrl,
        type: field.type,
        name: field.name,
        label: field.label,
      })),
  );
  const page = primaryNoticePage(context);
  const contactOnly = Boolean(page?.signals.hasEmail || page?.signals.hasPhone);

  if (links.length > 0 || rightsFormFields.length > 0) {
    return pass("A rights-specific access, correction, or erasure route was discovered.", {
      confidence: "medium",
      affectedUrls: [
        ...links.map((link) => link.href),
        ...new Set(rightsFormFields.map((field) => field.pageUrl)),
      ],
      evidence: [
        evidenceForRun(context, "rights-mechanism", "Rights-specific request-route signals.", {
          rightLinks: links.map((link) => ({ href: link.href, text: link.text })),
          rightsFormFields,
          note: "Pass requires a dedicated rights link/route or a form field naming an access, correction, erasure, or data-request action. A generic contact or notice email alone does not establish a rights mechanism.",
        }),
      ],
      limitations: "Discovery of a link or form does not prove the request workflow works or meets statutory timelines.",
    });
  }
  return warning(
    contactOnly
      ? "Only a general privacy contact was found; no dedicated access, correction, or erasure mechanism was discovered."
      : "No clear access, correction, or erasure request mechanism was discovered.",
    {
      evidence: [
        evidenceForRun(context, "rights-mechanism", "No rights-specific mechanism signal.", {
          noticeContactOnly: contactOnly,
          rightLinks: [],
          rightsFormFields: [],
          formsInspected: forms.length,
        }),
      ],
    },
  );
}

function grievanceMechanism(context: AuditContext): RuleOutcome {
  const links = [...allLinks(context, "grievance"), ...allLinks(context, "contact")];
  const contact = context.pages.some(
    (page) => page.signals.hasEmail || page.signals.hasPhone || page.signals.hasContactLanguage,
  );
  if (links.length > 0 || contact) {
    return pass("A grievance or contact route was discovered.", {
      confidence: "medium",
      evidence: [
        evidenceForRun(context, "grievance-mechanism", "Grievance/contact signals.", {
          links: links.map((link) => ({ href: link.href, text: link.text })),
          contactSignal: contact,
        }),
      ],
      limitations: "A contact route is not proof of an effective grievance-redressal process.",
    });
  }
  return warning("No grievance contact or mechanism was discovered.", {
    evidence: [evidenceForRun(context, "grievance-mechanism", "No grievance signal.", {})],
  });
}

function contactDiscoverability(context: AuditContext): RuleOutcome {
  const contactLinks = allLinks(context, "contact");
  const notice = primaryNoticePage(context);
  const hasContact = Boolean(notice?.signals.hasEmail || notice?.signals.hasPhone);
  if (contactLinks.length > 0 || hasContact) {
    return pass("A relevant contact route was discoverable.", {
      evidence: [
        evidenceForRun(context, "contact-discoverability", "Contact signals.", {
          contactLinks: contactLinks.map((link) => ({ href: link.href, text: link.text })),
          emailOrPhoneInNotice: hasContact,
        }),
      ],
    });
  }
  return warning("No relevant contact route was discoverable from the inspected pages.", {
    evidence: [evidenceForRun(context, "contact-discoverability", "No contact route.", {})],
  });
}

function safeWorkflow(context: AuditContext): RuleOutcome {
  return notAssessed("The engine did not submit a rights request. A safe synthetic workflow must be configured explicitly before this can be tested.", {
    evidence: [
      evidenceForRun(context, "rights-workflow", "Rights workflow not executed by policy.", {
        submissionPerformed: false,
      }),
    ],
    humanReviewRequired: true,
  });
}

export const RIGHTS_RULES: Record<string, TestEvaluator> = {
  "RIGHTS-001": rightsInformation,
  "RIGHTS-002": rightsMechanism,
  "RIGHTS-003": grievanceMechanism,
  "RIGHTS-004": contactDiscoverability,
  "RIGHTS-005": safeWorkflow,
};
