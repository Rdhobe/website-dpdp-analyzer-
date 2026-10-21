# BRAIN — Project Knowledge Index

**Project:** DPDP Website Compliance Auditor
**Status:** Early scaffold / pre-MVP
**Last updated:** 2026-10-19

## Project Purpose

A production-oriented web application that accepts a website URL, optionally authenticates with user-authorized credentials, crawls accessible pages, and produces an evidence-based compliance assessment against India's Digital Personal Data Protection (DPDP) Act, 2023 and the applicable DPDP Rules, 2025.

The product must answer:

- What compliance gaps exist?
- Which page, component, form, or workflow contains each gap?
- What evidence supports each finding?
- Which legal provision is relevant?
- What should change, and how?
- How can the user verify a fix?

It is a compliance assessment tool — not a generic scraper, cookie scanner, or chatbot.

## Current Status (Verified)

| Area | Reality |
| --- | --- |
| Frontend | Next.js 16.4.2 + React 19.3.0 + TypeScript 5 scaffold in `dpdp-compliance-auditor/`; target `src/` feature architecture approved (DEC-008), not yet migrated |
| Frontend structure | Current: root `app/`. Target: `src/app/` routing + `src/features/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/types/`, `src/config/` (T-125) |
| Styling | Tailwind CSS 4 via `@tailwindcss/turbopack`; custom audit dashboard UI in `components/audit/` |
| Pages | Home page (`/`) runs the full website audit dashboard (`components/audit/audit-dashboard.tsx`); `/audits` reuses it; `/audits/[id]` and `/audits/compare` for detail and comparison |
| Backend | **Placeholder** — standalone FastAPI app at workspace-root `backend/` exposing `GET /health` only; the landing-page inspector was removed |
| Database | **Not implemented** — SQLAlchemy/Alembic installed, but no PostgreSQL models, migrations, or schema files (a Prisma schema exists in the frontend but is not wired) |
| Crawler | **Implemented in TypeScript** — same-origin crawler in `lib/audit/crawler.ts`, no page/depth caps, fixed 5-minute run budget; Python Crawlee/Playwright are not used |
| Compliance engine | **Partial** — 75-test versioned deterministic registry in `lib/audit/` with verified legal references; no LLM layer |
| AI layer | **Not implemented** — no provider, prompts, or extraction pipeline |
| Auth | **Not implemented** |
| APIs | **Partial** — FastAPI `GET /health`; Next.js `/api/audits` (list/create/get/export) and `/api/audits/{id}/screenshots/{name}` |
| Tests | **Partial** — 59 frontend tests (Vitest, 9 files) + 3 backend tests (health, config) |
| Docker/infrastructure | **Not implemented** |
| Git | Workspace-root repository on `main`; tracks frontend, backend, and brain; pushed to GitHub |

The requirements brief (`Project requirements.md`) describes the full target system. Treat it as the product requirement source, not as evidence of implementation.

## Documentation Index

### Start Here
- [README.md](./README.md) — how the brain works, reading order, source-of-truth rules.
- [AGENTS.md](./AGENTS.md) — mandatory instructions for AI coding agents.
- [MEMORY.md](./MEMORY.md) — concise facts and limitations for future sessions.

### Product
- [PRD.md](./PRD.md) — vision, users, functional/non-functional requirements, scope.
- [FEATURES.md](./FEATURES.md) — feature registry with verified status.
- [FLOW.md](./FLOW.md) — user journeys, crawl flow, analysis flow, auth flow.
- [Project requirements.md](./Project%20requirements.md) — original requirements brief.

### Engineering
- [ARCHITECTURE.md](./ARCHITECTURE.md) — current and target architecture.
- [DECISION.md](./DECISION.md) — decision log.
- [RULES.md](./RULES.md) — development conventions and prohibited practices.
- [SECURITY.md](./SECURITY.md) — threat model, controls, and requirements.
- [DESIGN.md](./DESIGN.md) — design system and UI states.
- [DATABASE.md](./DATABASE.md) — proposed data model and status.
- [API.md](./API.md) — planned REST/event API contracts.
- [INTEGRATIONS.md](./INTEGRATIONS.md) — verified and proposed external services.
- [TESTCASE.md](./TESTCASE.md) — existing and proposed test coverage.

