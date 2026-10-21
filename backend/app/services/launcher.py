"""Audit creation and worker spawning, mirroring the Next.js launcher."""

from __future__ import annotations

import ipaddress
import json
import os
import socket
import subprocess
import uuid
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

from app.services.audit_store import FRONTEND_DIR, save_audit


class UnsafeTargetError(ValueError):
    pass


ENGINE_VERSION = "0.1.0"
REGISTRY_VERSION = "2026.10.19.3"
LEGAL_FRAMEWORK_VERSION = (
    "DPDP Act 2023 + DPDP Rules 2025, per-provision commencement verified 2026-10-19"
)
ENGINE_TIME_BUDGET_MS = 5 * 60 * 1000


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def private_targets_allowed() -> bool:
    return os.environ.get("AUDIT_ALLOW_PRIVATE_TARGETS") == "1"


def assert_public_target(url: str, allow_private_networks: bool = False) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeTargetError("URL must use http or https.")
    if not parsed.hostname:
        raise UnsafeTargetError("URL must include a host.")
    if parsed.username or parsed.password:
        raise UnsafeTargetError("URL must not contain embedded credentials.")
    allow_private = allow_private_networks or private_targets_allowed()
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise UnsafeTargetError(f"Could not resolve host: {parsed.hostname}") from exc
    for info in infos:
        address = info[4][0]
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            continue
        if (
            not allow_private
            and (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            )
        ):
            raise UnsafeTargetError(f"Target resolves to a non-public address: {address}")
    return parsed.geturl()


def default_audit_config(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    config = {
        "timeBudgetMs": ENGINE_TIME_BUDGET_MS,
        "timeoutMs": 10000,
        "maxBytes": 2000000,
        "maxRedirects": 5,
        "sameOriginOnly": True,
        "browserEnabled": False,
        "screenshots": False,
        "crawlDelayMs": 250,
        "authorized": True,
        "notes": None,
    }
    if overrides:
        config.update({k: v for k, v in overrides.items() if v is not None or k in overrides})
    return config


def spawn_audit_worker(run_id: str, credentials: dict[str, str] | None = None) -> None:
    node = "node"
    tsx_cli = FRONTEND_DIR / "node_modules" / "tsx" / "dist" / "cli.mjs"
    worker = FRONTEND_DIR / "workers" / "audit-worker.ts"
    child = subprocess.Popen(
        [node, str(tsx_cli), str(worker), run_id],
        cwd=str(FRONTEND_DIR),
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=os.environ.copy(),
    )
    if child.stdin is not None:
        if credentials:
            child.stdin.write(json.dumps(credentials).encode("utf-8"))
        child.stdin.close()


def create_queued_audit(
    target_url: str,
    config: dict[str, Any],
    auth: dict[str, Any] | None = None,
    credentials: dict[str, str] | None = None,
) -> dict[str, Any]:
    target = assert_public_target(target_url, allow_private_networks=private_targets_allowed())
    run_id = f"audit_{uuid.uuid4()}"
    now = _now()
    run = {
        "id": run_id,
        "status": "queued",
        "targetUrl": target,
        "finalOrigin": None,
        "createdAt": now,
        "startedAt": None,
        "completedAt": None,
        "config": config,
        "engineVersion": ENGINE_VERSION,
        "registryVersion": REGISTRY_VERSION,
        "legalFrameworkVersion": LEGAL_FRAMEWORK_VERSION,
        "pages": [],
        "tests": [],
        "findings": [],
        "findingGroups": [],
        "auth": auth,
        "summary": None,
        "crawlStats": None,
        "robots": None,
        "sitemap": None,
        "browser": None,
        "visual": None,
        "limitations": [
            "Audit queued. A separate worker process performs the crawl and evaluation."
        ],
        "errors": [],
        "progress": [],
    }
    save_audit(run)
    spawn_audit_worker(run_id, credentials)
    return run
