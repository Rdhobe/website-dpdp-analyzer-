import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  evidenceForRun,
  hasBrowser,
  notApplicable,
  notAssessed,
  pass,
  trackerRequests,
  warning,
} from "./helpers";

function hasChildSignal(context: AuditContext): boolean {
  return context.pages.some((page) => page.signals.childTerms.length > 0);
}

function childText(context: AuditContext): string {
  return context.pages
    .filter((page) => page.signals.childTerms.length > 0)
    .map((page) => page.textExcerpt)
    .join("\n")
    .slice(0, 80000);
}

function ageNotice(context: AuditContext): RuleOutcome {
  if (!hasChildSignal(context)) {
    return notApplicable("No child, age, parental-consent, or child-directed language was detected on the inspected pages.", {
      evidence: [evidenceForRun(context, "child-age", "No child signal.", {})],
    });
  }
  return warning("Child/age-related language was detected; verify whether the service is child-directed and whether an age notice is needed.", {
    evidence: [
      evidenceForRun(context, "child-age", "Child/age language.", {
        pages: context.pages
          .filter((page) => page.signals.childTerms.length > 0)
          .map((page) => page.finalUrl),
      }),
    ],
    humanReviewRequired: true,
  });
}

function parentalConsentWorkflow(context: AuditContext): RuleOutcome {
  if (!hasChildSignal(context)) {
    return notApplicable("No child-directed processing indicator was detected.", {
      evidence: [evidenceForRun(context, "child-parental", "No child signal.", {})],
    });
  }
  const text = childText(context);
  if (/\b(parent|guardian)\b.{0,60}\b(consent|permission|approval)\b/i.test(text)) {
    return pass("Parental/guardian consent language was detected; the actual workflow still requires review.", {
      confidence: "low",
      evidence: [
        evidenceForRun(context, "child-parental", "Parental-consent language.", {
          matched: true,
        }),
      ],
      limitations: "A public statement does not prove verifiable parental consent or age assurance.",
      humanReviewRequired: true,
    });
  }
  return warning("Child-related language was detected without a parental/guardian consent workflow indicator.", {
    evidence: [evidenceForRun(context, "child-parental", "Missing parental workflow signal.", {})],
    humanReviewRequired: true,
  });
}

function childDirected(context: AuditContext): RuleOutcome {
  if (!hasChildSignal(context)) {
    return notApplicable("No child-directed content or audience indicator was detected.", {
      evidence: [evidenceForRun(context, "child-directed", "No child signal.", {})],
    });
  }
  return warning("Child/age language was detected; human review must determine whether the service is child-directed and within DPDP s.9.", {
    evidence: [
      evidenceForRun(context, "child-directed", "Child-directedness signals.", {
        pages: context.pages
          .filter((page) => page.signals.childTerms.length > 0)
          .map((page) => page.finalUrl),
      }),
    ],
    humanReviewRequired: true,
  });
}

function childTracking(context: AuditContext): RuleOutcome {
  if (!hasChildSignal(context)) {
    return notApplicable("No child-directed processing indicator was detected.", {
      evidence: [evidenceForRun(context, "child-tracking", "No child signal.", {})],
    });
  }
  if (!hasBrowser(context)) {
    return notAssessed("Child-related tracking could not be tested without browser evidence.", {
      evidence: [evidenceForRun(context, "child-tracking", "Browser unavailable.", {})],
    });
  }
  const trackers = [
    ...trackerRequests(context, "initial"),
    ...trackerRequests(context, "afterAccept"),
  ];
  if (trackers.length > 0) {
    return warning("Tracking was observed in a context with child-related language; review whether it is directed at children.", {
      evidence: [
        evidenceForRun(context, "child-tracking", "Trackers in child-signal context.", {
          trackers,
        }),
      ],
      humanReviewRequired: true,
    });
  }
  return pass("No known third-party tracker was observed in the child-signal context.", {
    confidence: "medium",
    evidence: [evidenceForRun(context, "child-tracking", "No trackers in child context.", {})],
  });
}

export const CHILD_RULES: Record<string, TestEvaluator> = {
  "CHILD-001": ageNotice,
  "CHILD-002": parentalConsentWorkflow,
  "CHILD-003": childDirected,
  "CHILD-004": childTracking,
};
