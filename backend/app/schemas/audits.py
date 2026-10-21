"""Request/response schemas for the audit API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AuditCreateRequest(BaseModel):
    url: str = Field(..., description="Website URL to audit (http or https).")
    authorized: Literal[True] = Field(
        ..., description="User attests they are authorized to audit the target."
    )
    browserEnabled: bool = Field(default=False, description="Collect browser evidence.")
    screenshots: bool = Field(default=False, description="Capture finding screenshots.")
    notes: str | None = Field(default=None, max_length=500, description="Optional audit notes.")
    username: str | None = Field(
        default=None, min_length=1, max_length=200, description="Optional login username."
    )
    password: str | None = Field(
        default=None, min_length=1, max_length=500, description="Optional login password."
    )

    @model_validator(mode="after")
    def _credentials_pair(self) -> AuditCreateRequest:
        if (self.username is None) != (self.password is None):
            raise ValueError("username and password must be provided together.")
        return self

    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://example.com",
                "authorized": True,
                "browserEnabled": False,
                "screenshots": True,
                "notes": "Initial audit",
                "username": "user@example.com",
                "password": "secret",
            }
        }
    }


class CredentialsRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=1, max_length=500)

    model_config = {
        "json_schema_extra": {
            "example": {"username": "user@example.com", "password": "secret"}
        }
    }
