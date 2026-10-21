# CHANGES_LOG.md — Verified Change History

Chronological record of meaningful changes. Only verified changes are recorded. No historical entries were fabricated; dates reflect observed evidence or the date of this documentation task.

## 2026-10-20 — Implemented the audit API in the Python backend

- **Summary:** Added FastAPI endpoints mirroring the Next.js audit API so the Python backend can create, list, read, accept credentials for, export, and serve screenshots for audit runs. The endpoints reuse the existing TypeScript audit engine by writing the same `.data/audits` JSON store and spawning `workers/audit-worker.ts`; no Next.js code was changed. Added `app/api/audits.py`, `app/services/audit_store.py`, `app/services/launcher.py`, and `app/services/export.py`; registered the router in `app/main.py`.
- **Endpoints:** `GET /api/audits`, `POST /api/audits`, `GET /api/audits/{id}`, `POST /api/audits/{id}/credentials`, `GET /api/audits/{id}/export?format=json|csv|pdf`, `GET /api/audits/{id}/screenshots/{name}`.
- **Verification (observed):** `ruff check app/api app/services app/main.py` passed; `mypy app/api app/services app/main.py` passed; `pytest -q` → `3 passed`; smoke test created an audit that completed with progress entries; CSV, PDF, and JSON exports returned `200`; screenshot traversal returned `404`.
- **Docs:** [API.md](./API.md).

## 2026-10-20 — Live run log, sign-in diagnostics, and no worker console window

- **Summary:** Audits now persist a structured progress log (worker start, each crawled URL with attempted/fetched/failed/queued counts, login steps, crawl summary, evaluation) that the audit page polls and renders live. The worker is spawned without creating a visible Windows console (`detached: false`, `windowsHide: true`); `detached: true` forced a `DETACHED_PROCESS` console window on every run. Sign-in attempts now record diagnostics, and a login that never leaves the login page is reported as rejected credentials instead of silently continuing. See DEC-023.
- **Frontend changed:**
  - `lib/audit/types.ts` — `AuditProgressEvent`/`AuditProgressEntry`/`ProgressLevel`; `AuditRun.progress?`; `AuditAuthState.diagnostics?`.
  - `lib/audit/crawler.ts` — `onProgress` emits structured events before and after each fetch with `attempted`/`succeeded`/`failed`/`pending` counts.
  - `lib/audit/runner.ts` — emits start, login steps, wall/surface detection, crawl summary, browser/screenshot and evaluation events; stores login diagnostics on `auth` and in failure limitations.
  - `lib/audit/auth.ts` — `LoginResult.steps` records the Playwright flow; a form still on the login page after submit is reported as likely-rejected credentials.
  - `lib/audit/launcher.ts` — spawns the worker with `detached: false` and `windowsHide: true`.
  - `workers/audit-worker.ts` — appends progress entries and saves a throttled snapshot (≤1 write/750 ms, last 400 entries); the final run carries the full log.
  - `lib/audit/store.ts` — normalizes legacy runs to `progress: []`.
  - `components/audit/audit-progress.tsx` (new) — stats tiles, live/finished pill, newest-first coloured event list.
  - `components/audit/audit-report.tsx` — live log on queued/running, log + sign-in diagnostics on `requires_credentials`, collapsible log and diagnostics on finished reports.
  - `components/audit/audit-live.tsx` — polls every 1.5 s instead of 3 s.
- **Verified (observed 2026-10-20):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → **94 passed (13 files)**, `npm run build` passed. Spawned worker against `https://example.com/` persisted 6 progress entries (start → crawling → fetched → crawl summary → evaluating) and finished `completed` with 1 page / 75 tests.
- **Known limitation:** link discovery is static. On client-rendered dashboards that only expose post-login links via JavaScript, an authenticated crawl can still see few pages. Browser-based link discovery is not implemented.
- **Docs:** [DECISION.md](./DECISION.md) DEC-023; [FEATURES.md](./FEATURES.md) F-040; [TASKS.md](./TASKS.md) T-138; [DESIGN.md](./DESIGN.md); [API.md](./API.md); [TESTCASE.md](./TESTCASE.md); [MEMORY.md](./MEMORY.md).

## 2026-10-20 — Surface discovered sign-in pages on public sites and make discovery notices readable

