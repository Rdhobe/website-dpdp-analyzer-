# INTEGRATIONS.md — External Integrations

**Last verified:** 2026-10-19

Only integrations verified in code are listed as implemented. Everything else is planned or proposed. No credentials are included in this document.

## 1. Current Integrations (Verified)

| Integration | Purpose | Status | Evidence |
| --- | --- | --- | --- |
| Google Fonts via `next/font/google` | Load Geist and Geist Mono at build/runtime | **Implemented** | `app/layout.tsx` |
| Audit engine → target website | Crawl one authorized origin and collect evidence | **Implemented** | `lib/audit/crawler.ts`, `lib/audit/browser.ts` |
| FastAPI backend | Placeholder health service; the frontend no longer calls it | **Implemented (unused by UI)** | `backend/app/api/health.py` |

Notes:

- `next/font` self-hosts font files in the build output; no runtime API key is required.
- The frontend no longer consumes `NEXT_PUBLIC_API_URL`; the landing-page inspector was removed on 2026-10-19.
- Backend CORS defaults allow `http://localhost:3000` and `http://127.0.0.1:3000`, but no frontend request reaches the backend.
- No third-party SDKs or API keys are required for the current audit engine.
- The target-website integration sends no credentials for public crawls, is bounded by the fixed 5-minute run deadline plus timeout/redirect/body limits, and never submits data forms. When an operator supplies credentials for a detected login wall, Playwright submits only the single-step username/password form and the resulting same-site cookies are reused for that run; credentials are streamed to the worker over stdin and never persisted.

## 2. Planned Integrations (Requirements)

All planned integrations are **not implemented** and have no configuration in the repository.

### 2.1 LLM Provider (Optional)

| Attribute | Proposed |
| --- | --- |
| Purpose | Page classification, notice extraction, statement-vs-behavior comparison, missing-information detection, remediation suggestions, summaries, plain-language legal explanations |
| Direction | Outbound request (evidence/legal text) → inbound structured JSON |
| Authentication | Provider API key via secret manager/environment variable; name `TBD` |
| Configuration | Provider name, model, API key, base URL, timeout, max tokens, temperature; all configurable |
| Data exchanged | Redacted page text/excerpts, retrieved legal provisions, task instructions; response is structured analysis |
| Webhooks | None planned |
| Timeouts/retries | Required; bounded retries with backoff; degrade to deterministic results |
| Rate limits | Provider-dependent; must be configurable and respected |
| Failure modes | Unavailable, rate-limited, invalid JSON, invalid citations, policy refusal → mark not assessed, never fabricate |
| Security | Treat content as untrusted; validate schema; verify citations; don't send sensitive PII unnecessarily; support non-AI mode |
| Testing | Mocked provider in tests; no live calls in CI |
| Status | **Planned** (F-022, T-070/T-071/T-072) |
| Decision needed | Provider abstraction design and default provider (`TBD`) |

**Environment variables (names are proposals, not existing):** `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_TIMEOUT_SECONDS`.

Do not create these variables until the provider decision is recorded.

### 2.2 OCR / Document Extraction (Optional)

| Attribute | Proposed |
| --- | --- |
| Purpose | Extract text from image-based privacy notices and supported documents |
| Direction | Local processing or external OCR API (`TBD`) |
| Authentication | None if local; API key if external |
| Data exchanged | Documents/images; extracted text |
| Failure modes | Unreadable image, unsupported format, OCR timeout → record extraction error |
| Security | Size/type limits; sandbox parsing; redact sensitive output |
| Status | **Planned** (F-012, T-042) |
| Decision needed | Library/service choice (`TBD`) |

### 2.3 Object/File Storage

| Attribute | Proposed |
| --- | --- |
| Purpose | Store screenshots, HTML snapshots, documents, export artifacts |
| Direction | Backend/worker uploads; API returns signed references |
| Authentication | Provider credentials / IAM role (`TBD`) |
| Data exchanged | Page artifacts, reports |
| Security | Encryption at rest, tenant-scoped paths, signed URLs, retention/deletion |
| Status | **Planned** (DB-03) |
| Decision needed | Provider (S3-compatible, managed object storage, local volume for dev) |

### 2.4 Redis / Celery (or Equivalent Queue)

| Attribute | Proposed |
| --- | --- |
| Purpose | Background crawl/analyze/report jobs, progress state, possibly sessions |
| Direction | API enqueues; workers consume |
| Authentication | Password/TLS as configured; none in local dev |
| Data exchanged | Job IDs, progress counters, task payloads (no secrets in payload if avoidable) |
| Failure modes | Broker unavailable, job lost, duplicate execution → idempotency and recovery |
| Status | **Planned** (T-005) |
| Decision needed | Queue technology final choice |

