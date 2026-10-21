import { describe, expect, it } from "vitest";
import { buildFindingGroups, ungroupedFindings } from "@/lib/audit/groups";
import { displayFindings } from "@/lib/audit/presentation";
import type { CategoryCode, TestResult } from "@/lib/audit/types";

function testResult(
  testId: string,
  overrides: Partial<TestResult> = {},
): TestResult {
  const category = (overrides.category ?? "A") as CategoryCode;
  return {
    id: `finding_${testId}`,
    testId,
    title: `${testId} title`,
    category,
    categoryName: "Example",
    status: "FAIL",
    severity: "medium",
    confidence: "medium",
    claimType: "potential_privacy_gap",
    affectedUrls: [`https://example.test/${testId}`],
    evidence: [],
    screenshots: [],
    legalReferences: [],
    reasoning: `${testId} reasoning`,
    remediation: `${testId} remediation`,
    verificationSteps: `${testId} verification`,
    humanReviewRequired: false,
    timestamp: new Date().toISOString(),
    testVersion: "1.0.0",
    knownLimitations: "none",
    ...overrides,
  };
}

describe("finding groups", () => {
  it("consolidates related tests into a single group", () => {
    const tests = [testResult("NOTICE-001"), testResult("CRAWL-002")];
    const groups = buildFindingGroups(tests);
    expect(groups).toHaveLength(1);
    expect(groups[0].testIds).toEqual(["NOTICE-001", "CRAWL-002"]);
    expect(groups[0].primaryTestId).toBe("NOTICE-001");
    expect(ungroupedFindings(tests)).toHaveLength(0);
  });

  it("omits groups whose members are all non-findings", () => {
    const tests = [
      testResult("NOTICE-001", { status: "PASS" }),
      testResult("CRAWL-002", { status: "NOT_ASSESSED" }),
    ];
    expect(buildFindingGroups(tests)).toHaveLength(0);
  });

  it("keeps unrelated findings separate and orders primary first", () => {
    const tests = [
      testResult("CRAWL-005"),
      testResult("RIGHTS-001"),
      testResult("RIGHTS-002"),
      testResult("SEC-002"),
    ];
    const groups = buildFindingGroups(tests);
    const rights = groups.find((group) => group.primaryTestId === "RIGHTS-002");
    expect(rights?.testIds[0]).toBe("RIGHTS-002");
    expect(rights?.testIds).toContain("CRAWL-005");
    const ungrouped = ungroupedFindings(tests).map((test) => test.testId);
    expect(ungrouped).toEqual(["SEC-002"]);
  });

  it("derives the worst status and severity across members", () => {
    const tests = [
      testResult("CONSENT-001", { status: "WARNING", severity: "medium" }),
      testResult("CONSENT-002", { status: "FAIL", severity: "high" }),
      testResult("CONSENT-009", { status: "NEEDS_REVIEW", severity: "low" }),
      testResult("CRAWL-003", { status: "PASS", severity: "low" }),
    ];
    const group = buildFindingGroups(tests)[0];
    expect(group.status).toBe("FAIL");
    expect(group.severity).toBe("high");
    expect(group.humanReviewRequired).toBe(false);
  });

  it("exposes consolidated findings through the presentation layer", () => {
    const tests = [testResult("NOTICE-001"), testResult("CRAWL-002"), testResult("SEC-002")];
    const display = displayFindings(tests);
    expect(display).toHaveLength(2);
    const grouped = display.find((finding) => finding.linkedTestIds.length > 1);
    expect(grouped?.heading).toBe("NOTICE-001 + 1 related");
    expect(grouped?.linkedTestIds).toEqual(["NOTICE-001", "CRAWL-002"]);
  });
});
