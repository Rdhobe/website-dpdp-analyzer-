from __future__ import annotations

import re

from ..types import AuditContext, RuleOutcome, to_dict
from .helpers import (
    all_forms,
    all_links,
    evidence_for_run,
    fail,
    link_target_found,
    not_applicable,
    not_assessed,
    pass_,
    warning,
)


def _homepage(context: AuditContext) -> RuleOutcome:
    page = context.start_page
    if page is None:
        return not_assessed(
            "No homepage response was captured.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "crawl-error",
                        "Crawl produced no start page.",
                        {"errors": to_dict(context.crawl_stats)},
                    )
                ]
            },
        )
    if not page.ok or page.status is None or page.status >= 400:
        status = "none" if page.status is None else page.status
        detail = f" {page.error}" if page.error else ""
        return fail(
            f"The homepage could not be retrieved (status {status}).{detail}",
            {
                "affected_urls": [page.requested_url],
                "evidence": [
                    evidence_for_run(
                        context,
                        "http-status",
                        "Homepage response status and redirects.",
                        {
                            "requestedUrl": page.requested_url,
                            "finalUrl": page.final_url,
                            "status": page.status,
                            "redirectChain": list(page.redirect_chain),
                            "error": page.error,
                        },
                    )
                ],
            },
        )
    reasoning = (
        f"The homepage resolved after {len(page.redirect_chain) - 1} redirect(s) "
        f"to {page.final_url}."
        if len(page.redirect_chain) > 1
        else "The homepage returned a successful HTML response."
    )
    return pass_(
        reasoning,
        {
            "affected_urls": [page.requested_url],
            "evidence": [
                evidence_for_run(
                    context,
                    "http-status",
                    "Homepage resolved successfully.",
                    {
                        "requestedUrl": page.requested_url,
                        "finalUrl": page.final_url,
                        "status": page.status,
                        "redirectChain": list(page.redirect_chain),
                    },
                )
            ],
        },
    )


def _privacy_discovery(context: AuditContext) -> RuleOutcome:
    links = all_links(context, "privacy")
    accessible = [
        {"link": link, "page": link_target_found(context, link)}
        for link in links
        if link_target_found(context, link) is not None
        and link_target_found(context, link).ok
    ]
    if accessible:
        return pass_(
            "A reachable privacy-notice link was discovered and crawled.",
            {
                "affected_urls": [
                    entry["page"].final_url if entry["page"] is not None else entry["link"].href
                    for entry in accessible
                ],
                "evidence": [
                    evidence_for_run(
                        context,
                        "privacy-link",
                        "Reachable privacy links.",
                        {
                            "links": [
                                {
                                    "href": entry["link"].href,
                                    "text": entry["link"].text,
                                    "finalUrl": (
                                        entry["page"].final_url
                                        if entry["page"] is not None
                                        else None
                                    ),
                                }
                                for entry in accessible
                            ]
                        },
                    )
                ],
            },
        )

    external = [link for link in links if not link.internal]
    if external:
        return warning(
            "A privacy link was discovered but points outside the authorized origin; "
            "its content was not verified.",
            {
                "affected_urls": [link.href for link in external],
                "evidence": [
                    evidence_for_run(
                        context,
                        "privacy-link",
                        "External privacy links were not crawled.",
                        {
                            "links": [
                                {"href": link.href, "text": link.text} for link in external
                            ]
                        },
                    )
                ],
            },
        )

    failed_page = None
    for link in links:
        page = link_target_found(context, link)
        if page is not None and not page.ok:
            failed_page = {"link": link, "page": page}
            break
    if failed_page is not None:
        return warning(
            "A privacy link exists, but the target page was not successfully retrieved.",
            {
                "affected_urls": [failed_page["link"].href],
                "evidence": [
                    evidence_for_run(
                        context,
                        "privacy-link",
                        "Privacy link target failed.",
                        {
                            "href": failed_page["link"].href,
                            "status": failed_page["page"].status,
                            "error": failed_page["page"].error,
                        },
                    )
                ],
            },
        )

    if links:
        return warning(
            "A privacy link was discovered but its target was outside the crawler's "
            "page/depth budget, so availability was not verified.",
            {
                "affected_urls": [link.href for link in links],
                "evidence": [
                    evidence_for_run(
                        context,
                        "privacy-link",
                        "Privacy link was not crawled.",
                        {
                            "links": [
                                {"href": link.href, "text": link.text} for link in links
                            ],
                            "crawlStats": to_dict(context.crawl_stats),
                        },
                    )
                ],
            },
        )

    notice = next(
        (page for page in context.pages if page.signals.has_privacy_notice_language),
        None,
    )
    if notice is not None:
        return warning(
            "A page with privacy-notice language was crawled, but no privacy link was "
            "discovered from the inspected pages.",
            {
                "affected_urls": [notice.final_url],
                "evidence": [
                    evidence_for_run(
                        context,
                        "privacy-page",
                        "Notice-like page without a discovered link.",
                        {"finalUrl": notice.final_url, "title": notice.title},
                    )
                ],
            },
        )

    return fail(
        "No privacy-notice link or notice-like page was discovered in the crawl.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "privacy-link",
                    "No privacy link was discovered.",
                    {
                        "pagesInspected": context.crawl_stats.pages_attempted,
                        "errors": list(context.limitations),
                    },
                )
            ]
        },
    )


