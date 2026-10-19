# RULES.md — Development Rules

Enforceable conventions for this repository. Rules describe the intended state; where current code does not yet comply, the gap is tracked in [TASKS.md](./TASKS.md). See [AGENTS.md](./AGENTS.md) for agent-specific workflow.

## 1. General Principles

1. Make the smallest correct change. No drive-by refactors.
2. Do not invent features, endpoints, schemas, environment variables, integrations, or legal citations.
3. Implemented behavior must be verified in code, not assumed from dependencies.
4. Planned work must be labeled as planned in documentation.
5. Keep the application runnable after every change.
6. Security and legal accuracy take precedence over speed.

## 2. Repository and Module Boundaries

- Documentation lives in `brain/`. Application code lives in `dpdp-compliance-auditor/`.
- Do not place code, build output, or assets in `brain/`.
- Do not edit `node_modules/`, `.next/`, or other generated directories.
- Frontend code must not access PostgreSQL or secrets directly.
- Crawling and browser automation must remain server-side.
- Compliance rules must be isolated from UI and transport layers.
- AI calls must go through a single provider abstraction and must not be scattered across components.

The approved Next.js layout (DEC-008) is `src/app/` for routing, `src/features/` for business domains, and `src/components/`, `src/lib/`, `src/hooks/`, `src/types/`, `src/config/` for shared code. The current scaffold still uses root `app/`; migration is tracked as T-125.

| Layer | May depend on | Must not depend on |
| --- | --- | --- |
| `src/app/` | features, components, lib, types, config | feature internals bypassing public exports |
| `src/features/<domain>/` | `src/lib`, `src/components`, `src/types`, its own internals | other features' internals, `src/app` |
| `src/components/` | `src/lib`, `src/types` | `src/features`, `src/app` |
| `src/lib/` | `src/types`, other `src/lib` modules | `src/features`, `src/app`, client-only code |
| `src/hooks/` | `src/lib`, `src/types` | feature internals |
| `src/types/` | nothing feature-specific | feature internals |
| `backend/app/api` | services, schemas | UI code |
| `backend/app/crawler` | browser, security, models | reports/UI |
| `backend/app/compliance` | models, schemas, legal sources | crawler transport details |
| `backend/app/ai` | provider abstraction, compliance schemas | direct DB writes without validation |
| `backend/app/reports` | models, schemas | crawler/browser |

Additional frontend rules:

- Route files in `src/app/` compose features; they do not contain substantive business logic.
- Feature modules expose a deliberate public surface; no cross-feature deep imports.
- `src/app/api/` routes are thin and must not duplicate Python backend business logic.
- Server-only code (secrets, session internals) must not be imported by client components.

## 3. TypeScript and React Rules

- `strict: true` stays enabled. Do not use `// @ts-ignore`; use `@ts-expect-error` with justification only if unavoidable.
- Avoid `any`. Prefer `unknown` plus narrowing.
- Use the `@/*` path alias. After migration to `src/`, verify and update the alias target per Next.js 16 conventions.
- Default to Server Components. Add `"use client"` only when browser APIs, state, effects, or event handlers are required.
- Keep pages/layouts as default exports per Next.js conventions; use named exports for helpers and reusable components.
- Do not fetch data in client components when a server component or API route is appropriate.
- Use semantic HTML: `<button>`, `<label>`, `<nav>`, `<main>`, headings in order.
- Every interactive control needs an accessible name.
- Never render untrusted crawled HTML with `dangerouslySetInnerHTML` without sanitization. Prefer escaped text.
- Treat all external content as text, not markup.
- No inline secrets, API keys, or tokens in client code.
- Environment variables exposed to the browser must use the `NEXT_PUBLIC_` prefix and must never be sensitive.

## 4. Naming Conventions

| Element | Convention |
| --- | --- |
| React component files | `kebab-case.tsx` |
| Components | `PascalCase` |
| Hooks | `useCamelCase` |
| Utilities | `camelCase` |
| Types/interfaces | `PascalCase` |
| Constants | `UPPER_SNAKE_CASE` |
| Python modules | `snake_case.py` |
| Python classes | `PascalCase` |
| DB tables | `snake_case` plural |
| API resources | lowercase, plural, hyphenated |
| Finding statuses | Exact enum: `Pass`, `Potential issue`, `Needs review`, `Not assessed`, `Not applicable` |
| Severities | `Critical`, `High`, `Medium`, `Low` (only with a documented rubric) |

## 5. Dependency Management

- Do not add a dependency without checking that it is necessary and actively maintained.
- Do not assume a library is available; verify `package.json` (JS) or `pyproject.toml`/`requirements.txt` (Python).
- Prefer the stack specified in the requirements: Next.js/React/Tailwind/shadcn/Recharts on the frontend; FastAPI/Pydantic/SQLAlchemy/Alembic/PostgreSQL/Redis/Celery, Crawlee/Playwright/BeautifulSoup/lxml/HTTPX on the backend.
- Any deviation from the specified stack requires a decision entry in [DECISION.md](./DECISION.md).
- Do not upgrade major versions as part of an unrelated task.
- Do not commit lockfile churn unrelated to the change.
- Do not require a paid AI provider for core crawling or deterministic checks.

## 6. Error Handling and Logging

