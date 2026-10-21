import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "mkt_tok",
  "_ga",
  "_gl",
]);

export class UnsafeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTargetError";
  }
}

export function normalizeUrl(input: string | URL): URL {
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeTargetError("Only http and https URLs are supported.");
  }
  if (url.username || url.password) {
    throw new UnsafeTargetError("URLs with embedded credentials are not allowed.");
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  const sorted = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  url.search = "";
  for (const [key, value] of sorted) {
    url.searchParams.append(key, value);
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url;
}

export function urlKey(input: string | URL): string {
  return normalizeUrl(input).toString();
}

export function isSameOrigin(a: string | URL, b: string | URL): boolean {
  const left = a instanceof URL ? a : new URL(a);
  const right = b instanceof URL ? b : new URL(b);
  return left.origin === right.origin;
}

export function siteKey(input: string | URL): string {
  const url = input instanceof URL ? input : new URL(input);
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${host}${port}`;
}

export function isSameSite(a: string | URL, b: string | URL): boolean {
  return siteKey(a) === siteKey(b);
}

export function isPrivateOrReservedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
    if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    if (normalized.startsWith("ff")) return true;
    if (normalized.startsWith("2001:db8")) return true;
    if (normalized.startsWith("::ffff:")) {
      return isPrivateOrReservedIp(normalized.replace("::ffff:", ""));
    }
    return false;
  }

  return true;
}

export async function assertPublicTarget(
  input: string | URL,
  options: { allowPrivateNetworks?: boolean } = {},
): Promise<URL> {
  const url = normalizeUrl(input);
  if (options.allowPrivateNetworks) return url;

  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new UnsafeTargetError("Localhost targets are not allowed.");
  }

  let addresses;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeTargetError("The target hostname could not be resolved.");
  }

  if (addresses.length === 0) {
    throw new UnsafeTargetError("The target hostname did not resolve to an address.");
  }

  for (const address of addresses) {
    if (isPrivateOrReservedIp(address.address)) {
      throw new UnsafeTargetError(
        "The target resolves to a private, loopback, link-local, or reserved address.",
      );
    }
  }

  return url;
}

export function resolveLink(baseUrl: string, href: string): string | null {
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    /^(mailto|tel|javascript|data|file|ftp|sms|whatsapp):/i.test(trimmed)
  ) {
    return null;
  }
  try {
    return normalizeUrl(new URL(trimmed, baseUrl)).toString();
  } catch {
    return null;
  }
}

export function classifyLink(href: string, text: string): "privacy" | "cookie" | "terms" | "grievance" | "rights" | "contact" | "signup" | "form" | "sitemap" | "other" {
  const haystack = `${href} ${text}`.toLowerCase();
  if (/(privacy|privacy-policy|privacy policy|data protection policy)/.test(haystack)) return "privacy";
  if (/(cookie|cookies|consent preference|manage preferences)/.test(haystack)) return "cookie";
  if (/(terms|conditions|tos)/.test(haystack)) return "terms";
  if (/(grievance|complaint|redressal|dpo|data protection officer)/.test(haystack)) return "grievance";
  if (/(your rights|data rights|access request|erasure|correction|withdraw consent|nominate)/.test(haystack)) return "rights";
  if (/(contact|support|help|reach us)/.test(haystack)) return "contact";
  if (/(signup|sign up|register|create account|enquiry|inquiry|get started)/.test(haystack)) return "signup";
  if (/(form|request|submit)/.test(haystack)) return "form";
  if (/(sitemap)/.test(haystack)) return "sitemap";
  return "other";
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
