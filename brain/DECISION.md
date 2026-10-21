# DECISION.md — Architecture and Technical Decision Log

Record significant technical and product decisions here. Never silently replace an important decision; mark it `superseded` and add a new entry.

**Status values:** `proposed`, `accepted`, `superseded`, `rejected`.

---

## DEC-001 — Use the generated Next.js App Router scaffold as the frontend base

- **Date:** 2026-10-19
- **Status:** Accepted (verified in code)
- **Context:** The repository contained a create-next-app scaffold at `dpdp-compliance-auditor/`. The requirements specify Next.js + TypeScript + React + Tailwind for the frontend.
- **Options considered:**
  1. Keep and build on the Next.js scaffold.
  2. Replace it with another frontend framework.
  3. Start a new app from scratch.
- **Decision:** Keep the existing Next.js 16.4.2 App Router project with TypeScript and Tailwind CSS 4.
- **Reasons:** Aligns with the required stack; already runnable; avoids unnecessary rework; ESLint and strict TypeScript are configured.
- **Trade-offs / consequences:**
  - Next.js 16.4.2 includes version-specific behavior; agents must consult bundled docs.
  - shadcn/ui and Recharts are not installed yet.
  - The default create-next-app page and metadata must be replaced.
- **Evidence:** `dpdp-compliance-auditor/package.json`, `app/layout.tsx`, `app/page.tsx`, `next.config.ts`, `tsconfig.json`.

---

## DEC-002 — Maintain a `brain/` documentation system as the project knowledge base

- **Date:** 2026-10-19
- **Status:** Accepted
- **Context:** The project needs durable context for humans and AI agents across sessions; requirements are large and implementation is early.
- **Options considered:**
  1. Rely on the single requirements document and code comments.
  2. Maintain a structured `brain/` documentation set with source-of-truth rules.
  3. Use an external wiki only.
- **Decision:** Create and maintain the `brain/` directory at the workspace root with 18 linked documents, separating implemented facts from planned requirements.
- **Reasons:** Preserves decisions and constraints; reduces rediscovery; makes status explicit; supports AI-assisted development.
- **Trade-offs / consequences:** Documentation must be updated with code changes; stale docs are a risk mitigated by source-of-truth precedence in [README.md](./README.md).
- **Evidence:** `brain/` files created 2026-10-19.

---

## DEC-003 — Target a Python FastAPI backend with PostgreSQL, Redis/Celery, and Crawlee/Playwright

- **Date:** 2026-10-19
- **Status:** Accepted (implemented scaffold)
- **Context:** The requirements recommend a specific backend and crawling stack. No backend existed when this decision was first recorded. A TypeScript-only backend inside Next.js was also technically possible and would reduce language/runtime count.
- **Options considered:**
  1. Adopt the requirements stack: FastAPI + Pydantic + PostgreSQL + SQLAlchemy/Alembic + Redis/Celery + Crawlee for Python + Playwright.
  2. Build the backend in TypeScript (Next.js route handlers/server actions + Node crawler + Prisma/etc.).
  3. Hybrid: Next.js UI + Python crawler service only, with a TypeScript API.
- **Decision:** Adopt Option 1 unless a documented limitation (for example Crawlee for Python maturity, deployment constraints, or team skills) requires an alternative.
- **Reasons:** Requirements explicitly recommend it; Crawlee for Python and Playwright fit crawler needs; Pydantic supports strict finding schemas; Celery handles long-running audits.
- **Trade-offs / consequences:**
  - Two runtimes and more deployment complexity.
  - Requires coordinating the Next.js app structure (see DEC-008), the `backend/` Python service, and Docker Compose; the original `frontend/` placement is superseded by DEC-008.
  - Crawlee for Python API stability must be validated before adoption.
- **Open questions:** Deployment target and Python crawler library maturity. Backend location is resolved: standalone `backend/` at the workspace root, outside the Next.js app (2026-10-19).
- **Evidence:** `brain/Project requirements.md` sections 2, 15, 16; `backend/requirements.txt`; `backend/app/main.py`; `/health` verified 2026-10-19. **Scaffold implemented; database, queue, crawler, and AI layers are not.**

---

## DEC-004 — Versioned deterministic DPDP rules engine independent of the LLM

- **Date:** 2026-10-19
- **Status:** Proposed
- **Context:** The product needs reproducible, defensible compliance checks. LLM output is non-deterministic and can hallucinate legal citations.
- **Options considered:**
  1. LLM-only analysis.
  2. Deterministic rules only.
  3. Deterministic rules as the core, with optional retrieval-grounded AI assistance.
- **Proposed decision:** Option 3.
- **Reasons:** Deterministic checks work without paid providers; results are reproducible; AI adds language understanding where useful; citations can be validated.
- **Trade-offs / consequences:** More upfront rule-authoring work; rules need versioning and legal review; AI remains an enhancement, not a dependency.
- **Evidence:** Requirements sections 6 and 8. **Not implemented.**