def _cookie_discovery(context: AuditContext) -> RuleOutcome:
    links = all_links(context, "cookie")
    cookie_text = any(
        re.search(r"cookie|consent preference", page.text_excerpt, re.I)
        for page in context.pages
    )
    trackers = [
        request
        for request in (
            context.browser.initial.requests
            if context.browser is not None and context.browser.initial is not None
            else []
        )
        if request.known_tracker
    ]
    has_cookies = any(page.set_cookie_names for page in context.pages)
    applicable = has_cookies or bool(trackers) or cookie_text

    if not applicable:
        return not_applicable(
            "No cookie notice, cookie, or known tracker signal was observed; the notice "
            "may not be applicable to the inspected pages.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "cookie-signal",
                        "No cookie or tracker signal observed.",
                        {"pagesInspected": context.crawl_stats.pages_attempted},
                    )
                ]
            },
        )

    if links or cookie_text:
        return pass_(
            "Cookie-related content or a cookie link was discovered.",
            {
                "affected_urls": [link.href for link in links],
                "evidence": [
                    evidence_for_run(
                        context,
                        "cookie-link",
                        "Cookie-related discovery evidence.",
                        {
                            "links": [
                                {"href": link.href, "text": link.text} for link in links
                            ],
                            "cookieTextObserved": cookie_text,
                            "setCookieNames": [
                                name for page in context.pages for name in page.set_cookie_names
                            ],
                        },
                    )
                ],
            },
        )

    return warning(
        "Cookies or known trackers were observed without a discovered cookie notice.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "cookie-signal",
                    "Tracking observed without cookie notice discovery.",
                    {
                        "setCookieNames": [
                            name for page in context.pages for name in page.set_cookie_names
                        ],
                        "trackers": [request.host for request in trackers],
                    },
                )
            ]
        },
    )


def _grievance_discovery(context: AuditContext) -> RuleOutcome:
    links = [*all_links(context, "grievance"), *all_links(context, "contact")]
    accessible = []
    for link in links:
        page = link_target_found(context, link)
        if page is not None and page.ok:
            accessible.append({"link": link, "page": page})
    if accessible:
        return pass_(
            "A reachable grievance or contact page was discovered.",
            {
                "affected_urls": [
                    entry["page"].final_url if entry["page"] is not None else entry["link"].href
                    for entry in accessible
                ],
                "evidence": [
                    evidence_for_run(
                        context,
                        "grievance-link",
                        "Reachable grievance/contact links.",
                        {
                            "links": [
                                {
                                    "href": entry["link"].href,
                                    "text": entry["link"].text,
                                    "finalUrl": (
                                        entry["page"].final_url
                                        if entry["page"] is not None
                                        else None
                                    ),
                                }
                                for entry in accessible
                            ]
                        },
                    )
                ],
            },
        )
    contact_pages = [
        page
        for page in context.pages
        if page.signals.has_email
        or page.signals.has_phone
        or page.signals.has_contact_language
    ]
    if contact_pages:
        return warning(
            "Contact or grievance language was found, but no accessible grievance/contact "
            "page was verified.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "contact-signal",
                        "Contact language without a verified destination.",
                        {"pages": [page.final_url for page in contact_pages]},
                    )
                ]
            },
        )
    return warning(
        "No grievance or contact page was discovered. This is a review signal, not "
        "proof that no mechanism exists.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "grievance-link",
                    "No grievance/contact link found.",
                    {"pagesInspected": context.crawl_stats.pages_attempted},
                )
            ]
        },
    )


