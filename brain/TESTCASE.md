# TESTCASE.md — Test Cases and Quality Assurance

**Last updated:** 2026-10-19

## 1. Current Test Status (Verified)

- **Frontend:** Vitest 4 (`vitest.config.mts`), 9 files / 59 tests under `tests/audit/` with synthetic fixture sites.
- **Backend:** pytest/pytest-asyncio/pytest-cov/ruff/mypy installed; 3 tests cover health and config (the inspector tests were removed).
- **No CI pipeline exists.**
- **Executed 2026-10-19:** frontend `npm test` → 59 passed (9 files); `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed. Backend `pytest -q` → 3 passed; `ruff check .` passed; `mypy app main.py tests` passed (9 files).
- Frontend quality tooling is ESLint (`npm run lint`), TypeScript (`npx tsc --noEmit`), and Vitest (`npm test`).

Everything below is a **proposed** test case unless explicitly listed as existing. Do not report these as passing.

## 2. Test Strategy (Proposed)

| Level | Scope | Tooling |
| --- | --- | --- |
| Unit | URL normalization, rules, schemas, redaction, helpers | To be decided with stack (T-003) |
| Integration | API + DB + queue + crawler against local fixtures | To be decided |
| End-to-end | User creates project → audit → findings → export | Playwright (candidate) |
| Security | SSRF, tenant isolation, prompt injection, redaction | Backend tests + crafted fixtures |
| Contract | API response schemas | Pydantic/OpenAPI validation |
| Manual | Accessibility, visual review, report quality | Documented checklist |

**Test data rules:**

- Use synthetic personal data only.
- Never use real customer credentials or websites in automated tests.
- Provide a local synthetic test website (T-110) with privacy notices, forms, cookie banners, and deliberate gaps.

## 3. Existing Tests

| Reference | Location | Status |
| --- | --- | --- |
| `test_health_returns_ok` | `backend/tests/test_health.py` | **Passed** (2026-10-19) |
| `test_settings_read_cors_origins_from_environment` | `backend/tests/test_config.py` | **Passed** (2026-10-19) |
| `test_settings_defaults_for_optional_integrations` | `backend/tests/test_config.py` | **Passed** (2026-10-19) |
| `test_analyze_html_extracts_page_elements` | `backend/tests/test_landing_analyzer.py` | **Removed** (2026-10-19) |
| `test_ensure_public_url_rejects_unsafe_targets` (7 cases) | `backend/tests/test_landing_analyzer.py` | **Removed** (2026-10-19) |
| `test_analyze_landing_rejects_invalid_url` | `backend/tests/test_analysis_api.py` | **Removed** (2026-10-19) |
| `test_analyze_landing_rejects_private_network_target` | `backend/tests/test_analysis_api.py` | **Removed** (2026-10-19) |
| `test_analyze_landing_returns_elements` | `backend/tests/test_analysis_api.py` | **Removed** (2026-10-19) |
| Live `POST /api/analyze-landing` smoke test | `https://www.python.org/` | **Removed** (2026-10-19) |

## 4. Proposed Unit Test Cases

### URL normalization and discovery

| ID | Case | Input | Expected |
| --- | --- | --- | --- |
| UT-001 | Lowercase host, strip default port | `HTTPS://Example.COM:443/a` | `https://example.com/a` |
| UT-002 | Remove fragment | `https://example.com/a#top` | `https://example.com/a` |
| UT-003 | Preserve meaningful query params | `https://example.com/search?q=privacy` | unchanged |
| UT-004 | Strip tracking params | `?utm_source=x&id=5` | tracking removed, `id=5` kept |
| UT-005 | Deduplicate normalized equivalents | `/a`, `/a/`, `/a#x` | one URL |
| UT-006 | Reject non-HTTP schemes | `javascript:`, `ftp:`, `file:` | rejected |
| UT-007 | Reject URLs with embedded credentials | `https://u:p@example.com` | rejected |
| UT-008 | Sitemap index parsing | nested sitemap fixture | all child sitemaps discovered |
| UT-009 | robots.txt sitemap references | fixture | sitemaps extracted |
| UT-010 | Pagination link discovery | fixture | next-page URLs discovered |
| UT-011 | Discovery-source tracking | multiple sources for one URL | all sources recorded |

