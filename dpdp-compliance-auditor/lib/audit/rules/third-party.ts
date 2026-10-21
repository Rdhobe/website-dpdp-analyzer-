import type { AuditContext, RuleOutcome, TestEvaluator } from "../types";
import {
  evidenceForRun,
  notApplicable,
  pass,
  primaryNoticePage,
  warning,
} from "./helpers";

function thirdPartyIndicators(context: AuditContext): RuleOutcome {
  const hosts = [...new Set(context.pages.flatMap((page) => page.thirdPartyHosts))];
  if (hosts.length === 0) {
    return notApplicable("No third-party static resource host was observed in the inspected pages.", {
      evidence: [evidenceForRun(context, "third-party", "No third-party hosts.", {})],
    });
  }
  const notice = primaryNoticePage(context);
  if (!notice) {
    return warning("Third-party hosts were observed but no notice was available to review processor/transfer disclosures.", {
      evidence: [evidenceForRun(context, "third-party", "Third-party hosts without notice.", { hosts })],
    });
  }
  if (notice.signals.thirdPartySignalCount > 0) {
    return pass("Third-party hosts were observed and the notice contains third-party/processor/transfer language.", {
      confidence: "medium",
      affectedUrls: [notice.finalUrl],
      evidence: [
        evidenceForRun(context, "third-party", "Third-party hosts and notice language.", {
          hosts,
          thirdPartyLanguageSignals: notice.signals.thirdPartySignalCount,
        }),
      ],
      limitations: "The notice is not required to list every hostname; processor roles and transfer context require review.",
    });
  }
  return warning("Third-party hosts were observed without third-party/processor/transfer language in the available notice.", {
    affectedUrls: [notice.finalUrl],
    evidence: [
      evidenceForRun(context, "third-party", "Third-party hosts and notice language.", {
        hosts,
        thirdPartyLanguageSignals: 0,
      }),
    ],
  });
}

export const THIRD_PARTY_RULES: Record<string, TestEvaluator> = {
  "THIRD-001": thirdPartyIndicators,
};