def _rights_discovery(context: AuditContext) -> RuleOutcome:
    links = all_links(context, "rights")
    accessible = []
    for link in links:
        page = link_target_found(context, link)
        if page is not None and page.ok:
            accessible.append({"link": link, "page": page})
    if accessible:
        return pass_(
            "A reachable rights-related page was discovered.",
            {
                "affected_urls": [
                    entry["page"].final_url if entry["page"] is not None else entry["link"].href
                    for entry in accessible
                ],
                "evidence": [
                    evidence_for_run(
                        context,
                        "rights-link",
                        "Reachable rights links.",
                        {
                            "links": [
                                {"href": entry["link"].href, "text": entry["link"].text}
                                for entry in accessible
                            ]
                        },
                    )
                ],
            },
        )
    rights_text = next(
        (page for page in context.pages if page.signals.rights_categories),
        None,
    )
    if rights_text is not None:
        return warning(
            "Rights language was found, but no dedicated rights/request page was verified.",
            {
                "affected_urls": [rights_text.final_url],
                "evidence": [
                    evidence_for_run(
                        context,
                        "rights-text",
                        "Rights language without a dedicated page.",
                        {
                            "finalUrl": rights_text.final_url,
                            "rightsCategories": list(rights_text.signals.rights_categories),
                        },
                    )
                ],
            },
        )
    return warning(
        "No rights page or rights language was discovered. Applicability and the actual "
        "mechanism require review.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "rights-link",
                    "No rights discovery signal.",
                    {"pagesInspected": context.crawl_stats.pages_attempted},
                )
            ]
        },
    )


def _form_discovery(context: AuditContext) -> RuleOutcome:
    forms = all_forms(context)
    if not forms:
        return not_applicable(
            "No HTML forms were discovered; there may be no personal-data collection "
            "point on the inspected pages.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "form-inventory",
                        "No forms found.",
                        {"pagesInspected": context.crawl_stats.pages_attempted},
                    )
                ]
            },
        )
    page_urls = list(dict.fromkeys(form.page_url for form in forms))
    return pass_(
        f"{len(forms)} form(s) were discovered across {len(page_urls)} page(s).",
        {
            "affected_urls": page_urls,
            "evidence": [
                evidence_for_run(
                    context,
                    "form-inventory",
                    "Discovered form inventory.",
                    {
                        "forms": [
                            {
                                "pageUrl": form.page_url,
                                "action": form.absolute_action,
                                "method": form.method,
                                "fieldCount": len(form.fields),
                            }
                            for form in forms
                        ]
                    },
                )
            ],
        },
    )


def _js_rendered_content(context: AuditContext) -> RuleOutcome:
    if (
        context.browser is None
        or not context.browser.available
        or context.browser.initial is None
        or context.start_page is None
    ):
        limitations = (
            context.browser.limitations
            if context.browser is not None
            else context.limitations
        )
        return not_assessed(
            "Browser evidence was not available, so JavaScript-only content could not "
            "be compared with static HTML.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "browser-evidence",
                        "Browser rendering unavailable.",
                        {"limitations": list(limitations)},
                    )
                ]
            },
        )
    static_length = len(context.start_page.text_excerpt)
    rendered_length = len(context.browser.initial.text_excerpt)
    material_difference = rendered_length > max(static_length * 1.3, static_length + 300)
    return pass_(
        (
            "The rendered DOM contained materially more text than the static HTML, "
            "indicating JavaScript-rendered content."
            if material_difference
            else "No material JavaScript-only content difference was detected on the homepage."
        ),
        {
            "confidence": "high" if material_difference else "low",
            "affected_urls": [context.start_page.final_url],
            "evidence": [
                evidence_for_run(
                    context,
                    "dom-comparison",
                    "Static versus rendered text length.",
                    {
                        "staticCharacters": static_length,
                        "renderedCharacters": rendered_length,
                        "materialDifference": material_difference,
                    },
                )
            ],
            "limitations": "A text-length comparison is not a complete discovery of "
            "client-rendered pages or hidden content.",
        },
    )


