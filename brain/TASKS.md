# TASKS.md — Development Task Tracker

**Last updated:** 2026-10-19

Priorities: **P0** critical/blocking, **P1** core MVP, **P2** important, **P3** later.
Statuses: `todo`, `in progress`, `blocked`, `done`.

Only tasks with verified evidence are marked `done`. The TypeScript evidence-based audit engine (T-130) is the current product slice; the earlier landing-page inspector was removed (T-131).

## Summary

| Priority | Count | Done |
| --- | --- | --- |
| P0 | 20 | 5 |
| P1 | 18 | 1 |
| P2 | 12 | 0 |
| P3 | 5 | 0 |

---

## Completed

### T-000 — Establish project brain documentation

- **Description:** Create `brain/` with 18 linked documents; distinguish implemented facts from planned requirements.
- **Priority:** P0
- **Status:** done
- **Acceptance criteria:** All files exist; links resolve; no fabricated history or secrets; requirements document preserved.
- **Evidence:** Files created 2026-10-19; see [CHANGES_LOG.md](./CHANGES_LOG.md).

### T-126 — Install backend dependencies and FastAPI health foundation

- **Description:** Create runtime/dev requirements, install them into the workspace `.venv`, add FastAPI app factory, settings, `/health` endpoint, pytest/ruff/mypy config, and health/config tests.
- **Priority:** P0
- **Status:** done
- **Dependencies:** Existing Python 3.12 venv.
- **Acceptance criteria:** Dependencies install; app starts; `/health` responds; lint, type check, and test pass.
- **Files:** `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/pyproject.toml`, `backend/main.py`, `backend/app/`, `backend/tests/test_health.py`, `backend/tests/test_config.py`, `backend/.env.example`, `backend/.gitignore`, `backend/README.md`, `README.md`.
- **Evidence (observed):** `ruff check .` passed; `pytest -q` → 3 passed; `mypy app main.py tests` → success; live `GET /health` returned `status: ok`. Checks re-run successfully from the workspace-root backend after the location decision.
- **Note:** The backend is intentionally a sibling of `dpdp-compliance-auditor/`, not inside it.
- **Remaining:** Playwright browsers not installed; no database, queue, or auth.

### T-127 — Build the landing-page element inspector

- **Description:** Add a safe single-page fetch/extraction API and a frontend form that displays page metadata, element counts, headings, links, images, forms, scripts, iframes, and privacy signals.
- **Priority:** P1
- **Status:** removed (2026-10-19; superseded by T-130, removed by T-131)
- **Dependencies:** T-126.
- **Acceptance criteria:** Public HTML URL returns structured elements; unsafe targets are blocked; UI renders results and errors; checks pass.
- **Files:** `backend/app/api/analysis.py`, `backend/app/schemas/landing.py`, `backend/app/services/landing_analyzer.py`, `backend/app/security/url_safety.py`, `backend/tests/test_landing_analyzer.py`, `backend/tests/test_analysis_api.py`, `dpdp-compliance-auditor/app/page.tsx`, `dpdp-compliance-auditor/components/landing-analyzer.tsx`.
- **Evidence (observed 2026-10-19):** backend ruff/mypy passed; pytest `14 passed`; frontend `npm run lint` and `npm run build` passed; live `POST /api/analyze-landing` against `https://www.python.org/` returned 200 with 14 headings, 150 links, and 831 elements.
- **Remaining:** Add auth, rate limiting, persistence, multi-page crawling, and browser rendering later.
- **Security note:** Outbound targets are scheme/host/IP validated and redirects are revalidated; DNS-rebinding TOCTOU and public-endpoint abuse remain open.

---

## P0 — Foundations and Blockers

### T-001 — Decide backend stack and repository layout

- **Description:** Approve or replace the proposed FastAPI/PostgreSQL/Crawlee backend stack (DEC-003). The Next.js frontend structure is already approved as `src/` feature architecture (DEC-008).
- **Priority:** P0
- **Status:** done
- **Dependencies:** Product owner input for the backend.
- **Acceptance criteria:** [DECISION.md](./DECISION.md) updated to `accepted` for the backend choice; [ARCHITECTURE.md](./ARCHITECTURE.md) reflects the final layout; [RULES.md](./RULES.md) updated.
- **Files:** `brain/DECISION.md`, `brain/ARCHITECTURE.md`, repository root.
- **Evidence:** DEC-003 accepted; backend implemented as a standalone FastAPI service at the workspace root; frontend remains separate with DEC-008 `src/` as its migration target.
- **Blocks:** T-002, T-010, T-020, T-030, T-060, T-100.