### Scope and SSRF

| ID | Case | Input | Expected |
| --- | --- | --- | --- |
| UT-020 | Block loopback | `http://127.0.0.1` | rejected |
| UT-021 | Block IPv6 loopback | `http://[::1]` | rejected |
| UT-022 | Block private ranges | `10.x`, `172.16-31.x`, `192.168.x` | rejected |
| UT-023 | Block link-local/metadata | `169.254.169.254` | rejected |
| UT-024 | Block internal hostnames | `localhost`, `.internal` | rejected |
| UT-025 | Enforce same-origin default | external link | not queued |
| UT-026 | Allow approved subdomain | listed subdomain | queued |
| UT-027 | Reject redirect to out-of-scope host | 302 to other origin | not followed |
| UT-028 | DNS rebinding: re-check resolved IP at connect | mock DNS change | second resolution rejected |
| UT-029 | Reject non-standard port unless allowed | `:8080` | rejected by default |

### Crawl limits and lifecycle

| ID | Case | Expected |
| --- | --- | --- |
| UT-030 | Run time budget enforced | crawl stops at the 5-minute deadline; run is `partial`/`failed` with a time-limit note |
| UT-031 | No fixed page/depth cap | all same-site links are followed within the budget |
| UT-032 | Concurrency bound respected | never exceeds configured value |
| UT-033 | Delay respected between requests | timestamps comply |
| UT-034 | Timeout recorded as failure | page status failed/timeout |
| UT-035 | Max file size enforced | oversized download skipped |
| UT-036 | Content-type allowlist enforced | unsupported type skipped |
| UT-037 | Bounded retries | retry count capped, no infinite loop |
| UT-038 | Pause stops new work | no new requests after pause |
| UT-039 | Resume continues queue | pending URLs processed |
| UT-040 | Cancel stops job and cleans up | status cancelled; sessions destroyed |

### Finding schema and rules

| ID | Case | Expected |
| --- | --- | --- |
| UT-050 | Valid finding passes validation | accepted |
| UT-051 | Invalid status rejected | validation error |
| UT-052 | Severity outside enum rejected | validation error |
| UT-053 | Missing evidence rejected/flagged | validation error |
| UT-054 | Confidence bounded 0–1 | out-of-range rejected |
| UT-055 | Severity and confidence independent | no coupling |
| UT-056 | Deterministic rule without AI | produces expected finding |
| UT-057 | Legal citation must exist in legal DB | unknown citation rejected |
| UT-058 | In-force vs not-yet-effective provision | applicability reflected |
| UT-059 | No finding claims legal certification | forbidden language check |

### Redaction

| ID | Case | Expected |
| --- | --- | --- |
| UT-060 | Password field value redacted | value removed from evidence |
| UT-061 | Authorization header redacted from logs | header value absent |
| UT-062 | Cookies redacted in crawl logs | cookie values absent |
| UT-063 | Token query param redacted | token masked |
| UT-064 | CSV export formula injection escaped | leading `=`, `+`, `-`, `@` neutralized |

## 5. Proposed Integration Test Cases

