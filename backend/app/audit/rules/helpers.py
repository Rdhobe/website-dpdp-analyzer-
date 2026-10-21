from __future__ import annotations

import re
from typing import Optional

from ..evidence import create_evidence
from ..types import (
    AuditContext,
    CookieEvidence,
    EvidenceItem,
    FormEvidence,
    LinkEvidence,
    PageEvidence,
    RuleOutcome,
)


def evidence_for_page(
    page: PageEvidence, kind: str, summary: str, data: object
) -> EvidenceItem:
    return create_evidence(kind, page.final_url, summary, data)


def evidence_for_run(
    context: AuditContext, kind: str, summary: str, data: object
) -> EvidenceItem:
    payload: dict[str, object] = {"targetUrl": context.target_url}
    if isinstance(data, dict):
        payload.update(data)
    else:
        payload["value"] = data
    return create_evidence(kind, None, summary, payload)


def outcome(
    status: str,
    reasoning: str,
    options: Optional[dict] = None,
) -> RuleOutcome:
    values = dict(options or {})
    return RuleOutcome(status=status, reasoning=reasoning, **values)


def pass_(reasoning: str, options: Optional[dict] = None) -> RuleOutcome:
    return outcome("PASS", reasoning, {"confidence": "high", **(options or {})})


def fail(reasoning: str, options: Optional[dict] = None) -> RuleOutcome:
    return outcome("FAIL", reasoning, {"confidence": "high", **(options or {})})


def warning(reasoning: str, options: Optional[dict] = None) -> RuleOutcome:
    return outcome("WARNING", reasoning, {"confidence": "medium", **(options or {})})


def needs_review(reasoning: str, options: Optional[dict] = None) -> RuleOutcome:
    return outcome(
        "NEEDS_REVIEW",
        reasoning,
        {"confidence": "low", "human_review_required": True, **(options or {})},
    )


def not_assessed(reasoning: str, options: Optional[dict] = None) -> RuleOutcome:
    return outcome("NOT_ASSESSED", reasoning, {"confidence": "low", **(options or {})})


def not_applicable(reasoning: str, options: Optional[dict] = None) -> RuleOutcome:
    return outcome(
        "NOT_APPLICABLE", reasoning, {"confidence": "medium", **(options or {})}
    )


def notice_pages(context: AuditContext) -> list[PageEvidence]:
    return [
        page
        for page in context.pages
        if page.ok
        and (
            page.signals.has_privacy_notice_language
            or re.search(r"privacy|data[- ]protection|policy", page.final_url, re.I)
            or any(link.kind == "privacy" for link in page.links)
        )
    ]


def primary_notice_page(context: AuditContext) -> Optional[PageEvidence]:
    pages = notice_pages(context)
    for page in pages:
        if (
            page.signals.notice_word_count >= 150
            and len(page.signals.personal_data_categories) >= 2
        ):
            return page
    for page in pages:
        if page.signals.notice_word_count >= 80:
            return page
    return pages[0] if pages else None


def rights_pages(context: AuditContext) -> list[PageEvidence]:
    return [
        page
        for page in context.pages
        if page.signals.rights_categories
        or re.search(r"rights|grievance|complaint|privacy", page.final_url, re.I)
    ]


def all_links(context: AuditContext, kind: str) -> list[LinkEvidence]:
    seen: set[str] = set()
    links: list[LinkEvidence] = []
    for page in context.pages:
        for link in page.links:
            if link.kind != kind or link.href in seen:
                continue
            seen.add(link.href)
            links.append(link)
    return links


def all_forms(context: AuditContext) -> list[FormEvidence]:
    return [form for page in context.pages for form in page.forms]


def all_cookies(context: AuditContext) -> list[CookieEvidence]:
    cookies: list[CookieEvidence] = []
    if context.browser:
        for snapshot in (
            context.browser.initial,
            context.browser.after_accept,
            context.browser.after_reject,
        ):
            if snapshot:
                cookies.extend(snapshot.cookies)
    seen = {cookie.name for cookie in cookies}
    for page in context.pages:
        for cookie in page.cookies:
            if cookie.name not in seen:
                seen.add(cookie.name)
                cookies.append(cookie)
    return cookies


def tracker_requests(context: AuditContext, state: str) -> list[dict]:
    snapshot = getattr(context.browser, state, None) if context.browser else None
    if not snapshot:
        return []
    unique: dict[str, dict] = {}
    for request in snapshot.requests:
        if not request.known_tracker or request.host in unique:
            continue
        unique[request.host] = {
            "host": request.host,
            "category": request.tracker_category,
            "matchedDomain": request.tracker_match,
            "url": request.url,
            "method": request.method,
            "resourceType": request.resource_type,
            "thirdParty": request.third_party,
            "timestamp": request.timestamp,
        }
    return list(unique.values())


def has_browser(context: AuditContext) -> bool:
    return bool(context.browser and context.browser.available and context.browser.initial)


def site_text(context: AuditContext) -> str:
    return "\n".join(page.text_excerpt for page in notice_pages(context))[:120000]


def total_notice_words(context: AuditContext) -> int:
    return sum(page.signals.notice_word_count for page in notice_pages(context))


def link_target_found(
    context: AuditContext, link: LinkEvidence
) -> Optional[PageEvidence]:
    for page in context.pages:
        if (
            page.requested_url == link.href
            or page.final_url == link.href
            or page.requested_url.rstrip("/") == link.href.rstrip("/")
        ):
            return page
    return None


def unique_urls(pages: list[PageEvidence]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for page in pages:
        if page.final_url not in seen:
            seen.add(page.final_url)
            result.append(page.final_url)
    return result


def mask_host(host: str) -> str:
    return host
