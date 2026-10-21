import { randomUUID } from "node:crypto";
import { performLogin, type LoginCredentials, type StorageState } from "./auth";
import { collectBrowserEvidence } from "./browser";
import { crawlSite, type CrawlResult } from "./crawler";
import { createFindingId } from "./evidence";
import { buildFindingGroups } from "./groups";
import {
  COMMENCEMENT_SUMMARY,
  LEGAL_FRAMEWORK_VERSION,
  resolveLegalReferences,
} from "./legal";
import {
  detectLoginWall,
  findLoginSurfaces,
  type LoginWallDetection,
} from "./login-wall";
import { REGISTRY_VERSION, TEST_REGISTRY } from "./registry";
import { ALL_RULES } from "./rules";
import {
  attachFindingScreenshots,
  captureVisualEvidence,
  screenshotDirFor,
} from "./screenshots";
import { computeSummary } from "./summary";
import {
  CATEGORIES,
  type AuditAuthState,
  type AuditConfig,
  type AuditContext,
  type AuditProgressEvent,
  type AuditRun,
  type AuditStatus,
  type BrowserEvidence,
  type CrawlConfig,
  type CrawlStats,
  type EvidenceItem,
  type RuleOutcome,
  type TestResult,
  type TestStatus,
  type VisualEvidence,
} from "./types";

export const ENGINE_VERSION = "0.1.0";

export const ENGINE_TIME_BUDGET_MS = 5 * 60 * 1000;

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  timeBudgetMs: ENGINE_TIME_BUDGET_MS,
  timeoutMs: 10_000,
  maxBytes: 2_000_000,
  maxRedirects: 5,
  sameOriginOnly: true,
  browserEnabled: false,
  screenshots: false,
  crawlDelayMs: 250,
};

export function defaultAuditConfig(
  overrides: Partial<AuditConfig> = {},
): AuditConfig {
  return {
    ...DEFAULT_CRAWL_CONFIG,
    authorized: true,
    notes: null,
    ...overrides,
  };
}

export interface RunAuditInput {
  runId?: string;
  targetUrl: string;
  config: AuditConfig;
  allowPrivateNetworks?: boolean;
  browserEvidence?: BrowserEvidence;
  credentials?: LoginCredentials;
  onProgress?: (event: AuditProgressEvent) => void;
}

function emptyCrawlStats(): CrawlStats {
  const now = new Date().toISOString();
  return {
    pagesAttempted: 0,
    pagesSucceeded: 0,
    pagesFailed: 0,
    duplicatesSkipped: 0,
    outOfScopeSkipped: 0,
    blockedTargets: 0,
    maxDepthReached: 0,
    startedAt: now,
    finishedAt: now,
  };
}

function failedRun(
  runId: string,
  targetUrl: string,
  config: AuditConfig,
  error: string,
  auth: AuditAuthState | null = null,
  diagnostics: string[] = [],
): AuditRun {
  const now = new Date().toISOString();
  return {
    id: runId,
    status: "failed",
    targetUrl,
    finalOrigin: null,
    createdAt: now,
    startedAt: now,
    completedAt: now,
    config,
    engineVersion: ENGINE_VERSION,
    registryVersion: REGISTRY_VERSION,
    legalFrameworkVersion: LEGAL_FRAMEWORK_VERSION,
    pages: [],
    tests: [],
    findings: [],
    auth,
    summary: null,
    crawlStats: emptyCrawlStats(),
    robots: null,
    sitemap: null,
    browser: null,
    visual: null,
    limitations: [
      "The audit could not start or complete. No compliance conclusion should be drawn from this run.",
      ...diagnostics,
    ],
    errors: [error],
  };
}