def _failed_pages(context: AuditContext) -> RuleOutcome:
    failures = [page for page in context.pages if not page.ok]
    if failures:
        return fail(
            f"{len(failures)} page(s) failed or could not be assessed during the crawl.",
            {
                "affected_urls": [page.requested_url for page in failures],
                "evidence": [
                    evidence_for_run(
                        context,
                        "crawl-failure",
                        "Failed page attempts.",
                        {
                            "failures": [
                                {
                                    "requestedUrl": page.requested_url,
                                    "status": page.status,
                                    "error": page.error,
                                }
                                for page in failures
                            ],
                            "crawlStats": to_dict(context.crawl_stats),
                        },
                    )
                ],
            },
        )
    if context.errors:
        return warning(
            "No page returned an HTTP error, but crawl-level errors were recorded.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "crawl-error",
                        "Crawl errors.",
                        {
                            "errors": list(context.errors),
                            "crawlStats": to_dict(context.crawl_stats),
                        },
                    )
                ]
            },
        )
    return pass_(
        "No failed pages were recorded in the inspected scope.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "crawl-success",
                    "Crawl page outcomes.",
                    {
                        "pagesAttempted": context.crawl_stats.pages_attempted,
                        "pagesSucceeded": context.crawl_stats.pages_succeeded,
                    },
                )
            ]
        },
    )


def _sitemap_discovery(context: AuditContext) -> RuleOutcome:
    robots_ok = context.robots is not None and context.robots.status == 200
    sitemap_ok = context.sitemap is not None and context.sitemap.status == 200
    if robots_ok or sitemap_ok:
        return pass_(
            "robots.txt and/or sitemap.xml was accessible.",
            {
                "evidence": [
                    evidence_for_run(
                        context,
                        "discovery-files",
                        "Discovery file status.",
                        {
                            "robots": to_dict(context.robots),
                            "sitemap": to_dict(context.sitemap),
                        },
                    )
                ]
            },
        )
    return warning(
        "Neither robots.txt nor sitemap.xml was accessible; discovery coverage may be "
        "incomplete.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "discovery-files",
                    "Discovery files unavailable.",
                    {
                        "robots": to_dict(context.robots),
                        "sitemap": to_dict(context.sitemap),
                    },
                )
            ]
        },
    )


def _boundary_enforcement(context: AuditContext) -> RuleOutcome:
    return pass_(
        "The crawler enforced same-origin scope, normalized URL deduplication, and a "
        "fixed run time budget.",
        {
            "evidence": [
                evidence_for_run(
                    context,
                    "crawl-boundary",
                    "Crawl boundary statistics.",
                    {
                        "sameOriginOnly": context.config.same_origin_only,
                        "timeBudgetMs": context.config.time_budget_ms,
                        "stats": to_dict(context.crawl_stats),
                        "outOfScopeLinksObserved": context.crawl_stats.out_of_scope_skipped,
                    },
                )
            ],
            "limitations": "Links to external origins are recorded but never fetched in "
            "this engine. The crawl follows same-site links until the run time budget is "
            "reached rather than a fixed page or depth limit.",
        },
    )


CRAWL_RULES = {
    "CRAWL-001": _homepage,
    "CRAWL-002": _privacy_discovery,
    "CRAWL-003": _cookie_discovery,
    "CRAWL-004": _grievance_discovery,
    "CRAWL-005": _rights_discovery,
    "CRAWL-006": _form_discovery,
    "CRAWL-007": _js_rendered_content,
    "CRAWL-008": _failed_pages,
    "CRAWL-009": _sitemap_discovery,
    "CRAWL-010": _boundary_enforcement,
}