### Tracking
- [TASKS.md](./TASKS.md) — prioritized backlog.
- [CHANGES_LOG.md](./CHANGES_LOG.md) — verified change history.

## Architectural Principles

1. **Evidence over assertions.** Every finding must carry a source URL, captured evidence, confidence, and limitations.
2. **Rules engine is independent of the LLM.** Deterministic checks must run without any paid AI provider.
3. **Legal accuracy over coverage.** Never invent provisions, deadlines, or mandatory controls. Legal references require verified official sources.
4. **Untrusted input everywhere.** Crawled pages, uploaded documents, and extracted text are data, never instructions.
5. **Explicit scope and safety.** Crawl only authorized domains. Block private networks and metadata endpoints. Enforce limits.
6. **Human review is a first-class state.** Automated crawling cannot establish backend retention, internal governance, or legal conclusions.
7. **Tenant isolation.** Every project, page, finding, and report is scoped and authorized.
8. **No false certification.** Never present a score or report as guaranteed DPDP compliance.

## Important Constraints

- Do **not** require a paid AI provider for basic crawling and deterministic checks.
- Do **not** bypass MFA, CAPTCHA, authentication, or authorization controls.
- Do **not** perform intrusive penetration testing, purchases, or irreversible actions.
- Do **not** store raw passwords in plaintext.
- Do **not** assume a crawled absence proves a legal violation.
- Do **not** claim tests/builds passed without observed output.

## Current Development Priorities

1. **P0 — Harden the audit engine.** Crawling and deterministic checks work; next add auth/tenant isolation, rate limiting, egress hardening, a database adapter, and a queue.
2. **P0 — Migrate the Next.js scaffold to `src/` (T-125)** without adding placeholder feature pages.
3. **P0 — Build secure authentication and tenant-aware project CRUD.**
4. **P0 — Implement the crawler with scope enforcement, limits, and progress tracking.**
5. **P1 — Implement the versioned DPDP rules framework and deterministic checks.**
6. **P1 — Persist pages, evidence, findings, and audit runs.**
7. **P1 — Build the dashboard (overview, pages, findings, crawl monitor, history).**
8. **P2 — Add AI-assisted analysis with verified legal retrieval.**
9. **P2 — Add PDF/CSV/JSON exports and regression comparison.**
10. **P2 — Add automated tests, Docker Compose, and deployment docs.**

**Implemented 2026-10-19, extended 2026-10-20:** a TypeScript evidence-based audit engine now exists inside the Next.js app (`lib/audit/`, `workers/audit-worker.ts`, `app/api/audits/`, `app/audits/`, `components/audit/`) with a 75-test versioned registry, an uncapped crawler bounded by a 5-minute budget, login-wall detection with credential-gated sign-in, deterministic evaluators, file persistence, a worker process, JSON/CSV/PDF exports, and finding screenshots (full-page + element crops served from `/api/audits/{id}/screenshots/{name}`). It is verified by `npx tsc --noEmit`, `npm run lint`, `npm test` (90 passed), and `npm run build`. It does not yet include auth, tenant isolation, rate limiting, a database adapter, or a queue. See [CHANGES_LOG.md](./CHANGES_LOG.md), [DEC-009](./DECISION.md), [ARCHITECTURE.md](./ARCHITECTURE.md).

See [TASKS.md](./TASKS.md) for IDs and acceptance criteria.

## Keeping Knowledge Synchronized

After each meaningful change:

1. Update the relevant authoritative document.
2. Record verified changes in [CHANGES_LOG.md](./CHANGES_LOG.md).
3. Update statuses in [FEATURES.md](./FEATURES.md) and [TASKS.md](./TASKS.md).
4. Update [TESTCASE.md](./TESTCASE.md) when tests are added or changed.
5. Add only durable, concise notes to [MEMORY.md](./MEMORY.md).
6. Keep this index accurate; do not paste entire documents here.

See [README.md](./README.md) for the full maintenance process.