function requiresCredentialsRun(
  runId: string,
  targetUrl: string,
  config: AuditConfig,
  crawl: CrawlResult,
  detection: LoginWallDetection,
  startedAt: string,
): AuditRun {
  return {
    id: runId,
    status: "requires_credentials",
    targetUrl,
    finalOrigin: crawl.startPage
      ? new URL(crawl.startPage.finalUrl).origin
      : null,
    createdAt: startedAt,
    startedAt,
    completedAt: new Date().toISOString(),
    config,
    engineVersion: ENGINE_VERSION,
    registryVersion: REGISTRY_VERSION,
    legalFrameworkVersion: LEGAL_FRAMEWORK_VERSION,
    pages: crawl.pages,
    tests: [],
    findings: [],
    auth: {
      loginWallDetected: true,
      loginSurfaceDetected: true,
      loginUrl: detection.loginUrl,
      authenticated: false,
      failureReason: null,
    },
    summary: null,
    crawlStats: crawl.stats,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    browser: null,
    visual: null,
    limitations: [
      detection.reason ??
        "The site requires sign-in before its content can be audited.",
      "No tests were executed because only the sign-in page was reachable.",
      "Credentials are used only to sign in for this run and are not stored with the report.",
      "Only single username/password forms are supported. MFA, CAPTCHA, and single sign-on are not bypassed.",
      ...crawl.limitations,
    ],
    errors: crawl.errors,
  };
}

function severityFor(
  status: TestStatus,
  outcome: RuleOutcome,
  fallback: TestResult["severity"],
): TestResult["severity"] {
  if (outcome.severity) return outcome.severity;
  if (status === "PASS" || status === "NOT_APPLICABLE" || status === "NOT_ASSESSED") {
    return "info";
  }
  return fallback;
}