- **Summary:** A real audit of `www.mockmingle.in/` reached `/login`, `/signup`, and `/forgot-password` but reported no authentication surface or credential option, because login detection only inspected the start page. The same report hid `robots.txt: not found (HTTP 404)` and `sitemap.xml: not found (HTTP 404)` in one small line. This change detects login pages discovered anywhere in the crawl, offers an optional authenticated run on otherwise public sites, and renders the discovery files as large, labelled cards. See DEC-022.
- **Frontend changed:**
  - `lib/audit/types.ts` — `AuditAuthState` adds `loginSurfaceDetected`.
  - `lib/audit/login-wall.ts` — new `pageLooksLikeLogin` and `findLoginSurfaces`; `detectLoginWall` reuses the shared page classifier.
  - `lib/audit/runner.ts` — when no credentials were supplied and the start page is not a wall, detects login surfaces across the crawl, records `auth` with `loginSurfaceDetected`, and adds a limitation that pages behind the login were not audited; authenticated runs set the new field.
  - `lib/audit/store.ts` — `normalizeRun` backfills `loginSurfaceDetected` and infers a login surface from stored pages for older runs.
  - `workers/audit-worker.ts` — malformed-credential failure record includes `loginSurfaceDetected`.
  - `app/api/audits/[id]/credentials/route.ts` — accepts any non-running run whose `auth` detected a login wall or surface (not only `requires_credentials`).
  - `components/audit/credentials-prompt.tsx` — adds an `optional` variant with accurate copy for public sites.
  - `components/audit/audit-report.tsx` — renders an optional credentials prompt on completed/partial runs with a detected surface, and replaces the single discovery line with large `DiscoveryCard`s for `robots.txt`/`sitemap.xml` ("Found (HTTP 200)" / "Not found (HTTP 404)" plus an explanatory note).
- **Tests changed:** `tests/audit/login-wall.test.ts` extended to 9 tests (`findLoginSurfaces`, `pageLooksLikeLogin`).
- **Verified (observed 2026-10-20):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → **94 passed (13 files)**, `npm run build` passed. The existing `www.mockmingle.in` run (`audit_8566de3a-575f-4e16-92ee-52f9e4b88c0f`) now normalizes to `auth.loginSurfaceDetected: true` at `https://www.mockmingle.in/login` (its `/login` page carries a password field).
- **Docs:** [DECISION.md](./DECISION.md) DEC-022; [FEATURES.md](./FEATURES.md) F-039; [TASKS.md](./TASKS.md) T-137; [TESTCASE.md](./TESTCASE.md); [DESIGN.md](./DESIGN.md); [API.md](./API.md); [MEMORY.md](./MEMORY.md).

## 2026-10-20 — Uncapped crawl with a 5-minute budget, login-wall detection, and credential-gated continuation

- **Summary:** Removed the operator-facing max-pages/max-depth limits so the crawler follows same-site links until the queue empties or a fixed 5-minute engine budget is exhausted, with explicit slow-loading/time-limit messaging. Added login-wall detection: an unauthenticated crawl that lands on a sign-in page now produces `requires_credentials` instead of a dead failed run, the report prompts for a single username/password, and the worker signs in with Playwright, reuses the session cookies for the crawl, and then runs the normal registry. MFA, CAPTCHA, and SSO are reported, never bypassed. See DEC-019 to DEC-021.
- **Frontend changed:**
  - `lib/audit/types.ts` — `AuditStatus` adds `requires_credentials`; `CrawlConfig` replaces `maxPages`/`maxDepth` with `timeBudgetMs`; `AuditRun.auth: AuditAuthState | null`; `OutcomeLevel` adds `credentials_required`.
  - `lib/audit/crawler.ts` — `CrawlOptions` accepts `cookieHeader` and an absolute `deadline`; BFS follows same-site links without depth/page caps; per-request timeout is clamped to the remaining budget; `CrawlResult.timeLimitReached`; robots/sitemap requests are also budget-clamped; the page-limit limitation is replaced by a time-limit limitation.
  - `lib/audit/runner.ts` — `ENGINE_TIME_BUDGET_MS` (5 minutes) is the default `timeBudgetMs`; optional `credentials`; performs login, passes cookies/storage state to the crawler/browser/screenshots, detects a login wall when no credentials were supplied, returns `requires_credentials` with `auth`, skips browser/screenshots with a limitation when under 5 seconds remain, and marks time-limited runs `partial` or `failed` with a slow-loading message.
  - `lib/audit/login-wall.ts` (new) — `detectLoginWall` (401/403, login-like redirect/URL, or password form on a login-labelled page; a login link alone is not a wall).
  - `lib/audit/auth.ts` (new) — `performLogin` (single-step username/password only; detects MFA/CAPTCHA/SSO and rejection; returns a cookie header and Playwright storage state; never logs credentials).
  - `lib/audit/launcher.ts` — `createQueuedAudit` accepts optional `auth`/`credentials`; `spawnAuditWorker` streams credentials over the child's stdin and records `auth: null` for normal runs.
  - `workers/audit-worker.ts` — reads and validates the stdin payload, fails safely on malformed input, and passes credentials to `runAudit`.
  - `app/api/audits/route.ts` — request schema/config no longer accept `maxPages`/`maxDepth`.
  - `app/api/audits/[id]/credentials/route.ts` (new) — validates `{ username, password }`, requires a run that detected a login wall, and queues a new authenticated run for the same target/config.
  - `components/audit/new-audit-form.tsx` — removed max-pages/max-depth inputs and states the 5-minute limit and sign-in behaviour.
  - `components/audit/credentials-prompt.tsx` (new) — client form that posts credentials and routes to the new run.
  - `components/audit/audit-report.tsx` — renders the credentials prompt/physical reason for `requires_credentials` and labels an authenticated run.
  - `components/audit/audit-live.tsx`, `status-badge.tsx` — treat/style `requires_credentials`.
  - `lib/audit/browser.ts`, `lib/audit/screenshots.ts` — accept and reuse the authenticated storage state.
  - `lib/audit/summary.ts` — `deriveAuditOutcome` adds the `credentials_required` outcome ("Sign-in required to continue").
  - `lib/audit/rules/crawl.ts` — `CRAWL-010` evidence/limitation reflect the time budget instead of page/depth caps.
  - `lib/audit/store.ts` — `normalizeRun` backfills `auth` and `config.timeBudgetMs` for runs stored before this change.
