const SENSITIVE_QUERY_KEYS = new Set([
  "email",
  "e-mail",
  "phone",
  "mobile",
  "name",
  "token",
  "access_token",
  "id_token",
  "session",
  "sessionid",
  "auth",
  "authorization",
  "password",
  "passwd",
  "secret",
  "key",
  "apikey",
  "api_key",
  "otp",
  "aadhaar",
  "aadhar",
  "pan",
]);

const SELECTED_HEADERS = [
  "content-type",
  "content-language",
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "cache-control",
  "server",
  "x-powered-by",
];

export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
}

export function redactText(input: string): string {
  return input
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]")
    .replace(/(?:\+91[\s-]?)?[6-9]\d{9}\b/g, "[PHONE_REDACTED]")
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[AADHAAR_REDACTED]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[PAN_REDACTED]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[LONG_NUMBER_REDACTED]")
    .replace(/\b(?:eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,})\b/g, "[TOKEN_REDACTED]")
    .replace(/\b(?:sk_live|pk_live|ghp_|xox[baprs]-)[A-Za-z0-9_-]{10,}\b/g, "[SECRET_REDACTED]");
}

export function truncate(input: string, max = 24000): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}\n[TRUNCATED ${input.length - max} CHARACTERS]`;
}

export function selectSafeHeaders(headers: Headers): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const name of SELECTED_HEADERS) {
    const value = headers.get(name);
    if (value) selected[name] = redactText(value).slice(0, 2000);
  }
  return selected;
}

export function getSetCookieHeaders(headers: Headers): string[] {
  const possible = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof possible.getSetCookie === "function") {
    return possible.getSetCookie();
  }
  const combined = headers.get("set-cookie");
  if (!combined) return [];
  return combined.split(/,(?=\s*[^;=]+=)/g);
}

export function parseSetCookieNames(headers: Headers): string[] {
  return [...new Set(
    getSetCookieHeaders(headers)
      .map((cookie) => cookie.split(";")[0]?.split("=")[0]?.trim())
      .filter((name): name is string => Boolean(name)),
  )];
}

export function parseCookieAttributes(headers: Headers): Array<{
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  session: boolean;
}> {
  return getSetCookieHeaders(headers)
    .map((cookie) => {
      const [pair, ...attributes] = cookie.split(";").map((part) => part.trim());
      const name = pair?.split("=")[0]?.trim();
      if (!name) return null;
      const lower = attributes.map((attribute) => attribute.toLowerCase());
      const sameSite = attributes.find((attribute) =>
        attribute.toLowerCase().startsWith("samesite="),
      );
      return {
        name,
        secure: lower.includes("secure"),
        httpOnly: lower.includes("httponly"),
        sameSite: sameSite ? sameSite.split("=")[1] ?? null : null,
        session: !lower.some((attribute) => attribute.startsWith("max-age=") || attribute.startsWith("expires=")),
      };
    })
    .filter((cookie): cookie is NonNullable<typeof cookie> => Boolean(cookie));
}
