# FEATURES.md — Feature Registry

**Last verified:** 2026-10-19

Status is based on actual source code and test evidence, not on dependencies or intent.

- **Implemented** — verified working code exists.
- **Partial** — some real code exists but the feature is incomplete.
- **Planned** — in requirements/tasks, not built.
- **Blocked** — cannot proceed without a decision/dependency.
- **Deprecated** — should not be used.

## Current Implementation Summary

The frontend remains the default Next.js scaffold. A minimal FastAPI backend foundation now exists (health endpoint, settings, dependencies, three tests). **No product feature is implemented:** there is no database, crawler, compliance engine, AI layer, authentication, product API, or frontend test suite.

---

## F-000 — Next.js Application Scaffold

- **Description:** Runnable Next.js 16.4.2 App Router project with TypeScript, Tailwind 4, ESLint, and Geist fonts.
- **Purpose:** Base for the frontend.
- **Status:** **Implemented**
- **Related files:** `dpdp-compliance-auditor/package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `app/layout.tsx`, `app/globals.css`.
- **Dependencies:** Node.js, npm.
- **Acceptance criteria:** `npm run dev` starts; `npm run build` succeeds; `npm run lint` runs.
- **Evidence:** Files exist. Build/lint not run during documentation creation (see [CHANGES_LOG.md](./CHANGES_LOG.md)).
- **Notes:** `app/page.tsx` is still the create-next-app default page. Metadata is default.

---

## F-001 — Static Landing Page

- **Description:** Default create-next-app page linking to Next.js/Vercel resources.
- **Purpose:** Placeholder only.
- **Status:** **Implemented (placeholder)** — not a product feature.
- **Related files:** `app/page.tsx`, `public/*.svg`.
- **Acceptance criteria:** Not applicable; must be replaced.
- **Tests:** None.

---

## F-002 — User Registration and Sign-In

- **Description:** Platform account creation and authentication.
- **Status:** **Planned** (P0)
- **Related modules:** `backend/app/auth/` (planned), frontend auth screens (planned).
- **Dependencies:** Auth provider/library decision (SEC-01).
- **Acceptance criteria:** Register, sign in, sign out, session persistence, secure password hashing, invalid-credential handling.
- **Related tasks:** T-010.
- **Tests:** Proposed in [TESTCASE.md](./TESTCASE.md).

## F-003 — Organizations and Tenant Isolation

- **Description:** Multi-tenant organizations with isolated projects, audits, findings, and reports.
- **Status:** **Planned** (P0)
- **Dependencies:** F-002, database schema.
- **Acceptance criteria:** Cross-tenant access denied on every resource; authorization tested.
- **Related tasks:** T-011, T-051.
- **Tests:** Proposed.

## F-004 — Project Management

- **Description:** Create/list/view website audit projects with scope and crawl configuration.
- **Status:** **Planned** (P0)
- **Related modules:** projects API, database, UI.
- **Dependencies:** F-002, F-003, F-005.
- **Acceptance criteria:** All configuration fields from PRD FR-2.2 persist and validate; safe defaults; invalid URLs rejected; authorization attestation required.
- **Related tasks:** T-020, T-021.
- **Tests:** Proposed.

## F-005 — Website Audit Configuration Form

- **Description:** Form for project name, root URL, credentials/auth mode, crawl limits, scope, content types, toggles, legal framework version, business context.
- **Status:** **Planned** (P0)
- **Dependencies:** F-004.
- **Acceptance criteria:** Every field validated; same-origin-only default on; credential inputs handled securely; accessible labels and errors.
- **Related tasks:** T-021.
- **Tests:** Proposed.

## F-006 — URL Discovery and Normalization

- **Description:** Discover URLs via links, sitemaps, robots.txt, canonicals, pagination, JS-rendered links, menus, seed URLs, authenticated pages; normalize and deduplicate with discovery-source tracking.
- **Status:** **Planned** (P0)
- **Dependencies:** Crawler infrastructure.
- **Acceptance criteria:** Deterministic normalization; query-parameter controls; no duplicate page processing; discovery source stored.
- **Related tasks:** T-030.
- **Tests:** Proposed (unit + integration).

## F-007 — Scope and SSRF Enforcement

- **Description:** Same-origin default, approved subdomains, private-network/metadata blocking, redirect and DNS-rebinding protection.
- **Status:** **Planned** (P0)
- **Dependencies:** F-006.
- **Acceptance criteria:** Blocked destinations rejected before request and after redirects; scope escapes logged; tests cover loopback/private/metadata.
- **Related tasks:** T-031, T-050.
- **Tests:** Proposed security tests.

## F-008 — Crawler with Limits and Retries

- **Description:** Crawlee/Playwright crawler enforcing depth, page count, concurrency, delay, timeout, file size, and content types.
- **Status:** **Planned** (P0)
- **Dependencies:** F-006, F-007.
- **Acceptance criteria:** Limits honored; retries bounded; failures recorded per URL; crawl remains within scope.
- **Related tasks:** T-032.
- **Tests:** Proposed.

## F-009 — Authenticated Crawling

- **Description:** Public, credentials-based, and manual browser login; session persistence, expiry detection, auth-state verification, secure cleanup.
- **Status:** **Planned** (P1)
- **Dependencies:** F-008, credential encryption.
- **Acceptance criteria:** Login success is verified beyond form submission; expired sessions detected; no MFA/CAPTCHA bypass; credentials never logged.
- **Related tasks:** T-033.
- **Tests:** Proposed (local test site).

## F-010 — Live Crawl Progress and Controls

- **Description:** Live discovered/processed/failed/skipped counts, current URL, queue depth, retries, activity, pause/resume/cancel.
- **Status:** **Planned** (P0)
- **Dependencies:** F-008, background queue, SSE/WebSocket.
- **Acceptance criteria:** Updates reflect actual state; controls change job state; no invented percentages/ETAs.
- **Related tasks:** T-034, T-043.
- **Tests:** Proposed.

## F-011 — Page Extraction

- **Description:** Extract URL, canonical, status, title, meta, headings, text, DOM evidence, links, forms, controls, privacy/cookie links, consent controls, scripts/third-party metadata, screenshots, page type, timestamp, errors.
- **Status:** **Planned** (P0)
- **Dependencies:** F-008.
- **Acceptance criteria:** Each item persisted where available; inaccessible content not claimed; sensitive form values redacted.
- **Related tasks:** T-040, T-041.
- **Tests:** Proposed.

## F-012 — Document and OCR Processing

- **Description:** Safely download/parse PDFs and common documents; OCR for image-based notices.
- **Status:** **Planned** (P2)
- **Dependencies:** Extraction pipeline, size/type limits.
- **Acceptance criteria:** Type/size validation; parse failures reported; OCR output marked as such.
- **Related tasks:** T-042.
- **Tests:** Proposed.

## F-013 — Page Classification

- **Description:** Classify pages (e.g., home, privacy policy, terms, contact, login, form, checkout, account).
- **Status:** **Planned** (P1)
- **Dependencies:** F-011.
- **Acceptance criteria:** Deterministic baseline; AI augmentation optional; classification confidence/limitations recorded.
- **Related tasks:** T-044.
- **Tests:** Proposed.

## F-014 — Privacy Notice Analysis

- **Description:** Detect notice presence/discoverability and extract statements about purposes, data categories, consent/withdrawal, contact/grievance, rights, retention, third parties, children.
- **Status:** **Planned** (P1)
- **Dependencies:** F-011, F-013, legal framework.
- **Acceptance criteria:** Evidence-linked extraction; missing information flagged as potential/needs review, not violation.
- **Related tasks:** T-045.
- **Tests:** Proposed.

## F-015 — Consent and Cookie Analysis

- **Description:** Observe consent mechanisms, optional purposes, withdrawal controls, consent-dependent behavior, cookie attributes and third-party scripts.
- **Status:** **Planned** (P1)
- **Dependencies:** F-008, F-011.
- **Acceptance criteria:** Observations labeled as observed behavior; no claim of legal violation from technical absence alone.
- **Related tasks:** T-046.
- **Tests:** Proposed.

## F-016 — Form and Personal-Data Collection Analysis

- **Description:** Identify forms/fields collecting personal data, apparent purpose, potentially unnecessary fields, third-party submission, sensitive evidence.
- **Status:** **Planned** (P1)
- **Dependencies:** F-011.
- **Acceptance criteria:** Field inventory with redaction; unnecessary-field concerns marked for human review.
- **Related tasks:** T-047.
- **Tests:** Proposed.

## F-017 — Rights, Grievance, Children, Retention, Third-Party, Accountability Checks

- **Description:** Assess discoverable mechanisms for rights/grievance, age-related controls, retention/deletion statements, third-party disclosures, organizational contact disclosures.
- **Status:** **Planned** (P1)
- **Dependencies:** F-014, F-015, F-016, legal framework.
- **Acceptance criteria:** Applicability questions separated from observations; specialist-review flags where required.
- **Related tasks:** T-048.
- **Tests:** Proposed.

## F-018 — Security and Data-Handling Indicators

- **Description:** Limited authorized checks: HTTPS/TLS indicators, security headers, exposed directory listings/public sensitive files, public secrets/PII indicators, insecure form submission, third-party transmission, cookie attributes.
- **Status:** **Planned** (P1)
- **Dependencies:** Crawler/extraction.
- **Acceptance criteria:** Non-intrusive only; no exploitation; results labeled indicators, not violations.
- **Related tasks:** T-049.
- **Tests:** Proposed.

## F-019 — Versioned DPDP Legal Framework

- **Description:** Maintain official legal documents, provisions, versions, applicability, commencement/effective dates, source URLs, last-verified dates.
- **Status:** **Planned** (P1)
- **Dependencies:** Legal curation process.
- **Acceptance criteria:** Every rule references a verified provision; in-force vs not-yet-effective distinguished; version selectable per audit.
- **Related tasks:** T-060, T-061.
- **Tests:** Proposed (legal-reference validation).

## F-020 — Deterministic Compliance Rules Engine

- **Description:** LLM-independent rule definitions and analyzers producing evidence-based findings.
- **Status:** **Planned** (P1)
- **Dependencies:** F-017, F-019.
- **Acceptance criteria:** Runs without AI; deterministic outputs; schema-validated findings; severity rubric applied.
- **Related tasks:** T-062.
- **Tests:** Proposed.

## F-021 — Evidence-Based Finding Model

- **Description:** Pydantic-validated finding schema with status/severity/confidence/evidence/legal references/reasoning/remediation/verification/human review.
- **Status:** **Planned** (P0 schema / P1 engine)
- **Dependencies:** Database, rules engine.
- **Acceptance criteria:** Required fields enforced; enums validated; evidence tied to source URL; severity and confidence independent.
- **Related tasks:** T-063.
- **Tests:** Proposed (schema validation).

## F-022 — AI-Assisted Analysis

- **Description:** Optional LLM tasks with retrieval-grounded legal analysis, structured output, citation validation, uncertainty flags.
- **Status:** **Planned** (P2)
- **Dependencies:** F-019, F-020, F-021, provider abstraction.
- **Acceptance criteria:** No AI required for core checks; citations validated; untrusted content isolated; unsupported claims rejected.
- **Related tasks:** T-070, T-071, T-072.
- **Tests:** Proposed (prompt injection, citation validation).

## F-023 — Overview Dashboard

- **Description:** Metrics, severity distribution, coverage with denominator, last audit, previous comparison.
- **Status:** **Planned** (P1)
- **Dependencies:** APIs and persistence.
- **Acceptance criteria:** Real data only; no arbitrary compliance score; coverage methodology documented.
- **Related tasks:** T-080.
- **Tests:** Proposed.

## F-024 — Pages Dashboard

- **Description:** Searchable/filterable page inventory and evidence viewer.
- **Status:** **Planned** (P1)
- **Dependencies:** F-011.
- **Acceptance criteria:** Filters for auth/errors/risk; evidence viewer shows source and redactions.
- **Related tasks:** T-081.
- **Tests:** Proposed.

## F-025 — Findings Dashboard and Review Workflow

- **Description:** Finding list/detail, reviewer assignment, status, resolution notes.
- **Status:** **Planned** (P1)
- **Dependencies:** F-021.
- **Acceptance criteria:** All finding fields displayed; review state persists; authorization enforced.
- **Related tasks:** T-082.
- **Tests:** Proposed.

## F-026 — Legal Framework Dashboard

- **Description:** Display applicable provisions, effective dates, source documents, rule version, limitations.
- **Status:** **Planned** (P2)
- **Dependencies:** F-019.
- **Acceptance criteria:** Version and applicability visible; sources link to official documents.
- **Related tasks:** T-083.
- **Tests:** Proposed.

## F-027 — Crawl Monitor UI

- **Description:** Live progress, current URL, queue depth, retries, failures, controls, exportable redacted logs.
- **Status:** **Planned** (P1)
- **Dependencies:** F-010.
- **Acceptance criteria:** Controls functional; logs redacted; no fabricated ETA.
- **Related tasks:** T-084.
- **Tests:** Proposed.

## F-028 — Audit History and Comparison

- **Description:** Previous runs, changed/new/resolved findings, coverage changes, regression checks.
- **Status:** **Planned** (P2)
- **Dependencies:** Audit run persistence, recheck.
- **Acceptance criteria:** Comparison accurate by finding identity/evidence; coverage changes shown.
- **Related tasks:** T-085, T-095.
- **Tests:** Proposed.

## F-029 — Remediation Guidance

- **Description:** Structured remediation per finding with what/where/why/requirement/change/example/test/limitations; draft notice copy.
- **Status:** **Planned** (P1)
- **Dependencies:** F-021, F-019.
- **Acceptance criteria:** Generated copy labeled draft; no automatic modification of target site.
- **Related tasks:** T-086.
- **Tests:** Proposed.

## F-030 — PDF Report Export

- **Description:** Executive summary, scope, coverage/limitations, methodology, prioritized findings, URLs, evidence/screenshots, legal refs, remediation, review questions, framework version, timestamp.
- **Status:** **Planned** (P2)
- **Dependencies:** F-021, report renderer.
- **Acceptance criteria:** Reproducible by audit ID; redacted; includes limitations.
- **Related tasks:** T-090.
- **Tests:** Proposed.

## F-031 — JSON and CSV Export

- **Description:** Machine-readable JSON report; CSV findings and page inventory.
- **Status:** **Planned** (P2)
- **Dependencies:** Persistence.
- **Acceptance criteria:** Schema versioned; CSV injection safe; redaction applied.
- **Related tasks:** T-091.
- **Tests:** Proposed.

## F-032 — Pause/Resume/Cancel and Recovery

- **Description:** Audit lifecycle control and worker recovery.
- **Status:** **Planned** (P1)
- **Dependencies:** Background queue.
- **Acceptance criteria:** State transitions enforced; cancellation cleans up credentials/sessions; interrupted jobs recover safely.
- **Related tasks:** T-035.
- **Tests:** Proposed.

## F-033 — Re-run Selected Checks or Full Audit

- **Description:** Re-run checks or entire audit after remediation.
- **Status:** **Planned** (P2)
- **Dependencies:** F-020, F-028.
- **Acceptance criteria:** New audit run created; prior evidence preserved; comparison available.
- **Related tasks:** T-095.
- **Tests:** Proposed.

## F-034 — Docker Compose and Environment Setup

- **Description:** Local development environment, env examples, migrations, seed data, setup/deployment docs.
- **Status:** **Planned** (P0)
- **Dependencies:** Backend stack decision.
- **Acceptance criteria:** One-command local startup; no secrets committed; documented prerequisites.
- **Related tasks:** T-100, T-101.
- **Tests:** Manual smoke test.

## F-035 — Automated Test Suite and Local Test Site

- **Description:** Unit/integration/E2E/security tests and a synthetic local test website with privacy notices, forms, cookie banners, and deliberate gaps.
- **Status:** **Planned** (P0/P1)
- **Dependencies:** Stack.
- **Acceptance criteria:** CI-runnable; synthetic data only; covers required test areas.
- **Related tasks:** T-110–T-114.
- **Tests:** Self.

---

## F-036 — Backend Runtime Foundation

- **Description:** FastAPI application factory, settings via pydantic-settings, `/health` endpoint, pytest/ruff/mypy configuration, and dependency manifests installed into the workspace venv.
- **Purpose:** Provide a runnable backend base for product features.
- **Status:** **Implemented (scaffold)**
- **Related files:** `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/api/health.py`, `backend/main.py`, `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/pyproject.toml`, `backend/.env.example`, `backend/.gitignore`, `backend/README.md`, `backend/tests/test_health.py`, `backend/tests/test_config.py`.
- **Dependencies:** Python 3.12, workspace `.venv`.
- **Acceptance criteria:** App starts; `GET /health` returns status; lint/type/test checks run.
- **Evidence:** 2026-10-19 — ruff passed, pytest 3 passed, mypy passed, live `/health` returned `status: ok`.
- **Limitations:** No database, queue, auth, project API, crawler, or compliance logic. The backend is a standalone service at the workspace root and is not part of the Next.js application.

---

## Feature Dependency Overview

```mermaid
flowchart LR
    F002[Auth] --> F003[Tenants]
    F003 --> F004[Projects]
    F004 --> F005[Config]
    F005 --> F008[Crawler]
    F006[URL Discovery] --> F008
    F007[Scope/SSRF] --> F008
    F008 --> F010[Progress]
    F008 --> F011[Extraction]
    F011 --> F013[Classification]
    F011 --> F014[Notice Analysis]
    F011 --> F015[Consent]
    F011 --> F016[Forms]
    F013 --> F020[Rules Engine]
    F014 --> F020
    F015 --> F020
    F016 --> F020
    F019[Legal Framework] --> F020
    F020 --> F021[Findings]
    F021 --> F023[Overview]
    F021 --> F024[Pages]
    F021 --> F025[Findings UI]
    F021 --> F029[Remediation]
    F021 --> F030[PDF]
    F021 --> F031[JSON/CSV]
    F019 --> F022[AI]
    F020 --> F022
    F021 --> F028[History]
    F028 --> F033[Re-run]
```

## Related Documents

- [PRD.md](./PRD.md) — requirements and acceptance context.
- [TASKS.md](./TASKS.md) — implementation tasks.
- [TESTCASE.md](./TESTCASE.md) — test coverage.
- [FLOW.md](./FLOW.md) — flows behind features.
