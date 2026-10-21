import { defaultAuditConfig, runAudit } from "@/lib/audit/runner";
import type {
  AuditConfig,
  AuditContext,
  BrowserEvidence,
  BrowserSnapshot,
  CrawlStats,
  FormEvidence,
  NetworkRequestEvidence,
  PageEvidence,
  PageSignals,
} from "@/lib/audit/types";
import { startFixtureServer, type FixtureSite, type RunningFixture } from "./fixture-server";

export function testConfig(overrides: Partial<AuditConfig> = {}): AuditConfig {
  return defaultAuditConfig({
    timeBudgetMs: 30_000,
    timeoutMs: 5_000,
    maxBytes: 500_000,
    maxRedirects: 3,
    crawlDelayMs: 0,
    browserEnabled: false,
    screenshots: false,
    ...overrides,
  });
}

export async function withFixture<T>(
  site: FixtureSite,
  run: (fixture: RunningFixture) => Promise<T>,
): Promise<T> {
  const fixture = await startFixtureServer(site);
  try {
    return await run(fixture);
  } finally {
    await fixture.close();
  }
}

export function crawlStats(overrides: Partial<CrawlStats> = {}): CrawlStats {
  const now = new Date().toISOString();
  return {
    pagesAttempted: 1,
    pagesSucceeded: 1,
    pagesFailed: 0,
    duplicatesSkipped: 0,
    outOfScopeSkipped: 0,
    blockedTargets: 0,
    maxDepthReached: 0,
    startedAt: now,
    finishedAt: now,
    ...overrides,
  };
}

export function makeContext(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    targetUrl: "https://example.test/",
    pages: [],
    startPage: null,
    robots: null,
    sitemap: null,
    browser: null,
    crawlStats: crawlStats(),
    config: testConfig(),
    limitations: [],
    errors: [],
    organizationalEvidence: {},
    now: new Date().toISOString(),
    ...overrides,
  };
}

export function pageSignals(overrides: Partial<PageSignals> = {}): PageSignals {
  return {
    personalDataCategories: [],
    purposes: [],
    rightsCategories: [],
    retentionSignalCount: 0,
    thirdPartySignalCount: 0,
    childTerms: [],
    hasEmail: false,
    hasPhone: false,
    hasContactLanguage: false,
    contradictionFlags: [],
    noticeWordCount: 0,
    averageSentenceLength: 0,
    dateStrings: [],
    hasPrivacyNoticeLanguage: false,
    publicPersonalDataPatterns: [],
    ...overrides,
  };
}

export function pageEvidence(overrides: Partial<PageEvidence> = {}): PageEvidence {
  return {
    id: "page-1",
    requestedUrl: "https://example.test/",
    finalUrl: "https://example.test/",
    status: 200,
    ok: true,
    contentType: "text/html",
    headers: {},
    title: "Example",
    language: "en",
    headings: [],
    textExcerpt: "Example homepage text.",
    signals: pageSignals(),
    links: [],
    forms: [],
    scripts: [],
    iframes: [],
    resources: [],
    thirdPartyHosts: [],
    setCookieNames: [],
    cookies: [],
    redirectChain: ["https://example.test/"],
    error: null,
    fetchedAt: new Date().toISOString(),
    rendered: false,
    ...overrides,
  };
}

export function passwordForm(overrides: Partial<FormEvidence> = {}): FormEvidence {
  return {
    pageUrl: "https://example.test/login",
    action: "/login",
    absoluteAction: "https://example.test/login",
    method: "post",
    externalDestination: false,
    fields: [
      {
        tag: "input",
        type: "password",
        name: "password",
        label: "Password",
        autocomplete: "current-password",
        required: true,
        disabled: false,
        checked: false,
        sensitiveCategory: "credential",
        redacted: true,
      },
    ],
    hasPrivacyLinkNearby: false,
    consentCheckboxLabels: [],
    ...overrides,
  };
}

export function trackerRequest(
  host: string,
  overrides: Partial<NetworkRequestEvidence> = {},
): NetworkRequestEvidence {
  return {
    url: `https://${host}/script.js`,
    host,
    method: "GET",
    resourceType: "script",
    thirdParty: true,
    knownTracker: true,
    trackerCategory: "analytics",
    trackerMatch: host,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function snapshot(overrides: Partial<BrowserSnapshot> = {}): BrowserSnapshot {
  return {
    url: "https://example.test/",
    title: "Example",
    textExcerpt: "Example homepage text.",
    cookies: [],
    localStorageKeys: [],
    sessionStorageKeys: [],
    requests: [],
    bannerVisible: false,
    acceptVisible: false,
    rejectVisible: false,
    withdrawalVisible: false,
    errors: [],
    screenshot: null,
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function browserEvidence(overrides: Partial<BrowserEvidence> = {}): BrowserEvidence {
  return {
    available: true,
    limitations: [],
    initial: snapshot(),
    afterReject: null,
    afterAccept: null,
    afterReload: null,
    afterWithdraw: null,
    interactionLog: [],
    ...overrides,
  };
}

export async function runLocalAudit(fixture: RunningFixture, overrides: Partial<AuditConfig> = {}) {
  return runAudit({
    targetUrl: `${fixture.url}/`,
    config: testConfig(overrides),
    allowPrivateNetworks: true,
  });
}

export function statusOf(run: { tests: Array<{ testId: string; status: string }> }, testId: string): string {
  const test = run.tests.find((candidate) => candidate.testId === testId);
  if (!test) throw new Error(`Test ${testId} was not present in the run.`);
  return test.status;
}