---

## DEC-005 — Evidence-based finding model with human-review states

- **Date:** 2026-10-19
- **Status:** Proposed
- **Context:** Findings must be defensible and must not overstate compliance conclusions.
- **Options considered:**
  1. Simple pass/fail checklist.
  2. LLM-generated narrative findings.
  3. Structured, Pydantic-validated findings with evidence, legal references, confidence, severity, limitations, and human-review flags.
- **Proposed decision:** Option 3, using the schema and statuses in the requirements (`Pass`, `Potential issue`, `Needs review`, `Not assessed`, `Not applicable`).
- **Reasons:** Supports explainability, auditability, exports, and review workflows; prevents conflating confidence and severity.
- **Trade-offs / consequences:** More complex schema and UI; requires evidence capture and legal-reference validation.
- **Evidence:** Requirements section 7. **Not implemented.**

---

## DEC-006 — Default crawl scope is same-origin-only with explicit subdomain approvals

- **Date:** 2026-10-19
- **Status:** Proposed
- **Context:** Unbounded crawling risks scope escape, SSRF, and unauthorized data collection.
- **Options considered:**
  1. Crawl any discovered internal/external link.
  2. Same-origin-only by default, with optional explicitly approved subdomains.
  3. Whole-registrable-domain crawling by default.
- **Proposed decision:** Option 2.
- **Reasons:** Minimizes unauthorized collection; matches requirements; preserves user control.
- **Trade-offs / consequences:** Some legitimate linked subdomains may be missed unless approved; users need clear scope controls.
- **Evidence:** Requirements sections 4 and 5. **Not implemented.**

---

## DEC-007 — Treat crawled content as untrusted data for AI analysis

- **Date:** 2026-10-19
- **Status:** Proposed
- **Context:** Websites can contain prompt-injection text that attempts to manipulate an LLM.
- **Options considered:**
  1. Pass crawled content directly into the model prompt with minimal separation.
  2. Isolate content as quoted data, use strict schemas, validate outputs, verify citations, and never let content alter system instructions.
  3. Avoid AI entirely.
- **Proposed decision:** Option 2, with Option 3 always available as a fallback.
- **Reasons:** Preserves useful AI analysis while limiting manipulation and hallucination risk.
- **Trade-offs / consequences:** Prompt design and validation add complexity; some analysis quality may be reduced.
- **Evidence:** Requirements sections 5 and 8. **Not implemented.**

---

## DEC-008 — Adopt `src/` feature-based architecture for the Next.js frontend

- **Date:** 2026-10-19
- **Status:** Accepted (architecture target; implementation pending)
- **Context:** The scaffold currently keeps routes in `dpdp-compliance-auditor/app/` with no separation between routing, feature logic, and shared code. The product has many distinct domains (projects, crawling, extraction, findings, legal framework, reports, history), and a flat structure would create tight coupling.
- **Options considered:**
  1. Keep all routes and components under the project root `app/`.
  2. Move to `src/app/` for routing only, with business logic in `src/features/`, shared UI in `src/components/`, and shared utilities in `src/lib/`.
  3. Use a `frontend/` package inside a larger monorepo immediately.
