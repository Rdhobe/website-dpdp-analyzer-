"""Legal framework facts and references for the DPDP audit engine (Python port)."""

from __future__ import annotations

from typing import Any, Optional

from .types import LegalDocument, LegalReference

ACT_URL = "https://www.indiacode.nic.in/handle/123456789/22037?locale=en"
RULES_URL = "https://www.indiacode.nic.in/handle/123456789/22038?locale=en"
COMMENCEMENT_URL = "https://www.indiacode.nic.in/handle/123456789/22039?locale=en"

GAZETTE_DATE = "2025-11-13"
SUBSTANTIVE_EFFECTIVE_FROM = "2027-05-13"
CONSENT_MANAGER_EFFECTIVE_FROM = "2026-11-13"
LEGAL_FRAMEWORK_VERSION = "DPDP Act 2023 + DPDP Rules 2025, per-provision commencement verified 2026-10-19"


def _lr(**kwargs: Any) -> LegalReference:
    return LegalReference(**kwargs)


LEGAL_REFERENCES: list[LegalReference] = [
    _lr(
        id="DPDP-SEC-001",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 1",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=None,
        effective_status="in_force",
        commencement_group="immediate",
        applicability="Applies to processing of digital personal data within and outside India in connection with offering goods or services to data principals in India.",
        evidence_required=["privacy notice", "terms"],
        summary="Short title, extent and commencement; the Act applies to digital personal data processed in India.",
        verified_on="2026-10-19",
        notes="Commencement notification published 2025-11-13.",
    ),
    _lr(
        id="DPDP-SEC-005",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 5",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Notice obligations for Data Fiduciaries before or at collection.",
        evidence_required=["privacy notice", "notice elements"],
        summary="Notice to a Data Principal before processing personal data.",
        verified_on="2026-10-19",
        notes="Not yet in force; effective from 2027-05-13.",
    ),
    _lr(
        id="DPDP-SEC-006",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 6",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=CONSENT_MANAGER_EFFECTIVE_FROM,
        effective_status="partially_in_force",
        commencement_group="one_year",
        applicability="Consent and consent manager obligations.",
        evidence_required=["consent mechanism", "cookie banner", "consent withdrawal"],
        summary="Consent and consent manager; Section 6(9) in force from 2026-11-13.",
        verified_on="2026-10-19",
        notes="Section 6(9) (withdrawal) effective 2026-11-13; remainder 2027-05-13.",
    ),
    _lr(
        id="DPDP-SEC-008",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 8",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Obligations of Data Fiduciary.",
        evidence_required=["data minimisation", "retention", "security"],
        summary="Obligations of Data Fiduciary.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-009",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 9",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Processing of children's personal data.",
        evidence_required=["age gate", "parental consent", "child-directed content"],
        summary="Processing of personal data of children.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-010",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 10",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Additional obligations for Significant Data Fiduciaries.",
        evidence_required=["DPO", "DPIA", "audit"],
        summary="Additional obligations of Significant Data Fiduciary.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-011",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 11",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Right to access information about personal data.",
        evidence_required=["rights page", "access request mechanism"],
        summary="Right of Data Principal to access information.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-012",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 12",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Right to correction and erasure.",
        evidence_required=["correction request", "erasure request"],
        summary="Right to correction and erasure of personal data.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-013",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 13",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Right of grievance redressal.",
        evidence_required=["grievance mechanism", "contact"],
        summary="Right of grievance redressal.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-014",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 14",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Right to nominate.",
        evidence_required=["nomination mechanism"],
        summary="Right to nominate.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-016",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 16",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Transfer of personal data outside India.",
        evidence_required=["cross-border transfer disclosure", "third-party processors"],
        summary="Transfer of personal data outside India.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-SEC-017",
        document_title="Digital Personal Data Protection Act, 2023",
        provision="Section 17",
        source_url=ACT_URL,
        version="2023",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Exemptions.",
        evidence_required=[],
        summary="Exemptions.",
        verified_on="2026-10-19",
        notes="Not yet in force.",
    ),
    _lr(
        id="DPDP-RULES-2025",
        document_title="Digital Personal Data Protection Rules, 2025",
        provision="Rules",
        source_url=RULES_URL,
        version="2025",
        published_date=GAZETTE_DATE,
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        effective_status="not_yet_effective",
        commencement_group="eighteen_months",
        applicability="Rules prescribing notice, consent manager, retention, security and breach notification.",
        evidence_required=["notice", "consent", "security", "retention"],
        summary="DPDP Rules, 2025.",
        verified_on="2026-10-19",
        notes="Notified 2025-11-13.",
    ),
]

LEGAL_DOCUMENTS: list[LegalDocument] = [
    LegalDocument(
        id="DPDP-ACT-2023",
        title="Digital Personal Data Protection Act, 2023",
        source_url=ACT_URL,
        published_date=GAZETTE_DATE,
        effective_status="partially_in_force",
        effective_from=None,
        summary="The principal Act governing digital personal data protection in India.",
        verified_on="2026-10-19",
        notes="Phased commencement; see per-provision references.",
    ),
    LegalDocument(
        id="DPDP-RULES-2025",
        title="Digital Personal Data Protection Rules, 2025",
        source_url=RULES_URL,
        published_date=GAZETTE_DATE,
        effective_status="not_yet_effective",
        effective_from=SUBSTANTIVE_EFFECTIVE_FROM,
        summary="Rules notified under the Act.",
        verified_on="2026-10-19",
        notes="Notified 2025-11-13.",
    ),
]

LEGAL_REFERENCE_BY_ID: dict[str, LegalReference] = {
    ref.id: ref for ref in LEGAL_REFERENCES
}
LEGAL_DOCUMENT_BY_ID: dict[str, LegalDocument] = {
    doc.id: doc for doc in LEGAL_DOCUMENTS
}


def get_legal_reference(ref_id: str) -> Optional[LegalReference]:
    return LEGAL_REFERENCE_BY_ID.get(ref_id)


def get_legal_document(doc_id: str) -> Optional[LegalDocument]:
    return LEGAL_DOCUMENT_BY_ID.get(doc_id)


COMMENCEMENT_SUMMARY = (
    "Phased commencement: Section 6(9) (consent withdrawal) in force from "
    "2026-11-13; main substantive provisions from 2027-05-13; Act notified "
    "2025-11-13."
)

COMMENCEMENT_CAVEAT = (
    "Commencement dates are taken from the notification; verify against the "
    "official gazette before relying on them for legal advice."
)


def effective_status_for_group(group: str) -> str:
    if group == "immediate":
        return "in_force"
    if group == "one_year":
        return "partially_in_force"
    if group == "eighteen_months":
        return "not_yet_effective"
    return "unknown"
