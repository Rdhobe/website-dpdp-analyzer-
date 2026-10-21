import { createEvidence } from "../evidence";
import type {
  AuditContext,
  CookieEvidence,
  EvidenceItem,
  FormEvidence,
  LinkEvidence,
  PageEvidence,
  RuleOutcome,
} from "../types";

export function evidenceForPage(
  page: PageEvidence,
  kind: string,
  summary: string,
  data: unknown,
): EvidenceItem {
  return createEvidence(kind, page.finalUrl, summary, data);
}

export function evidenceForRun(
  context: AuditContext,
  kind: string,
  summary: string,
  data: unknown,
): EvidenceItem {
  return createEvidence(kind, null, summary, {
    targetUrl: context.targetUrl,
    ...((data && typeof data === "object") ? data : { value: data }),
  });
}

export function outcome(
  status: RuleOutcome["status"],
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return { status, reasoning, ...options };
}

export function pass(
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return outcome("PASS", reasoning, { confidence: "high", ...options });
}

export function fail(
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return outcome("FAIL", reasoning, { confidence: "high", ...options });
}

export function warning(
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return outcome("WARNING", reasoning, { confidence: "medium", ...options });
}

export function needsReview(
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return outcome("NEEDS_REVIEW", reasoning, {
    confidence: "low",
    humanReviewRequired: true,
    ...options,
  });
}

export function notAssessed(
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return outcome("NOT_ASSESSED", reasoning, { confidence: "low", ...options });
}

export function notApplicable(
  reasoning: string,
  options: Partial<Omit<RuleOutcome, "status" | "reasoning">> = {},
): RuleOutcome {
  return outcome("NOT_APPLICABLE", reasoning, { confidence: "medium", ...options });
}

export function noticePages(context: AuditContext): PageEvidence[] {
  return context.pages.filter(
    (page) =>
      page.ok &&
      (page.signals.hasPrivacyNoticeLanguage ||
        /privacy|data[- ]protection|policy/i.test(page.finalUrl) ||
        page.links.some((link) => link.kind === "privacy")),
  );
}

export function primaryNoticePage(context: AuditContext): PageEvidence | null {
  const pages = noticePages(context);
  return (
    pages.find(
      (page) =>
        page.signals.noticeWordCount >= 150 &&
        page.signals.personalDataCategories.length >= 2,
    ) ??
    pages.find((page) => page.signals.noticeWordCount >= 80) ??
    pages[0] ??
    null
  );
}

export function rightsPages(context: AuditContext): PageEvidence[] {
  return context.pages.filter(
    (page) =>
      page.signals.rightsCategories.length > 0 ||
      /rights|grievance|complaint|privacy/i.test(page.finalUrl),
  );
}

export function allLinks(context: AuditContext, kind: LinkEvidence["kind"]): LinkEvidence[] {
  const seen = new Set<string>();
  const links: LinkEvidence[] = [];
  for (const page of context.pages) {
    for (const link of page.links) {
      if (link.kind !== kind || seen.has(link.href)) continue;
      seen.add(link.href);
      links.push(link);
    }
  }
  return links;
}

export function allForms(context: AuditContext): FormEvidence[] {
  return context.pages.flatMap((page) => page.forms);
}

export function allCookies(context: AuditContext): CookieEvidence[] {
  const cookies: CookieEvidence[] = context.browser
    ? [
        ...(context.browser.initial?.cookies ?? []),
        ...(context.browser.afterAccept?.cookies ?? []),
        ...(context.browser.afterReject?.cookies ?? []),
      ]
    : [];
  const seen = new Set(cookies.map((cookie) => cookie.name));
  for (const page of context.pages) {
    for (const cookie of page.cookies) {
      if (!seen.has(cookie.name)) {
        seen.add(cookie.name);
        cookies.push(cookie);
      }
    }
  }
  return cookies;
}

export function trackerRequests(
  context: AuditContext,
  state: "initial" | "afterReject" | "afterAccept" | "afterWithdraw" | "afterReload",
): Array<{
  host: string;
  category: string | null;
  matchedDomain: string | null;
  url: string;
  method: string;
  resourceType: string;
  thirdParty: boolean;
  timestamp: string;
}> {
  const snapshot = context.browser?.[state];
  if (!snapshot) return [];
  const unique = new Map<
    string,
    {
      host: string;
      category: string | null;
      matchedDomain: string | null;
      url: string;
      method: string;
      resourceType: string;
      thirdParty: boolean;
      timestamp: string;
    }
  >();
  for (const request of snapshot.requests) {
    if (!request.knownTracker) continue;
    if (unique.has(request.host)) continue;
    unique.set(request.host, {
      host: request.host,
      category: request.trackerCategory,
      matchedDomain: request.trackerMatch,
      url: request.url,
      method: request.method,
      resourceType: request.resourceType,
      thirdParty: request.thirdParty,
      timestamp: request.timestamp,
    });
  }
  return [...unique.values()];
}

export function hasBrowser(context: AuditContext): boolean {
  return Boolean(context.browser?.available && context.browser.initial);
}

export function siteText(context: AuditContext): string {
  return noticePages(context)
    .map((page) => page.textExcerpt)
    .join("\n")
    .slice(0, 120000);
}

export function totalNoticeWords(context: AuditContext): number {
  return noticePages(context).reduce(
    (total, page) => total + page.signals.noticeWordCount,
    0,
  );
}

export function linkTargetFound(
  context: AuditContext,
  link: LinkEvidence,
): PageEvidence | null {
  return (
    context.pages.find(
      (page) =>
        page.requestedUrl === link.href ||
        page.finalUrl === link.href ||
        page.requestedUrl.replace(/\/$/, "") === link.href.replace(/\/$/, ""),
    ) ?? null
  );
}

export function uniqueUrls(pages: PageEvidence[]): string[] {
  return [...new Set(pages.map((page) => page.finalUrl))];
}

export function maskHost(host: string): string {
  return host;
}
