import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import type { StorageState } from "./auth";
import { classifyTracker, isThirdPartyHost } from "./trackers";
import { redactText, truncate } from "./redact";
import type {
  BrowserEvidence,
  BrowserSnapshot,
  CookieEvidence,
  NetworkRequestEvidence,
  ScreenshotRef,
} from "./types";

export interface BrowserCollectOptions {
  targetUrl: string;
  timeoutMs: number;
  screenshots: boolean;
  screenshotDir: string;
  runId: string;
  storageState?: StorageState | null;
}

const BANNER_SELECTORS = [
  '[id*="cookie" i]',
  '[class*="cookie" i]',
  '[id*="consent" i]',
  '[class*="consent" i]',
  '[aria-label*="cookie" i]',
  '[aria-label*="consent" i]',
  '[role="dialog"]',
];

const ACCEPT_TEXT =
  /^(accept all|accept|allow all|allow|agree|i agree|got it|ok|okay|continue)$/i;
const REJECT_TEXT =
  /^(reject all|reject|decline|deny|refuse|only necessary|necessary only|essential only|do not sell|no thanks)$/i;
const WITHDRAW_TEXT =
  /(withdraw|manage (cookie )?preferences|change (cookie )?preferences|cookie settings|privacy settings|consent settings)/i;

function cookieEvidence(
  cookies: Array<{
    name: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    expires: number;
    domain: string;
  }>,
  originHost: string,
): CookieEvidence[] {
  return cookies.map((cookie) => ({
    name: cookie.name,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    session: cookie.expires <= 0,
    thirdParty: isThirdPartyHost(cookie.domain.replace(/^\./, ""), originHost),
  }));
}

async function safeCall<T>(
  action: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await action();
  } catch {
    return fallback;
  }
}

async function hasVisible(
  page: Page,
  selector: string,
): Promise<boolean> {
  return safeCall(async () => {
    const locator = page.locator(selector).first();
    return (await locator.count()) > 0 && (await locator.isVisible());
  }, false);
}

async function findAction(
  page: Page,
  textPattern: RegExp,
): Promise<{ found: boolean; label: string | null }> {
  const candidates = page
    .locator('button, a, [role="button"], input[type="button"], input[type="submit"]');
  const count = await safeCall(() => candidates.count(), 0);
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    const visible = await safeCall(() => candidate.isVisible(), false);
    if (!visible) continue;
    const label = await safeCall(
      async () =>
        (
          (await candidate.innerText()) ||
          (await candidate.getAttribute("aria-label")) ||
          (await candidate.getAttribute("value")) ||
          ""
        ).trim(),
      "",
    );
    if (label && textPattern.test(label)) return { found: true, label };
  }
  return { found: false, label: null };
}

async function clickAction(page: Page, textPattern: RegExp): Promise<string | null> {
  const action = await findAction(page, textPattern);
  if (!action.found || !action.label) return null;
  const candidates = page
    .locator('button, a, [role="button"], input[type="button"], input[type="submit"]')
    .filter({ hasText: action.label });
  const count = await safeCall(() => candidates.count(), 0);
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (await safeCall(() => candidate.isVisible(), false)) {
      await safeCall(() => candidate.click({ timeout: 3000 }), undefined);
      await page.waitForTimeout(750);
      return action.label;
    }
  }
  return null;
}