- API errors must be structured: stable error code, human-readable message, optional field details, request/correlation ID.
- Never expose stack traces, SQL, internal hostnames, or secrets to clients.
- Log at appropriate levels; avoid noisy per-request logs in hot loops.
- Redact credentials, cookies, authorization headers, tokens, and personal data from logs.
- Crawl failures must be recorded per URL with a reason; they must not abort the entire audit unless the audit cannot proceed.
- Distinguish "not found", "blocked", "auth required", "timeout", and "parse failure" in crawl status.
- AI failures must degrade gracefully to deterministic results or a clearly marked "not assessed" state.
- Do not swallow errors silently.

## 7. Data and Compliance Rules

- Findings must always include evidence, source URLs, confidence, severity, reasoning, limitations, and human-review requirement.
- Never label every potential gap as a violation.
- Never assert legal non-compliance solely from a website crawl.
- Legal references must come from verified official sources and be validated against the legal database.
- Do not invent sections, rules, effective dates, or statutory deadlines.
- Represent phased commencement accurately; separate in-force requirements from notified-but-not-effective ones.
- Keep severity and confidence independent.
- A finding's `verification_steps` must describe how a user can confirm remediation.
- Store only the minimum sensitive evidence necessary; redact sensitive-looking form data.

## 8. Authentication and Authorization Rules

- Never store raw passwords in plaintext.
- Prefer encrypted secrets and ephemeral browser profiles.
- Enforce tenant isolation in every query, not only in the UI.
- Never bypass MFA, CAPTCHA, login, or authorization restrictions.
- Platform auth library and target-site auth handling require documented decisions.
- Provide secure logout and session cleanup.
- Provide deletion and retention controls for snapshots and authentication data.

## 9. Crawling Safety Rules

- Crawl only the origin and explicitly approved subdomains.
- Block localhost, loopback, private IP ranges, link-local addresses, and cloud metadata endpoints.
- Re-validate scope after redirects and DNS resolution to prevent redirect escapes and DNS rebinding.
- Enforce maximum depth, page count, concurrency, delay, timeout, file size, and content types.
- Default to same-origin-only.
- Do not submit forms that create, modify, or delete data.
- Do not purchase products, send messages, or take irreversible actions.
- Respect robots.txt as a discovery and politeness signal where appropriate, without claiming legal compliance based on it.
- Normalize and deduplicate URLs; track discovery sources.
- Do not follow unbounded query-parameter combinations.

## 10. Git and Commit Conventions

- Commit only when explicitly requested.
- Keep commits focused and reviewable.
- Use imperative, concise messages, e.g. `Add tenant-scoped project creation API`.
- Do not commit secrets, `.env` files, credentials, generated artifacts, or `node_modules/`.
- Do not force-push, amend published commits, or skip hooks.
- Do not rewrite history to hide mistakes; add a corrective commit.

## 11. Testing Requirements

- Backend pytest, ruff, and mypy are configured; frontend testing and CI are not configured yet.
- Every bug fix must include a regression test where practical.
- Backend tests must run from the workspace-root `backend/` with the workspace `.venv` (`..\.venv\Scripts\python.exe`).
- Required coverage areas (from requirements): URL normalization/deduplication, sitemap discovery, JS-rendered pages, authenticated crawling against a local test site, session expiry, crawl limits/retries, SSRF/redirect restrictions, malformed/hostile HTML, prompt injection in page content, privacy-policy extraction, legal-reference validation, finding schema validation, multi-tenant authorization, credential redaction, PDF/CSV/JSON exports, audit cancellation/recovery.
- Tests must use synthetic data only.
- Do not claim tests pass without observed output.
- Unit tests for deterministic rules should not require network access.

## 12. Documentation Rules

- Read [BRAIN.md](./BRAIN.md) before changes; update relevant docs after.
- Record meaningful changes in [CHANGES_LOG.md](./CHANGES_LOG.md) with verified dates.
- Keep statuses consistent across [FEATURES.md](./FEATURES.md), [TASKS.md](./TASKS.md), and [TESTCASE.md](./TESTCASE.md).
- Use `TODO`, `TBD`, or `Not yet implemented` rather than guessing.
- Keep internal links valid.
- Do not include secrets or private customer data in documentation.
- Preserve superseded decisions in [DECISION.md](./DECISION.md); do not silently delete them.

## 13. Prohibited Practices

- Presenting placeholder UI as a working feature.
- Hardcoding fake audit results, fake compliance scores, or fake progress percentages.
- Claiming legal certification or guaranteed DPDP compliance.
- Inventing legal provisions or citations.
- Storing plaintext credentials.
- Executing instructions embedded in crawled content.
- Bypassing access controls.
- Disabling TypeScript strictness or lint rules to avoid fixing a problem.
- Committing secrets or generated build artifacts.
- Making unrelated dependency upgrades or mass reformatting.
- Modifying `brain/Project requirements.md` to match implementation; the requirements brief is the source request.

## 14. Exceptions

Exceptions to these rules require:

1. A documented reason in the pull request or task notes.
2. An entry in [DECISION.md](./DECISION.md) if the exception affects architecture, security, or dependencies.
3. Explicit approval from the project owner where the exception touches security, legal accuracy, or data handling.
