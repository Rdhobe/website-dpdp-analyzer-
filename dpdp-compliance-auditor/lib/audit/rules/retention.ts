import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  evidenceForRun,
  notAssessed,
  pass,
  primaryNoticePage,
  warning,
} from "./helpers";

function retentionIndicators(context: AuditContext): RuleOutcome {
  const notice = primaryNoticePage(context);
  if (!notice) {
    return notAssessed("No notice was available to inspect retention and deletion indicators.", {
      evidence: [evidenceForRun(context, "retention", "No notice.", {})],
    });
  }
  if (notice.signals.retentionSignalCount > 0) {
    return pass("Retention/deletion language was detected in the notice.", {
      confidence: "low",
      affectedUrls: [notice.finalUrl],
      evidence: [
        evidenceForRun(context, "retention", "Retention language.", {
          signalCount: notice.signals.retentionSignalCount,
        }),
      ],
      limitations: "Notice language does not prove that deletion occurs; organizational evidence is required.",
      humanReviewRequired: true,
    });
  }
  return warning("No familiar retention/deletion language was detected in the notice.", {
    affectedUrls: [notice.finalUrl],
    evidence: [
      evidenceForRun(context, "retention", "No retention language.", {
        excerpt: notice.textExcerpt.slice(0, 2000),
      }),
    ],
  });
}

export const RETENTION_RULES: Record<string, TestEvaluator> = {
  "RETENTION-001": retentionIndicators,
};
