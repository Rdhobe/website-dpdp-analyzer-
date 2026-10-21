import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Browser, Page } from "playwright";
import { redactText } from "./redact";
import { auditDataDir } from "./store";
import type {
  CategoryCode,
  ScreenshotRef,
  TestResult,
  VisualEvidence,
} from "./types";

const SAFE_RUN_ID = /^[A-Za-z0-9_-]+$/;
const SAFE_SCREENSHOT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.png$/;

export const SCREENSHOT_SEGMENT = "screenshots";
const MAX_SCREENSHOTS_PER_FINDING = 4;

interface AnchorCapture {
  key: string;
  label: string;
  selector: string;
}

const ANCHOR_SELECTORS: AnchorCapture[] = [
  {
    key: "consent-banner",
    label: "Cookie/consent interface",
    selector:
      '[id*="cookie" i], [class*="cookie" i], [aria-label*="cookie" i], [id*="consent" i], [class*="consent" i], [role="dialog"]',
  },
  { key: "privacy-notice", label: "Privacy notice link", selector: 'a[href*="privacy" i]' },
  { key: "cookie-policy", label: "Cookie policy link", selector: 'a[href*="cookie" i]' },
  { key: "terms", label: "Terms link", selector: 'a[href*="terms" i]' },
  {
    key: "contact-grievance",
    label: "Contact or grievance link",
    selector: 'a[href*="grievance" i], a[href*="contact" i], a[href^="mailto:"]',
  },
  { key: "form", label: "Data collection form", selector: "form" },
  { key: "heading", label: "Primary heading", selector: "h1" },
];

const CATEGORY_ANCHOR_PREFERENCE: Record<CategoryCode, string[]> = {
  A: [],
  B: ["privacy-notice", "heading"],
  C: ["consent-banner", "cookie-policy"],
  D: ["form"],
  E: ["contact-grievance"],
  F: ["privacy-notice", "heading"],
  G: [],
  H: [],
  I: ["privacy-notice"],
  J: [],
};

const ANCHOR_LABEL_BY_KEY = new Map(
  ANCHOR_SELECTORS.map((anchor) => [anchor.key, anchor.label]),
);

export function screenshotDirFor(runId: string): string {
  if (!SAFE_RUN_ID.test(runId)) {
    throw new Error("Invalid audit identifier.");
  }
  return join(auditDataDir(), runId, SCREENSHOT_SEGMENT);
}

export function isSafeScreenshotName(name: string): boolean {
  return SAFE_SCREENSHOT_NAME.test(name) && !name.includes("..");
}

export function resolveScreenshotPath(runId: string, name: string): string | null {
  if (!SAFE_RUN_ID.test(runId) || !isSafeScreenshotName(name)) {
    return null;
  }
  return join(screenshotDirFor(runId), name);
}

export function screenshotUrl(runId: string, name: string): string {
  return `/api/audits/${encodeURIComponent(runId)}/screenshots/${encodeURIComponent(name)}`;
}

function sameUrl(a: string, b: string): boolean {
  const normalize = (value: string): string =>
    value.split("#")[0].replace(/\/+$/, "").toLowerCase();
  return normalize(a) === normalize(b);
}

import type { StorageState } from "./auth";

export interface CaptureVisualOptions {
  runId: string;
  pageUrls: string[];
  timeoutMs: number;
  maxPages: number;
  onProgress?: (message: string) => void;
  storageState?: StorageState | null;
}

