import type { PageEvidence } from "./types";

const LOGIN_URL =
  /\/(?:login|log-in|signin|sign-in|sign_in|auth|authenticate|account\/login|session\/new)(?:[/?#]|$)/i;
const LOGIN_TEXT =
  /\b(sign in|log in|login|signin|authentication required|session expired|please log in|enter your password)\b/i;

export interface LoginWallDetection {
  loginWallDetected: boolean;
  loginUrl: string | null;
  reason: string | null;
}

export interface LoginSurfaceDetection {
  loginSurfaceDetected: boolean;
  loginUrls: string[];
}

export function pageLooksLikeLogin(page: PageEvidence): boolean {
  const hasPasswordField = page.forms.some((form) =>
    form.fields.some((field) => field.type === "password"),
  );
  const titleAndText = `${page.title ?? ""} ${page.textExcerpt.slice(0, 2000)}`;
  const loginLanguage = LOGIN_TEXT.test(titleAndText);
  const loginUrl = LOGIN_URL.test(page.finalUrl);
  return loginUrl || (hasPasswordField && loginLanguage);
}

export function findLoginSurfaces(pages: PageEvidence[]): LoginSurfaceDetection {
  const loginUrls = [
    ...new Set(pages.filter(pageLooksLikeLogin).map((page) => page.finalUrl)),
  ];
  return { loginSurfaceDetected: loginUrls.length > 0, loginUrls };
}

export function detectLoginWall(pages: PageEvidence[]): LoginWallDetection {
  const start = pages[0];
  if (!start) {
    return { loginWallDetected: false, loginUrl: null, reason: null };
  }

  const hasPasswordField = start.forms.some((form) =>
    form.fields.some((field) => field.type === "password"),
  );
  const titleAndText = `${start.title ?? ""} ${start.textExcerpt.slice(0, 2000)}`;
  const loginLanguage = LOGIN_TEXT.test(titleAndText);
  const loginUrl = LOGIN_URL.test(start.finalUrl);
  const redirectedToLogin =
    start.redirectChain.length > 1 && LOGIN_URL.test(start.finalUrl);

  if (start.status === 401 || start.status === 403) {
    return {
      loginWallDetected: true,
      loginUrl: start.finalUrl,
      reason: `The start page returned HTTP ${start.status}, which indicates authentication is required.`,
    };
  }

  if (redirectedToLogin || (loginUrl && loginLanguage)) {
    return {
      loginWallDetected: true,
      loginUrl: start.finalUrl,
      reason: "The start URL resolved to a sign-in page instead of the requested content.",
    };
  }

  if (hasPasswordField && loginLanguage) {
    return {
      loginWallDetected: true,
      loginUrl: start.finalUrl,
      reason: "The start page asks for a password sign-in before showing its content.",
    };
  }

  return { loginWallDetected: false, loginUrl: null, reason: null };
}
