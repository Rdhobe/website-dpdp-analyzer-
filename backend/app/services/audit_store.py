"""File-backed store for audit runs, mirroring the Next.js audit store contract."""

from __future__ import annotations

import json
import os
import re
import uuid
from pathlib import Path
from typing import Any

FRONTEND_DIR = Path(__file__).resolve().parents[3] / "dpdp-compliance-auditor"
AUDIT_DATA_DIR = FRONTEND_DIR / ".data" / "audits"

SAFE_ID = re.compile(r"^[A-Za-z0-9_-]+$")
SAFE_SCREENSHOT_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*\.png$")


def audit_data_dir() -> Path:
    override = os.environ.get("AUDIT_DATA_DIR")
    if override:
        return Path(override)
    return AUDIT_DATA_DIR


def ensure_audit_data_dir() -> None:
    audit_data_dir().mkdir(parents=True, exist_ok=True)


def audit_path(audit_id: str) -> Path:
    if not SAFE_ID.fullmatch(audit_id):
        raise ValueError("Invalid audit identifier.")
    return audit_data_dir() / f"{audit_id}.json"


def save_audit(run: dict[str, Any]) -> dict[str, Any]:
    ensure_audit_data_dir()
    target = audit_path(run["id"])
    temporary = target.with_name(f"{target.name}.{uuid.uuid4()}.tmp")
    try:
        temporary.write_text(json.dumps(run, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return run


def get_audit(audit_id: str) -> dict[str, Any] | None:
    try:
        path = audit_path(audit_id)
    except ValueError:
        return None
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(parsed, dict):
            return parsed
        return None
    except FileNotFoundError:
        return None


def list_audits() -> list[dict[str, Any]]:
    directory = audit_data_dir()
    try:
        entries = sorted(directory.iterdir(), key=lambda p: p.name)
    except FileNotFoundError:
        return []
    items: list[dict[str, Any]] = []
    for entry in entries:
        if not entry.is_file() or not entry.name.endswith(".json"):
            continue
        try:
            run = json.loads(entry.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        items.append(
            {
                "id": run.get("id"),
                "status": run.get("status"),
                "targetUrl": run.get("targetUrl"),
                "createdAt": run.get("createdAt"),
                "completedAt": run.get("completedAt"),
                "summary": run.get("summary"),
                "errorCount": len(run.get("errors") or []),
            }
        )
    items.sort(key=lambda item: item.get("createdAt") or "", reverse=True)
    return items


def resolve_screenshot_path(run_id: str, name: str) -> Path | None:
    if not SAFE_ID.fullmatch(run_id) or not SAFE_SCREENSHOT_NAME.fullmatch(name) or ".." in name:
        return None
    path = audit_data_dir() / run_id / "screenshots" / name
    return path


def screenshot_dir_for(run_id: str) -> Path:
    return audit_data_dir() / run_id / "screenshots"
