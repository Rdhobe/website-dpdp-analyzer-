import {
  CATEGORIES,
  type AuditCoverage,
  type AuditOutcome,
  type AuditStatus,
  type AuditSummary,
  type CategoryCode,
  type CategorySummary,
  type CrawlStats,
  type ResourceDiscoveryEvidence,
  type SeveritySummary,
  type TestResult,
} from "./types";

const CATEGORY_CODES = Object.keys(CATEGORIES) as CategoryCode[];

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function deriveAuditOutcome(
  status: AuditStatus,
  summary: AuditSummary | null,
): AuditOutcome {
  if (status === "requires_credentials") {
    return {
      level: "credentials_required",
      tone: "caution",
      headline: "Sign-in required to continue",
      detail:
        "The site required a sign-in before its content could be audited, so no tests were run. Provide the username and password for a single sign-in form to continue.",
      failCount: 0,
      warningCount: 0,
      needsReviewCount: 0,
      notAssessedCount: 0,
      criticalOrHighCount: 0,
      partial: false,
    };
  }

  if (status === "failed" || !summary) {
    return {
      level: "failed",
      tone: "danger",
      headline: "Audit did not complete",
      detail:
        "No pass or fail conclusion can be drawn from this run. Review the collection errors and re-run the audit.",
      failCount: 0,
      warningCount: 0,
      needsReviewCount: 0,
      notAssessedCount: 0,
      criticalOrHighCount: 0,
      partial: status === "partial",
    };
  }

  const partial = status === "partial";
  const partialNote = partial
    ? " Some pages could not be fetched, so these results cover only part of the site."
    : "";
  const criticalOrHighCount =
    summary.severityCounts.critical + summary.severityCounts.high;

  if (summary.fail > 0) {
    return {
      level: "not_ready",
      tone: "danger",
      headline: `${plural(summary.fail, "check")} failed`,
      detail:
        `${summary.fail} of ${summary.total} checks failed and ${summary.warning} raised warnings. ` +
        `Address the failed checks before relying on this site's readiness. This is a readiness signal, not a compliance verdict.` +
        partialNote,
      failCount: summary.fail,
      warningCount: summary.warning,
      needsReviewCount: summary.needsReview,
      notAssessedCount: summary.notAssessed,
      criticalOrHighCount,
      partial,
    };
  }

  if (summary.warning > 0) {
    return {
      level: "needs_attention",
      tone: "warning",
      headline: `No failed checks, but ${plural(summary.warning, "warning")}`,
      detail:
        `No check failed outright. ${summary.warning} check(s) raised warnings that should be reviewed before treating the site as ready.` +
        partialNote,
      failCount: 0,
      warningCount: summary.warning,
      needsReviewCount: summary.needsReview,
      notAssessedCount: summary.notAssessed,
      criticalOrHighCount,
      partial,
    };
  }

  if (summary.needsReview > 0 || summary.notAssessed > 0) {
    return {
      level: "inconclusive",
      tone: "caution",
      headline: "Inconclusive — no failures, but checks remain unverified",
      detail:
        `No check failed or warned. However ${summary.needsReview} check(s) need human review and ${summary.notAssessed} could not be assessed, so a pass cannot be confirmed.` +
        partialNote,
      failCount: 0,
      warningCount: 0,
      needsReviewCount: summary.needsReview,
      notAssessedCount: summary.notAssessed,
      criticalOrHighCount,
      partial,
    };
  }

  return {
    level: "no_failures",
    tone: "success",
    headline: "No failing automated checks",
    detail:
      `${summary.pass} of ${summary.total} checks passed, with no failures, warnings, or unverified checks; ${summary.notApplicable} were not applicable. ` +
      `This confirms only the automated checks that ran against the crawled pages — it is not a certification of DPDP compliance.` +
      partialNote,
    failCount: 0,
    warningCount: 0,
    needsReviewCount: 0,
    notAssessedCount: 0,
    criticalOrHighCount,
    partial,
  };
}

