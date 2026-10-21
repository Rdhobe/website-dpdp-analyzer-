import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import {
  assertPublicTarget,
  classifyLink,
  isSameOrigin,
  isSameSite,
  normalizeUrl,
  resolveLink,
  UnsafeTargetError,
  urlKey,
} from "./url";
import {
  parseCookieAttributes,
  parseSetCookieNames,
  redactText,
  redactUrl,
  selectSafeHeaders,
  truncate,
} from "./redact";
import { isThirdPartyHost } from "./trackers";
import {
  countMatches,
  extractDates,
  matchedCategories,
  PERSONAL_DATA_TERMS,
  PURPOSE_TERMS,
  RETENTION_TERMS,
  RIGHTS_TERMS,
  THIRD_PARTY_TERMS,
  CHILD_TERMS,
} from "./text";
import type {
  AuditProgressEvent,
  CrawlConfig,
  CrawlStats,
  FormEvidence,
  FormFieldEvidence,
  LinkEvidence,
  PageEvidence,
  PageSignals,
  ResourceDiscoveryEvidence,
  ResourceEvidence,
} from "./types";

const DEFAULT_HEADERS = {
  "user-agent":
    "DPDP-Compliance-Auditor/0.1 (+authorized website audit; no form submission)",
  accept:
    "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.5",
  "accept-language": "en-IN,en;q=0.9",
};

const HTML_TYPES = ["text/html", "application/xhtml+xml"];

export interface CrawlOptions extends CrawlConfig {
  targetUrl: string;
  allowPrivateNetworks?: boolean;
  cookieHeader?: string | null;
  deadline?: number;
  onProgress?: (event: AuditProgressEvent) => void;
}

export interface CrawlResult {
  startPage: PageEvidence | null;
  pages: PageEvidence[];
  robots: ResourceDiscoveryEvidence | null;
  sitemap: ResourceDiscoveryEvidence | null;
  stats: CrawlStats;
  timeLimitReached: boolean;
  limitations: string[];
  errors: string[];
}

interface FetchResult {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  headers: Headers;
  contentType: string | null;
  body: string;
  redirectChain: string[];
}

function emptySignals(text: string): PageSignals {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8);
  const averageSentenceLength =
    sentences.length > 0
      ? Math.round(
          sentences.reduce(
            (total, sentence) => total + sentence.split(/\s+/).length,
            0,
          ) / sentences.length,
        )
      : 0;

  return {
    personalDataCategories: matchedCategories(text, PERSONAL_DATA_TERMS),
    purposes: matchedCategories(text, PURPOSE_TERMS),
    rightsCategories: matchedCategories(text, RIGHTS_TERMS),
    retentionSignalCount: countMatches(text, RETENTION_TERMS),
    thirdPartySignalCount: countMatches(text, THIRD_PARTY_TERMS),
    childTerms: matchedCategories(
      text,
      CHILD_TERMS.map((pattern, index) => ({
        category: `child-signal-${index + 1}`,
        pattern,
      })),
    ),
    hasEmail: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
    hasPhone: /(?:\+91[\s-]?)?[6-9]\d{9}\b/.test(text),
    hasContactLanguage: /\b(contact|grievance|dpo|data protection officer)\b/i.test(
      text,
    ),
    contradictionFlags: detectContradictions(text),
    noticeWordCount: words.length,
    averageSentenceLength,
    dateStrings: extractDates(text),
    hasPrivacyNoticeLanguage:
      /\bprivacy\b/i.test(text) &&
      /\b(personal data|personal information|data protection|consent)\b/i.test(
        text,
      ),
    publicPersonalDataPatterns: detectPublicPersonalData(text),
  };
}

function detectPublicPersonalData(text: string): string[] {
  const patterns: string[] = [];
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
    patterns.push("email-address");
  }
  if (/(?:\+91[\s-]?)?[6-9]\d{9}\b/.test(text)) {
    patterns.push("phone-number");
  }
  if (/\b\d{4}\s?\d{4}\s?\d{4}\b/.test(text)) {
    patterns.push("aadhaar-like-number");
  }
  if (/\b[A-Z]{5}\d{4}[A-Z]\b/.test(text)) {
    patterns.push("pan-like-number");
  }
  if (/\b(?:\d[ -]*?){13,19}\b/.test(text)) {
    patterns.push("long-number-sequence");
  }
  return patterns;
}

