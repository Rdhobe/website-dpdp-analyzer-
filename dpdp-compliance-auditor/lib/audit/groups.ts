import type {
  FindingGroup,
  Severity,
  TestResult,
  TestStatus,
} from "./types";

const STATUS_RANK: Record<TestStatus, number> = {
  FAIL: 0,
  WARNING: 1,
  NEEDS_REVIEW: 2,
  NOT_ASSESSED: 3,
  PASS: 4,
  NOT_APPLICABLE: 5,
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const FINDING_STATUSES: TestStatus[] = ["FAIL", "WARNING", "NEEDS_REVIEW"];

interface GroupDefinition {
  key: string;
  title: string;
  primaryTestId: string;
  testIds: string[];
}

const GROUP_DEFINITIONS: GroupDefinition[] = [
  {
    key: "privacy-notice",
    title: "Privacy notice missing or unreachable",
    primaryTestId: "NOTICE-001",
    testIds: ["NOTICE-001", "CRAWL-002"],
  },
  {
    key: "rights-mechanism",
    title: "Data-Principal rights mechanism",
    primaryTestId: "RIGHTS-002",
    testIds: ["RIGHTS-002", "RIGHTS-001", "CRAWL-005"],
  },
  {
    key: "grievance-mechanism",
    title: "Grievance and contact mechanism",
    primaryTestId: "RIGHTS-003",
    testIds: ["RIGHTS-003", "RIGHTS-004", "CRAWL-004"],
  },
  {
    key: "consent-controls",
    title: "Consent and cookie controls",
    primaryTestId: "CONSENT-001",
    testIds: ["CONSENT-001", "CONSENT-002", "CONSENT-009", "CRAWL-003"],
  },
];

export const GROUPED_TEST_IDS = new Set(
  GROUP_DEFINITIONS.flatMap((definition) => definition.testIds),
);

function worstStatus(members: TestResult[]): TestStatus {
  return [...members].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  )[0]?.status ?? "NOT_ASSESSED";
}

function worstSeverity(members: TestResult[]): Severity {
  const findings = members.filter((member) =>
    FINDING_STATUSES.includes(member.status),
  );
  const pool = findings.length > 0 ? findings : members;
  return [...pool].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )[0]?.severity ?? "info";
}

function orderMembers(
  definition: GroupDefinition,
  tests: TestResult[],
): TestResult[] {
  const ordered: TestResult[] = [];
  for (const testId of [definition.primaryTestId, ...definition.testIds]) {
    const member = tests.find((test) => test.testId === testId);
    if (member && !ordered.includes(member)) ordered.push(member);
  }
  return ordered;
}

export function buildFindingGroups(tests: TestResult[]): FindingGroup[] {
  const groups: FindingGroup[] = [];

  for (const definition of GROUP_DEFINITIONS) {
    const members = orderMembers(definition, tests);
    if (members.length === 0) continue;
    const hasFinding = members.some((member) =>
      FINDING_STATUSES.includes(member.status),
    );
    if (!hasFinding) continue;

    const primary =
      members.find((member) => member.testId === definition.primaryTestId) ??
      members[0];
    const statusSummary = members
      .map((member) => `${member.testId} ${member.status}`)
      .join(", ");

    const evidence = members.flatMap((member) => member.evidence);
    const screenshots = [
      ...new Map(
        members
          .flatMap((member) => member.screenshots)
          .map((shot) => [shot.name, shot] as const),
      ).values(),
    ];
    const legalReferences = [
      ...new Map(
        members
          .flatMap((member) => member.legalReferences)
          .map((reference) => [reference.id, reference] as const),
      ).values(),
    ];

    groups.push({
      id: `group_${definition.key}`,
      title: definition.title,
      primaryTestId: definition.primaryTestId,
      testIds: members.map((member) => member.testId),
      status: worstStatus(members),
      severity: worstSeverity(members),
      confidence: primary.confidence,
      claimType: primary.claimType,
      affectedUrls: [...new Set(members.flatMap((member) => member.affectedUrls))],
      evidence,
      screenshots,
      legalReferences,
      reasoning: `${primary.reasoning} Consolidated finding — this issue is reported by ${members.length} related checks (${statusSummary}).`,
      remediation: primary.remediation,
      verificationSteps: primary.verificationSteps,
      humanReviewRequired: members.some((member) => member.humanReviewRequired),
      knownLimitations: primary.knownLimitations,
    });
  }

  return groups;
}

export function ungroupedFindings(tests: TestResult[]): TestResult[] {
  return tests.filter(
    (test) =>
      FINDING_STATUSES.includes(test.status) &&
      !GROUPED_TEST_IDS.has(test.testId),
  );
}