async function snapshot(
  page: Page,
  context: BrowserContext,
  targetHost: string,
  requests: NetworkRequestEvidence[],
  errors: string[],
  screenshot: ScreenshotRef | null,
): Promise<BrowserSnapshot> {
  const cookies = await safeCall(() => context.cookies(), []);
  const localStorageKeys = await safeCall(
    () => page.evaluate(() => Object.keys(window.localStorage).sort()),
    [] as string[],
  );
  const sessionStorageKeys = await safeCall(
    () => page.evaluate(() => Object.keys(window.sessionStorage).sort()),
    [] as string[],
  );
  const bodyText = await safeCall(
    async () => (await page.locator("body").innerText()).slice(0, 20000),
    "",
  );
  const bannerVisible = await Promise.all(
    BANNER_SELECTORS.map((selector) => hasVisible(page, selector)),
  ).then((values) => values.some(Boolean));
  const accept = await findAction(page, ACCEPT_TEXT);
  const reject = await findAction(page, REJECT_TEXT);
  const withdraw = await findAction(page, WITHDRAW_TEXT);

  return {
    url: page.url(),
    title: await safeCall(() => page.title(), null),
    textExcerpt: truncate(redactText(bodyText), 12000),
    cookies: cookieEvidence(cookies, targetHost),
    localStorageKeys,
    sessionStorageKeys,
    requests: requests.slice(-500),
    bannerVisible,
    acceptVisible: accept.found,
    rejectVisible: reject.found,
    withdrawalVisible: withdraw.found,
    errors: errors.slice(-100),
    screenshot,
    capturedAt: new Date().toISOString(),
  };
}

function attachListeners(
  page: Page,
  host: string,
  requests: NetworkRequestEvidence[],
  errors: string[],
): void {
  page.on("request", (request) => {
    try {
      const url = new URL(request.url());
      if (!url.protocol.startsWith("http")) return;
      const tracker = classifyTracker(url.hostname);
      requests.push({
        url: redactText(url.origin + url.pathname).slice(0, 1000),
        host: url.hostname,
        method: request.method(),
        resourceType: request.resourceType(),
        thirdParty: isThirdPartyHost(url.hostname, host),
        knownTracker: tracker.known,
        trackerCategory: tracker.category,
        trackerMatch: tracker.matchedDomain,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Ignore malformed request URLs.
    }
  });
  page.on("pageerror", (error) => {
    errors.push(redactText(error.message).slice(0, 500));
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(redactText(message.text()).slice(0, 500));
    }
  });
}

async function newState(
  browser: Browser,
  options: BrowserCollectOptions,
  state: string,
): Promise<{
  context: BrowserContext;
  page: Page;
  requests: NetworkRequestEvidence[];
  errors: string[];
  screenshotPath: string | null;
  screenshot: ScreenshotRef | null;
}> {
  const context = await browser.newContext({
    ignoreHTTPSErrors: false,
    serviceWorkers: "block",
    storageState: options.storageState ?? undefined,
  });
  const page = await context.newPage();
  const requests: NetworkRequestEvidence[] = [];
  const errors: string[] = [];
  const targetHost = new URL(options.targetUrl).hostname;
  attachListeners(page, targetHost, requests, errors);

  let screenshotPath: string | null = null;
  let screenshot: ScreenshotRef | null = null;
  if (options.screenshots) {
    await mkdir(options.screenshotDir, { recursive: true });
    const name = `${options.runId}-${state}-consent.png`;
    screenshotPath = join(options.screenshotDir, name);
    screenshot = {
      name,
      kind: "consent-state",
      label: `Consent state: ${state}`,
      pageUrl: options.targetUrl,
      selector: null,
      capturedAt: new Date().toISOString(),
    };
  }

  await page
    .goto(options.targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs,
    })
    .catch((error) => {
      errors.push(
        redactText(
          error instanceof Error ? error.message : "Navigation failed.",
        ).slice(0, 500),
      );
    });
  await page.waitForTimeout(1000);

  return { context, page, requests, errors, screenshotPath, screenshot };
}