### 2.5 PostgreSQL

| Attribute | Proposed |
| --- | --- |
| Purpose | Primary relational persistence |
| Direction | API/workers read/write |
| Authentication | Connection string/credentials via environment; least privilege |
| Data exchanged | All domain data |
| Status | **Planned** (T-004) |
| Notes | Not an external SaaS integration per se, but an infrastructure dependency. See [DATABASE.md](./DATABASE.md). |

### 2.6 Playwright Browser Binaries

| Attribute | Proposed |
| --- | --- |
| Purpose | JavaScript rendering, authenticated sessions, screenshots, controlled interaction |
| Direction | Local process |
| Authentication | None |
| Data exchanged | Target pages and sessions |
| Security | Isolated browser contexts; no credential logging; cleanup after audits |
| Status | **Planned** (F-008/F-009) |

### 2.7 Official Legal Sources

| Attribute | Proposed |
| --- | --- |
| Purpose | Source of truth for DPDP Act 2023, DPDP Rules 2025, commencement notifications, amendments |
| Direction | Inbound curation (manual or controlled ingestion) |
| Authentication | None expected (public government sources) |
| Data exchanged | Legal documents, provisions, effective dates |
| Failure modes | Source unavailable/changed → last-verified date and manual review |
| Security | Verify official domain; store checksum; no scraping that violates terms |
| Status | **Planned** (T-060) |
| Decision needed | Ingestion/curation workflow (`TBD`) |

### 2.8 Email / Notification Provider (Proposed, not in requirements)

Not required by the requirements. If added for audit-completed notifications, record a decision here first.

## 3. Integration Configuration Variable Names (Proposed)

No environment variables exist today. Proposed names only — do not treat as implemented:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Queue/cache |
| `SECRET_KEY` / `ENCRYPTION_KEY` | App secret/key material (names `TBD`) |
| `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_BASE_URL` | Optional AI |
| `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Object storage (`TBD`) |
| `SENTRY_DSN` | Error tracking, if adopted |
| `CORS_ALLOWED_ORIGINS` | API CORS |
| `RATE_LIMIT_*` | Rate limiting tuning |

Provide an `.env.example` with names only once values are actually consumed.

## 4. Integration Rules

1. Document every new integration in this file before or with the change.
2. Never commit credentials; use secret management.
3. Define timeout, retry, and failure behavior for every outbound call.
4. Treat all third-party responses as untrusted input.
5. Make optional integrations (AI, OCR) fail gracefully.
6. Respect provider terms of service and rate limits.
7. Add tests using mocks; no live external calls in automated tests.
8. Record significant integration choices in [DECISION.md](./DECISION.md).

## 5. Implemented TypeScript Engine Integrations (2026-10-19)

| Integration | Status | Detail |
| --- | --- | --- |
| Playwright | Partial | `lib/audit/browser.ts` imports `playwright` dynamically and collects cookies, network requests, consent-control visibility, and servable consent screenshots; `lib/audit/screenshots.ts` captures full-page and element-crop screenshots for findings. Browser binaries were installed locally on 2026-10-19 (`npx playwright install chromium` → Chrome Headless Shell 156); when absent, capture degrades gracefully with a `NOT_ASSESSED`/limitation notice. The dependency is declared in `package.json`. |
| Cheerio | Implemented | Static HTML parsing in `lib/audit/crawler.ts`. |
| pdfkit | Implemented | PDF export in `lib/audit/export.ts` (declared, with `@types/pdfkit`). |
| Zod | Implemented | Request validation in `app/api/audits/route.ts`. |
| tsx | Implemented | Runs the detached worker (`node node_modules/tsx/dist/cli.mjs workers/audit-worker.ts <runId>`). |
| Prisma / PostgreSQL | Schema only | `prisma/schema.prisma` defined; no client adapter or migration wired. |
| Redis / BullMQ | Not implemented | No queue; the launcher spawns a local child process. |
| Crawlee | Not used | The crawler is a purpose-built bounded `fetch` + Cheerio loop. |
| LLM provider | Not implemented | Deterministic checks run without AI. |

Environment variables introduced are documented in `dpdp-compliance-auditor/.env.example`: `AUDIT_DATA_DIR`, `AUDIT_ALLOW_PRIVATE_TARGETS`, `AUDIT_STORE`, `DATABASE_URL`, and `AUDIT_BROWSER_ENABLED`.

## 6. Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system data flow.
- [SECURITY.md](./SECURITY.md) — secret handling and AI security.
- [DATABASE.md](./DATABASE.md) — persistence.
- [PRD.md](./PRD.md) — integration requirements.
- [TASKS.md](./TASKS.md) — integration tasks.
