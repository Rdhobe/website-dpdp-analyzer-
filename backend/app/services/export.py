"""Export helpers for audit runs."""

from __future__ import annotations

import io
import json
from typing import Any

from reportlab.lib.pagesizes import A4  # type: ignore[import-untyped]
from reportlab.pdfgen import canvas  # type: ignore[import-untyped]

CLAIM_TYPE_LABELS = {
    "verified_legal_requirement": "Verified legal requirement",
    "regulatory_readiness": "Regulatory readiness (provision not yet in force)",
    "potential_privacy_gap": "Potential privacy gap",
    "technical_recommendation": "Technical recommendation",
}


def to_json_export(run: dict[str, Any]) -> str:
    return json.dumps(run, ensure_ascii=False, indent=2)


def _csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    if any(ch in text for ch in (",", '"', "\n", "\r")):
        return '"' + text.replace('"', '""') + '"'
    return text


def to_csv_export(run: dict[str, Any]) -> str:
    headers = [
        "testId",
        "category",
        "title",
        "status",
        "severity",
        "confidence",
        "claimType",
        "humanReviewRequired",
        "affectedUrls",
        "reasoning",
        "remediation",
        "verificationSteps",
        "screenshots",
        "legalReferences",
        "evidence",
        "knownLimitations",
    ]
    rows: list[str] = [",".join(headers)]
    for test in run.get("tests") or []:
        claim_type = test.get("claimType", "")
        claim_label = CLAIM_TYPE_LABELS.get(claim_type, claim_type)
        legal_refs = " | ".join(
            f"{ref.get('provision')} ({ref.get('effectiveStatus')}"
            + (f", from {ref.get('effectiveFrom')}" if ref.get("effectiveFrom") else "")
            + ")"
            for ref in (test.get("legalReferences") or [])
        )
        evidence = json.dumps(
            [
                {
                    "kind": item.get("kind"),
                    "summary": item.get("summary"),
                    "pageUrl": item.get("pageUrl"),
                    "data": item.get("data"),
                }
                for item in (test.get("evidence") or [])
            ],
            ensure_ascii=False,
        )
        values = [
            test.get("testId"),
            test.get("category"),
            test.get("title"),
            test.get("status"),
            test.get("severity"),
            test.get("confidence"),
            claim_label,
            "yes" if test.get("humanReviewRequired") else "no",
            " | ".join(test.get("affectedUrls") or []),
            test.get("reasoning"),
            test.get("remediation"),
            test.get("verificationSteps"),
            " | ".join(shot.get("name", "") for shot in (test.get("screenshots") or [])),
            legal_refs,
            evidence,
            test.get("knownLimitations"),
        ]
        rows.append(",".join(_csv_cell(v) for v in values))
    return "\r\n".join(rows)


async def to_pdf_export(run: dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 48

    def line(text: str, size: int = 10, bold: bool = False) -> None:
        nonlocal y
        if y < 60:
            pdf.showPage()
            y = height - 48
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawString(48, y, text[:110])
        y -= size + 4

    line("DPDP Website Readiness Audit", 18, True)
    line("Readiness assessment only. Not legal advice or certification.", 9)
    line(f"Audit ID: {run.get('id')}")
    line(f"Target: {run.get('targetUrl')}")
    line(f"Status: {run.get('status')}")
    line(f"Created: {run.get('createdAt')}")
    line(f"Completed: {run.get('completedAt') or 'not completed'}")
    line(f"Engine: {run.get('engineVersion')} | Registry: {run.get('registryVersion')}")
    line(f"Legal framework: {run.get('legalFrameworkVersion')}")
    y -= 6

    summary = run.get("summary")
    if isinstance(summary, dict):
        line("Summary", 13, True)
        line(
            f"PASS {summary.get('pass')} FAIL {summary.get('fail')} WARN {summary.get('warning')} "
            f"REVIEW {summary.get('needsReview')} NA {summary.get('notAssessed')} "
            f"N/A {summary.get('notApplicable')}"
        )
        y -= 4
        line("Category results", 11, True)
        category_counts = summary.get("categoryCounts")
    if isinstance(category_counts, list):
        for category in category_counts:
            if not isinstance(category, dict):
                continue
            line(
                f"{category.get('category')} {category.get('name')}: "
                f"P{category.get('passCount')} F{category.get('fail')} W{category.get('warning')} "
                f"R{category.get('needsReview')} U{category.get('notAssessed')} "
                f"X{category.get('notApplicable')}"
            )
    y -= 4

    line(f"Findings ({len(run.get('findings') or [])})", 13, True)
    for test in run.get("tests") or []:
        if test.get("status") not in ("FAIL", "WARNING", "NEEDS_REVIEW"):
            continue
        line(
            f"{test.get('testId')} {test.get('status')} "
            f"({test.get('severity')}/{test.get('confidence')}) - {test.get('title')}",
            10,
            True,
        )
        if test.get("affectedUrls"):
            line(f"Affected: {', '.join(test.get('affectedUrls') or [])}", 9)
        line(f"Reasoning: {test.get('reasoning')}", 9)
        y -= 2

    y -= 4
    line("Limitations", 13, True)
    for limitation in run.get("limitations") or []:
        line(f"- {limitation}", 9)

    pdf.save()
    buffer.seek(0)
    return buffer.read()
