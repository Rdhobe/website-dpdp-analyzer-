import { describe, expect, it } from "vitest";
import { computeSummary, deriveAuditOutcome } from "@/lib/audit/summary";
import type { AuditSummary, TestResult, TestStatus } from "@/lib/audit/types";

function summary(overrides: Partial<AuditSummary> = {}): AuditSummary {
  return {
    total: 75,
    pass: 0,
    fail: 0,
    warning: 0,
    needsReview: 0,
    notAssessed: 0,
    notApplicable: 0,
    automated: 0,
    humanReviewRequired: 0,
    categoryCounts: [],
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    coveragePercent: 0,
    coverage: {
      pageCrawl: { attempted: 1, succeeded: 1, failed: 0, ratio: 1 },
      siteDiscovery: {
        discoveredPages: 1,
        declaredUrls: 0,
        inventoryAvailable: false,
        ratio: 0,
      },
      testExecution: {
        executed: 0,
        applicable: 0,
        notApplicable: 0,
        total: 0,
        ratio: 0,
      },
      evidenceSufficiency: { sufficient: 0, total: 0, ratio: 0 },
    },
    pageCoverage: {
      pagesAttempted: 1,
      pagesSucceeded: 1,
      pagesFailed: 0,
      duplicatesSkipped: 0,
      outOfScopeSkipped: 0,
    },
    ...overrides,
  };
}

describe("deriveAuditOutcome", () => {
  it("reports a failed run when the audit did not complete", () => {
    const outcome = deriveAuditOutcome("failed", null);
    expect(outcome.level).toBe("failed");
    expect(outcome.tone).toBe("danger");
    expect(outcome.failCount).toBe(0);
  });

  it("treats a missing summary as inconclusive", () => {
    expect(deriveAuditOutcome("completed", null).level).toBe("failed");
  });

  it("marks the site not ready when any check failed", () => {
    const outcome = deriveAuditOutcome(
      "completed",
      summary({ fail: 2, pass: 16, warning: 12, needsReview: 10, notAssessed: 19 }),
    );
    expect(outcome.level).toBe("not_ready");
    expect(outcome.tone).toBe("danger");
    expect(outcome.headline).toContain("2 checks failed");
    expect(outcome.failCount).toBe(2);
  });

  it("uses the singular form for one failed check", () => {
    expect(deriveAuditOutcome("completed", summary({ fail: 1 })).headline).toContain(
      "1 check failed",
    );
  });

  it("flags warnings when nothing failed outright", () => {
    const outcome = deriveAuditOutcome("completed", summary({ warning: 3, pass: 10 }));
    expect(outcome.level).toBe("needs_attention");
    expect(outcome.tone).toBe("warning");
    expect(outcome.failCount).toBe(0);
  });

  it("is inconclusive when checks need review or were not assessed", () => {
    expect(deriveAuditOutcome("completed", summary({ needsReview: 4 })).level).toBe(
      "inconclusive",
    );
    expect(deriveAuditOutcome("completed", summary({ notAssessed: 6 })).level).toBe(
      "inconclusive",
    );
  });

  it("reports no failing checks when everything passed or was not applicable", () => {
    const outcome = deriveAuditOutcome(
      "completed",
      summary({ pass: 60, notApplicable: 15 }),
    );
    expect(outcome.level).toBe("no_failures");
    expect(outcome.tone).toBe("success");
    expect(outcome.detail).toContain("60 of 75");
  });

  it("notes partial coverage in the detail", () => {
    const outcome = deriveAuditOutcome("partial", summary({ fail: 1 }));
    expect(outcome.partial).toBe(true);
    expect(outcome.detail).toContain("part of the site");
  });

  it("counts critical and high severity non-pass results", () => {
    const outcome = deriveAuditOutcome(
      "completed",
      summary({
        warning: 2,
        severityCounts: { critical: 1, high: 3, medium: 4, low: 0, info: 0 },
      }),
    );
    expect(outcome.criticalOrHighCount).toBe(4);
  });
});

function result(status: TestStatus, withEvidence: boolean): TestResult {
  return {
    id: `finding_${status}_${Math.random().toString(36).slice(2)}`,
    testId: "X-001",
    title: "Example",
    category: "A",
    categoryName: "Example",
    status,
    severity: "medium",
    confidence: "medium",
    claimType: "potential_privacy_gap",
    affectedUrls: [],
    evidence: withEvidence
      ? [
          {
            id: "ev_1",
            kind: "html",
            summary: "example",
            pageUrl: "https://example.test/",
            data: {},
          },
        ]
      : [],
    screenshots: [],
    legalReferences: [],
    reasoning: "reason",
    remediation: "fix",
    verificationSteps: "verify",
    humanReviewRequired: false,
    timestamp: new Date().toISOString(),
    testVersion: "1.0.0",
    knownLimitations: "none",
  };
}

describe("computeSummary coverage metrics", () => {
  const stats = {
    pagesAttempted: 4,
    pagesSucceeded: 3,
    pagesFailed: 1,
    duplicatesSkipped: 1,
    outOfScopeSkipped: 0,
    blockedTargets: 0,
    maxDepthReached: 1,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };

  it("keeps page, discovery, execution and evidence measures independent", () => {
    const tests = [
      result("PASS", true),
      result("FAIL", true),
      result("NOT_ASSESSED", false),
      result("NOT_APPLICABLE", false),
    ];
    const computed = computeSummary(tests, stats, {
      robots: {
        url: "https://example.test/robots.txt",
        status: 200,
        contentType: "text/plain",
        bodyExcerpt: "User-agent: *",
        discoveredUrls: ["https://example.test/a", "https://example.test/b"],
        error: null,
      },
      sitemap: null,
    });

    expect(computed.coverage.pageCrawl).toMatchObject({
      attempted: 4,
      succeeded: 3,
      failed: 1,
    });
    expect(computed.coverage.siteDiscovery.declaredUrls).toBe(2);
    expect(computed.coverage.siteDiscovery.inventoryAvailable).toBe(true);
    expect(computed.coverage.testExecution).toMatchObject({
      executed: 2,
      applicable: 3,
      notApplicable: 1,
      total: 4,
    });
    expect(computed.coverage.evidenceSufficiency).toMatchObject({
      sufficient: 2,
      total: 4,
    });
    expect(computed.coveragePercent).toBe(75);
  });

  it("marks the site inventory unavailable when robots and sitemap are absent", () => {
    const computed = computeSummary([result("PASS", true)], stats);
    expect(computed.coverage.siteDiscovery.inventoryAvailable).toBe(false);
    expect(computed.coverage.siteDiscovery.ratio).toBe(0);
  });
});
