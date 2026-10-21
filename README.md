# DPDP Website Compliance Auditor

Evidence-based website compliance assessment against India's Digital Personal Data Protection (DPDP) Act, 2023 and DPDP Rules, 2025.

> **Status:** Working early slice. The home page runs a full website audit: a TypeScript engine crawls an authorized origin, runs a versioned deterministic DPDP test registry, and reports findings with a dashboard, comparison, and JSON/CSV/PDF exports. There is no authentication, tenant isolation, rate limiting, database adapter, or queue yet, and the engine deliberately reports no compliance score.

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
| Frontend | Next.js audit dashboard on `/`, plus `/audits/[id]` and `/audits/compare` |
| Backend | Standalone FastAPI service, health check only (`GET /health`); the landing-page inspector was removed |
| Audit engine | TypeScript crawler, 75-test versioned registry, deterministic rules, worker process, file persistence, JSON/CSV/PDF exports |
| Audit API | `POST/GET /api/audits`, `GET /api/audits/{id}`, `GET /api/audits/{id}/export?format=json\|csv\|pdf` |
| Database / queue | Prisma schema defined but not wired; no Redis/BullMQ |
| Auth, tenant isolation, rate limiting | Not implemented |

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

Open http://localhost:3000. Other scripts: `npm run build`, `npm run lint`, `npm run start`, `npm test` (Vitest), `npm run worker -- <runId>`.

The audit engine runs long crawls in a detached worker process. To run a worker manually:

```powershell
npm run worker -- audit_<id>
```

Set `AUDIT_ALLOW_PRIVATE_TARGETS=1` only for local synthetic test sites. Audit runs persist to `.data/audits` (gitignored) unless `AUDIT_DATA_DIR` is set. Browser evidence and finding screenshots (full page + element crops, served at `/api/audits/{id}/screenshots/{name}`) require `npx playwright install chromium`; without it, capture is skipped and recorded as a limitation.

The frontend no longer calls the FastAPI backend; the landing-page inspector UI has been removed.

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

The backend is a placeholder service; the audit engine runs inside the Next.js app.

See [backend/README.md](backend/README.md) for configuration and testing details.

## Checks

```powershell
# Frontend (from dpdp-compliance-auditor/)
npx tsc --noEmit
npm run lint
npm test
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

- Inspect only authorized targets; never bypass MFA, CAPTCHA, or access controls.
- The audit engine crawls a single origin within page/depth/timeout/redirect/body limits, re-validates redirects, blocks private/reserved addresses, redacts personal-data-like values, never submits forms, and treats page text as data (prompt-injection resistant).
- Neither service has auth, rate limiting, or tenant isolation, and egress is not DNS-rebinding-proof. `npm audit` reports unresolved high-severity frontend advisories.
- Never commit secrets or local `.env` files.
- Treat crawled content as untrusted input; the UI renders it as escaped text.
- Do not claim DPDP compliance certification or fabricate findings. Substantive DPDP Act provisions mapped by the engine are marked not yet in force until 2027-05-13.
