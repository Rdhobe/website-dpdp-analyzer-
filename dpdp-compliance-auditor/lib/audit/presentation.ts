import { buildFindingGroups, ungroupedFindings } from "./groups";
import type {
  Confidence,
  FindingGroup,
  Severity,
  TestResult,
} from "./types";

export interface DisplayFinding {
  key: string;
  heading: string;
  linkedTestIds: string[];
  title: string;
  status: TestResult["status"];
  severity: Severity;
  confidence: Confidence;
  claimType: TestResult["claimType"];
  affectedUrls: string[];
  evidence: TestResult["evidence"];
  screenshots: TestResult["screenshots"];
  legalReferences: TestResult["legalReferences"];
  reasoning: string;
  remediation: string;
  verificationSteps: string;
  humanReviewRequired: boolean;
  knownLimitations: string;
}

export function displayFindingFromGroup(group: FindingGroup): DisplayFinding {
  const others = group.testIds.filter((id) => id !== group.primaryTestId);
  return {
    key: group.id,
    heading:
      others.length > 0
        ? `${group.primaryTestId} + ${others.length} related`
        : group.primaryTestId,
    linkedTestIds: group.testIds,
    title: group.title,
    status: group.status,
    severity: group.severity,
    confidence: group.confidence,
    claimType: group.claimType,
    affectedUrls: group.affectedUrls,
    evidence: group.evidence,
    screenshots: group.screenshots,
    legalReferences: group.legalReferences,
    reasoning: group.reasoning,
    remediation: group.remediation,
    verificationSteps: group.verificationSteps,
    humanReviewRequired: group.humanReviewRequired,
    knownLimitations: group.knownLimitations,
  };
}

export function displayFindingFromTest(test: TestResult): DisplayFinding {
  return {
    key: test.id,
    heading: test.testId,
    linkedTestIds: [test.testId],
    title: test.title,
    status: test.status,
    severity: test.severity,
    confidence: test.confidence,
    claimType: test.claimType,
    affectedUrls: test.affectedUrls,
    evidence: test.evidence,
    screenshots: test.screenshots,
    legalReferences: test.legalReferences,
    reasoning: test.reasoning,
    remediation: test.remediation,
    verificationSteps: test.verificationSteps,
    humanReviewRequired: test.humanReviewRequired,
    knownLimitations: test.knownLimitations,
  };
}

export function displayFindings(
  tests: TestResult[],
  groups?: FindingGroup[],
): DisplayFinding[] {
  const resolvedGroups = groups ?? buildFindingGroups(tests);
  return [
    ...resolvedGroups.map(displayFindingFromGroup),
    ...ungroupedFindings(tests).map(displayFindingFromTest),
  ];
}
