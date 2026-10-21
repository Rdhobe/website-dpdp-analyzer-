import type { Browser, BrowserContext, Page } from "playwright";

export interface LoginCredentials {
  username: string;
  password: string;
}

export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

export interface LoginResult {
  ok: boolean;
  cookieHeader: string;
  storageState: StorageState | null;
  loginUrl: string | null;
  finalUrl: string | null;
  reason: string | null;
  steps: string[];
}

export interface PerformLoginInput {
  targetUrl: string;
  credentials: LoginCredentials;
  timeoutMs: number;
}

const PASSWORD_SELECTORS = ['input[type="password"]'];

const USERNAME_SELECTORS = [
  'input[autocomplete="username"]',
  'input[type="email"]',
  'input[name*="user" i]',
  'input[name*="email" i]',
  'input[name*="login" i]',
  'input[id*="user" i]',
  'input[id*="email" i]',
  'input[type="text"]',
  'input:not([type])',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button[name*="login" i]',
  'button[name*="signin" i]',
  'button[name*="sign-in" i]',
];

const LOGIN_URL =
  /\/(?:login|log-in|signin|sign-in|sign_in|auth|authenticate|account\/login|session\/new)(?:[/?#]|$)/i;

const UNSUPPORTED_TEXT =
  /\b(captcha|recaptcha|hcaptcha|one[- ]time (code|password)|otp|two[- ]factor|2fa|multi[- ]factor|authenticator|verify your identity|single sign[- ]on)\b/i;

const REJECTED_TEXT =
  /\b(invalid|incorrect|wrong)\b[^.]{0,40}\b(username|password|credentials|login)\b|\b(login|sign[- ]?in|authentication) failed\b/i;

async function firstVisible(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0 && (await locator.isVisible())) {
        return selector;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function isLoginUrl(url: string): boolean {
  try {
    return LOGIN_URL.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

async function sessionResult(
  context: BrowserContext,
  targetUrl: string,
  loginUrl: string | null,
  finalUrl: string,
  steps: string[],
): Promise<LoginResult> {
  const storageState = await context.storageState();
  let host: string;
  try {
    host = new URL(targetUrl).hostname;
  } catch {
    host = "";
  }
  const cookieHeader = storageState.cookies
    .filter((cookie) => {
      const domain = cookie.domain.replace(/^\./, "");
      return host === domain || (host !== "" && host.endsWith(`.${domain}`));
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  steps.push(
    cookieHeader
      ? `Session captured with ${storageState.cookies.length} cookie(s); reused for the crawl.`
      : "Sign-in completed but no first-party cookies were set for the target host.",
  );

  return {
    ok: true,
    cookieHeader,
    storageState,
    loginUrl,
    finalUrl,
    reason: null,
    steps: [...steps],
  };
}

async function settle(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  await page.waitForTimeout(1500);
}

export async function performLogin(input: PerformLoginInput): Promise<LoginResult> {
  let browser: Browser | null = null;
  const steps: string[] = [];

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    steps.push("Chromium launched in headless mode.");
  } catch {
    return {
      ok: false,
      cookieHeader: "",
      storageState: null,
      loginUrl: null,
      finalUrl: null,
      reason:
        "Browser automation is not available on this host, so the sign-in form could not be submitted.",
      steps,
    };
  }

  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext({
      ignoreHTTPSErrors: false,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const timeout = Math.max(5_000, Math.min(input.timeoutMs, 60_000));
    page.setDefaultTimeout(timeout);

    await page.goto(input.targetUrl, { waitUntil: "domcontentloaded", timeout });
    await page.waitForTimeout(1000);
    steps.push(`Opened ${input.targetUrl} (now at ${page.url()}).`);

    const loginUrl = page.url();
    const passwordSelector = await firstVisible(page, PASSWORD_SELECTORS);

    if (!passwordSelector) {
      if (isLoginUrl(page.url())) {
        return {
          ok: false,
          cookieHeader: "",
          storageState: null,
          loginUrl,
          finalUrl: page.url(),
          reason:
            "A sign-in page was detected, but no single username and password form was found. Only single username/password forms are supported.",
          steps,
        };
      }
      steps.push("No password field was present; treating the current session as already signed in.");
      return await sessionResult(context, input.targetUrl, loginUrl, page.url(), steps);
    }

    steps.push(`Found a password field (${passwordSelector}).`);

    const usernameSelector = await firstVisible(page, USERNAME_SELECTORS);
    if (!usernameSelector) {
      return {
        ok: false,
        cookieHeader: "",
        storageState: null,
        loginUrl,
        finalUrl: page.url(),
        reason:
          "The sign-in form does not include a username field on the same page. Only single-step username/password forms are supported.",
        steps,
      };
    }

    steps.push(`Found a username field (${usernameSelector}).`);
    await page.fill(usernameSelector, input.credentials.username);
    await page.fill(passwordSelector, input.credentials.password);
    steps.push("Entered the supplied username and password.");

    const submitSelector = await firstVisible(page, SUBMIT_SELECTORS);
    if (submitSelector) {
      steps.push(`Submitting via ${submitSelector}.`);
      await page.click(submitSelector);
    } else {
      steps.push("No submit button found; pressing Enter in the password field.");
      await page.press(passwordSelector, "Enter");
    }

    await settle(page, timeout);
    steps.push(`After submit the browser is at ${page.url()}.`);

    const bodyText = await page
      .locator("body")
      .innerText()
      .then((text) => text.slice(0, 6000))
      .catch(() => "");

    if (UNSUPPORTED_TEXT.test(bodyText) || UNSUPPORTED_TEXT.test(page.url())) {
      return {
        ok: false,
        cookieHeader: "",
        storageState: null,
        loginUrl,
        finalUrl: page.url(),
        reason:
          "The site requires MFA, CAPTCHA, or single sign-on, which this auditor does not attempt to bypass.",
        steps,
      };
    }

    const stillPassword = await firstVisible(page, PASSWORD_SELECTORS);
    if (stillPassword && (isLoginUrl(page.url()) || REJECTED_TEXT.test(bodyText))) {
      return {
        ok: false,
        cookieHeader: "",
        storageState: null,
        loginUrl,
        finalUrl: page.url(),
        reason: isLoginUrl(page.url())
          ? "The sign-in did not leave the login page; the supplied username and password were likely rejected."
          : "The site did not accept the supplied username and password. The audit was not run with unauthenticated content.",
        steps,
      };
    }

    return await sessionResult(context, input.targetUrl, loginUrl, page.url(), steps);
  } catch (error) {
    return {
      ok: false,
      cookieHeader: "",
      storageState: null,
      loginUrl: null,
      finalUrl: null,
      reason: `The sign-in attempt could not be completed: ${
        error instanceof Error ? error.name : "unexpected error"
      }.`,
      steps,
    };
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
