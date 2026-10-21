"""Audit API endpoints mirroring the Next.js audit routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Response
from fastapi.responses import FileResponse, JSONResponse

from app.schemas.audits import AuditCreateRequest, CredentialsRequest
from app.services.audit_store import (
    get_audit,
    list_audits,
    resolve_screenshot_path,
)
from app.services.launcher import (
    UnsafeTargetError,
    create_queued_audit,
    default_audit_config,
)

router = APIRouter(prefix="/api/audits", tags=["audits"])

CREATE_RESPONSE_EXAMPLE = {
    "id": "audit_00000000-0000-0000-0000-000000000000",
    "status": "queued",
    "targetUrl": "https://example.com/",
    "finalOrigin": None,
    "createdAt": "2026-10-20T00:00:00.000Z",
    "startedAt": None,
    "completedAt": None,
    "config": {
        "timeBudgetMs": 300000,
        "timeoutMs": 10000,
        "maxBytes": 2000000,
        "maxRedirects": 5,
        "sameOriginOnly": True,
        "browserEnabled": False,
        "screenshots": False,
        "crawlDelayMs": 250,
        "authorized": True,
        "notes": None,
    },
    "engineVersion": "0.1.0",
    "registryVersion": "2026.10.19.3",
    "legalFrameworkVersion": (
        "DPDP Act 2023 + DPDP Rules 2025, per-provision commencement verified 2026-10-19"
    ),
    "pages": [],
    "tests": [],
    "findings": [],
    "findingGroups": [],
    "auth": None,
    "summary": None,
    "crawlStats": None,
    "robots": None,
    "sitemap": None,
    "browser": None,
    "visual": None,
    "limitations": ["Audit queued. A separate worker process performs the crawl and evaluation."],
    "errors": [],
    "progress": [],
}


def _not_found() -> JSONResponse:
    return JSONResponse(status_code=404, content={"error": "Audit not found."})


async def list_audits_endpoint() -> dict[str, Any]:
    return {"audits": list_audits()}


async def create_audit(payload: AuditCreateRequest) -> Response:
    config = default_audit_config(
        {
            "browserEnabled": payload.browserEnabled,
            "screenshots": payload.screenshots,
            "notes": payload.notes,
        }
    )
    credentials = None
    auth = None
    if payload.username is not None and payload.password is not None:
        credentials = {"username": payload.username, "password": payload.password}
        auth = {
            "loginWallDetected": True,
            "loginSurfaceDetected": True,
            "loginUrl": None,
            "authenticated": False,
            "failureReason": None,
        }
    try:
        run = create_queued_audit(
            target_url=payload.url, config=config, auth=auth, credentials=credentials
        )
    except UnsafeTargetError as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception as exc:  # pragma: no cover - defensive
        return JSONResponse(status_code=500, content={"error": str(exc)})
    return JSONResponse(status_code=202, content=run)


async def get_audit_endpoint(audit_id: str) -> Response:
    run = get_audit(audit_id)
    if run is None:
        return _not_found()
    return JSONResponse(content=run, headers={"cache-control": "no-store"})


async def submit_credentials(audit_id: str, payload: CredentialsRequest) -> Response:
    run = get_audit(audit_id)
    if run is None:
        return _not_found()

    auth = run.get("auth") or {}
    login_detected = (
        auth.get("loginWallDetected") is True
        or auth.get("loginSurfaceDetected") is True
    )
    busy = run.get("status") in ("queued", "running")
    if not login_detected or busy:
        return JSONResponse(
            status_code=409,
            content={"error": "This audit is not ready to accept sign-in credentials."},
        )

    target_url = run["targetUrl"]
    config = run["config"]
    next_auth: dict[str, Any] = {
        "loginWallDetected": auth.get("loginWallDetected") is True,
        "loginSurfaceDetected": True,
        "loginUrl": auth.get("loginUrl"),
        "authenticated": False,
        "failureReason": None,
    }
    credentials: dict[str, str] = {
        "username": payload.username,
        "password": payload.password,
    }

    try:
        next_run = create_queued_audit(
            target_url=target_url,
            config=config,
            auth=next_auth,
            credentials=credentials,
        )
    except UnsafeTargetError as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception as exc:  # pragma: no cover - defensive
        return JSONResponse(status_code=500, content={"error": str(exc)})

    return JSONResponse(
        status_code=202,
        content={"id": next_run["id"], "status": next_run["status"]},
    )


async def export_audit(
    audit_id: str,
    format: str = Query(default="json"),
) -> Response:
    run = get_audit(audit_id)
    if run is None:
        return _not_found()

    base_name = f"dpdp-audit-{run['id']}"

    if format == "csv":
        from app.services.export import to_csv_export

        content = to_csv_export(run)
        return Response(
            content=content,
            media_type="text/csv; charset=utf-8",
            headers={
                "content-disposition": f'attachment; filename="{base_name}.csv"',
                "cache-control": "no-store",
            },
        )

    if format == "pdf":
        from app.services.export import to_pdf_export

        pdf = await to_pdf_export(run)
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={
                "content-disposition": f'attachment; filename="{base_name}.pdf"',
                "cache-control": "no-store",
            },
        )

    if format != "json":
        return JSONResponse(
            status_code=400,
            content={"error": "Unsupported export format. Use json, csv, or pdf."},
        )

    from app.services.export import to_json_export

    content = to_json_export(run)
    return Response(
        content=content,
        media_type="application/json; charset=utf-8",
        headers={
            "content-disposition": f'attachment; filename="{base_name}.json"',
            "cache-control": "no-store",
        },
    )


async def get_screenshot(audit_id: str, name: str) -> Response:
    path = resolve_screenshot_path(audit_id, name)
    if path is None or not path.is_file():
        return Response(content="Not found.", status_code=404, media_type="text/plain")
    return FileResponse(
        path,
        media_type="image/png",
        headers={"cache-control": "private, max-age=3600"},
    )


router.add_api_route("", list_audits_endpoint, methods=["GET"])
router.add_api_route(
    "",
    create_audit,
    methods=["POST"],
    status_code=202,
    responses={202: {"content": {"application/json": {"example": CREATE_RESPONSE_EXAMPLE}}}},
)
router.add_api_route("/{audit_id}", get_audit_endpoint, methods=["GET"])
router.add_api_route(
    "/{audit_id}/credentials", submit_credentials, methods=["POST"], status_code=202
)
router.add_api_route("/{audit_id}/export", export_audit, methods=["GET"])
router.add_api_route("/{audit_id}/screenshots/{name}", get_screenshot, methods=["GET"])