async function captureFullPage(
  page: Page,
  directory: string,
  name: string,
  pageUrl: string,
): Promise<ScreenshotRef | null> {
  try {
    await page.screenshot({ path: join(directory, name), fullPage: true, timeout: 15_000 });
    return {
      name,
      kind: "full-page",
      label: "Full page",
      pageUrl,
      selector: null,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function captureElement(
  page: Page,
  directory: string,
  name: string,
  pageUrl: string,
  anchor: AnchorCapture,
): Promise<ScreenshotRef | null> {
  try {
    const locator = page.locator(anchor.selector).first();
    if ((await locator.count()) === 0) return null;
    if (!(await locator.isVisible())) return null;
    await locator.scrollIntoViewIfNeeded({ timeout: 3_000 }).catch(() => undefined);
    await locator.screenshot({ path: join(directory, name), timeout: 8_000 });
    return {
      name,
      kind: "element",
      label: anchor.label,
      pageUrl,
      selector: anchor.selector,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function captureVisualEvidence(
  options: CaptureVisualOptions,
): Promise<VisualEvidence> {
  const limitations: string[] = [];
  const screenshots: ScreenshotRef[] = [];
  let browser: Browser | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    return {
      available: false,
      limitations: [
        `Playwright browser launch failed: ${redactText(
          error instanceof Error ? error.message : "unknown error",
        )}`,
        "Install a browser with `npx playwright install chromium` to capture finding screenshots.",
      ],
      screenshots: [],
    };
  }

  try {
    const directory = screenshotDirFor(options.runId);
    await mkdir(directory, { recursive: true });
    const urls = [...new Set(options.pageUrls)].slice(
      0,
      Math.max(1, options.maxPages),
    );

    for (let index = 0; index < urls.length; index += 1) {
      const url = urls[index];
      options.onProgress?.(
        `Capturing screenshots (${index + 1}/${urls.length}): ${url}`,
      );
      const prefix = String(index).padStart(2, "0");
      const context = await browser.newContext({
        ignoreHTTPSErrors: false,
        serviceWorkers: "block",
        viewport: { width: 1280, height: 900 },
        storageState: options.storageState ?? undefined,
      });
      const page = await context.newPage();
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: options.timeoutMs,
        });
        await page.waitForTimeout(600);

        const full = await captureFullPage(page, directory, `${prefix}-full.png`, url);
        if (full) screenshots.push(full);

        for (const anchor of ANCHOR_SELECTORS) {
          const ref = await captureElement(
            page,
            directory,
            `${prefix}-${anchor.key}.png`,
            url,
            anchor,
          );
          if (ref) screenshots.push(ref);
        }
      } catch (error) {
        limitations.push(
          `Screenshot capture failed for ${url}: ${redactText(
            error instanceof Error ? error.message : "unknown error",
          )}`,
        );
      } finally {
        await context.close().catch(() => undefined);
      }
    }

    if (screenshots.length === 0) {
      limitations.push("No page screenshots could be captured.");
    }
    limitations.push(
      "Screenshots are captured without logging in, submitting forms, or interacting with consent controls. Element crops show the first matching visible element only.",
    );
    return { available: true, limitations, screenshots };
  } catch (error) {
    return {
      available: false,
      limitations: [
        ...limitations,
        `Visual evidence collection failed: ${redactText(
          error instanceof Error ? error.message : "unknown error",
        )}`,
      ],
      screenshots,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function screenshotsForTest(
  test: TestResult,
  visual: VisualEvidence,
): ScreenshotRef[] {
  const urls = test.affectedUrls.length > 0 ? test.affectedUrls : [];
  const labels = CATEGORY_ANCHOR_PREFERENCE[test.category] ?? [];
  const chosen: ScreenshotRef[] = [];
  const seen = new Set<string>();

  const push = (ref: ScreenshotRef | undefined): void => {
    if (!ref || seen.has(ref.name)) return;
    seen.add(ref.name);
    chosen.push(ref);
  };

  for (const url of urls) {
    const pageShots = visual.screenshots.filter((shot) => sameUrl(shot.pageUrl, url));
    if (pageShots.length === 0) continue;
    for (const label of labels) {
      const targetLabel = ANCHOR_LABEL_BY_KEY.get(label);
      if (!targetLabel) continue;
      push(
        pageShots.find(
          (shot) => shot.kind === "element" && shot.label === targetLabel,
        ),
      );
    }
    push(pageShots.find((shot) => shot.kind === "full-page"));
    if (chosen.length >= MAX_SCREENSHOTS_PER_FINDING) break;
  }

  if (chosen.length === 0) {
    push(visual.screenshots.find((shot) => shot.kind === "full-page"));
  }

  return chosen.slice(0, MAX_SCREENSHOTS_PER_FINDING);
}

export function attachFindingScreenshots(
  tests: TestResult[],
  visual: VisualEvidence | null,
): TestResult[] {
  if (!visual || visual.screenshots.length === 0) {
    return tests;
  }
  return tests.map((test) => ({
    ...test,
    screenshots: screenshotsForTest(test, visual),
  }));
}