function detectContradictions(text: string): string[] {
  const flags: string[] = [];
  if (
    /\b(never|do not|don't|no)\b.{0,30}\b(share|sell|disclose)\b/i.test(text) &&
    /\bshare\b.{0,60}\b(third[- ]part|partner|vendor|affiliate)\b/i.test(text)
  ) {
    flags.push("Sharing contradiction: 'never/no sharing' language appears with third-party sharing language.");
  }
  if (
    /\b(no|do not use|don't use|never use)\b.{0,20}\bcookies?\b/i.test(text) &&
    /\bcookies?\b/i.test(text)
  ) {
    flags.push("Cookie contradiction: language says cookies are not used while cookies are discussed.");
  }
  if (
    /\b(no|never|do not collect|don't collect)\b.{0,30}\bpersonal (data|information)\b/i.test(
      text,
    ) &&
    /\b(collect|process|use)\b.{0,40}\bpersonal (data|information)\b/i.test(text)
  ) {
    flags.push("Collection contradiction: 'no personal data' language appears with collection/processing language.");
  }
  return flags;
}

function fieldSensitiveCategory(value: string): string | null {
  for (const term of PERSONAL_DATA_TERMS) {
    if (term.pattern.test(value)) return term.category;
  }
  return null;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function labelForField(
  $: CheerioAPI,
  element: AnyNode,
  fallback: string | null,
): string | null {
  const id = $(element).attr("id");
  if (id) {
    const label = $(`label[for="${id.replace(/"/g, '\\"')}"]`).first().text();
    if (label.trim()) return normalizeText(label);
  }
  const wrappingLabel = $(element).closest("label").text();
  if (wrappingLabel.trim()) return normalizeText(wrappingLabel);
  return (
    $(element).attr("aria-label") ??
    $(element).attr("placeholder") ??
    fallback
  );
}

function parseForms(
  $: CheerioAPI,
  pageUrl: string,
  originHost: string,
  originProtocol: string,
): FormEvidence[] {
  const forms: FormEvidence[] = [];
  $("form").each((_, form) => {
    const action = $(form).attr("action") ?? pageUrl;
    let absoluteAction = pageUrl;
    try {
      absoluteAction = new URL(action, pageUrl).toString();
    } catch {
      absoluteAction = pageUrl;
    }
    const externalDestination = !isSameOrigin(absoluteAction, pageUrl);
    const fields: FormFieldEvidence[] = [];
    const consentCheckboxLabels: string[] = [];

    $(form)
      .find("input, select, textarea")
      .each((__, field) => {
        const tag = field.tagName.toLowerCase();
        const type = ($(field).attr("type") ?? (tag === "input" ? "text" : tag)).toLowerCase();
        if (["button", "submit", "reset", "image"].includes(type)) return;
        const name = $(field).attr("name") ?? null;
        const label = labelForField($, field, name);
        const autocomplete = $(field).attr("autocomplete") ?? null;
        const sensitiveCategory = fieldSensitiveCategory(
          `${name ?? ""} ${label ?? ""} ${autocomplete ?? ""} ${type}`,
        );
        const required = $(field).attr("required") !== undefined || $(field).attr("aria-required") === "true";
        const disabled = $(field).attr("disabled") !== undefined;
        const checked = $(field).attr("checked") !== undefined || $(field).attr("aria-checked") === "true";

        if (type === "checkbox") {
          const consentText = `${label ?? ""} ${name ?? ""}`.toLowerCase();
          if (/(consent|agree|privacy|terms|marketing|promotion|analytics|advertis)/.test(consentText)) {
            consentCheckboxLabels.push(label ?? name ?? "unlabelled checkbox");
          }
        }

        fields.push({
          tag,
          type,
          name,
          label,
          autocomplete,
          required,
          disabled,
          checked,
          sensitiveCategory,
          redacted: true,
        });
      });

    const nearby = $(form).find("a").add($(form).nextAll("a").slice(0, 2));
    const hasPrivacyLinkNearby = nearby.toArray().some((anchor) =>
      /privacy|data protection/i.test(
        `${$(anchor).attr("href") ?? ""} ${$(anchor).text()}`,
      ),
    );

    forms.push({
      pageUrl,
      action,
      absoluteAction,
      method: ($(form).attr("method") ?? "GET").toUpperCase(),
      externalDestination:
        externalDestination ||
        (originProtocol === "https:" && absoluteAction.startsWith("http:")),
      fields,
      hasPrivacyLinkNearby,
      consentCheckboxLabels,
    });
  });
  return forms;
}

function parseResources(
  $: CheerioAPI,
  pageUrl: string,
  originHost: string,
  isHttps: boolean,
): {
  scripts: ResourceEvidence[];
  iframes: ResourceEvidence[];
  resources: ResourceEvidence[];
} {
  const scripts: ResourceEvidence[] = [];
  const iframes: ResourceEvidence[] = [];
  const resources: ResourceEvidence[] = [];

  const add = (
    raw: string | undefined,
    kind: ResourceEvidence["kind"],
  ): ResourceEvidence | null => {
    if (!raw) return null;
    const resolved = resolveLink(pageUrl, raw);
    if (!resolved) return null;
    const url = new URL(resolved);
    const resource: ResourceEvidence = {
      url: redactUrl(resolved),
      host: url.hostname,
      kind,
      thirdParty: isThirdPartyHost(url.hostname, originHost),
      insecure: isHttps && url.protocol === "http:",
    };
    resources.push(resource);
    return resource;
  };

  $("script[src]").each((_, element) => {
    const resource = add($(element).attr("src"), "script");
    if (resource) scripts.push(resource);
  });
  $("iframe[src]").each((_, element) => {
    const resource = add($(element).attr("src"), "iframe");
    if (resource) iframes.push(resource);
  });
  $("link[href]").each((_, element) => {
    const rel = ($(element).attr("rel") ?? "").toLowerCase();
    add(
      $(element).attr("href"),
      rel.includes("stylesheet") ? "stylesheet" : "link",
    );
  });
  $("img[src]").each((_, element) => {
    add($(element).attr("src"), "image");
  });
  $("video[src], audio[src], source[src]").each((_, element) => {
    add($(element).attr("src"), "media");
  });

  return { scripts, iframes, resources };
}

function pageFromHtml(
  html: string,
  finalUrl: string,
  requestedUrl: string,
  status: number,
  headers: Headers,
  redirectChain: string[],
  index: number,
): PageEvidence {
  const $ = cheerio.load(html);
  const origin = new URL(finalUrl);
  const isHttps = origin.protocol === "https:";
  const rawText = normalizeText($("body").text() || $("html").text());
  const signals = emptySignals(rawText);
  const headings = $("h1,h2,h3,h4,h5,h6")
    .toArray()
    .map((heading) => ({
      level: Number(heading.tagName.replace("h", "")) || 0,
      text: normalizeText($(heading).text()).slice(0, 300),
    }))
    .filter((heading) => heading.text.length > 0);

  const links: LinkEvidence[] = [];
  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href") ?? "";
    const text = normalizeText($(anchor).text()).slice(0, 300);
    const resolved = resolveLink(finalUrl, href);
    if (!resolved) return;
    links.push({
      href: redactUrl(resolved),
      text,
      internal: isSameSite(resolved, finalUrl),
      kind: classifyLink(resolved, text),
    });
  });

  const forms = parseForms($, finalUrl, origin.hostname, origin.protocol);
  const { scripts, iframes, resources } = parseResources(
    $,
    finalUrl,
    origin.hostname,
    isHttps,
  );
  if (!isHttps && finalUrl.startsWith("http:")) {
    for (const resource of resources) {
      resource.insecure = resource.url.startsWith("http:");
    }
  }

  const thirdPartyHosts = [...new Set(
    resources
      .filter((resource) => resource.thirdParty)
      .map((resource) => resource.host),
  )];

  return {
    id: `page_${index}`,
    requestedUrl: redactUrl(requestedUrl),
    finalUrl: redactUrl(finalUrl),
    status,
    ok: status >= 200 && status < 400,
    contentType: headers.get("content-type"),
    headers: selectSafeHeaders(headers),
    title: normalizeText($("title").first().text()) || null,
    language: $("html").attr("lang") ?? null,
    headings,
    textExcerpt: truncate(redactText(rawText), 24000),
    signals,
    links,
    forms,
    scripts,
    iframes,
    resources,
    thirdPartyHosts,
    setCookieNames: parseSetCookieNames(headers),
    cookies: parseCookieAttributes(headers).map((cookie) => ({
      ...cookie,
      thirdParty: false,
    })),
    redirectChain: redirectChain.map(redactUrl),
    error: null,
    fetchedAt: new Date().toISOString(),
    rendered: false,
  };
}

function failurePage(
  requestedUrl: string,
  error: string,
  index: number,
  status: number | null = null,
): PageEvidence {
  return {
    id: `page_${index}`,
    requestedUrl: redactUrl(requestedUrl),
    finalUrl: redactUrl(requestedUrl),
    status,
    ok: false,
    contentType: null,
    headers: {},
    title: null,
    language: null,
    headings: [],
    textExcerpt: "",
    signals: emptySignals(""),
    links: [],
    forms: [],
    scripts: [],
    iframes: [],
    resources: [],
    thirdPartyHosts: [],
    setCookieNames: [],
    cookies: [],
    redirectChain: [],
    error: redactText(error),
    fetchedAt: new Date().toISOString(),
    rendered: false,
  };
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    throw new Error(
      `Response body is ${contentLength} bytes, above the ${maxBytes}-byte limit.`,
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(`Response body exceeded the ${maxBytes}-byte limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

async function fetchSafe(
  input: string,
  options: {
    maxRedirects: number;
    timeoutMs: number;
    maxBytes: number;
    allowPrivateNetworks?: boolean;
    cookieHeader?: string | null;
  },
): Promise<FetchResult> {
  let current = await assertPublicTarget(input, {
    allowPrivateNetworks: options.allowPrivateNetworks,
  });
  const redirectChain: string[] = [current.toString()];
  const headers = options.cookieHeader
    ? { ...DEFAULT_HEADERS, cookie: options.cookieHeader }
    : DEFAULT_HEADERS;

  for (let redirect = 0; redirect <= options.maxRedirects; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        headers,
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error("Request timed out.");
      }
      const cause =
        error instanceof Error
          ? (error.cause as { code?: string; message?: string } | undefined)
          : undefined;
      const detail =
        cause?.code ??
        cause?.message ??
        (error instanceof Error ? error.message : "unknown network error");
      throw new Error(`Request failed: ${detail}`);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Redirect ${response.status} did not include a Location header.`);
      }
      if (redirect === options.maxRedirects) {
        throw new Error(`Redirect limit of ${options.maxRedirects} exceeded.`);
      }
      const next = new URL(location, current);
      const safeNext = await assertPublicTarget(next, {
        allowPrivateNetworks: options.allowPrivateNetworks,
      });
      if (!isSameSite(safeNext, current)) {
        throw new UnsafeTargetError("Cross-origin redirects are not followed.");
      }
      current = safeNext;
      redirectChain.push(current.toString());
      continue;
    }

    const body = await readLimitedBody(response, options.maxBytes);
    return {
      requestedUrl: input,
      finalUrl: current.toString(),
      status: response.status,
      headers: response.headers,
      contentType: response.headers.get("content-type"),
      body,
      redirectChain,
    };
  }

  throw new Error("Redirect handling failed.");
}