- **Decision:** Option 2. The frontend target structure is:
  - `public/images`, `public/icons` for static assets.
  - `src/app/` split into `(auth)` and `(dashboard)` route groups, plus thin `src/app/api/` routes where genuinely needed.
  - `src/features/<domain>/` for business functionality.
  - `src/components/{ui,layout,navigation,shared}` for reusable UI.
  - `src/lib/{api,auth,env,errors,formatting}` plus `utils.ts` for shared infrastructure.
  - `src/hooks/` for truly shared hooks, `src/types/` for cross-feature types only, `src/config/` for configuration.
  - `tests/`, `.env.example`, `package.json`, and `README.md` at the frontend application root.
  - The Python backend remains a **separate sibling service** at the workspace root (`C:\projects\website dpdp analyzer\backend\`); it is not nested inside `dpdp-compliance-auditor/`.
- **Reasons:** Enforces clear boundaries; keeps route files thin; avoids cross-feature deep imports; matches the multi-domain nature of the product; supports independent testing of feature modules.
- **Trade-offs / consequences:**
  - Requires migrating existing `app/` files into `src/app/` and updating imports and `tsconfig` paths.
  - Route group layouts add indirection, but clarify auth vs. dashboard shells.
  - The Python backend remains a separate service; `src/app/api/` must not become a second business API.
  - No code has been moved yet; migration is tracked as T-125.
- **Migration notes:**
  - Move `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, and `app/favicon.ico` under `src/app/`.
  - Update the `@/*` path alias if it must point to `src/` (verify Next.js 16 conventions before changing).
  - Create feature directories incrementally; do not add empty placeholder directories that imply implemented features.
- **Supersedes:** The `frontend/ (app, components, features, lib, types)` layout proposed in DEC-003 for frontend placement.
- **Evidence:** User-approved architecture specification; `brain/ARCHITECTURE.md` section 3.1. **Not implemented.**

---

## DEC-009 — Implement the audit engine in TypeScript inside the Next.js app; keep the Python inspector

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** The product brief recommended a Python/Crawlee/FastAPI backend, but the user explicitly directed the crawling and analysis pipeline to be implemented in TypeScript. The existing FastAPI landing-page inspector is verified and working.
- **Options considered:**
  1. Build the crawl/rules engine in Python in `backend/` using Crawlee/Playwright.
  2. Build it in TypeScript inside the Next.js app and leave the Python inspector untouched.
  3. Move the inspector into TypeScript and remove the Python service.
- **Decision:** Option 2. The engine lives in `dpdp-compliance-auditor/lib/audit/`, runs in a detached Node/tsx worker (`workers/audit-worker.ts`), uses bounded `fetch` + Cheerio with optional Playwright, and persists to a file store by default. A PostgreSQL Prisma schema is included but not wired.
- **Reasons:** Satisfies the explicit TypeScript requirement; reuses the existing Next.js runtime; avoids disrupting verified Python behavior; keeps long crawls out of the request/response cycle via a worker process.
- **Trade-offs / consequences:**
  - Diverges from the brief's Python/Crawlee recommendation; Crawlee, BullMQ, Redis, and PostgreSQL persistence are not yet implemented.
  - Two language runtimes now coexist, and the frontend owns its own audit API surface.
  - The file store is single-host and not tenant-isolated; production persistence requires the Prisma/PostgreSQL adapter and a queue.
  - The worker is spawned with the local `node_modules/tsx` path, so container deployment must ship Node and the installed dependencies.
- **Supersedes / superseded by:** Refines AQ-01 in [ARCHITECTURE.md](./ARCHITECTURE.md); does not supersede DEC-008.
- **Evidence:** `npx tsc --noEmit`, `npm run lint`, `npm test` (43 passed), and `npm run build` all passed on 2026-10-19.

---

## DEC-010 — Remove the landing-page inspector entirely; the audit engine is the only analysis path

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** The landing-page inspector duplicated a subset of the new audit engine's capabilities (single-page fetch and element extraction) and had become redundant. The user directed that the inspector be removed completely — both the frontend UI and the related Python backend — and replaced on the home page by the full website audit.
- **Options considered:**
  1. Keep the inspector and the engine side by side.
  2. Remove only the frontend inspector UI and keep the Python endpoint.
  3. Remove the inspector UI and all related backend endpoint code, leaving the FastAPI service as a placeholder.
- **Decision:** Option 3. Deleted `components/landing-analyzer.tsx` and the Python `analysis.py`, `schemas/`, `security/`, and `services/` modules plus their tests. Extracted a shared `components/audit/audit-dashboard.tsx` rendered by both `/` and `/audits`. The FastAPI service now exposes only `GET /health`.
- **Reasons:** Removes redundant, diverging code paths; makes the audit engine the single source of analysis; keeps the workspace-root Git repository clean.
- **Trade-offs / consequences:**
  - The frontend no longer calls the FastAPI backend; `NEXT_PUBLIC_API_URL` is unused.
  - The backend is a placeholder until a real backend responsibility is defined; DEC-009 (TypeScript engine, separate Python service) is unaffected.
  - `beautifulsoup4` and `lxml` were removed from `backend/requirements.txt`.
- **Supersedes / superseded by:** None; extends DEC-009 by choosing option 3 over option 2 there.
- **Evidence:** `npx tsc --noEmit`, `npm run lint`, `npm test` (43 passed), `npm run build`; backend `pytest` (3 passed), `ruff`, and `mypy` all passed on 2026-10-19.

---

## DEC-011 — Capture Playwright screenshots as visual evidence for findings

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** The user asked that findings and review items show screenshots so a user can see visually where their site falls short, rather than reading text evidence alone.
- **Options considered:**
  1. Keep text/DOM evidence only.
  2. Store arbitrary external image URLs or embed base64 data in the run JSON.
  3. Capture PNGs server-side with Playwright into the per-run data directory and reference them by generated name.
- **Decision:** Option 3. `lib/audit/screenshots.ts` captures a full-page screenshot and element crops (consent interface, privacy/cookie/terms links, contact/grievance link, form, primary heading) per crawled page, attaches them to tests by category and affected URL, and stores them under `.data/audits/<runId>/screenshots/`. They are served by `app/api/audits/[id]/screenshots/[name]/route.ts` and rendered by `components/audit/screenshot-gallery.tsx`.
- **Reasons:** Keeps evidence self-contained and offline-capable; avoids hotlinking third-party assets and bloating the JSON store; names-only references prevent leaking filesystem paths; serving through a validated route keeps traversal out.
- **Trade-offs / consequences:**
  - Requires Playwright browser binaries (`npx playwright install chromium`); capture degrades gracefully to a limitation notice when absent.
  - Screenshots may contain personal data and are stored unredacted on local disk; they are not yet covered by auth or tenant isolation.
  - Element crops capture only the first matching visible element and never submit forms or interact with consent controls.
  - PDF export embeds up to two finding screenshots and CSV gains a `screenshots` column.
- **Supersedes / superseded by:** None; extends DEC-009/DEC-010.
- **Evidence:** `npx tsc --noEmit`, `npm run lint`, `npm test` (50 passed), `npm run build` passed; a live audit of `https://example.com/` completed with 24 findings each receiving a screenshot; `GET /api/audits/{id}/screenshots/00-full.png` → `200 image/png` and a traversal request → `404`, on 2026-10-19.

---

## DEC-012 — Present a plain-language readiness outcome instead of a pass/fail score

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** After running `https://example.com/`, the user could not tell whether the site passed or failed because the report only showed status counts. The engine deliberately produces no compliance score and states "readiness, not certification".
- **Options considered:**
  1. Keep counts only and rely on the note.
  2. Compute a numeric compliance score or a single pass/fail badge.
  3. Derive a plain-language readiness outcome from the counts, with an explicit "no pass/fail certificate" disclaimer.
- **Decision:** Option 3. `deriveAuditOutcome(status, summary)` maps results to `failed` / `not_ready` / `needs_attention` / `inconclusive` / `no_failures`, and `audit-report.tsx` shows it as a banner. Any failure → "Needs work"; warnings only → "Review warnings"; unverified checks → "Inconclusive"; all pass/N-A → "No failing checks".
- **Reasons:** Directly answers "did it pass or fail" in plain language; preserves the no-score, no-certification principle; the `inconclusive` state avoids implying a pass when evidence is missing.
- **Trade-offs / consequences:**
  - A derived outcome can still be misread as a verdict; the banner must always carry the "not a certificate" disclaimer and list what was not assessed.
  - A partial crawl marks the outcome as partial coverage.
  - The outcome is computed from statuses, not severities; critical/high counts are surfaced to the banner for future weighting but do not change the level yet.
- **Supersedes / superseded by:** None; refines the no-score stance in DEC-009 / [FEATURES.md](./FEATURES.md).
- **Evidence:** `npx tsc --noEmit`, `npm run lint`, `npm test` (59 passed), `npm run build` passed; a live `https://example.com/` run (fail=2, warning=12) rendered the "Needs work" banner with the disclaimer on 2026-10-19.

---

## DEC-013 — Per-test guidance, real failure reasons, and fail a run with no loaded pages

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** Every finding showed identical generic remediation/verification text, and a site with an invalid TLS certificate produced a confusing "partial" report with no explanation and no screenshots. The auditor must not bypass TLS verification.
- **Options considered:**
  1. Keep one generic remediation/verification per category.
  2. Compute a generic message that interpolates the test name/description.
  3. Author specific remediation and verification text for every test and surface the real failure cause.
- **Decision:** Option 3. `registry.ts` now carries distinct `remediation`/`verification` for all 75 tests (registry version `2026.10.19.2`); the crawler reports the underlying cause code (e.g. `DEPTH_ZERO_SELF_SIGNED_CERT`); the homepage-failure reasoning includes the error; and `runner.ts` marks a run `failed` when zero pages loaded successfully. The missing-screenshot message now states the actual reason.
- **Reasons:** Guidance that repeats is not actionable; users need to know why a run produced nothing; a site that never loaded was never actually audited, so a `failed` run with no conclusion is more honest than `partial`.
- **Trade-offs / consequences:**
  - Run status semantics changed: a completely unreachable target is now `failed`, not `partial`; tests were checked to confirm existing `partial` fixtures still have a successful page.
  - Registry text is now more to maintain; the fallback embeds the test name/description for any future test that omits guidance.
- **Supersedes / superseded by:** None; complements DEC-012.
- **Evidence:** `npx tsc --noEmit`, `npm run lint`, `npm test` (59 passed), `npm run build` passed; registry audit showed 75 unique remediation/verification strings; a live `https://shakthi.in/` run (self-signed certificate) reported `failed` with the certificate reason on 2026-10-19.

---

## DEC-014 — Scope the crawl by site (apex = www), seed it from robots/sitemap, and state discovery results plainly

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** A site whose apex (`https://shakktii.in/`) 301-redirects to `https://www.shakktii.in/` produced **zero** crawled pages: the redirect was rejected as cross-origin, so no links were followed and robots/sitemap were never meaningfully read. The report also showed `robots.txt: not fetched · sitemap.xml: not fetched`, which did not distinguish "not found" from "not fetched".
- **Options considered:**
  1. Keep strict exact-origin crawling (apex and www are different origins) and require the user to enter the canonical host.
  2. Follow redirects across any host and crawl any in-scope page by registrable domain (needs a public-suffix list).
  3. Treat the site as `scheme + host-with-`www.`-removed + port`, follow same-site redirects, and crawl links within that site.
- **Decision:** Option 3. Added `isSameSite`/`siteKey` in `lib/audit/url.ts`. The crawler follows redirects and scopes links when the site key matches (so `shakktii.in` and `www.shakktii.in` are one site; different host, port, or scheme stay out of scope). robots/sitemap are now fetched **before** the crawl and their discovered URLs (sitemap `<loc>`, robots `Sitemap:`) seed the queue. Pages that resolve to a final URL already crawled are counted as duplicates. The report now renders `found` / `not found (HTTP 404)` / `not fetched (reason)` per resource.
- **Reasons:** An apex→www redirect is standard and must not silently defeat the whole audit; a site is the natural authorization/scope unit; seeding from sitemap improves coverage of pages that the homepage does not link to; the previous wording was ambiguous.
- **Trade-offs / consequences:**
  - Scope is now slightly broader than exact origin: any host that differs from the target only by a leading `www.` is in scope. This does not weaken SSRF protection — different hosts, ports, schemes, and private/reserved IPs remain blocked.
  - Redirects still must stay within the same site; a redirect to another host is still refused.
  - No public-suffix list is used, so exotic multi-label public suffixes (`foo.co.uk` vs `www.foo.co.uk`) are handled only for the `www.` case, which is the observed real-world pattern.
- **Supersedes / superseded by:** None; refines the scope rule documented in [SECURITY.md](./SECURITY.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Evidence:** `npx tsc --noEmit`, `npm run lint`, `npm test` (64 passed, 9 files) passed on 2026-10-19; a live `https://shakktii.in/` crawl followed the apex→www redirect, fetched 7 pages (homepage once), skipped 1 duplicate, and listed robots/sitemap as `404`.

---

## DEC-015 — Consolidate related checks into finding groups instead of removing tests

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** A PDF review of `mockmingle.in` showed the same underlying problem reported many times: a missing/unreachable privacy notice appeared as separate `NOTICE-*` and `CRAWL-002` rows, rights issues as `RIGHTS-*` + `CRAWL-005`, grievance as `RIGHTS-003/004` + `CRAWL-004`, and consent/cookie issues as `CONSENT-001/002/009` + `CRAWL-003`. Readers saw duplicate or near-duplicate findings. Deleting tests would reduce coverage and the audit trail.
- **Options considered:**
  1. Remove or merge the redundant tests from the registry.
  2. Keep every test but stop showing the redundant ones in the findings list.
  3. Keep every test and group related results into one reported issue, built from a declarative map.
- **Decision:** Option 3. Added `lib/audit/groups.ts` with a declarative `GROUP_DEFINITIONS` map and `buildFindingGroups`/`ungroupedFindings`/`GROUPED_TEST_IDS`. The runner stores `run.findingGroups`; the report and PDF render groups first and then the remaining ungrouped findings, while the "All test results" table still lists every test. Groups: privacy notice = `NOTICE-001` + `CRAWL-002`; rights = `RIGHTS-002` + `RIGHTS-001` + `CRAWL-005`; grievance = `RIGHTS-003` + `RIGHTS-004` + `CRAWL-004`; consent/cookies = `CONSENT-001` + `CONSENT-002` + `CONSENT-009` + `CRAWL-003`.
- **Reasons:** Preserves full coverage and the underlying evidence for each test while presenting one consolidated issue with a worst-case status and severity; the grouping is data, so it is easy to review and extend.
- **Trade-offs / consequences:** A group shows one representative remediation and reasoning (from the primary test), with the member statuses listed. `run.findingGroups` is optional, so older stored runs still render by computing groups on the fly.
- **Supersedes / superseded by:** None.
- **Evidence:** `lib/audit/groups.ts`, `lib/audit/presentation.ts`, `tests/audit/groups.test.ts` (5 tests); `npm test` 84 passed.

## DEC-016 — Label every result with a claim type (legal requirement vs readiness vs gap vs recommendation)

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** The review found reports that read as if best-practice or technical checks were legal obligations, and as if not-yet-in-force provisions created current breaches. Readers could not tell what kind of claim each row made.
- **Options considered:**
  1. Keep a single undifferentiated "finding" concept.
  2. Only differentiate FAIL vs WARNING.
  3. Attach an explicit `claimType` to every test definition and result, shown in the UI, CSV and PDF.
- **Decision:** Option 3. Added `CLAIM_TYPES`/`ClaimType`/`CLAIM_TYPE_LABELS` in `lib/audit/types.ts` with four values: `verified_legal_requirement`, `regulatory_readiness`, `potential_privacy_gap`, `technical_recommendation`. `defineTest` assigns a default (`registry.ts`): a legal reference that is `in_force` → verified legal requirement; a legal reference that is not yet in force → regulatory readiness; category `J` (organizational review) → regulatory readiness; category `G` (implementation/security hardening) without a legal reference → technical recommendation; otherwise → potential privacy gap. A test can override via `claimType`.
- **Reasons:** Makes the strength of each claim explicit and defensible; aligns the wording with "readiness, not certification".
- **Trade-offs / consequences:** Category `J` (organizational cannot-verify items) is labelled regulatory readiness, which covers both not-yet-in-force provisions and controls not verifiable from outside; the UI legend states this.
- **Supersedes / superseded by:** None.
- **Evidence:** `lib/audit/types.ts`, `lib/audit/registry.ts` (`defaultClaimType`), `tests/audit/registry.test.ts`; UI/CSV/PDF show the label.

## DEC-017 — Replace the single "evidence coverage %" with four independent coverage measures

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** The report showed one headline "79% evidence coverage" that mixed unrelated things (pages fetched, tests executed, evidence present) and could be read as a compliance score.
- **Options considered:**
  1. Keep `coveragePercent` as the single figure.
  2. Remove coverage reporting entirely.
  3. Report four independent measures and stop presenting any single percentage as a score.
- **Decision:** Option 3. `computeAuditCoverage` (`lib/audit/summary.ts`) produces `pageCrawl`, `siteDiscovery`, `testExecution` and `evidenceSufficiency`, each with counts and a ratio. `summary.coverage` carries them; the old `coveragePercent` is retained for compatibility but is no longer the displayed headline. The report and PDF label each measure and state that none is a compliance score.
- **Reasons:** Each measure answers a different question and must not be blended; the discovery measure uses the sitemap/robots inventory when present.
- **Trade-offs / consequences:** `computeSummary` now takes an optional `DiscoveryInput` (`robots`, `sitemap`); callers that omit it get zeroed discovery values.
- **Supersedes / superseded by:** None.
- **Evidence:** `lib/audit/summary.ts`, `tests/audit/summary.test.ts` (coverage cases); report/PDF render the four measures.

## DEC-018 — Store per-provision commencement and export the full evidence set

- **Date:** 2026-10-19
- **Status:** Accepted (implemented)
- **Context:** The review flagged a single blanket statement that "substantive provisions are not yet in force until 2027-05-13". Commencement is phased — e.g. Section 6(9) (Consent Manager registration) is in the one-year group. The review also found the PDF omitted the structured evidence that the dashboard shows.
- **Options considered:**
  1. Keep one global effective date and a summary-only PDF.
  2. Store per-provision commencement and include full evidence in the PDF/CSV.
  3. Keep one date but add an interpretation caveat only.
- **Decision:** Option 2. `lib/audit/legal.ts` gives every provision its own `effectiveFrom`, `effectiveStatus` and `commencementGroup` (`one_year` | `eighteen_months`), with `ACT-S6-9` = `2026-11-13` and the main notice/consent provisions = `2027-05-13`, plus `COMMENCEMENT_SUMMARY` and a caveat that dates are calculated from the 2025-11-13 Gazette and may be amended. `lib/audit/export.ts` now emits the full structured evidence per finding in the PDF and CSV (JSON), adds the claim-type column, and renders consolidated groups, coverage measures and legal mappings.
- **Reasons:** Per-provision dates are accurate and auditable; full evidence makes the exported PDF self-contained and verifiable.
- **Trade-offs / consequences:** PDFs are larger; the caveat remains because commencement dates derive from the Gazette date.
- **Supersedes / superseded by:** Refines the legal-mapping approach; the earlier single-date statement in `runner.ts` limitations is replaced by `COMMENCEMENT_SUMMARY`.
- **Evidence:** `lib/audit/legal.ts`, `lib/audit/export.ts`, `tests/audit/legal.test.ts` (5 tests), `tests/audit/export.test.ts`.

## DEC-019 — Crawl without page or depth caps, bounded by a fixed 5-minute run budget

- **Date:** 2026-10-20
- **Status:** Accepted (implemented)
- **Context:** The operator no longer wants to choose `maxPages`/`maxDepth`; a site should be crawled as far as its same-site links allow. An unbounded crawl still needs a safety stop so a run cannot hang or consume resources indefinitely.
- **Options considered:**
  1. Keep page/depth caps and raise the defaults.
  2. Remove caps and rely on request timeouts only.
  3. Remove caps and enforce a fixed engine time budget.
- **Decision:** Option 3. `CrawlConfig` drops `maxPages`/`maxDepth` and gains `timeBudgetMs`, defaulting to `ENGINE_TIME_BUDGET_MS = 5 * 60 * 1000`. `crawlSite` follows same-site links until the queue empties or the absolute deadline passes; each request timeout is reduced to the remaining budget. When the budget stops the crawl, `CrawlResult.timeLimitReached` is set and a limitation explains that the site may be large or slow. A run that fetched some pages becomes `partial`; a run that fetched none becomes `failed` with a time-limit error. Browser evidence and screenshots are skipped (with a stated limitation) when less than 5 seconds remain. `maxDepthReached` is retained only as crawl statistics, not as a limit.
- **Reasons:** Keeps the product promise ("audit the whole reachable site") while guaranteeing a bounded run; timeout messaging tells the user whether slowness or site size truncated coverage.
- **Trade-offs / consequences:** Large sites are intentionally truncated at 5 minutes; queue memory grows with discovered links; legacy runs are normalized with the default `timeBudgetMs`. `AuditConfig` consumers (API, UI, tests, `CRAWL-010` evidence) were updated.
- **Supersedes / superseded by:** Supersedes the max-pages/max-depth clauses in DEC-006/DEC-014-era crawl configuration; scope rules from DEC-014 are unchanged.
- **Evidence:** `lib/audit/{types,runner,crawler}.ts`, `app/api/audits/route.ts`, `components/audit/new-audit-form.tsx`, `tests/audit/crawler.test.ts` (budget-exhaustion case).

## DEC-020 — Detect login walls and prompt for a single username/password sign-in

- **Date:** 2026-10-20
- **Status:** Accepted (implemented)
- **Context:** Auditing a site behind a login previously produced an unauthorized "failed" run with no way to continue. The operator chose to detect the wall after the unauthenticated crawl and then prompt for credentials, rather than collecting credentials up front or requiring manual capture.
- **Options considered:**
  1. Always ask for credentials before crawling.
  2. Crawl unauthenticated, detect a login wall, then prompt.
  3. Do not support authenticated sites.
- **Decision:** Option 2. `lib/audit/login-wall.ts` flags a wall on HTTP 401/403, a redirect/resolution to a login-like URL, or a login-labelled page containing a password field; a homepage that merely links to a login page is not flagged. `runAudit` returns status `requires_credentials` with `auth = { loginWallDetected, loginUrl, authenticated: false, failureReason }` and runs no tests. The report renders `CredentialsPrompt`, which posts to `POST /api/audits/{id}/credentials`; that endpoint creates a new queued run for the same target/config and launches the worker with the credentials. Only single-step username/password forms are supported; MFA, CAPTCHA, and SSO are detected and reported, never bypassed.
- **Reasons:** Avoids storing credentials for public sites, keeps the first pass cheap, and makes the credential step explicit and auditable.
- **Trade-offs / consequences:** Adds a terminal `requires_credentials` status and a new report state; multi-step/SSO logins fail with a clear reason; authenticated runs depend on Playwright.
- **Supersedes / superseded by:** None.
- **Evidence:** `lib/audit/login-wall.ts`, `lib/audit/auth.ts`, `lib/audit/runner.ts`, `components/audit/credentials-prompt.tsx`, `tests/audit/login-wall.test.ts` (5 tests); validated end to end against a local login fixture (unauth → `requires_credentials`; auth → 75 tests, cookie-authenticated crawl).

## DEC-021 — Pass credentials to the worker over stdin and never persist them

- **Date:** 2026-10-20
- **Status:** Accepted (implemented)
- **Context:** The audit worker runs in a separate process, so credentials must cross a process boundary. Writing a temp file (even `0600`) or putting values in `argv`/env would leave plaintext recoverable.
- **Options considered:**
  1. Write a temporary credentials file and pass its path.
  2. Pass credentials as command-line arguments or environment variables.
  3. Stream credentials to the worker's stdin.
- **Decision:** Option 3. `POST /api/audits/{id}/credentials` passes the credentials to `createQueuedAudit`, which forwards them to `spawnAuditWorker`; the worker is spawned with a piped stdin, the JSON is written once and the stream closed. The worker parses and validates the payload, rejects malformed input, and passes it directly to `runAudit`. Credentials are never written to `run.json`, the API response, logs, or errors; the run records only `auth` metadata and a statement that credential values are not stored. `spawnAuditWorker` still accepts a null credential stream for normal runs.
- **Reasons:** Nothing sensitive touches disk or process arguments; the pipe is short-lived and scoped to one worker.
- **Trade-offs / consequences:** The parent must write stdin before the child reads; spawn uses `stdio: ["pipe","ignore","ignore"]` instead of fully detached stdio, and the child still `unref()`s. If the payload is unreadable, the run fails with a clear auth error.
- **Supersedes / superseded by:** Supersedes the temporary-file sketch considered during DEC-020.
- **Evidence:** `lib/audit/launcher.ts`, `workers/audit-worker.ts`, `app/api/audits/[id]/credentials/route.ts`; worker handoff validated with a local login fixture and a search of the stored run for the password value (not present).

## DEC-022 — Surface sign-in pages found on public sites and make discovery notices prominent

- **Date:** 2026-10-20
- **Status:** Accepted (implemented)
- **Context:** A real audit of `www.mockmingle.in/` reached `/login`, `/signup`, and `/forgot-password` but reported neither an authentication surface nor a credential option, because DEC-020 only inspected the start page and only flagged a hard wall. The same report buried `robots.txt: not found (HTTP 404)` and `sitemap.xml: not found (HTTP 404)` in one small line, so an operator could miss that crawl coverage was limited to followed links.
- **Options considered:**
  1. Keep wall-only detection (start page) and leave discovery notices as small text.
  2. Also detect login pages discovered during the crawl, surface them in the report, and offer an optional authenticated run; render discovery-file status as large, labelled cards.
  3. Treat any discovered login page as a blocking `requires_credentials` run.
- **Decision:** Option 2. `AuditAuthState` gains `loginSurfaceDetected`; `findLoginSurfaces` flags any crawled page that is a login URL or a login-labelled page with a password field. `runAudit` still returns `requires_credentials` when the start page is a wall, but for an otherwise public site it sets `auth = { loginWallDetected: false, loginSurfaceDetected: true, loginUrl, authenticated: false }`, adds a limitation that pages behind the login were not audited, and the report shows an optional `CredentialsPrompt`. `POST /api/audits/{id}/credentials` now accepts any non-running run whose `auth` detected a login wall or surface. `store.normalizeRun` backfills `loginSurfaceDetected` and infers a surface for older runs. The report replaces the single discovery line with two large `DiscoveryCard`s for `robots.txt` and `sitemap.xml` ("Found (HTTP 200)" / "Not found (HTTP 404)" plus an explanatory note).
- **Reasons:** Makes authentication surfaces and coverage gaps visible without forcing credentials for public sites; keeps the DEC-020 wall behaviour for genuinely gated sites.
- **Trade-offs / consequences:** `loginSurfaceDetected` is a required field on `AuditAuthState`; stored runs are normalized on read. The optional prompt can start a second, authenticated run for the same target.
- **Supersedes / superseded by:** Extends DEC-020; does not supersede it.
- **Evidence:** `lib/audit/login-wall.ts` (`findLoginSurfaces`, `pageLooksLikeLogin`), `lib/audit/runner.ts`, `lib/audit/types.ts`, `lib/audit/store.ts`, `app/api/audits/[id]/credentials/route.ts`, `components/audit/{credentials-prompt,audit-report}.tsx`, `tests/audit/login-wall.test.ts` (9 tests); `www.mockmingle.in` run normalized to `loginSurfaceDetected: true` at `https://www.mockmingle.in/login`.

## DEC-023 — Persist a structured run log and spawn the worker without a console window

- **Date:** 2026-10-20
- **Status:** Accepted (implemented)
- **Context:** The audit page only showed a "running" badge, so an operator could not tell which URL was being fetched, how many pages had completed, or why a sign-in run produced few pages. Every run also opened a visible terminal window titled with the Node executable path.
- **Options considered:**
  1. Keep status-only polling and `detached: true`.
  2. Persist structured progress entries in `run.json` and poll them; spawn the worker non-detached with `windowsHide: true`.
  3. Stream progress over SSE/WebSocket.
- **Decision:** Option 2. `AuditRun.progress` holds timestamped entries (`info`/`success`/`warning`/`error`) with optional crawl counts; the crawler and runner emit events, and the worker writes a throttled snapshot. The audit page shows a live log with attempted/fetched/failed/queued tiles. The worker is spawned with `detached: false` and `windowsHide: true`: on Windows, `detached: true` implies `DETACHED_PROCESS`, and `CREATE_NO_WINDOW` is ignored with that flag, which is why a console appeared. Sign-in attempts also return step diagnostics, stored on `auth`.
- **Reasons:** Reuses the existing file store and polling, needs no new infrastructure, and makes run state auditable after the fact.
- **Trade-offs / consequences:** The worker no longer survives its parent process group being killed; progress writes are capped at 400 entries and throttled to one write per 750 ms; progress URLs are the same redacted crawl keys.
- **Supersedes / superseded by:** None.
- **Evidence:** `lib/audit/{types,crawler,runner,auth,launcher,store}.ts`, `workers/audit-worker.ts`, `components/audit/{audit-progress,audit-report,audit-live}.tsx`; spawned-worker run against `https://example.com/` persisted 6 progress entries and completed with 1 page / 75 tests. Static link discovery still limits client-rendered post-login pages.

---

## Decision Template

```markdown
## DEC-NNN — Title

- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded | rejected
- **Context:** Problem and constraints.
- **Options considered:** 1. ... 2. ... 3. ...
- **Decision:** What was chosen.
- **Reasons:** Why.
- **Trade-offs / consequences:** What improves, what worsens, migration impact.
- **Supersedes / superseded by:** DEC-XXX or none.
- **Evidence:** Files, commands, or documents verified.
```
