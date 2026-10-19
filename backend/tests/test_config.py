"""Tests for application settings."""

from pathlib import Path

import pytest

from app.core.config import Settings


@pytest.fixture
def isolated_settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)


def test_settings_read_cors_origins_from_environment(
    monkeypatch: pytest.MonkeyPatch, isolated_settings: None
) -> None:
    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:3000", "https://example.com"]')

    settings = Settings()

    assert settings.cors_origins == ["http://localhost:3000", "https://example.com"]


def test_settings_defaults_for_optional_integrations(isolated_settings: None) -> None:
    settings = Settings()

    assert settings.database_url is None
    assert settings.redis_url is None