export interface DiscoveryInput {
  robots: ResourceDiscoveryEvidence | null;
  sitemap: ResourceDiscoveryEvidence | null;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function computeAuditCoverage(
  tests: TestResult[],
  crawlStats: CrawlStats,
  discovery: DiscoveryInput = { robots: null, sitemap: null },
): AuditCoverage {
  const total = tests.length;
  const notAssessed = tests.filter((test) => test.status === "NOT_ASSESSED").length;
  const notApplicable = tests.filter((test) => test.status === "NOT_APPLICABLE").length;
  const applicable = total - notApplicable;
  const executed = total - notAssessed - notApplicable;
  const sufficient = tests.filter(
    (test) =>
      test.evidence.length > 0 &&
      (test.status === "PASS" ||
        test.status === "FAIL" ||
        test.status === "WARNING" ||
        test.status === "NEEDS_REVIEW"),
  ).length;

  const declaredUrls = new Set<string>([
    ...(discovery.robots?.discoveredUrls ?? []),
    ...(discovery.sitemap?.discoveredUrls ?? []),
  ]);
  const inventoryAvailable = Boolean(
    discovery.robots?.status === 200 || discovery.sitemap?.status === 200,
  );
  const discoveredPages = crawlStats.pagesSucceeded;

  return {
    pageCrawl: {
      attempted: crawlStats.pagesAttempted,
      succeeded: crawlStats.pagesSucceeded,
      failed: crawlStats.pagesFailed,
      ratio: ratio(crawlStats.pagesSucceeded, crawlStats.pagesAttempted),
    },
    siteDiscovery: {
      discoveredPages,
      declaredUrls: declaredUrls.size,
      inventoryAvailable,
      ratio: inventoryAvailable
        ? Math.min(1, ratio(discoveredPages, declaredUrls.size))
        : 0,
    },
    testExecution: {
      executed,
      applicable,
      notApplicable,
      total,
      ratio: ratio(executed, applicable),
    },
    evidenceSufficiency: {
      sufficient,
      total,
      ratio: ratio(sufficient, total),
    },
  };
}

export function computeSummary(
  tests: TestResult[],
  crawlStats: CrawlStats,
  discovery: DiscoveryInput = { robots: null, sitemap: null },
): AuditSummary {
  const categoryCounts: CategorySummary[] = CATEGORY_CODES.map((category) => {
    const results = tests.filter((test) => test.category === category);
    return {
      category,
      name: CATEGORIES[category],
      pass: results.filter((test) => test.status === "PASS").length,
      fail: results.filter((test) => test.status === "FAIL").length,
      warning: results.filter((test) => test.status === "WARNING").length,
      needsReview: results.filter((test) => test.status === "NEEDS_REVIEW").length,
      notAssessed: results.filter((test) => test.status === "NOT_ASSESSED").length,
      notApplicable: results.filter((test) => test.status === "NOT_APPLICABLE").length,
      total: results.length,
    };
  });

  const severityCounts: SeveritySummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const test of tests) {
    if (test.status === "PASS" || test.status === "NOT_APPLICABLE") continue;
    severityCounts[test.severity] += 1;
  }

  const total = tests.length;
  const notAssessed = tests.filter((test) => test.status === "NOT_ASSESSED").length;
  const assessed = total - notAssessed;

  return {
    total,
    pass: tests.filter((test) => test.status === "PASS").length,
    fail: tests.filter((test) => test.status === "FAIL").length,
    warning: tests.filter((test) => test.status === "WARNING").length,
    needsReview: tests.filter((test) => test.status === "NEEDS_REVIEW").length,
    notAssessed,
    notApplicable: tests.filter((test) => test.status === "NOT_APPLICABLE").length,
    automated: tests.filter(
      (test) => test.status !== "NEEDS_REVIEW" && test.status !== "NOT_ASSESSED",
    ).length,
    humanReviewRequired: tests.filter((test) => test.humanReviewRequired).length,
    categoryCounts,
    severityCounts,
    coveragePercent: total === 0 ? 0 : Math.round((assessed / total) * 100),
    coverage: computeAuditCoverage(tests, crawlStats, discovery),
    pageCoverage: {
      pagesAttempted: crawlStats.pagesAttempted,
      pagesSucceeded: crawlStats.pagesSucceeded,
      pagesFailed: crawlStats.pagesFailed,
      duplicatesSkipped: crawlStats.duplicatesSkipped,
      outOfScopeSkipped: crawlStats.outOfScopeSkipped,
    },
  };
}