async function evaluateRegistry(
  context: AuditContext,
  onProgress?: (event: AuditProgressEvent) => void,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const [index, definition] of TEST_REGISTRY.entries()) {
    onProgress?.({
      message: `Evaluating test ${index + 1}/${TEST_REGISTRY.length}: ${definition.id} — ${definition.name}`,
      level: "info",
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    const evaluator = ALL_RULES[definition.id];
    let outcome: RuleOutcome;
    try {
      outcome = evaluator
        ? evaluator(context)
        : {
            status: "NOT_ASSESSED",
            confidence: "low",
            reasoning: "No deterministic evaluator is registered for this test.",
            limitations: "The test definition exists but execution is not implemented.",
          };
    } catch (error) {
      outcome = {
        status: "NOT_ASSESSED",
        confidence: "low",
        reasoning: "The test evaluator threw an error and was not treated as a pass.",
        limitations: `Evaluator error: ${error instanceof Error ? error.message : "unknown error"}`,
        humanReviewRequired: true,
      };
    }

    const evidence: EvidenceItem[] = outcome.evidence ?? [];
    const status = outcome.status;
    results.push({
      id: createFindingId(definition.id),
      testId: definition.id,
      title: definition.name,
      category: definition.category,
      categoryName: CATEGORIES[definition.category],
      status,
      severity: severityFor(status, outcome, definition.severityPolicy.defaultSeverity),
      confidence: outcome.confidence ?? (status === "PASS" ? "high" : "medium"),
      claimType: definition.claimType,
      affectedUrls: [...new Set(outcome.affectedUrls ?? [])],
      evidence,
      screenshots: [],
      legalReferences: resolveLegalReferences(definition.legalReferenceIds),
      reasoning: outcome.reasoning,
      remediation: outcome.remediation ?? definition.remediationTemplate,
      verificationSteps:
        outcome.verificationSteps ?? definition.verificationProcedure,
      humanReviewRequired:
        outcome.humanReviewRequired ??
        (status === "NEEDS_REVIEW" || definition.category === "J"),
      timestamp: context.now,
      testVersion: definition.version,
      knownLimitations: outcome.limitations ?? definition.limitations,
    });
    onProgress?.({
      message: `Completed test ${index + 1}/${TEST_REGISTRY.length}: ${definition.id} — ${status}`,
      level: "info",
    });
  }
  return results;
}

const SEVERITY_RANK: Record<TestResult["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const STATUS_RANK: Record<TestStatus, number> = {
  FAIL: 0,
  WARNING: 1,
  NEEDS_REVIEW: 2,
  NOT_ASSESSED: 3,
  PASS: 4,
  NOT_APPLICABLE: 5,
};

export async function runAudit(input: RunAuditInput): Promise<AuditRun> {
  const runId = input.runId ?? `audit_${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + input.config.timeBudgetMs;
  const budgetMinutes = Math.max(1, Math.round(input.config.timeBudgetMs / 60_000));
  let auth: AuditAuthState | null = null;
  let cookieHeader: string | null = null;
  let storageState: StorageState | null = null;

  if (input.credentials) {
    input.onProgress?.({ message: "Signing in with the supplied credentials...", level: "info" });
    const login = await performLogin({
      targetUrl: input.targetUrl,
      credentials: input.credentials,
      timeoutMs: input.config.timeoutMs,
    });
    for (const [index, step] of login.steps.entries()) {
      const last = index === login.steps.length - 1;
      input.onProgress?.({
        message: step,
        level: last ? (login.ok ? "success" : "error") : "info",
      });
    }
    auth = {
      loginWallDetected: true,
      loginSurfaceDetected: true,
      loginUrl: login.loginUrl,
      authenticated: login.ok,
      failureReason: login.ok ? null : login.reason,
      diagnostics: login.steps,
    };
    if (!login.ok) {
      return failedRun(
        runId,
        input.targetUrl,
        input.config,
        login.reason ?? "The sign-in attempt failed.",
        auth,
        login.steps,
      );
    }
    cookieHeader = login.cookieHeader || null;
    storageState = login.storageState;
  }

  let crawl: CrawlResult;

  input.onProgress?.({ message: `Starting crawl of ${input.targetUrl}`, level: "info" });

  try {
    crawl = await crawlSite({
      ...input.config,
      targetUrl: input.targetUrl,
      allowPrivateNetworks: input.allowPrivateNetworks,
      cookieHeader,
      deadline,
      onProgress: (event) => input.onProgress?.(event),
    });
  } catch (error) {
    return failedRun(
      runId,
      input.targetUrl,
      input.config,
      error instanceof Error ? error.message : "The crawl failed.",
      auth,
    );
  }

  if (!input.credentials) {
    const loginWall = detectLoginWall(crawl.pages);
    if (loginWall.loginWallDetected) {
      input.onProgress?.({
        message: `Login wall detected at ${loginWall.loginUrl ?? input.targetUrl}. Waiting for credentials to continue.`,
        level: "warning",
      });
      return requiresCredentialsRun(
        runId,
        input.targetUrl,
        input.config,
        crawl,
        loginWall,
        startedAt,
      );
    }
    const surfaces = findLoginSurfaces(crawl.pages);
    if (surfaces.loginSurfaceDetected) {
      input.onProgress?.({
        message: `Sign-in area found at ${surfaces.loginUrls[0] ?? "a login page"}; continuing with the public pages.`,
        level: "warning",
      });
      auth = {
        loginWallDetected: false,
        loginSurfaceDetected: true,
        loginUrl: surfaces.loginUrls[0] ?? null,
        authenticated: false,
        failureReason: null,
      };
    }
  }

  input.onProgress?.({
    message: `Crawl finished: ${crawl.stats.pagesSucceeded} page(s) fetched, ${crawl.stats.pagesFailed} failed.`,
    level: crawl.stats.pagesFailed > 0 ? "warning" : "success",
    attempted: crawl.stats.pagesAttempted,
    succeeded: crawl.stats.pagesSucceeded,
    failed: crawl.stats.pagesFailed,
    pending: 0,
  });

  const timeRemaining = () => deadline - Date.now();
  const skippedForTime: string[] = [];

  let browser: BrowserEvidence | null = input.browserEvidence ?? null;
  if (input.config.browserEnabled && !browser) {
    if (timeRemaining() > 5_000) {
      input.onProgress?.({ message: "Collecting browser evidence...", level: "info" });
      browser = await collectBrowserEvidence({
        targetUrl: crawl.startPage?.finalUrl ?? input.targetUrl,
        timeoutMs: input.config.timeoutMs,
        screenshots: input.config.screenshots,
        screenshotDir: screenshotDirFor(runId),
        runId,
        storageState,
      });
    } else {
      skippedForTime.push(
        `Browser checks were skipped because the ${budgetMinutes}-minute crawl time limit was reached.`,
      );
    }
  }

  let visual: VisualEvidence | null = null;
  if (input.config.screenshots) {
    if (timeRemaining() > 5_000) {
      input.onProgress?.({ message: "Capturing finding screenshots...", level: "info" });
      visual = await captureVisualEvidence({
        runId,
        pageUrls: crawl.pages.filter((page) => page.ok).map((page) => page.finalUrl),
        timeoutMs: input.config.timeoutMs,
        maxPages: 10,
        onProgress: (message) => input.onProgress?.({ message, level: "info" }),
        storageState,
      });
    } else {
      skippedForTime.push(
        `Screenshots were skipped because the ${budgetMinutes}-minute crawl time limit was reached.`,
      );
    }
  }

  const authLimitations = auth?.authenticated
    ? [
        "This audit signed in with credentials supplied for this run. Credential values are not stored with the report.",
      ]
    : auth?.loginSurfaceDetected
      ? [
          `Sign-in areas were found (${auth.loginUrl ?? "a login page"}), but this run was unauthenticated, so pages behind the login were not audited. Provide credentials if you are authorized to audit the signed-in experience.`,
        ]
      : [];

  const limitations = [
    ...crawl.limitations,
    ...(browser?.limitations ?? []),
    ...(visual?.limitations ?? []),
    ...skippedForTime,
    ...authLimitations,
    COMMENCEMENT_SUMMARY,
    "The engine does not provide legal advice or certification. Findings with human-review flags require a qualified reviewer.",
  ];

  const context: AuditContext = {
    targetUrl: input.targetUrl,
    pages: crawl.pages,
    startPage: crawl.startPage,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    browser,
    crawlStats: crawl.stats,
    config: input.config,
    limitations,
    errors: crawl.errors,
    organizationalEvidence: {},
    now: new Date().toISOString(),
  };

  input.onProgress?.({ message: "Evaluating deterministic tests...", level: "info" });
  const tests = attachFindingScreenshots(
    await evaluateRegistry(context, input.onProgress),
    visual,
  );
  const findings = tests
    .filter(
      (test) =>
        test.status === "FAIL" ||
        test.status === "WARNING" ||
        test.status === "NEEDS_REVIEW",
    )
    .sort((a, b) => {
      const status = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (status !== 0) return status;
      const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (severity !== 0) return severity;
      return a.testId.localeCompare(b.testId);
    });

  const noUsablePages = crawl.pages.length === 0 || crawl.stats.pagesSucceeded === 0;
  const errors = [...crawl.errors];

  if (noUsablePages && crawl.timeLimitReached) {
    errors.push(
      `No page loaded successfully within the ${budgetMinutes}-minute time limit. The site may be loading too slowly; the audit stopped at the crawler limit.`,
    );
  }

  const status: AuditStatus = noUsablePages
    ? "failed"
    : crawl.timeLimitReached || crawl.stats.pagesFailed > 0
      ? "partial"
      : "completed";

  return {
    id: runId,
    status,
    targetUrl: input.targetUrl,
    finalOrigin: crawl.startPage
      ? new URL(crawl.startPage.finalUrl).origin
      : null,
    createdAt: startedAt,
    startedAt,
    completedAt: new Date().toISOString(),
    config: input.config,
    engineVersion: ENGINE_VERSION,
    registryVersion: REGISTRY_VERSION,
    legalFrameworkVersion: LEGAL_FRAMEWORK_VERSION,
    pages: crawl.pages,
    tests,
    findings,
    findingGroups: buildFindingGroups(tests),
    auth,
    summary: computeSummary(tests, crawl.stats, {
      robots: crawl.robots,
      sitemap: crawl.sitemap,
    }),
    crawlStats: crawl.stats,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    browser,
    visual,
    limitations,
    errors,
  };
}
