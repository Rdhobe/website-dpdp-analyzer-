# Backend — DPDP Website Compliance Auditor

Standalone FastAPI service for the DPDP Website Compliance Auditor. It is intentionally separate from the Next.js frontend at `../dpdp-compliance-auditor/` and communicates with it over HTTP.

> **Status:** Scaffold only. The service exposes a health check and configuration. Database, queue, crawler, authentication, compliance rules, and reporting are not implemented.

## Requirements

- Python 3.12
- The workspace virtual environment at `../.venv` (created at the workspace root)
- No Node.js dependencies

## Setup

From the workspace root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
```

Create local configuration when needed:

```powershell
Copy-Item backend\.env.example backend\.env
```

Do not commit `.env` or real credentials. `backend/.gitignore` excludes them.

## Run

From this directory (`backend/`):

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/health
- OpenAPI docs: http://127.0.0.1:8000/docs

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Returns service status, name, version, and environment |

`/health` is a liveness-style check only; it does not verify database or Redis connectivity.

## Configuration

Settings are loaded by `app/core/config.py` using pydantic-settings from environment variables or `backend/.env`.

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_NAME` | `DPDP Website Compliance Auditor API` | API title |
| `APP_VERSION` | `0.1.0` | API version |
| `ENVIRONMENT` | `development` | Environment label |
| `DEBUG` | `false` | Debug flag |
| `API_PREFIX` | `/api` | Reserved for product routes |
| `CORS_ORIGINS` | `[]` | JSON array, e.g. `["http://localhost:3000"]` |
| `DATABASE_URL` | unset | PostgreSQL async URL |
| `REDIS_URL` | unset | Redis URL |

`DATABASE_URL` and `REDIS_URL` are configuration placeholders; no connection layer or workers exist yet.

## Tests and checks

From this directory:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m mypy app main.py tests
```

Current tests cover the health endpoint and settings parsing. A Starlette deprecation warning about `httpx` may appear; tests still pass.

## Layout

```text
backend/
├── app/
│   ├── api/health.py      # GET /health
│   ├── core/config.py     # pydantic-settings configuration
│   └── main.py            # application factory and app instance
├── tests/
│   ├── test_config.py
│   └── test_health.py
├── .env.example
├── .gitignore
├── main.py                # development entrypoint
├── pyproject.toml         # pytest, ruff, mypy
├── requirements.txt
└── requirements-dev.txt
```

## Boundaries

- Keep this service independent of the Next.js frontend. The frontend should call it over HTTP; do not place Python code inside `dpdp-compliance-auditor/`.
- Do not add secrets, `.env` files, or virtual environments to version control.
- No compliance or legal claims should be produced until the rules engine and evidence model exist.