export async function collectBrowserEvidence(
  options: BrowserCollectOptions,
): Promise<BrowserEvidence> {
  const limitations: string[] = [];
  const interactionLog: string[] = [];
  let browser: Browser | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    return {
      available: false,
      limitations: [
        `Playwright browser launch failed: ${redactText(error instanceof Error ? error.message : "unknown error")}`,
        "Install a browser with `npx playwright install chromium` and enable browser evidence to run behavioural consent checks.",
      ],
      initial: null,
      afterReject: null,
      afterAccept: null,
      afterReload: null,
      afterWithdraw: null,
      interactionLog,
    };
  }

  try {
    const targetHost = new URL(options.targetUrl).hostname;

    const initial = await newState(browser, options, "initial");
    await safeCall(
      () =>
        initial.page.screenshot({
          path: initial.screenshotPath ?? undefined,
          fullPage: false,
        }),
      undefined,
    );
    const initialSnapshot = await snapshot(
      initial.page,
      initial.context,
      targetHost,
      initial.requests,
      initial.errors,
      initial.screenshot,
    );
    interactionLog.push("Captured initial state before any consent action.");
    await initial.context.close();

    const rejectState = await newState(browser, options, "after-reject");
    const rejectLabel = await clickAction(rejectState.page, REJECT_TEXT);
    if (rejectLabel) {
      interactionLog.push(`Clicked reject/decline control: ${rejectLabel}`);
    } else {
      limitations.push("No visible reject/decline control was found for the reject-behaviour check.");
    }
    await safeCall(
      () =>
        rejectState.page.screenshot({
          path: rejectState.screenshotPath ?? undefined,
          fullPage: false,
        }),
      undefined,
    );
    const afterReject = await snapshot(
      rejectState.page,
      rejectState.context,
      targetHost,
      rejectState.requests,
      rejectState.errors,
      rejectState.screenshot,
    );
    await rejectState.context.close();

    const acceptState = await newState(browser, options, "after-accept");
    const acceptLabel = await clickAction(acceptState.page, ACCEPT_TEXT);
    if (acceptLabel) {
      interactionLog.push(`Clicked accept control: ${acceptLabel}`);
    } else {
      limitations.push("No visible accept control was found for the accept-behaviour check.");
    }
    await safeCall(
      () =>
        acceptState.page.screenshot({
          path: acceptState.screenshotPath ?? undefined,
          fullPage: false,
        }),
      undefined,
    );
    const afterAccept = await snapshot(
      acceptState.page,
      acceptState.context,
      targetHost,
      acceptState.requests,
      acceptState.errors,
      acceptState.screenshot,
    );

    await safeCall(() => acceptState.page.reload({ waitUntil: "domcontentloaded" }), undefined);
    await acceptState.page.waitForTimeout(750);
    const afterReload = await snapshot(
      acceptState.page,
      acceptState.context,
      targetHost,
      acceptState.requests,
      acceptState.errors,
      null,
    );
    interactionLog.push("Reloaded the accepted state to test persistence.");

    const withdrawLabel = await clickAction(acceptState.page, WITHDRAW_TEXT);
    if (withdrawLabel) {
      interactionLog.push(`Clicked withdrawal/preference control: ${withdrawLabel}`);
    } else {
      limitations.push("No visible withdrawal/preference control was found after acceptance.");
    }
    const afterWithdraw = await snapshot(
      acceptState.page,
      acceptState.context,
      targetHost,
      acceptState.requests,
      acceptState.errors,
      null,
    );
    await acceptState.context.close();

    limitations.push(
      "Browser consent testing clicks only controls with recognized consent labels. It does not submit data forms or test every possible consent path. When credentials are supplied for this run, it reuses that authenticated session but does not fill any other login form.",
    );

    return {
      available: true,
      limitations,
      initial: initialSnapshot,
      afterReject,
      afterAccept,
      afterReload,
      afterWithdraw,
      interactionLog,
    };
  } catch (error) {
    return {
      available: false,
      limitations: [
        ...limitations,
        `Browser evidence collection failed: ${redactText(error instanceof Error ? error.message : "unknown error")}`,
      ],
      initial: null,
      afterReject: null,
      afterAccept: null,
      afterReload: null,
      afterWithdraw: null,
      interactionLog,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
