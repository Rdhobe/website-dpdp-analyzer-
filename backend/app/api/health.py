"""Health and readiness endpoints."""

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["system"])


@router.get("/health", summary="Service health check")
def health() -> dict[str, str]:
    """Return basic service health without exposing configuration secrets."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }
