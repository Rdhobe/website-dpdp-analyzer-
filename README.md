# DPDP Website Compliance Auditor

Evidence-based website compliance assessment against India's Digital Personal Data Protection (DPDP) Act, 2023 and DPDP Rules, 2025.

> **Status:** Early scaffold. The frontend is still the default Next.js starter, and the backend currently exposes only a health check. No auditing, compliance scoring, or reporting is implemented.

## Repository layout

This workspace is **not** a single Next.js application. The frontend and backend are separate services:

```text
.
├── dpdp-compliance-auditor/   # Next.js frontend application
├── backend/                   # FastAPI backend (independent Python service)
├── brain/                     # Product/architecture documentation
├── .venv/                     # Shared local Python environment (not committed)
└── README.md
```

The backend is deliberately **not** placed inside the Next.js app. It is a standalone HTTP service with its own dependencies, runtime, and tests. The workspace root is a single Git repository tracking the frontend, backend, and documentation; the frontend is not a nested repository.

## Current status

| Area | Status |
| --- | --- |
| Frontend | Default Next.js 16 scaffold |
| Backend | FastAPI scaffold with `GET /health` |
| Database, queues, crawler, auth | Not implemented |
| Compliance rules and reporting | Not implemented |

See [brain/BRAIN.md](brain/BRAIN.md) for the documented current state and [brain/Project requirements.md](brain/Project%20requirements.md) for the source brief.

## Prerequisites

- Node.js 20+ and npm
- Python 3.12
- The workspace virtual environment at `.venv`

## Frontend

```powershell
cd dpdp-compliance-auditor
npm install
npm run dev
```

Open http://localhost:3000. Other scripts: `npm run build`, `npm run lint`, `npm run start`.

## Backend

Install dependencies once from the workspace root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
```

Run the API:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- Health check: http://127.0.0.1:8000/health
- Interactive API docs: http://127.0.0.1:8000/docs

See [backend/README.md](backend/README.md) for configuration and testing details.

## Checks

```powershell
# Frontend (from dpdp-compliance-auditor/)
npm run lint
npm run build

# Backend (from backend/)
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m mypy app main.py tests
```

## Documentation

- [brain/BRAIN.md](brain/BRAIN.md) — project index and status
- [brain/ARCHITECTURE.md](brain/ARCHITECTURE.md) — current and target architecture
- [brain/DECISION.md](brain/DECISION.md) — decision log
- [brain/TASKS.md](brain/TASKS.md) — task backlog
- [brain/TESTCASE.md](brain/TESTCASE.md) — test plan and executed tests

## Security and scope

- Crawl only authorized targets; never bypass MFA, CAPTCHA, or access controls.
- Never commit secrets or local `.env` files.
- Treat crawled content as untrusted input.
- Do not claim DPDP compliance certification or fabricate findings.