### T-002 — Create backend and infrastructure skeleton

- **Description:** Create `backend/`, `tests/`, `.env.example`, and supporting infrastructure configuration (Docker Compose, migrations, scripts). The Next.js app remains at `dpdp-compliance-auditor/` with the DEC-008 `src/` structure.
- **Priority:** P0
- **Status:** in progress
- **Dependencies:** T-001 (done).
- **Acceptance criteria:** Directories exist with minimal runnable configuration; no secrets; documented in architecture.
- **Files:** `backend/`, `tests/`, `.env.example`, `infrastructure/`.
- **Progress (2026-10-19):** `backend/`, `backend/tests/`, `backend/.env.example`, requirements, README, and runnable API exist. Docker Compose, migrations, root test layout, and infrastructure scripts are still pending.

### T-125 — Migrate Next.js scaffold to `src/` feature architecture

- **Description:** Move `app/` to `src/app/`, create route groups `(auth)` and `(dashboard)`, introduce `src/features/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/types/`, and `src/config/` incrementally, and update the `@/*` alias if required.
- **Priority:** P0
- **Status:** todo
- **Dependencies:** None for the move; feature directories should be created only as they receive real code.
- **Acceptance criteria:**
  - `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, and `src/app/not-found.tsx` exist.
  - Route groups `(auth)` and `(dashboard)` exist when their pages are implemented.
  - Shared layers exist without empty placeholder modules that imply features.
  - `npm run lint` and `npm run build` pass after the move.
  - No cross-feature deep imports; boundaries in [RULES.md](./RULES.md) enforced.
  - `next.config.ts`/`tsconfig.json` paths remain correct.
- **Files:** `dpdp-compliance-auditor/src/`, `dpdp-compliance-auditor/tsconfig.json`, `dpdp-compliance-auditor/next.config.ts`.
- **Notes:** Do not implement feature pages as part of the migration; move only what exists and establish the structure.

### T-003 — Configure test framework

- **Description:** Add a test runner for frontend and backend (as decided), a `test` script, and CI-ready configuration. Backend pytest is configured (T-126); frontend testing and CI remain.
- **Priority:** P0
- **Status:** in progress
- **Dependencies:** T-001, T-002 (backend portion complete).
- **Acceptance criteria:** Backend and frontend test commands run and report results in CI; [TESTCASE.md](./TESTCASE.md) updated.
- **Files:** `package.json`, test config, CI config.

### T-004 — Provision PostgreSQL and migrations

- **Description:** Add database connection, SQLAlchemy models baseline, Alembic migrations, and a local PostgreSQL service.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-001.
- **Acceptance criteria:** Migration applies cleanly; seed script runs; schema matches [DATABASE.md](./DATABASE.md).
- **Files:** `backend/`, `infrastructure/`.

### T-005 — Provision Redis and job queue

- **Description:** Add Redis and Celery (or approved equivalent) with a health check and one smoke-test task.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-001.
- **Acceptance criteria:** Worker starts; enqueue/execute/result verified; failure/retry behavior documented.
- **Files:** `backend/`, `infrastructure/`.

### T-006 — Create environment variable examples

- **Description:** Add `.env.example` files with names and descriptions only; document each variable.
- **Priority:** P0
- **Status:** todo
- **Dependencies:** T-002.
- **Acceptance criteria:** No real secrets; all runtime variables documented; `.gitignore` covers env files.
- **Files:** `.env.example`, `docs/setup.md`.

### T-007 — Replace default Next.js metadata and landing page

- **Description:** Set product-appropriate metadata and replace the create-next-app page with a real entry point (or a clearly labeled app shell).
- **Priority:** P0
- **Status:** done
- **Dependencies:** Design direction.
- **Acceptance criteria:** No "Create Next App" metadata; no fake audit data; accessible and responsive.
- **Files:** `dpdp-compliance-auditor/app/layout.tsx`, `app/page.tsx` (target after T-125: `src/app/layout.tsx`, `src/app/page.tsx`).
- **Evidence (2026-10-19):** metadata now describes the product; the home page was later changed (T-131) to render the audit dashboard instead of the removed inspector. `npm run lint` and `npm run build` passed.

### T-008 — Fix font application inconsistency

- **Description:** Align `globals.css` body font with the Geist tokens or intentionally adopt a system font.
- **Priority:** P0
- **Status:** done
- **Dependencies:** None.
- **Acceptance criteria:** Font choice is consistent and documented in [DESIGN.md](./DESIGN.md).
- **Evidence (2026-10-19):** body now uses `var(--font-geist-sans)`; documented in DESIGN.md.
- **Files:** `dpdp-compliance-auditor/app/globals.css` (target after T-125: `src/app/globals.css`).

### T-009 — Add security headers and baseline protections

- **Description:** Configure CSP, HSTS (production), frame protection, referrer policy, content-type options, and permissions policy.
- **Priority:** P0
- **Status:** todo
- **Dependencies:** T-001/T-002 deployment shape.
- **Acceptance criteria:** Headers present in production build; documented in [SECURITY.md](./SECURITY.md).
- **Files:** `next.config.ts`, deployment config.

### T-010 — Implement platform authentication

- **Description:** Registration, sign-in, sign-out, secure sessions, password hashing (if applicable).
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-001, T-002, T-004; SEC-01 decision.
- **Acceptance criteria:** Auth flows work; sessions secure; tests cover invalid credentials and session expiry.
- **Files:** `backend/app/auth/`, frontend auth pages.

### T-011 — Implement organizations and tenant isolation

- **Description:** Organization model, membership, and tenant-scoped authorization middleware/services.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-004, T-010.
- **Acceptance criteria:** Cross-tenant access denied and logged; tests cover IDOR attempts.
- **Files:** `backend/app/models/`, `backend/app/auth/`, `backend/app/services/`.

### T-020 — Implement project CRUD API

- **Description:** Create/list/get/update/delete website projects with validation and tenant scoping.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-011.
- **Acceptance criteria:** Endpoints in [API.md](./API.md) implemented; invalid/blocked URLs rejected; authorization enforced.
- **Files:** `backend/app/api/`, `backend/app/schemas/`, `backend/app/models/`.

### T-021 — Build audit configuration UI

- **Description:** Implement the configuration form with all fields, validation, safe defaults, and authorization attestation.
- **Priority:** P0
- **Status:** todo
- **Dependencies:** T-020, design components.
- **Acceptance criteria:** All fields in PRD FR-2.2 work; accessible errors; same-origin default on.
- **Files:** frontend project forms.

### T-030 — Implement URL discovery and normalization

- **Description:** Anchor/sitemap/robots/canonical/pagination/JS link discovery; normalization; dedupe; discovery-source tracking.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-001, T-005.
- **Acceptance criteria:** Unit tests for normalization/dedup; query-parameter controls; no infinite loops.
- **Files:** `backend/app/crawler/`.

### T-031 — Implement scope and SSRF protection

- **Description:** URL validation, private/metadata blocking, redirect scope enforcement, DNS re-resolution.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-030.
- **Acceptance criteria:** Security tests for loopback/private/metadata/redirect escape pass.
- **Files:** `backend/app/security/`, `backend/app/crawler/`.

### T-032 — Implement crawler with limits and retries

- **Description:** Crawlee/Playwright crawler honoring depth, page count, concurrency, delay, timeout, file size, content types.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-030, T-031.
- **Acceptance criteria:** Limits enforced; failures recorded; retries bounded; crawl cancellable.
- **Files:** `backend/app/crawler/`, `backend/app/browser/`.

### T-034 — Implement live crawl progress API and UI

- **Description:** SSE/WebSocket progress with real counts and pause/resume/cancel controls.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-032, T-005.
- **Acceptance criteria:** Progress reflects actual state; no invented ETA; controls verified.
- **Files:** `backend/app/api/`, frontend crawl monitor.

### T-035 — Implement pause/resume/cancel and recovery

- **Description:** Job lifecycle state machine, cleanup, and worker recovery.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-032.
- **Acceptance criteria:** State transitions enforced; sessions/credentials cleaned; interrupted jobs recover or fail clearly.
- **Files:** `backend/app/workers/`, `backend/app/services/`.

### T-040 — Implement page extraction

- **Description:** Extract page metadata, text, DOM evidence, links, forms, controls, cookies/scripts, screenshots, page type, errors.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-032.
- **Acceptance criteria:** Evidence persisted with timestamp; sensitive values redacted; inaccessible content not claimed.
- **Files:** `backend/app/extraction/`.

### T-050 — Implement credential encryption and redaction

- **Description:** Encrypt target credentials/session references and redact logs, evidence, and exports.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** SEC-02/SEC-03 decisions, T-004.
- **Acceptance criteria:** No plaintext credentials at rest or in logs; redaction tests pass.
- **Files:** `backend/app/security/`.

### T-063 — Implement finding schema and validation

- **Description:** Pydantic finding/evidence/legal-reference models with enum and field validation.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-002.
- **Acceptance criteria:** Invalid findings rejected; statuses/severity enums enforced; unit tests.
- **Files:** `backend/app/schemas/`.

### T-100 — Create Docker Compose local environment

- **Description:** Services for frontend, API, worker, PostgreSQL, Redis, and test website.
- **Priority:** P0
- **Status:** blocked
- **Dependencies:** T-001.
- **Acceptance criteria:** Documented one-command startup; health checks; no secrets committed.
- **Files:** `infrastructure/docker/`, `docker-compose.yml`.

### T-110 — Create local synthetic test website

- **Description:** Local site with synthetic privacy notices, forms, cookie banner, consent controls, and deliberate gaps.
- **Priority:** P0
- **Status:** todo
- **Dependencies:** None (can start early).
- **Acceptance criteria:** Serves multiple page types; uses synthetic data only; documented.
- **Files:** test fixture directory.

---

## P1 — Core MVP

### T-033 — Implement authenticated crawling

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-032, T-050
- **Acceptance criteria:** Login verification, session persistence, expiry detection, manual MFA/CAPTCHA flow, secure cleanup; tests with local site.

### T-041 — Persist page snapshots and evidence

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-004, T-040
- **Acceptance criteria:** Snapshots retrievable per page/audit; retention controls; access authorized.

### T-042 — Document/PDF/OCR extraction

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-040
- **Acceptance criteria:** Safe type/size validation; parse errors recorded; OCR output labeled.

### T-043 — Audit run persistence and progress model

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-004
- **Acceptance criteria:** Audit status/counts persisted; progress reproducible after reconnect.

### T-044 — Page classification

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-040
- **Acceptance criteria:** Deterministic classification baseline; confidence recorded.

### T-045 — Privacy notice extraction and analysis

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-044, T-062
- **Acceptance criteria:** Statements extracted with evidence; missing info flagged as potential/needs review.

### T-046 — Consent and cookie analysis

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-040
- **Acceptance criteria:** Observable consent behavior and cookie attributes recorded; no overclaiming.

### T-047 — Form and personal-data collection analysis

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-040
- **Acceptance criteria:** Field inventory, purposes, third-party submission, redaction.

### T-048 — Rights/grievance/children/retention/third-party/accountability checks

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-045, T-046, T-047, T-062
- **Acceptance criteria:** Applicability separated from observation; specialist-review flags.

### T-049 — Security indicator checks

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-040
- **Acceptance criteria:** Non-intrusive checks only; indicators labeled, not violations.

### T-060 — Curate legal framework sources

- **Description:** Collect official DPDP Act 2023, DPDP Rules 2025, commencement notifications, amendments; record versions and verification dates.
- **Priority:** P1, **Status:** todo, **Dependencies:** Legal reviewer
- **Acceptance criteria:** Each source has official URL, version, date, applicability; no invented content.

### T-061 — Implement legal source and rule storage

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-004, T-060
- **Acceptance criteria:** Versioned legal documents/provisions/rules persist; source URLs validated.

### T-062 — Implement deterministic rules engine

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-061, T-063
- **Acceptance criteria:** Runs without AI; deterministic; severity rubric applied; findings schema-valid.

### T-080 — Overview dashboard

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-043, T-062
- **Acceptance criteria:** Real metrics; defined coverage denominator; no arbitrary compliance score.

### T-081 — Pages dashboard and evidence viewer

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-041
- **Acceptance criteria:** Search/filter; evidence viewer with source links and redaction indicators.

### T-082 — Findings dashboard and review workflow

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-062
- **Acceptance criteria:** Full finding detail; reviewer assignment/status/notes persist; authorization enforced.

### T-084 — Crawl monitor UI

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-034
- **Acceptance criteria:** Live progress, controls, redacted log export.

### T-086 — Remediation guidance generation

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-062
- **Acceptance criteria:** Structured remediation; draft copy labeled; no auto-modification.

### T-111 — Implement crawling and security tests

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-003, T-031, T-032, T-110
- **Acceptance criteria:** Automated tests cover normalization, sitemap, JS pages, auth, expiry, limits, retries, SSRF, hostile HTML.

### T-112 — Implement extraction/rules/schema tests

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-003, T-040, T-062, T-063
- **Acceptance criteria:** Notice extraction, citation validation, finding schema, prompt injection tests.

### T-113 — Implement auth/tenant/redaction tests

- **Priority:** P1, **Status:** blocked, **Dependencies:** T-003, T-011, T-050
- **Acceptance criteria:** Multi-tenant authorization and credential redaction tests.

---

## P2 — AI, Reporting, History, Operations

### T-070 — LLM provider abstraction

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-001
- **Acceptance criteria:** Configurable provider/model/keys; non-AI mode; no paid provider required for core checks.

### T-071 — Retrieval-grounded legal analysis pipeline

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-061, T-070, T-062
- **Acceptance criteria:** Retrieve → applicability → evidence → analyze → structured output → citation validation → uncertainty flags.

### T-072 — Prompt-injection defenses

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-070
- **Acceptance criteria:** Content treated as data; injection tests; output schema enforcement.

### T-083 — Legal framework dashboard

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-061
- **Acceptance criteria:** Provisions, effective dates, sources, version, limitations displayed.

### T-085 — Audit history and comparison UI

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-043, T-095
- **Acceptance criteria:** Run list, diffs, coverage changes, regressions.

### T-090 — PDF report export

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-062
- **Acceptance criteria:** Required sections; reproducible by audit ID; redacted; limitations included.

### T-091 — JSON and CSV export

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-062
- **Acceptance criteria:** Schema-versioned; CSV injection safe; redaction applied.

### T-092 — Export tests

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-090, T-091, T-003
- **Acceptance criteria:** PDF/CSV/JSON tests including redaction and injection cases.

### T-095 — Re-run selected checks or full audit

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-062, T-043
- **Acceptance criteria:** New run preserves prior evidence; comparison available; config/version recorded.

### T-096 — Audit cancellation and recovery tests

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-035, T-003
- **Acceptance criteria:** Cancellation cleans up; recovery works; no false completion.

### T-101 — Setup and deployment documentation

- **Priority:** P2, **Status:** todo
- **Acceptance criteria:** `docs/setup.md`, `docs/architecture.md`, `docs/security.md`, `docs/legal-framework.md`, `docs/api.md` accurate and runnable.

### T-102 — Observability and structured logging

- **Priority:** P2, **Status:** blocked, **Dependencies:** T-002
- **Acceptance criteria:** Correlation IDs; redaction; configurable levels; no secrets in logs.

---

## P3 — Later

### T-120 — Scheduled/recurring audits
### T-121 — Role-based permissions refinement
### T-122 — Multi-language notice analysis
### T-123 — Notifications for completed audits
### T-124 — Performance/load testing for large crawls

All P3 tasks: **Status:** todo, **Priority:** P3, details `TBD`.

---

## Bugs

No known product bugs are tracked. The audit engine and placeholder backend run; known limitations are listed under Technical Debt and the engine's `Remaining` notes.

- **Resolved 2026-10-19:** Geist is now applied (T-008) and default metadata/page replaced by the inspector (T-007).

## Technical Debt

- No CI. Frontend has a Vitest suite (`npm test`); backend has health/config tests only.
- No shared schema/types package between frontend and backend (planned stack).
- No design system or component library yet.
- Repository consolidation: the root repo now tracks the frontend, backend, and brain; avoid reintroducing a nested frontend `.git`.
- Requirements and implementation are far apart; status discipline is required.

## Completed (continued — TypeScript Audit Engine, 2026-10-19)

### T-130 — Implement the TypeScript evidence-based audit engine vertical slice

- **Description:** Add a server-side TypeScript crawl/evidence/rules/runner/store/worker/export pipeline plus dashboard, detail, compare, and API surfaces inside the existing Next.js app, without modifying the Python landing-page inspector.
- **Priority:** P1
- **Status:** done
- **Acceptance criteria met:** bounded same-origin crawler; SSRF/private-IP blocking; evidence redaction; 75-test versioned registry with deterministic evaluators; explicit PASS/FAIL/WARNING/NEEDS_REVIEW/NOT_ASSESSED/NOT_APPLICABLE statuses; no compliance score; file persistence; separate worker process; JSON/CSV/PDF exports; dashboard and compare UI; automated synthetic-fixture tests.
- **Files:** `lib/audit/**`, `lib/audit/rules/**`, `workers/audit-worker.ts`, `app/api/audits/**`, `app/audits/**`, `components/audit/**`, `tests/audit/**`, `vitest.config.mts`, `prisma/schema.prisma`, `dpdp-compliance-auditor/.env.example`, `dpdp-compliance-auditor/package.json`.
- **Evidence (observed):** `npx tsc --noEmit` passed; `npm run lint` passed with no warnings; `npm test` → 43 passed (7 files); `npm run build` passed.
- **Remaining:** Prisma/PostgreSQL adapter and migrations; Redis/BullMQ queue; auth, rate limiting, and tenant isolation; `npm audit` high-severity advisories; DNS-rebinding-resistant egress.

### T-131 — Remove the landing-page inspector and make the audit engine the home page

- **Description:** Delete the landing-page inspector (frontend UI and the Python endpoint, schemas, services, security helpers, and tests) and render the full website audit dashboard on `/`.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130.
- **Acceptance criteria met:** `components/landing-analyzer.tsx` deleted; backend analysis modules and tests deleted; shared `components/audit/audit-dashboard.tsx` rendered by `/` and `/audits`; metadata updated; checks pass.
- **Files removed:** `dpdp-compliance-auditor/components/landing-analyzer.tsx`, `backend/app/api/analysis.py`, `backend/app/schemas/`, `backend/app/security/`, `backend/app/services/`, `backend/tests/test_analysis_api.py`, `backend/tests/test_landing_analyzer.py`.
- **Files changed:** `dpdp-compliance-auditor/app/page.tsx`, `dpdp-compliance-auditor/app/audits/page.tsx`, `dpdp-compliance-auditor/app/layout.tsx`, `dpdp-compliance-auditor/components/audit/audit-dashboard.tsx`, `backend/app/main.py`, `backend/requirements.txt`, root/`backend`/frontend `README.md`.
- **Evidence (observed 2026-10-19):** frontend `npx tsc --noEmit`, `npm run lint`, `npm test` (43 passed), and `npm run build` passed; backend `pytest` (3 passed), `ruff`, and `mypy` (9 files) passed.
- **Related decision:** [DEC-010](./DECISION.md).

### T-132 — Add finding screenshots (visual evidence) to the audit engine

- **Description:** Capture Playwright screenshots of the relevant page and element for each finding and review item so users can see visually where the site falls short; store them per run and serve them safely.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130.
- **Acceptance criteria met:** full-page + element-crop capture (consent, privacy/cookie/terms, contact/grievance, form, heading); attachment to tests by category/URL; traversal-safe serving route; findings, run gallery, and browser snapshots in the UI; PDF embeds screenshots and CSV gains a `screenshots` column; graceful degradation when browsers are absent.
- **Files:** `lib/audit/screenshots.ts`, `lib/audit/types.ts`, `lib/audit/runner.ts`, `lib/audit/browser.ts`, `lib/audit/launcher.ts`, `lib/audit/export.ts`, `app/api/audits/[id]/screenshots/[name]/route.ts`, `components/audit/screenshot-gallery.tsx`, `components/audit/audit-report.tsx`, `components/audit/new-audit-form.tsx`, `tests/audit/screenshots.test.ts`, `tests/audit/export.test.ts`, `tests/audit/helpers.ts`.
- **Evidence (observed 2026-10-19):** `npx tsc --noEmit`, `npm run lint`, `npm test` (then 50 passed, 8 files), `npm run build` passed; `npx playwright install chromium` installed Chrome Headless Shell 156; a live audit of `https://example.com/` completed with 24 findings each receiving a screenshot and the serving route returned `200 image/png` while a traversal request returned `404`.
- **Remaining:** screenshots are unredacted local files with no auth/tenant isolation; only the first matching visible element is cropped; UI is not yet covered by tests.
- **Related decision:** [DEC-011](./DECISION.md).

### T-133 — Clarify the report verdict and consolidate exports behind one dropdown

- **Description:** Users could not tell whether a site passed or failed the audit, and the three separate export buttons were scattered. Add a plain-language readiness outcome derived from the summary and a single export dropdown.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130.
- **Acceptance criteria met:** `deriveAuditOutcome()` maps counts to one of failed/not_ready/needs_attention/inconclusive/no_failures; the report shows the outcome banner with an explicit "no pass/fail certificate" disclaimer and still no compliance score; JSON/CSV/PDF exports share one `Export ▾` dropdown.
- **Files:** `lib/audit/summary.ts`, `lib/audit/types.ts`, `components/audit/audit-report.tsx`, `components/audit/export-menu.tsx`, `tests/audit/summary.test.ts`.
- **Evidence (observed 2026-10-19):** `npx tsc --noEmit`, `npm run lint`, `npm test` (59 passed, 9 files), `npm run build` passed; a live `https://example.com/` run rendered the outcome banner ("Needs work") and the export dropdown.
- **Related decision:** [DEC-012](./DECISION.md).

### T-134 — Give every test its own guidance and clarify failure/screenshot reasons

- **Description:** All findings showed the same generic remediation and verification text; unreachable sites gave no clear reason and no screenshot explanation. Author per-test guidance and surface the real cause.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130.
- **Acceptance criteria met:** 75/75 tests have unique remediation and verification text; crawler reports the underlying network/TLS cause; the homepage failure reasoning includes the error; a run with zero successful pages is `failed`; the missing-screenshot message reflects the actual reason.
- **Files:** `lib/audit/registry.ts`, `lib/audit/crawler.ts`, `lib/audit/rules/crawl.ts`, `lib/audit/runner.ts`, `components/audit/audit-report.tsx`.
- **Evidence (observed 2026-10-19):** `npx tsc --noEmit`, `npm run lint`, `npm test` (59 passed, 9 files), `npm run build` passed; registry audit showed 75 unique remediation/verification strings; a live `https://shakthi.in/` run reported `failed`, "Audit did not complete", and `DEPTH_ZERO_SELF_SIGNED_CERT`.
- **Related decision:** [DEC-013](./DECISION.md).

### T-135 — Crawl apex/www sites and report robots/sitemap discovery plainly

- **Description:** An apex→www redirect made the crawler refuse the whole site as cross-origin (0 pages). Scope the crawl by site, follow same-site redirects, seed the queue from robots/sitemap, dedupe final-URL aliases, and replace the ambiguous "not fetched" label.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130, T-134.
- **Acceptance criteria met:** `shakktii.in` → `www.shakktii.in` is followed; links and sitemap URLs under the same site are crawled; the homepage is not listed twice; robots/sitemap show `found` / `not found (HTTP 404)` / `not fetched (reason)`.
- **Files:** `lib/audit/url.ts` (`siteKey`, `isSameSite`), `lib/audit/crawler.ts`, `components/audit/audit-report.tsx` (`describeDiscovery`), `tests/audit/url.test.ts`, `tests/audit/crawler.test.ts`.
- **Evidence (observed 2026-10-19):** `npx tsc --noEmit`, `npm run lint`, `npm test` (64 passed, 9 files) passed; live `https://shakktii.in/` crawl → 7 pages, 0 failed, 1 duplicate skipped, `/ecosystem` and `/onboarding?type=...` crawled, robots/sitemap `404`.
- **Related decision:** [DEC-014](./DECISION.md).

### T-136 — Make report findings verifiable and honest (consolidation, claim labels, coverage, per-provision dates, full evidence)

- **Description:** Address six issues from the `mockmingle.in` PDF review: consolidate related findings while keeping all tests; label each result with a claim type; split the ambiguous single "coverage %" into four independent measures; stop framing best-practice checks as legal obligations; store per-provision commencement dates (including Section 6(9)); and include the full structured evidence in the PDF/CSV exports.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130, T-135.
- **Acceptance criteria met:** Related checks render as one consolidated finding with a worst-case status/severity (groups per DEC-015); every test/result carries a `claimType` shown in UI, CSV and PDF; the report shows page crawl, site discovery, test execution and evidence sufficiency instead of one percentage; legal mapping shows each provision's own effective date/commencement group; the PDF and CSV include the structured evidence.
- **Files:** `lib/audit/{types,groups,presentation,summary,legal,registry,runner,trackers,export,browser}.ts`, `lib/audit/rules/{helpers,consent,rights}.ts`, `components/audit/audit-report.tsx`, `tests/audit/{groups,legal,trackers,summary,registry,export,rules.integration}.test.ts`, `tests/audit/{helpers,fixtures}.ts`.
- **Evidence (observed 2026-10-19):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → 84 passed (12 files), `npm run build` passed. Export validated on the real `mockmingle.in` run: 75 tests, 4 finding groups, recomputed coverage, 16-column CSV with `claimType`/`evidence`, and an 822 KB PDF containing the full evidence.
- **Related decisions:** [DEC-015](./DECISION.md), [DEC-016](./DECISION.md), [DEC-017](./DECISION.md), [DEC-018](./DECISION.md).

### T-137 — Uncapped 5-minute crawl and credential-gated login continuation

- **Description:** Remove the operator-facing max-pages/max-depth controls, crawl same-site links until the queue empties or a fixed 5-minute budget expires, report slow-loading/time-limit truncation honestly, detect login walls, and let the operator supply a single username/password to continue in a new authenticated run without persisting credentials.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-130, T-134, T-136.
- **Acceptance criteria met:** `POST /api/audits` and the form no longer expose page/depth limits; crawls stop at `ENGINE_TIME_BUDGET_MS` (5 min) with a limitation and a `partial`/`failed` status; an unauthenticated login wall yields `requires_credentials` with 0 tests and a credentials prompt; a login page found on an otherwise public site is surfaced in the report with an optional authenticated run; credentials create a new queued run, are streamed over stdin, and never appear in `run.json`; single username/password login succeeds and cookie-authenticated crawling reaches protected pages; MFA/CAPTCHA/SSO is refused with a reason; legacy runs normalize with the default budget, `auth: null`, or a backfilled login surface; `robots.txt`/`sitemap.xml` status renders as a large labelled card.
- **Files:** `lib/audit/{types,crawler,runner,auth,login-wall,launcher,summary,browser,screenshots,store}.ts`, `lib/audit/rules/crawl.ts`, `workers/audit-worker.ts`, `app/api/audits/route.ts`, `app/api/audits/[id]/credentials/route.ts`, `components/audit/{new-audit-form,credentials-prompt,audit-report,audit-live,status-badge}.tsx`, `tests/audit/{crawler,login-wall}.test.ts`, `tests/audit/helpers.ts`.
- **Evidence (observed 2026-10-20):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → 94 passed (13 files), `npm run build` passed. Local login fixture: unauth → `requires_credentials`; authenticated → `completed`, 75 tests, `/privacy` reached. `https://example.com/` → `completed`, 75 tests. Spawned-worker stdin handoff → `completed`, 75 tests, no password value in the stored run. `www.mockmingle.in` run normalizes to `loginSurfaceDetected: true` at `/login`.
- **Related decisions:** [DEC-019](./DECISION.md), [DEC-020](./DECISION.md), [DEC-021](./DECISION.md), [DEC-022](./DECISION.md).

### T-138 - Live run log, sign-in diagnostics, and no worker console window

- **Description:** Persist structured progress events for each audit and show them live, record Playwright sign-in diagnostics, report a form that never leaves the login page as rejected credentials, and spawn the worker without a visible Windows console.
- **Priority:** P1
- **Status:** done
- **Dependencies:** T-137.
- **Acceptance criteria met:** `run.progress` stores start/page/crawl-summary/evaluation entries with counts; the audit page renders a live log (queued/running) and a collapsible log on finished runs; `auth.diagnostics` records each sign-in step; `windowsHide: true` with `detached: false` stops the console window; legacy runs normalize to `progress: []`.
- **Files:** `lib/audit/{types,crawler,runner,auth,launcher,store}.ts`, `workers/audit-worker.ts`, `components/audit/{audit-progress,audit-report,audit-live}.tsx`.
- **Evidence (observed 2026-10-20):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → 94 passed (13 files), `npm run build` passed. Spawned worker persisted 6 progress entries for `https://example.com/` and finished `completed` (1 page, 75 tests).
- **Related decisions:** [DEC-023](./DECISION.md).

## Related Documents

- [FEATURES.md](./FEATURES.md) — features and statuses.
- [DECISION.md](./DECISION.md) — decisions blocking tasks.
- [TESTCASE.md](./TESTCASE.md) — test plan.
- [CHANGES_LOG.md](./CHANGES_LOG.md) — completed work.
