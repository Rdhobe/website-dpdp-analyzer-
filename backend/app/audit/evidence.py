from __future__ import annotations

import uuid
from typing import Any, Optional

from .types import EvidenceItem


def create_evidence(
    kind: str,
    page_url: Optional[str],
    summary: str,
    data: Any,
) -> EvidenceItem:
    return EvidenceItem(
        id=str(uuid.uuid4()),
        kind=kind,
        page_url=page_url,
        summary=summary,
        data=data,
    )