- **Tests changed:** removed the temporary-file helper and its test; added `tests/audit/login-wall.test.ts` (5 tests); extended `tests/audit/crawler.test.ts` with a budget-exhaustion case; `tests/audit/helpers.ts` `testConfig` now uses `timeBudgetMs` and adds `pageEvidence`/`passwordForm` builders.
- **Verified (observed 2026-10-20):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → **90 passed (13 files)**, `npm run build` passed (includes the new credentials route). Validation: (a) local login fixture, unauthenticated → `requires_credentials` with 0 tests; (b) same fixture with credentials → `completed`, 75 tests, cookie-authenticated crawl reached `/privacy`; (c) `https://example.com/` → `completed`, 75 tests; (d) worker path (spawned process, stdin handoff) → `completed`, 75 tests, authenticated, and the stored run did not contain the password value.
- **Docs:** [DECISION.md](./DECISION.md) DEC-019–DEC-021; [TASKS.md](./TASKS.md) T-137; [FEATURES.md](./FEATURES.md) F-039; [API.md](./API.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN.md](./DESIGN.md), [SECURITY.md](./SECURITY.md), [TESTCASE.md](./TESTCASE.md), [MEMORY.md](./MEMORY.md), [AGENTS.md](./AGENTS.md).

## 2026-10-19 — Make reports verifiable: consolidated findings, claim labels, four coverage measures, per-provision dates, full evidence in exports

- **Summary:** A PDF review of `mockmingle.in` raised six issues: duplicate-looking findings, rights results that did not match what was on the page, an ambiguous single "coverage %", best-practice checks framed as legal obligations, not-yet-in-force provisions implied as current breaches, and a PDF that omitted the structured evidence shown in the dashboard. This change addresses all six. See DEC-015 to DEC-018.
- **Frontend changed:**
  - `lib/audit/types.ts` — added `CLAIM_TYPES`/`ClaimType`/`CLAIM_TYPE_LABELS`, `COMMENCEMENT_GROUPS`/`CommencementGroup`, `LegalReference.commencementGroup`, `TestDefinition.claimType`, `TestResult.claimType`, `FindingGroup`, `AuditCoverage`, `AuditSummary.coverage`, `AuditRun.findingGroups?`, `NetworkRequestEvidence.trackerMatch`.
  - `lib/audit/groups.ts` (new) — `buildFindingGroups`, `ungroupedFindings`, `GROUPED_TEST_IDS`; groups privacy notice, rights, grievance, consent/cookies.
  - `lib/audit/presentation.ts` (new) — shared `DisplayFinding` view + `displayFindings` used by both the report and the export.
  - `lib/audit/summary.ts` — `computeAuditCoverage`; `computeSummary(tests, crawlStats, discovery?)` now emits `coverage` (pageCrawl/siteDiscovery/testExecution/evidenceSufficiency); `coveragePercent` retained but no longer the headline.
  - `lib/audit/legal.ts` — per-provision `effectiveFrom`/`effectiveStatus`/`commencementGroup`; `ACT-S6-9` = `2026-11-13` (one-year group), main notice/consent = `2027-05-13` (eighteen-month group); `COMMENCEMENT_SUMMARY`, `COMMENCEMENT_CAVEAT`, `LEGAL_SOURCE_LINKS`.
  - `lib/audit/registry.ts` — `defaultClaimType` in `defineTest`; `REGISTRY_VERSION` `2026.10.19.3`.
  - `lib/audit/runner.ts` — sets `claimType` on each result, computes `findingGroups`, passes discovery to `computeSummary`, and replaces the single-date limitation with `COMMENCEMENT_SUMMARY`.
  - `lib/audit/trackers.ts` — `classifyTracker` returns `matchedDomain` and prefers the longest matching suffix.
  - `lib/audit/browser.ts`, `lib/audit/rules/helpers.ts` — `trackerMatch` on network evidence; richer `trackerRequests` output.
  - `lib/audit/rules/consent.ts` — CONSENT-005 initialTracking evidence enriched (browser state, banner/accept/reject/withdraw visibility, per-request tracker match, classification method) with interface-aware reasoning.
  - `lib/audit/rules/rights.ts` — RIGHTS-002 passes only on a dedicated rights route/form field; a notice-only contact yields WARNING.
  - `lib/audit/export.ts` — PDF now includes full structured evidence per finding, consolidated groups, four coverage measures, claim labels and per-provision legal dates; CSV adds `claimType` and a JSON `evidence` column.
  - `components/audit/audit-report.tsx` — coverage cards, consolidated findings, claim badges/legend, commencement groups in legal mapping, per-provision banner.
  - `lib/audit/store.ts` — `normalizeRun` backfills `claimType`, `findingGroups` and `summary.coverage` for runs stored before this change (verified against the real `mockmingle.in` run).
