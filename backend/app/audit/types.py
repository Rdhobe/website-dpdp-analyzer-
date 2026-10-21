"""Domain models for the DPDP audit engine.

Field names are snake_case in Python and serialized to the camelCase contract
used by the existing Next.js frontend so both engines stay interchangeable.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from enum import Enum
from typing import Any, Callable, Optional

TEST_STATUSES = (
    "PASS",
    "FAIL",
    "WARNING",
    "NEEDS_REVIEW",
    "NOT_ASSESSED",
    "NOT_APPLICABLE",
)

CATEGORIES = {
    "A": "Website discovery and coverage",
    "B": "Privacy notices and transparency",
    "C": "Consent and cookie behaviour",
    "D": "Forms and personal-data collection",
    "E": "Data Principal rights and grievance mechanisms",
    "F": "Children's personal data",
    "G": "Security and technical signals",
    "H": "Third-party processing and transfer indicators",
    "I": "Retention and deletion indicators",
    "J": "Organizational compliance evidence",
}

SEVERITIES = ("critical", "high", "medium", "low", "info")

CONFIDENCES = ("high", "medium", "low")

CLAIM_TYPES = (
    "verified_legal_requirement",
    "regulatory_readiness",
    "potential_privacy_gap",
    "technical_recommendation",
)

CLAIM_TYPE_LABELS = {
    "verified_legal_requirement": "Verified legal requirement",
    "regulatory_readiness": "Regulatory readiness (provision not yet in force)",
    "potential_privacy_gap": "Potential privacy gap",
    "technical_recommendation": "Technical recommendation",
}

LEGAL_EFFECTIVE_STATUSES = (
    "in_force",
    "partially_in_force",
    "not_yet_effective",
    "unknown",
)

COMMENCEMENT_GROUPS = ("immediate", "one_year", "eighteen_months", "unknown")

AUDIT_STATUSES = (
    "queued",
    "running",
    "requires_credentials",
    "completed",
    "failed",
    "partial",
)

PROGRESS_LEVELS = ("info", "success", "warning", "error")

OUTCOME_LEVELS = (
    "failed",
    "credentials_required",
    "not_ready",
    "needs_attention",
    "inconclusive",
    "no_failures",
)

OUTCOME_TONES = ("danger", "warning", "caution", "neutral", "success")


_JSON_ALIASES = {"pass_count": "pass"}


def _camel(name: str) -> str:
    if name in _JSON_ALIASES:
        return _JSON_ALIASES[name]
    head, *tail = name.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in tail)


def to_dict(value: Any) -> Any:
    """Recursively convert dataclasses/enums to a camelCase JSON value."""

    if is_dataclass(value) and not isinstance(value, type):
        return {_camel(key): to_dict(item) for key, item in asdict(value).items()}
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: to_dict(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_dict(item) for item in value]
    return value


@dataclass
class LegalReference:
    id: str = ""
    document_title: str = ""
    provision: str = ""
    source_url: str = ""
    version: str = ""
    published_date: Optional[str] = None
    effective_from: Optional[str] = None
    effective_status: str = "unknown"
    commencement_group: str = "unknown"
    applicability: str = ""
    evidence_required: list[str] = field(default_factory=list)
    summary: str = ""
    verified_on: str = ""
    notes: str = ""


@dataclass
class LegalDocument:
    id: str = ""
    title: str = ""
    source_url: str = ""
    published_date: str = ""
    effective_status: str = "unknown"
    effective_from: Optional[str] = None
    summary: str = ""
    verified_on: str = ""
    notes: str = ""


@dataclass
class SeverityPolicy:
    default_severity: str = "medium"
    escalation: str = ""
    notes: str = ""


@dataclass
class TestDefinition:
    id: str = ""
    name: str = ""
    category: str = "A"
    description: str = ""
    preconditions: list[str] = field(default_factory=list)
    evidence_required: list[str] = field(default_factory=list)
    execution_method: str = ""
    legal_reference_ids: list[str] = field(default_factory=list)
    applicability: str = ""
    claim_type: str = "regulatory_readiness"
    severity_policy: SeverityPolicy = field(default_factory=SeverityPolicy)
    remediation_template: str = ""
    verification_procedure: str = ""
    limitations: str = ""
    version: str = ""
    automated: bool = True


@dataclass
class HeadingEvidence:
    level: int = 1
    text: str = ""


@dataclass
class LinkEvidence:
    href: str = ""
    text: str = ""
    internal: bool = True
    kind: str = "other"


@dataclass
class FormFieldEvidence:
    tag: str = "input"
    type: str = "text"
    name: Optional[str] = None
    label: Optional[str] = None
    autocomplete: Optional[str] = None
    required: bool = False
    disabled: bool = False
    checked: bool = False
    sensitive_category: Optional[str] = None
    redacted: bool = True


@dataclass
class FormEvidence:
    page_url: str = ""
    action: str = ""
    absolute_action: str = ""
    method: str = "get"
    external_destination: bool = False
    fields: list[FormFieldEvidence] = field(default_factory=list)
    has_privacy_link_nearby: bool = False
    consent_checkbox_labels: list[str] = field(default_factory=list)


@dataclass
class ResourceEvidence:
    url: str = ""
    host: str = ""
    kind: str = "other"
    third_party: bool = False
    insecure: bool = False


@dataclass
class CookieEvidence:
    name: str = ""
    secure: bool = False
    http_only: bool = False
    same_site: Optional[str] = None
    session: bool = False
    third_party: bool = False


@dataclass
class NetworkRequestEvidence:
    url: str = ""
    host: str = ""
    method: str = "GET"
    resource_type: str = "other"
    third_party: bool = False
    known_tracker: bool = False
    tracker_category: Optional[str] = None
    tracker_match: Optional[str] = None
    timestamp: str = ""


@dataclass
class PageSignals:
    personal_data_categories: list[str] = field(default_factory=list)
    purposes: list[str] = field(default_factory=list)
    rights_categories: list[str] = field(default_factory=list)
    retention_signal_count: int = 0
    third_party_signal_count: int = 0
    child_terms: list[str] = field(default_factory=list)
    has_email: bool = False
    has_phone: bool = False
    has_contact_language: bool = False
    contradiction_flags: list[str] = field(default_factory=list)
    notice_word_count: int = 0
    average_sentence_length: int = 0
    date_strings: list[str] = field(default_factory=list)
    has_privacy_notice_language: bool = False
    public_personal_data_patterns: list[str] = field(default_factory=list)


@dataclass
class PageEvidence:
    id: str = ""
    requested_url: str = ""
    final_url: str = ""
    status: Optional[int] = None
    ok: bool = False
    content_type: Optional[str] = None
    headers: dict[str, str] = field(default_factory=dict)
    title: Optional[str] = None
    language: Optional[str] = None
    headings: list[HeadingEvidence] = field(default_factory=list)
    text_excerpt: str = ""
    signals: PageSignals = field(default_factory=PageSignals)
    links: list[LinkEvidence] = field(default_factory=list)
    forms: list[FormEvidence] = field(default_factory=list)
    scripts: list[ResourceEvidence] = field(default_factory=list)
    iframes: list[ResourceEvidence] = field(default_factory=list)
    resources: list[ResourceEvidence] = field(default_factory=list)
    third_party_hosts: list[str] = field(default_factory=list)
    set_cookie_names: list[str] = field(default_factory=list)
    cookies: list[CookieEvidence] = field(default_factory=list)
    redirect_chain: list[str] = field(default_factory=list)
    error: Optional[str] = None
    fetched_at: str = ""
    rendered: bool = False


@dataclass
class ScreenshotRef:
    name: str = ""
    kind: str = "full-page"
    label: str = ""
    page_url: str = ""
    selector: Optional[str] = None
    captured_at: str = ""


@dataclass
class VisualEvidence:
    available: bool = False
    limitations: list[str] = field(default_factory=list)
    screenshots: list[ScreenshotRef] = field(default_factory=list)


@dataclass
class BrowserSnapshot:
    url: str = ""
    title: Optional[str] = None
    text_excerpt: str = ""
    cookies: list[CookieEvidence] = field(default_factory=list)
    local_storage_keys: list[str] = field(default_factory=list)
    session_storage_keys: list[str] = field(default_factory=list)
    requests: list[NetworkRequestEvidence] = field(default_factory=list)
    banner_visible: bool = False
    accept_visible: bool = False
    reject_visible: bool = False
    withdrawal_visible: bool = False
    errors: list[str] = field(default_factory=list)
    screenshot: Optional[ScreenshotRef] = None
    captured_at: str = ""


@dataclass
class BrowserEvidence:
    available: bool = False
    limitations: list[str] = field(default_factory=list)
    initial: Optional[BrowserSnapshot] = None
    after_reject: Optional[BrowserSnapshot] = None
    after_accept: Optional[BrowserSnapshot] = None
    after_reload: Optional[BrowserSnapshot] = None
    after_withdraw: Optional[BrowserSnapshot] = None
    interaction_log: list[str] = field(default_factory=list)


@dataclass
class ResourceDiscoveryEvidence:
    url: str = ""
    status: Optional[int] = None
    content_type: Optional[str] = None
    body_excerpt: str = ""
    discovered_urls: list[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class CrawlStats:
    pages_attempted: int = 0
    pages_succeeded: int = 0
    pages_failed: int = 0
    duplicates_skipped: int = 0
    out_of_scope_skipped: int = 0
    blocked_targets: int = 0
    max_depth_reached: int = 0
    started_at: str = ""
    finished_at: Optional[str] = None


@dataclass
class EvidenceItem:
    id: str = ""
    kind: str = ""
    page_url: Optional[str] = None
    summary: str = ""
    data: Any = None


@dataclass
class TestResult:
    id: str = ""
    test_id: str = ""
    title: str = ""
    category: str = "A"
    category_name: str = ""
    status: str = "NOT_ASSESSED"
    severity: str = "info"
    confidence: str = "low"
    claim_type: str = "regulatory_readiness"
    affected_urls: list[str] = field(default_factory=list)
    evidence: list[EvidenceItem] = field(default_factory=list)
    screenshots: list[ScreenshotRef] = field(default_factory=list)
    legal_references: list[LegalReference] = field(default_factory=list)
    reasoning: str = ""
    remediation: str = ""
    verification_steps: str = ""
    human_review_required: bool = False
    timestamp: str = ""
    test_version: str = ""
    known_limitations: str = ""


@dataclass
class FindingGroup:
    id: str = ""
    title: str = ""
    primary_test_id: str = ""
    test_ids: list[str] = field(default_factory=list)
    status: str = "NOT_ASSESSED"
    severity: str = "info"
    confidence: str = "low"
    claim_type: str = "regulatory_readiness"
    affected_urls: list[str] = field(default_factory=list)
    evidence: list[EvidenceItem] = field(default_factory=list)
    screenshots: list[ScreenshotRef] = field(default_factory=list)
    legal_references: list[LegalReference] = field(default_factory=list)
    reasoning: str = ""
    remediation: str = ""
    verification_steps: str = ""
    human_review_required: bool = False
    known_limitations: str = ""


@dataclass
class CategorySummary:
    category: str = "A"
    name: str = ""
    pass_count: int = 0
    fail: int = 0
    warning: int = 0
    needs_review: int = 0
    not_assessed: int = 0
    not_applicable: int = 0
    total: int = 0


@dataclass
class SeveritySummary:
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


@dataclass
class AuditCoverage:
    page_crawl: dict[str, Any] = field(default_factory=dict)
    site_discovery: dict[str, Any] = field(default_factory=dict)
    test_execution: dict[str, Any] = field(default_factory=dict)
    evidence_sufficiency: dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditSummary:
    total: int = 0
    pass_count: int = 0
    fail: int = 0
    warning: int = 0
    needs_review: int = 0
    not_assessed: int = 0
    not_applicable: int = 0
    automated: int = 0
    human_review_required: int = 0
    category_counts: list[CategorySummary] = field(default_factory=list)
    severity_counts: SeveritySummary = field(default_factory=SeveritySummary)
    coverage_percent: int = 0
    coverage: AuditCoverage = field(default_factory=AuditCoverage)
    page_coverage: dict[str, int] = field(default_factory=dict)


@dataclass
class AuditAuthState:
    login_wall_detected: bool = False
    login_surface_detected: bool = False
    login_url: Optional[str] = None
    authenticated: bool = False
    failure_reason: Optional[str] = None
    diagnostics: list[str] = field(default_factory=list)


@dataclass
class AuditProgressEntry:
    at: str = ""
    level: str = "info"
    message: str = ""
    url: Optional[str] = None
    attempted: Optional[int] = None
    succeeded: Optional[int] = None
    failed: Optional[int] = None
    pending: Optional[int] = None


@dataclass
class AuditOutcome:
    level: str = "inconclusive"
    tone: str = "neutral"
    headline: str = ""
    detail: str = ""
    fail_count: int = 0
    warning_count: int = 0
    needs_review_count: int = 0
    not_assessed_count: int = 0
    critical_or_high_count: int = 0
    partial: bool = False


@dataclass
class CrawlConfig:
    time_budget_ms: int = 300000
    timeout_ms: int = 15000
    max_bytes: int = 2000000
    max_redirects: int = 5
    same_origin_only: bool = True
    browser_enabled: bool = True
    screenshots: bool = True
    crawl_delay_ms: int = 200


@dataclass
class AuditConfig(CrawlConfig):
    authorized: bool = True
    notes: Optional[str] = None


@dataclass
class AuditRun:
    id: str = ""
    status: str = "queued"
    target_url: str = ""
    final_origin: Optional[str] = None
    created_at: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    config: AuditConfig = field(default_factory=AuditConfig)
    engine_version: str = "0.1.0"
    registry_version: str = ""
    legal_framework_version: str = ""
    pages: list[PageEvidence] = field(default_factory=list)
    tests: list[TestResult] = field(default_factory=list)
    findings: list[TestResult] = field(default_factory=list)
    finding_groups: list[FindingGroup] = field(default_factory=list)
    auth: Optional[AuditAuthState] = None
    summary: Optional[AuditSummary] = None
    crawl_stats: Optional[CrawlStats] = None
    robots: Optional[ResourceDiscoveryEvidence] = None
    sitemap: Optional[ResourceDiscoveryEvidence] = None
    browser: Optional[BrowserEvidence] = None
    visual: Optional[VisualEvidence] = None
    limitations: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    progress: list[AuditProgressEntry] = field(default_factory=list)


@dataclass
class AuditListItem:
    id: str = ""
    status: str = "queued"
    target_url: str = ""
    created_at: str = ""
    completed_at: Optional[str] = None
    summary: Optional[AuditSummary] = None
    error_count: int = 0


@dataclass
class AuditContext:
    target_url: str = ""
    pages: list[PageEvidence] = field(default_factory=list)
    start_page: Optional[PageEvidence] = None
    robots: Optional[ResourceDiscoveryEvidence] = None
    sitemap: Optional[ResourceDiscoveryEvidence] = None
    browser: Optional[BrowserEvidence] = None
    crawl_stats: CrawlStats = field(default_factory=CrawlStats)
    config: AuditConfig = field(default_factory=AuditConfig)
    limitations: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    organizational_evidence: dict[str, bool] = field(default_factory=dict)
    now: str = ""


@dataclass
class RuleOutcome:
    status: str = "NOT_ASSESSED"
    severity: Optional[str] = None
    confidence: Optional[str] = None
    affected_urls: list[str] = field(default_factory=list)
    evidence: list[EvidenceItem] = field(default_factory=list)
    reasoning: str = ""
    remediation: Optional[str] = None
    verification_steps: Optional[str] = None
    human_review_required: bool = False
    limitations: Optional[str] = None


TestEvaluator = Callable[[AuditContext], RuleOutcome]