function isHtml(contentType: string | null): boolean {
  if (!contentType) return false;
  return HTML_TYPES.some((type) => contentType.toLowerCase().includes(type));
}

async function discoverResource(
  baseUrl: string,
  path: string,
  options: {
    maxRedirects: number;
    timeoutMs: number;
    maxBytes: number;
    allowPrivateNetworks?: boolean;
    cookieHeader?: string | null;
  },
): Promise<ResourceDiscoveryEvidence> {
  const url = new URL(path, baseUrl).toString();
  try {
    const result = await fetchSafe(url, {
      ...options,
      maxBytes: Math.min(options.maxBytes, 512_000),
    });
    const discoveredUrls: string[] = [];
    if (path.includes("robots")) {
      for (const line of result.body.split(/\r?\n/)) {
        const match = /^\s*sitemap:\s*(.+)\s*$/i.exec(line);
        if (match?.[1]) {
          try {
            discoveredUrls.push(normalizeUrl(match[1]).toString());
          } catch {
            // Ignore malformed sitemap references.
          }
        }
      }
    } else {
      for (const match of result.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        if (match[1]) {
          try {
            discoveredUrls.push(normalizeUrl(match[1].trim()).toString());
          } catch {
            // Ignore malformed sitemap entries.
          }
        }
      }
    }
    return {
      url: redactUrl(result.finalUrl),
      status: result.status,
      contentType: result.contentType,
      bodyExcerpt: truncate(redactText(result.body), 4000),
      discoveredUrls: [...new Set(discoveredUrls)].slice(0, 200),
      error: null,
    };
  } catch (error) {
    return {
      url: redactUrl(url),
      status: null,
      contentType: null,
      bodyExcerpt: "",
      discoveredUrls: [],
      error: redactText(error instanceof Error ? error.message : "Discovery failed."),
    };
  }
}