- **Tests changed:** added `tests/audit/groups.test.ts`, `tests/audit/legal.test.ts`, `tests/audit/trackers.test.ts`; extended `summary`, `registry`, `export`, `rules.integration` and `helpers`/`fixtures` (new `rightsRouteSite`).
- **Verified (observed 2026-10-19):** `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` → **84 passed (12 files)**, `npm run build` passed.
- **Docs:** [DECISION.md](./DECISION.md) DEC-015–DEC-018; [FEATURES.md](./FEATURES.md), [TESTCASE.md](./TESTCASE.md), [DESIGN.md](./DESIGN.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [API.md](./API.md), [MEMORY.md](./MEMORY.md), [TASKS.md](./TASKS.md).

## 2026-10-19 — Crawl sites whose apex redirects to www, seed from robots/sitemap, and state discovery plainly

- **Summary:** A site whose apex (`https://shakktii.in/`) 301-redirects to `https://www.shakktii.in/` produced **0** crawled pages because the redirect was rejected as cross-origin ("Cross-origin redirects are not followed"). The crawler now treats an apex domain and its `www` host as one site, follows same-site redirects, seeds the queue from robots/sitemap URLs, dedupes final-URL aliases, and the report shows `found` / `not found (HTTP 404)` / `not fetched (reason)` instead of a bare status.
- **Frontend changed:**
  - `lib/audit/url.ts` — added `siteKey()` and `isSameSite()` (scheme + host with a leading `www.` removed + port); `isSameOrigin()` retained for exact-origin checks.
  - `lib/audit/crawler.ts` — redirects and link scope use `isSameSite`; internal-link detection uses `isSameSite`; robots/sitemap are fetched **before** the crawl and their discovered URLs seed the queue; a page whose final URL was already crawled is counted as a duplicate (so the homepage is listed once).
  - `components/audit/audit-report.tsx` — added `describeDiscovery()` rendering `found (HTTP 200, N URL(s) discovered)`, `not found (HTTP 404)`, or `not fetched (reason)`.
  - `tests/audit/url.test.ts` — apex/www scope tests; `tests/audit/crawler.test.ts` — same-site redirect followed, off-site redirect refused.
- **Verification (observed):**
  - `npx tsc --noEmit` → passed; `npm run lint` → passed; `npm test` → `64 passed` (9 files).
  - Live `https://shakktii.in/` crawl → apex→www redirect followed; 7 pages succeeded, 0 failed, 1 duplicate skipped; `/ecosystem` and `/onboarding?type=...` crawled; robots.txt and sitemap.xml reported `404` (shown as "not found").
- **Notes:** Scope is slightly broader (apex ≡ www) but SSRF protections are unchanged: other hosts, ports, schemes, and private/reserved IPs remain blocked, and off-site redirects are still refused.

## 2026-10-19 — URL field starts empty with a placeholder

- **Summary:** The website URL input was prefilled with `https://example.com`, which invited accidental audits of the wrong site. It now starts empty and shows `https://example.com` only as a placeholder.
- **Frontend changed:** `components/audit/new-audit-form.tsx` — initial `url` state is `""`; the input has `placeholder="https://example.com"` with matching light/dark placeholder styling.
- **Verification (observed):** `npx tsc --noEmit` → passed; `npm run lint` → passed.

## 2026-10-19 — Per-test remediation text, clearer failure reasons, and failed status when nothing loads

- **Summary:** Findings all showed the same generic remediation/verification text, and an unreachable site (invalid certificate) produced a "Needs work" partial report with no screenshot reason. Each of the 75 tests now has its own remediation and verification guidance, the crawler surfaces the underlying network/TLS error, screenshots explain why none were captured, and a run where no page loads is marked `failed`.
- **Frontend changed:**
  - `lib/audit/registry.ts` — every `defineTest` now passes distinct `remediation` and `verification` text (75/75 unique); the fallback also embeds the test name/description. `REGISTRY_VERSION` bumped to `2026.10.19.2`.
  - `lib/audit/crawler.ts` — fetch failures now report the underlying cause code (for example `DEPTH_ZERO_SELF_SIGNED_CERT`) instead of a bare "fetch failed".
  - `lib/audit/rules/crawl.ts` — the homepage failure reasoning includes the recorded error detail.
  - `lib/audit/runner.ts` — a run with zero successfully fetched pages is `failed` (was `partial`), so the outcome reads "Audit did not complete".
  - `components/audit/audit-report.tsx` — the missing-screenshot message now distinguishes "screenshots not enabled", "browser could not render", "no page was fetched", and "no matching element".
- **Verification (observed):**
  - `npx tsc --noEmit` → passed; `npm run lint` → passed; `npm test` → `59 passed` (9 files); `npm run build` → passed.
  - Registry check: 75 tests, 75 unique remediation strings, 75 unique verification strings, none empty.
  - Live `https://shakthi.in/` (self-signed certificate) → run `failed`; report shows "Audit did not complete", the reasoning "Request failed: DEPTH_ZERO_SELF_SIGNED_CERT", and "No page could be rendered for screenshots".
- **Notes:** The auditor intentionally does not disable TLS verification, so sites with an invalid certificate cannot be crawled or screenshotted.

## 2026-10-19 — Added a plain-language audit outcome and a single export dropdown

- **Summary:** Users could not tell whether their site passed or failed because the report only showed raw counts. Added a readiness-outcome banner that turns the counts into one clear sentence, plus a single `Export ▾` dropdown replacing the three separate export buttons.
- **Frontend added:** `deriveAuditOutcome()` in `lib/audit/summary.ts` (levels `failed`/`not_ready`/`needs_attention`/`inconclusive`/`no_failures`; `AuditOutcome`/`OutcomeLevel`/`OutcomeTone` in `lib/audit/types.ts`); `components/audit/export-menu.tsx`.
- **Frontend changed:** `components/audit/audit-report.tsx` renders the outcome banner and uses the export dropdown.
- **Behaviour:** any failed check → "Needs work"; warnings only → "Review warnings"; needs-review/not-assessed present → "Inconclusive"; all pass or N/A → "No failing checks"; run not completed → "Audit did not complete". The banner states there is no single pass/fail certificate and still shows no numeric compliance score.
- **Tests:** `tests/audit/summary.test.ts` (9 tests for `deriveAuditOutcome`).
- **Verification (observed):**
  - `npx tsc --noEmit` → passed; `npm run lint` → passed; `npm test` → `59 passed` (9 files); `npm run build` → passed.
  - Live audit of `https://example.com/` → `completed`, `fail=2`, `warning=12`; the rendered `/audits/{id}` page contained "Needs work", "check" outcome copy, the "There is no single pass/fail certificate" note, and the `Export ▾` dropdown.

## 2026-10-19 — Added finding screenshots (visual evidence) to the audit engine

- **Summary:** Each finding and review item can now show a screenshot of the exact page and element it refers to, so a user can see where the site falls short. Playwright captures a full-page screenshot plus element crops (consent interface, privacy/cookie/terms links, contact/grievance link, forms, primary heading) for each crawled page, and screenshots are attached to tests by category and affected URL.
- **Frontend added:** `lib/audit/screenshots.ts` (capture, path safety, finding attachment); `components/audit/screenshot-gallery.tsx`; `app/api/audits/[id]/screenshots/[name]/route.ts`.
- **Frontend changed:** `lib/audit/types.ts` (new `ScreenshotRef` and `VisualEvidence`; `TestResult.screenshots`; `AuditRun.visual`; `BrowserSnapshot.screenshot` replaces the raw `screenshotPath`); `lib/audit/runner.ts` (capture + attach); `lib/audit/browser.ts` (servable consent screenshots under the per-run directory); `lib/audit/launcher.ts`; `lib/audit/export.ts` (PDF embeds up to two finding screenshots, CSV gains a `screenshots` column); `components/audit/audit-report.tsx` (visual-evidence blocks in findings, run gallery, browser snapshots); `components/audit/new-audit-form.tsx` (screenshots default on).
- **Storage / serving:** screenshots live under `.data/audits/<runId>/screenshots/` (gitignored) and are served at `/api/audits/{id}/screenshots/{name}` with traversal-safe name validation.
- **Tests:** `tests/audit/screenshots.test.ts` (7 tests: name safety, path resolution, finding attachment); `tests/audit/export.test.ts` updated for the new CSV column.
- **Verification (observed):**
  - `npx tsc --noEmit` → passed; `npm run lint` → passed; `npm test` → `50 passed` (8 files); `npm run build` → passed (`/api/audits/[id]/screenshots/[name]` is dynamic).
  - `npx playwright install chromium` → installed Chrome Headless Shell 156.
  - Direct capture probe → full page + consent-banner + privacy-notice + form + heading crops produced for a synthetic page.
  - End-to-end: audit of `https://example.com/` completed with 24 findings, all 24 receiving a screenshot; `GET /api/audits/{id}/screenshots/00-full.png` → `200 image/png`; traversal attempt → `404`.
- **Limitations:** screenshots require installed browser binaries; capture does not log in, submit forms, or interact with consent controls, and element crops show only the first matching visible element; screenshots may contain personal data and are stored unredacted in the local file store.

## 2026-10-19 — Removed the landing-page inspector (frontend UI + Python endpoint)

- **Summary:** Removed the single-page landing inspector completely and replaced the home page with the full website audit experience. The audit engine (added earlier the same day) is now the only analysis path.
- **Frontend removed:** `components/landing-analyzer.tsx` (and its `NEXT_PUBLIC_API_URL` usage). The frontend no longer calls the FastAPI backend.
- **Frontend added:** `components/audit/audit-dashboard.tsx` — shared server component (run form + audit history + Suspense) used by both `/` and `/audits`.
- **Frontend changed:** `app/page.tsx` now renders the audit dashboard; `app/audits/page.tsx` reuses the same component; `app/layout.tsx` metadata renamed from "DPDP Landing Page Inspector" to "DPDP Website Compliance Auditor".
- **Backend removed:** `app/api/analysis.py`, `app/schemas/`, `app/security/`, `app/services/`, `tests/test_analysis_api.py`, `tests/test_landing_analyzer.py`; `app/main.py` no longer registers the analysis router; `requirements.txt` drops `beautifulsoup4` and `lxml`.
- **Backend retained:** `GET /health`, settings, CORS, and their tests — now a placeholder service.
- **Verification (observed):**
  - Frontend `npx tsc --noEmit` → passed; `npm run lint` → passed; `npm test` → `43 passed` (7 files); `npm run build` → passed (`/` is now a partial prerender).
  - Backend `pytest -q` → `3 passed`; `ruff check .` → passed; `mypy app main.py tests` → passed (9 source files).
- **Docs:** root `README.md`, `dpdp-compliance-auditor/README.md`, `backend/README.md`, and brain docs updated.

## 2026-10-19 — Added the TypeScript evidence-based DPDP audit engine (crawl + rules + dashboard + exports)

- **Summary:** Implemented a server-side TypeScript audit engine inside the existing Next.js app without changing the Python landing-page inspector. The engine crawls one authorized origin within configured limits, collects evidence, evaluates a versioned deterministic test registry, persists runs, and exposes dashboard, compare, and export surfaces.
- **Frontend added:**
  - `lib/audit/{types,legal,registry,url,redact,evidence,trackers,text,crawler,browser,summary,runner,store,launcher,export}.ts` — engine core.
  - `lib/audit/rules/{helpers,crawl,notice,consent,forms,rights,children,security,third-party,retention,org,index}.ts` — deterministic evaluators.
  - `workers/audit-worker.ts` — separate-process worker entry.
  - `app/api/audits/route.ts`, `app/api/audits/[id]/route.ts`, `app/api/audits/[id]/export/route.ts`.
  - `app/audits/page.tsx`, `app/audits/[id]/page.tsx`, `app/audits/compare/page.tsx`, `components/audit/{status-badge,new-audit-form,audit-report,audit-live}.tsx`.
  - `tests/audit/**` (7 files, 43 tests) with synthetic fixture sites in `tests/audit/fixtures.ts`.
  - `vitest.config.mts`, `prisma/schema.prisma`, `dpdp-compliance-auditor/.env.example`.
- **Frontend changed:** `app/page.tsx` adds a link to `/audits`; `package.json` adds `worker`, `test`, `test:watch`, and `prisma:generate` scripts plus `cheerio`, `zod`, `pdfkit`, `@prisma/client`, `playwright`, `vitest`, `tsx`, `@types/pdfkit`, and `prisma` dependencies.
- **Test registry:** 75 tests across categories A–J with `REGISTRY_VERSION = 2026.10.19.1` and `TEST_VERSION = 1.0.0`; includes supplementary `THIRD-001` and `RETENTION-001`.
- **Legal posture:** Official Act/MeitY/PIB sources recorded; substantive DPDP Act provisions mapped as `not_yet_effective` with `effectiveFrom = 2027-05-13`; section 6(9) has a separate earlier note; no Rule-level mapping until commencement is verified.
- **Safety controls:** same-origin bounded crawl (page/depth/timeout/redirect/body limits), URL normalization and tracking-parameter stripping, private/reserved IP blocking, redaction of emails/phones/Aadhaar-like/PAN-like/token/secret values in stored evidence, no form submission, deterministic checks resistant to page-text prompt injection, and missing evidence is never treated as PASS.
- **Persistence:** default file store at `.data/audits` (`AUDIT_DATA_DIR`); a PostgreSQL Prisma schema exists but the Prisma adapter is not wired.
- **Verification (observed):**
  - `npx tsc --noEmit` → passed.
  - `npm run lint` → passed with no warnings.
  - `npm test` → `43 passed` across 7 files.
  - `npm run build` → passed; `/audits` and `/audits/[id]` are partial prerenders, `/audits/compare` and the three `/api/audits` routes are dynamic.
- **Limitations:** Prisma/PostgreSQL and Redis/BullMQ adapters not wired; Playwright browser binaries not installed; no auth, rate limiting, or tenant isolation; `npm audit` reports 8 high-severity advisories; DNS-rebinding TOCTOU remains a residual SSRF risk; browser consent behaviour is only exercised when `browserEnabled` is set.

## 2026-10-19 — Added the landing-page element inspector (API + UI)

- **Summary:** Implemented a single-page analysis endpoint and connected the Next.js home page to it.
- **Backend added:**
  - `app/schemas/landing.py` — request and response models.
  - `app/services/landing_analyzer.py` — HTTPX fetch, BeautifulSoup/lxml extraction, limits, privacy-signal heuristics.
  - `app/security/url_safety.py` — scheme/credential checks, DNS resolution, public-IP enforcement, and redirect revalidation.
  - `app/api/analysis.py` — `POST /api/analyze-landing`.
  - `tests/test_landing_analyzer.py`, `tests/test_analysis_api.py`.
- **Backend changed:** `app/main.py` registers the analysis router; CORS now defaults to `http://localhost:3000` and `http://127.0.0.1:3000`; `.env.example` updated.
- **Frontend added:** `components/landing-analyzer.tsx` — URL form, loading/error states, summary counts, collapsible element sections, and privacy signals.
- **Frontend changed:** `app/page.tsx` replaced the starter page with the inspector UI; `app/layout.tsx` metadata updated; `app/globals.css` now uses Geist instead of Arial.
- **Extraction coverage:** title, meta description, language, canonical URL, top-20 tag counts, headings, links, images, forms and fields, scripts, iframes, privacy/terms links, and cookie/consent keywords.
- **Safety controls:** one page only; `http`/`https` only; credentials rejected; non-public IPs rejected; redirects capped at 5 and revalidated; 10-second timeout; 2 MB body cap; HTML/XHTML content type required; inline script content is not returned.
- **Verification (observed):**
  - `ruff check .` → passed.
  - `mypy app main.py tests` → passed, 18 source files.
  - `pytest -q` → `14 passed` (one Starlette `httpx` deprecation warning).
  - `npm run lint` → passed.
  - `npm run build` → passed; `/` statically generated.
  - Live API on `127.0.0.1:8011`: `https://www.python.org/` → 200, 14 headings, 150 links, 831 elements, privacy link detected.
- **Limitations:** no JavaScript rendering, crawling, authentication, rate limiting, or persistence. Privacy signals are heuristics, not compliance findings. DNS-rebinding TOCTOU remains a residual SSRF risk.

## 2026-10-19 — Consolidated Git tracking and fixed frontend 404 on GitHub

- **Problem:** The workspace-root commit recorded `dpdp-compliance-auditor/` as a gitlink (`160000`) because the frontend still had its own nested `.git`. GitHub displayed a 404 when opening that path.
- **Fix:** Moved the nested `.git` to `C:\Users\sec-gen\AppData\Local\Temp\opencode\dpdp-frontend-git-backup-20261019`, removed the gitlink from the index, and added the frontend source files directly to the root repository.
- **Files added:** workspace-root `.gitignore` for Python, Node/Next.js, environment files, and build output.
- **Verification:** `git ls-tree HEAD dpdp-compliance-auditor` now reports a tree (`040000`), not a commit. The frontend sources, including `app/`, `public/`, package files, and `README.md`, are tracked by the root repo.
- **Commit / remote:** `3af8190 Track frontend files instead of embedded repository`, pushed to `origin/main` at `https://github.com/Rdhobe/website-dpdp-analyzer-.git`.
- **Impact:** The workspace root is now the single Git repository for frontend, backend, and brain. Do not reintroduce a nested `.git` inside `dpdp-compliance-auditor/`.

## 2026-10-19 — Added backend dependencies and FastAPI foundation

- **Summary:** Created backend dependency manifests and installed them into the existing workspace virtual environment. Added a minimal FastAPI application with configuration and a health endpoint.
- **Files added:**
  - `backend/requirements.txt` — runtime dependencies (FastAPI, Uvicorn, Pydantic, SQLAlchemy, asyncpg, Alembic, Celery/Redis, HTTPX, Crawlee, Playwright, BeautifulSoup, lxml, pypdf, Pillow, Jinja2, ReportLab, tenacity, logging, dotenv).
  - `backend/requirements-dev.txt` — pytest, pytest-asyncio, pytest-cov, ruff, mypy.
  - `backend/pyproject.toml` — pytest, ruff, and mypy configuration.
  - `backend/app/__init__.py`, `backend/app/core/{__init__.py,config.py}`.
  - `backend/app/api/{__init__.py,health.py}`.
  - `backend/app/main.py` — application factory and `app` instance.
  - `backend/tests/test_health.py` — health endpoint test.
  - `backend/tests/test_config.py` — settings/CORS/env-default tests.
  - `backend/.env.example` — documented environment variables with placeholder values.
  - `backend/.gitignore` — ignores caches, venvs, `.env`, and build artifacts.
  - `backend/README.md` — backend setup, configuration, endpoints, layout, and boundaries.
  - `README.md` (workspace root) — project overview and separate frontend/backend layout.
- **Files modified:**
  - `backend/main.py` — replaced the empty file with a development entrypoint.
- **Environment:** Installed runtime and development dependencies into `C:\projects\website dpdp analyzer\.venv` using the existing Python 3.12.0 environment. pip upgraded from 23.2.1 to 26.2.1.
- **Verification (observed):**
  - `python -m ruff check .` → All checks passed.
  - `python -m pytest -q` → `3 passed` (one Starlette `httpx` deprecation warning).
  - `python -m mypy app main.py tests` → Success, no issues in 9 source files.
  - Uvicorn started on `127.0.0.1:8010`; `GET /health` returned `{"status":"ok",...}`.
- **Impact:**
  - The backend is now runnable: `uvicorn app.main:app` from `backend/`.
  - No database, crawler, auth, compliance, or AI functionality exists yet.
  - Playwright browser binaries were **not** downloaded (`playwright install` is still required before browser use).
  - `.env.example` documents placeholders only; no real secrets are stored.
  - The backend is a **standalone service** at the workspace root (`backend/`), deliberately outside the Next.js app. The project owner confirmed the backend must not be mixed into the frontend. The `backend/` directory was briefly relocated under `dpdp-compliance-auditor/` and then returned to the workspace root; ruff, pytest (3 passed), and mypy were re-run successfully afterward. Workspace-root `README.md` and `backend/README.md` document the separation and setup.
- **Migration considerations:** None yet.

## 2026-10-19 — Approved `src/` feature architecture for the Next.js frontend

- **Summary:** Replaced the previous `frontend/ (app, components, features, lib, types)` target with an explicit `src/` layout: routing in `src/app/` with `(auth)` and `(dashboard)` route groups, business logic in `src/features/<domain>/`, shared UI in `src/components/{ui,layout,navigation,shared}`, shared utilities in `src/lib/`, plus `src/hooks/`, `src/types/`, `src/config/`, `backend/`, `tests/`, and `.env.example`.
- **Files affected:**
  - `brain/ARCHITECTURE.md` — full target tree, route map, feature responsibilities, import boundaries, AQ-08.
  - `brain/DECISION.md` — added DEC-008; updated DEC-003 frontend placement note.
  - `brain/AGENTS.md` — target layout, boundaries, path-alias guidance.
  - `brain/RULES.md` — frontend module dependency table, alias and import rules.
  - `brain/TASKS.md` — updated T-001/T-002, added T-125 migration task, path notes for T-007/T-008.
  - `brain/DESIGN.md` — target locations for styles, components, feature UI.
  - `brain/MEMORY.md` — target layout facts and pending-work update.
  - `brain/BRAIN.md` — status and priorities updated.
  - `brain/API.md` — noted `src/app/api/` as the target for thin route handlers.
- **Reason:** The user approved a feature-based `src/` architecture to separate routing from domain logic and prevent cross-feature coupling.
- **Impact:** Documentation only. No application files, dependencies, or configuration changed. The scaffold still uses root `app/`; migration is tracked as T-125. The new layout is a target, not implemented behavior.
- **Verification:** Internal links checked after edits; no application commands were run because no code changed.

## 2026-10-19 — Created the project brain documentation system

- **Summary:** Created 18 linked Markdown documents in `brain/` covering agent instructions, architecture, decisions, design, features, flows, memory, rules, security, tasks, test cases, database, product requirements, integrations, API reference, change log, and this guide.
- **Files affected:**
  - `brain/README.md`
  - `brain/AGENTS.md`
  - `brain/ARCHITECTURE.md`
  - `brain/BRAIN.md`
  - `brain/CHANGES_LOG.md`
  - `brain/DECISION.md`
  - `brain/DESIGN.md`
  - `brain/FEATURES.md`
  - `brain/FLOW.md`
  - `brain/MEMORY.md`
  - `brain/RULES.md`
  - `brain/SECURITY.md`
  - `brain/TASKS.md`
  - `brain/TESTCASE.md`
  - `brain/DATABASE.md`
  - `brain/PRD.md`
  - `brain/INTEGRATIONS.md`
  - `brain/API.md`
- **Reason:** Establish a durable, source-of-truth-aligned knowledge base for developers and AI agents, separating implemented facts from planned requirements.
- **Impact:**
  - Documentation only. No application code, dependencies, configuration, or build output changed.
  - `brain/Project requirements.md` was preserved unchanged.
- **Migration considerations:** None.
- **Verification:**
  - Project inspection found a Next.js 16.4.2 scaffold only (no backend/database/crawler/tests).
  - `brain/` contained only `Project requirements.md` before this change.
  - No build, lint, or test commands were run as part of this documentation task.

## 2026-10-19 — Baseline repository state observed (pre-existing, not created in this task)

- **Summary:** Repository inspected at the start of the task.
- **Verified facts:**
  - `dpdp-compliance-auditor/` contains a Next.js 16.4.2 App Router project.
  - Source files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/favicon.ico`.
  - Default create-next-app content and metadata remain.
  - No backend, database, API routes, auth, crawler, or tests exist.
  - `package.json` defines `dev`, `build`, `start`, `lint` only.
  - Git history: single commit `d5583f6 Initial commit from Create Next App`.
- **Reason:** Establish the initial documented baseline.
- **Note:** These facts describe pre-existing state, not a change made during this task.

## How to Add Entries

Use this format:

```markdown
## YYYY-MM-DD — Short title

- **Summary:** What changed.
- **Files affected:** Paths.
- **Reason:** Why.
- **Impact:** Behavior, compatibility, migration, security.
- **Verification:** Commands run and actual results.
```

Rules:

- Do not record planned work as completed.
- Do not include secrets or personal data.
- If a change modifies architecture, APIs, schema, integrations, security, features, or flows, update the corresponding brain documents in the same change.