| ID | Case | Setup | Expected |
| --- | --- | --- | --- |
| IT-001 | Create project | Authenticated tenant | Project persists with validated config |
| IT-002 | Reject blocked URL | Root URL `http://169.254.169.254` | 4xx with safe error, no job |
| IT-003 | Full public crawl | Local synthetic site | Pages discovered/extracted within limits |
| IT-004 | JS-rendered page | Local site requiring JS | Content extracted with rendering enabled |
| IT-005 | Credentials login | Local auth fixture | Session verified; protected pages crawled |
| IT-006 | Auth failure | Wrong credentials | Audit marked auth-failed; no protected claims |
| IT-007 | Session expiry | Fixture expires session | Expiry detected; re-auth or clear failure |
| IT-008 | Authenticated coverage | Mixed public/protected | Coverage and auth status reported |
| IT-009 | Progress events | Crawl running | Real counts/current URL; no invented ETA |
| IT-010 | Pause/resume/cancel API | Running audit | State transitions and cleanup correct |
| IT-011 | Extraction persistence | Crawl complete | Page snapshots/evidence retrievable |
| IT-012 | Cookie/tracker observations | Local banner fixture | Attributes/scripts recorded |
| IT-013 | Finding generation | Known gaps fixture | Expected finding statuses/evidence |
| IT-014 | AI disabled | No provider key | Deterministic checks complete |
| IT-015 | AI citation validation | Mocked invalid citation | Claim rejected |
| IT-016 | Report export | Completed audit | PDF/JSON/CSV generated, redacted |
| IT-017 | Reproducibility | Same audit ID | Same findings/version preserved |
| IT-018 | Re-audit comparison | Changed fixture | New/resolved/regressed detected |
| IT-019 | Failed page visibility | 404/timeout pages | Listed with reasons |
| IT-020 | Audit recovery | Worker restart | Job recovers or fails clearly |

## 6. Proposed Security Test Cases

| ID | Case | Expected |
| --- | --- | --- |
| ST-001 | Cross-tenant project access | 403/404 without leaking existence |
| ST-002 | Cross-tenant finding access | Denied |
| ST-003 | Cross-tenant export access | Denied |
| ST-004 | Unauthenticated API access | 401 |
| ST-005 | IDOR via guessed IDs | Denied |
| ST-006 | SSRF via redirect | Out-of-scope redirect not followed |
| ST-007 | SSRF via DNS rebinding | Re-checked and blocked |
| ST-008 | Hostile HTML/XSS fixture | No script execution in UI; escaped |
| ST-009 | Prompt injection fixture | Model output not manipulated; citation validation holds |
| ST-010 | Credential leakage in logs/export | Redaction verified |
| ST-011 | Rate-limit bypass attempt | Throttled |
| ST-012 | Oversized upload/document | Rejected |
| ST-013 | Malformed document parser | Fails safely, no crash |
| ST-014 | CSV injection | Neutralized |
| ST-015 | Unauthorized form submission | No mutating form submitted |

## 7. Proposed End-to-End Scenarios

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| E2E-001 | First audit | Register → create project → configure → crawl → findings → export | Completes with evidence and limitations |
| E2E-002 | Authenticated audit | Project with credentials → local auth site → protected pages assessed | Auth state and coverage reported |
| E2E-003 | Review workflow | Open finding → assign reviewer → status → notes | Persisted and visible |
| E2E-004 | Remediation loop | Fix local fixture → re-run → compare | Finding resolved; diff shown |
| E2E-005 | Coverage limitations | Site with blocked/timeout pages | Failures visible; coverage denominator explained |
| E2E-006 | Non-AI operation | No AI key configured | Deterministic audit completes |
| E2E-007 | Cancel audit | Start → cancel → verify cleanup | Cancelled; no lingering sessions |
| E2E-008 | Accessibility smoke | Keyboard-only pass on core dashboards | All controls reachable; labels present |

## 8. Test-to-Feature Mapping

| Feature | Tests |
| --- | --- |
| F-002/F-003 Auth & tenants | ST-001–ST-005, E2E-001 |
| F-006 URL discovery | UT-001–UT-011 |
| F-007 Scope/SSRF | UT-020–UT-029, ST-006–ST-007 |
| F-008/F-032 Crawler/lifecycle | UT-030–UT-040, IT-009–IT-010, E2E-007 |
| F-009 Authenticated crawling | IT-005–IT-008, E2E-002 |
| F-011 Extraction | IT-011–IT-012 |
| F-014–F-018 Analysis | IT-013, E2E-001 |
| F-020/F-021 Rules/findings | UT-050–UT-059, IT-013 |
| F-022 AI | IT-014–IT-015, ST-009 |
| F-025 Review workflow | E2E-003 |
| F-030/F-031 Exports | IT-016, UT-064, ST-010 |
| F-028/F-033 History/re-run | IT-018, E2E-004 |
| Cross-cutting security | ST-001–ST-015 |

## 9. Execution and Reporting Rules

