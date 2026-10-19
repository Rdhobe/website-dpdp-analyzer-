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