export async function crawlSite(options: CrawlOptions): Promise<CrawlResult> {
  const startedAt = new Date().toISOString();
  const deadline = options.deadline ?? Date.now() + options.timeBudgetMs;
  const budgetMinutes = Math.max(1, Math.round(options.timeBudgetMs / 60_000));
  const start = await assertPublicTarget(options.targetUrl, {
    allowPrivateNetworks: options.allowPrivateNetworks,
  });
  const origin = start.origin;
  const siteScope = start;
  const pages: PageEvidence[] = [];
  const limitations: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const finalSeen = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [
    { url: start.toString(), depth: 0 },
  ];
  const stats: CrawlStats = {
    pagesAttempted: 0,
    pagesSucceeded: 0,
    pagesFailed: 0,
    duplicatesSkipped: 0,
    outOfScopeSkipped: 0,
    blockedTargets: 0,
    maxDepthReached: 0,
    startedAt,
    finishedAt: null,
  };

  const fetchOptions = {
    maxRedirects: options.maxRedirects,
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes,
    allowPrivateNetworks: options.allowPrivateNetworks,
    cookieHeader: options.cookieHeader ?? null,
  };

  const remainingAtStart = Math.max(1000, deadline - Date.now());
  const discoveryOptions = {
    ...fetchOptions,
    timeoutMs: Math.min(options.timeoutMs, remainingAtStart),
  };
  const robots = await discoverResource(origin, "/robots.txt", discoveryOptions);
  const sitemap = await discoverResource(origin, "/sitemap.xml", discoveryOptions);

  for (const candidate of [...robots.discoveredUrls, ...sitemap.discoveredUrls]) {
    let key: string;
    try {
      key = urlKey(candidate);
    } catch {
      continue;
    }
    if (!isSameSite(key, siteScope)) continue;
    if (seen.has(key)) continue;
    if (queue.some((queued) => queued.url === key)) continue;
    queue.push({ url: key, depth: 1 });
  }

  while (queue.length > 0 && Date.now() < deadline) {
    queue.sort((a, b) => a.depth - b.depth);
    const next = queue.shift();
    if (!next) break;

    let normalized: string;
    try {
      normalized = urlKey(next.url);
    } catch {
      stats.outOfScopeSkipped += 1;
      continue;
    }

    if (seen.has(normalized)) {
      stats.duplicatesSkipped += 1;
      continue;
    }
    seen.add(normalized);

    if (!isSameSite(normalized, siteScope)) {
      stats.outOfScopeSkipped += 1;
      continue;
    }

    stats.pagesAttempted += 1;
    stats.maxDepthReached = Math.max(stats.maxDepthReached, next.depth);
    options.onProgress?.({
      message: `Crawling ${normalized}`,
      url: normalized,
      level: "info",
      attempted: stats.pagesAttempted,
      succeeded: stats.pagesSucceeded,
      failed: stats.pagesFailed,
      pending: queue.length,
    });
    let page: PageEvidence;

    try {
      const remaining = Math.max(1000, deadline - Date.now());
      const result = await fetchSafe(normalized, {
        ...fetchOptions,
        timeoutMs: Math.min(options.timeoutMs, remaining),
      });
      if (!isHtml(result.contentType)) {
        page = failurePage(
          normalized,
          `Unsupported content type: ${result.contentType ?? "unknown"}.`,
          pages.length + 1,
          result.status,
        );
        page.finalUrl = redactUrl(result.finalUrl);
        page.headers = selectSafeHeaders(result.headers);
        errors.push(`${normalized}: unsupported content type ${result.contentType ?? "unknown"}.`);
      } else {
        page = pageFromHtml(
          result.body,
          result.finalUrl,
          normalized,
          result.status,
          result.headers,
          result.redirectChain,
          pages.length + 1,
        );
        if (!page.ok) {
          errors.push(`${normalized}: HTTP ${result.status}.`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown crawl error.";
      page = failurePage(normalized, message, pages.length + 1);
      if (error instanceof UnsafeTargetError) stats.blockedTargets += 1;
      errors.push(`${normalized}: ${message}`);
    }

    if (page.ok) {
      let finalKey: string | null = null;
      try {
        finalKey = urlKey(page.finalUrl);
      } catch {
        finalKey = null;
      }
      if (finalKey && finalSeen.has(finalKey)) {
        stats.duplicatesSkipped += 1;
        stats.pagesAttempted -= 1;
        continue;
      }
      if (finalKey) finalSeen.add(finalKey);
      stats.pagesSucceeded += 1;
    } else {
      stats.pagesFailed += 1;
    }

    pages.push(page);

    options.onProgress?.({
      message: `${page.ok ? "Fetched" : "Failed"} ${normalized}${
        typeof page.status === "number" ? ` (HTTP ${page.status})` : ""
      }`,
      url: normalized,
      level: page.ok ? "success" : "warning",
      attempted: stats.pagesAttempted,
      succeeded: stats.pagesSucceeded,
      failed: stats.pagesFailed,
      pending: queue.length,
    });

    if (!page.ok) continue;

    for (const link of page.links) {
      if (!link.internal) continue;
      const key = urlKey(link.href);
      if (seen.has(key)) continue;
      if (!queue.some((queued) => queued.url === key)) {
        queue.push({ url: key, depth: next.depth + 1 });
      }
    }

    for (const link of page.links) {
      if (!link.internal) {
        stats.outOfScopeSkipped += 1;
      }
      if (
        link.kind === "privacy" ||
        link.kind === "grievance" ||
        link.kind === "rights" ||
        link.kind === "cookie"
      ) {
        const key = urlKey(link.href);
        if (!seen.has(key) && isSameSite(key, siteScope)) {
          const existingIndex = queue.findIndex((queued) => queued.url === key);
          if (existingIndex >= 0) {
            queue[existingIndex] = { url: key, depth: next.depth + 1 };
          } else {
            queue.unshift({ url: key, depth: next.depth + 1 });
          }
        }
      }
    }
  }

  const timeLimitReached = queue.length > 0 && Date.now() >= deadline;
  if (timeLimitReached) {
    limitations.push(
      `Crawl stopped after the ${budgetMinutes}-minute time limit with ${queue.length} URL(s) still queued. The site may be large or slow to load; this report covers only the pages fetched within the limit.`,
    );
  }
  if (stats.pagesFailed > 0) {
    limitations.push(
      `${stats.pagesFailed} page(s) failed or were not assessable; their checks may be NOT_ASSESSED rather than PASS.`,
    );
  }
  if (options.browserEnabled) {
    limitations.push(
      "Browser evidence was requested. Static crawl evidence remains the source for all non-browser checks.",
    );
  } else {
    limitations.push(
      "Browser rendering was not enabled. JavaScript-only content and consent behaviour may be NOT_ASSESSED.",
    );
  }

  stats.finishedAt = new Date().toISOString();

  return {
    startPage: pages[0] ?? null,
    pages,
    robots,
    sitemap,
    stats,
    timeLimitReached,
    limitations,
    errors,
  };
}
