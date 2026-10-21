import type { RuleOutcome, TestEvaluator } from "../types";
import { evidenceForRun, needsReview } from "./helpers";

function organizationalReview(testId: string): TestEvaluator {
  return (context): RuleOutcome =>
    needsReview(
      "Organizational evidence was not supplied or reviewed in this audit. A public website cannot prove or disprove this internal control.",
      {
        evidence: [
          evidenceForRun(context, "organizational-evidence", `No organizational evidence supplied for ${testId}.`, {
            testId,
            evidenceSupplied: context.organizationalEvidence[testId] ?? false,
            requiredEvidence:
              "The organization must provide the policy, record, or procedure named by the test before this can be assessed.",
          }),
        ],
        remediation:
          "Provide the relevant policy, register, contract, procedure, or test record to a reviewer. Do not treat the absence of public evidence as a failure.",
        verificationSteps:
          "Review the supplied evidence against the test definition and record the reviewer, date, and conclusion.",
      },
    );
}

export const ORG_RULES: Record<string, TestEvaluator> = {
  "ORG-001": organizationalReview("ORG-001"),
  "ORG-002": organizationalReview("ORG-002"),
  "ORG-003": organizationalReview("ORG-003"),
  "ORG-004": organizationalReview("ORG-004"),
  "ORG-005": organizationalReview("ORG-005"),
  "ORG-006": organizationalReview("ORG-006"),
  "ORG-007": organizationalReview("ORG-007"),
  "ORG-008": organizationalReview("ORG-008"),
  "ORG-009": organizationalReview("ORG-009"),
  "ORG-010": organizationalReview("ORG-010"),
};