- Record the exact command run and observed result.
- Do not mark a test as passing based on intent or partial output.
- Distinguish "not run", "skipped", "blocked", "failed", and "passed".
- Flaky tests must be fixed or quarantined with an issue reference, not silently retried forever.
- Security tests must run in CI once the backend exists.

## 10. Implemented TypeScript Audit Engine Tests (2026-10-20)

The frontend now has a test framework (Vitest 4) and an automated suite for the audit engine. Command: `npm test` from `dpdp-compliance-auditor/`. Observed result: **13 files, 94 tests passed**.

| File | Coverage |
| --- | --- |
| `tests/audit/url.test.ts` | URL normalization, tracking-parameter stripping, default ports, credential/protocol rejection, private/reserved IP ranges, public-target assertion, link resolution and classification, site scope (apex = www) |
| `tests/audit/registry.test.ts` | 75 unique tests, required definition fields, evaluator for every test, all ten categories covered, supplementary `THIRD-001`/`RETENTION-001`, valid claim type for every test, default claim mappings |
| `tests/audit/crawler.test.ts` | Same-origin crawl, policy discovery, form parsing with redaction, third-party host and cookie capture, robots/sitemap, partial-run status, external-origin exclusion, same-site redirect followed, off-site redirect refused, run-budget exhaustion with a time-limit error |
| `tests/audit/login-wall.test.ts` | Login wall from 401, login redirect, password form on a login-labelled page; a homepage login link alone is not a wall; empty page input; `findLoginSurfaces` on a public homepage with a discovered `/login`; `pageLooksLikeLogin` classification; empty input |
| `tests/audit/rules.integration.test.ts` | Complete-site passes, missing notice fails, consent controls, preselected consent, contradictory notices, missing rights, rights mechanism passes only on a dedicated route, JS-only rendering not assessed, failed pages, missing security headers, prompt-injection resistance |
| `tests/audit/consent-browser.test.ts` | Pre-consent trackers, post-reject persistence, withdrawal behaviour, tracker classification, accept state, browser-unavailable handling (`NOT_ASSESSED`) |
| `tests/audit/store.test.ts` | Atomic file persistence, retrieval, listing, unknown identifier, unsafe identifier rejection, missing directory |
| `tests/audit/export.test.ts` | JSON round-trip, CSV header (incl. `claimType`/`evidence`) and row count, PDF signature and size |
| `tests/audit/screenshots.test.ts` | Screenshot name safety (rejects traversal/invalid names), per-run directory resolution, and finding attachment by category/URL (element crop + full-page fallback) |
| `tests/audit/summary.test.ts` | Summary-based readiness outcome (`deriveAuditOutcome`) and the four independent coverage measures (`computeAuditCoverage`): page crawl, site discovery, test execution, evidence sufficiency |
| `tests/audit/groups.test.ts` | Finding consolidation: related tests grouped, all-non-finding groups omitted, worst status/severity derivation, primary-first ordering, presentation-layer output |
| `tests/audit/legal.test.ts` | Per-provision commencement dates and groups, Section 6(9) one-year group, all provisions not-yet-effective, `resolveLegalReferences`, phased `COMMENCEMENT_SUMMARY` |
| `tests/audit/trackers.test.ts` | Tracker classification with matched domain suffix, longest-suffix preference, unknown host, first-party subdomain |

Not yet covered by automated tests: Playwright browser collection and live screenshot capture (manually verified on 2026-10-19/2026-10-20, not unit-tested), the Playwright sign-in flow and credential stdin handoff (validated manually on 2026-10-20), progress-log persistence through the spawned worker (validated manually on 2026-10-20 against `https://example.com/`: 6 entries, `completed`, 1 page, 75 tests), Prisma adapter, worker process lifecycle, API route handlers (including `/api/audits/[id]/credentials`), dashboard/credentials UI, and rate limiting/auth.

## 11. Related Documents

- [TASKS.md](./TASKS.md) — test implementation tasks (T-003, T-110–T-114, T-092, T-096).
- [FEATURES.md](./FEATURES.md) — features under test.
- [SECURITY.md](./SECURITY.md) — security requirements.
- [API.md](./API.md) — contracts to test.
