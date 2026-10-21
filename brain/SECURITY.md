# SECURITY.md — Security Requirements and Posture

**Last verified:** 2026-10-19

This document separates **confirmed controls** (verified in the current codebase), **required controls** (from the requirements brief), and **recommendations**. It contains no secrets.

## 1. Current Security Posture (Verified)

| Area | Current state |
| --- | --- |
| Platform authentication | **Not implemented** |
| Authorization / tenant isolation | **Not implemented** |
| Database | None |
| API surface | Python `GET /health`; Next.js `/api/audits/**` (list/create/get/export) and `/api/audits/{id}/screenshots/{name}`; no auth or rate limiting on any |
| Crawler / SSRF controls | **Partial** — the TypeScript crawler (`lib/audit/url.ts`, `lib/audit/crawler.ts`) validates URLs, revalidates redirects, blocks private/reserved addresses, and bounds crawl size; DNS-rebinding TOCTOU remains a residual risk |
| Secret management | No secrets present in repository |
| Environment variables | `.env.example` plus pydantic-settings; no real `.env` committed |
| Security headers | No explicit configuration in `next.config.ts` |
| Rate limiting | **Not implemented** |
| Logging/redaction | **Not implemented** |
| Dependency scanning | No automated vulnerability scanning configured |
| TLS | Deployment-dependent; local dev uses HTTP on `localhost:3000` |
| Input validation | Pydantic settings validation; Zod validation in the Next.js audit API; outbound URL safety in `lib/audit/url.ts` |
| CSP | Not configured |

**Confirmed existing controls:**

- `.gitignore` excludes `.env*`, `*.pem`, build output, and `node_modules/`.
- TypeScript `strict: true` is enabled in `tsconfig.json`.
- ESLint with `eslint-config-next` core-web-vitals and TypeScript rules is configured.
- React/Next.js default output escaping applies; no `dangerouslySetInnerHTML` is used.
- No secrets are committed in the application source.
- Outbound analysis targets are restricted to `http`/`https`; URLs with credentials are rejected.
- Target hostnames are resolved and every address must be globally routable; loopback, private, link-local, reserved, and metadata-range addresses are rejected.
- Redirects are followed manually, capped at five, and revalidated before each request.
- Fetch limits: 10-second timeout, 2 MB body cap, HTML/XHTML content type required.
- Requests send no cookies or authorization headers; inline script content is not returned.

**Framework baseline:** Next.js 16.4.2, React 19.3.0 — keep patched; security fixes should be applied promptly.

### 1.1 Outbound Fetch Residual Risks

- DNS rebinding between validation and connection is not fully eliminated by resolve-then-request. A hardened crawler should connect to the validated IP or use a network egress proxy.
- The analysis endpoint is unauthenticated and has no rate limit or per-user quota; add both before exposing it publicly.
- The endpoint does not execute JavaScript, authenticate, submit forms, or bypass access controls.
- Crawled content is only parsed for inspection; it is not sent to an LLM.

## 2. Threat Model

### Assets

- Platform user identities, sessions, and organization membership.
- Target-website credentials, cookies, and authenticated browser sessions.
- Crawled page snapshots, screenshots, forms, and potentially personal data.
- Audit findings, evidence, reports, and legal mapping.
- Legal source corpus and rule versions.
- LLM API keys and other provider credentials.

### Adversaries and Threats

| Threat | Impact | Notes |
| --- | --- | --- |
| SSRF via target URL or redirect | Access to internal networks/metadata; data exfiltration | High priority once crawling exists |
| DNS rebinding | Bypass of IP allow/deny checks | Re-resolve and re-check at connect time |
| Credential theft | Compromise of target websites and platform accounts | Never log/store plaintext |
| Prompt injection in crawled content | AI performs unintended actions or fabricates findings | Treat content as data; isolate prompts |
| Cross-tenant data access (IDOR) | Exposure of other organizations' audits | Enforce tenant scope in queries |
| Authenticated crawling scope escape | Unauthorized data collection | Re-validate origin after redirects |
| Sensitive data exposure in evidence/exports | Privacy harm, regulatory exposure | Redact and minimize |
| Legal citation hallucination | Incorrect compliance advice | Validate citations against legal DB |
| Malicious uploaded documents | Parser exploits, OCR abuse | Sandbox, size/type limits |
| Job flooding / abuse | Resource exhaustion, cost | Rate limits, quotas, queue bounds |
| XSS via crawled content rendering | Account/session compromise | Escape, sanitize, avoid raw HTML |
| Supply-chain compromise | Broad compromise | Lockfiles, review, scanning |
| Log leakage | Secret/PII exposure | Structured redaction |

## 3. Authentication and Authorization (Required)

### Platform users

- Registration/sign-in must be implemented before any real multi-user usage.
- Sessions must be secure: `HttpOnly`, `Secure` in production, appropriate `SameSite`.
- Password storage, if used, must use a modern adaptive hash (Argon2id or bcrypt with strong parameters). Never plaintext or reversible encryption.
- Add multi-factor authentication for administrative access (recommendation).
- Logout must invalidate server-side sessions.
- Password reset and account deletion flows are **TBD**.

### Authorization

- Every project, audit, page, finding, report, and artifact access must check tenant/organization membership.
- Do not rely on unguessable IDs as authorization.
- Use defense in depth: authorize at the service/repository layer, not only in routes or UI.
- Administrative roles must be explicit and audited.
- Cross-tenant access tests are required (see [TESTCASE.md](./TESTCASE.md)).

### Target-website authentication

- Modes: public, credentials-based, manual browser login.
- User must attest authorization to audit the target.
- Credentials must be encrypted at rest with a managed key; prefer short-lived credentials and ephemeral browser profiles.
- Login sessions must not be reused across projects or tenants.
- Session-expiration detection and re-authentication behavior must be explicit.
- Secure logout and session cleanup are mandatory.
- Never bypass MFA, CAPTCHA, or access controls.
- Manual login for MFA/CAPTCHA must occur in a controlled browser session, not by credential capture workarounds.

## 4. Secret and Environment Variable Management (Required)

- Secret storage mechanism is **TBD** (e.g., environment secrets, managed secret manager, encrypted DB columns).
- Provide a `.env.example` with variable names only — never real values.
- Do not commit `.env`, `.env.local`, keys, certificates, or session files.
- Client-exposed variables must use `NEXT_PUBLIC_` and contain no secrets.
- Rotate keys after any suspected exposure.
- Redact secrets in logs, error responses, crawl logs, and exports.
- Avoid secrets in URLs and query strings.
- Limit secret access to the processes that need it (API, workers).

## 5. Input Validation and Output Encoding (Required)

- Validate all user input at the API boundary using Pydantic models.
- Validate target URLs strictly: scheme allowlist (`http`/`https`), hostname rules, no credentials in URL, no non-standard ports unless explicitly allowed.
- Enforce maximum lengths for project names, URLs, auth instructions, selectors, and notes.
- Validate crawl configuration bounds (depth, page count, concurrency, delay, timeout, file size, content types).
- Reject malformed or unsupported content types.
- Sanitize or escape all crawled content before rendering.
- Do not render crawled HTML as trusted markup.
- Validate finding schema and enum values before persistence and export.
- Validate uploaded documents by type, size, and structure; parse in an isolated context.
- Encode output appropriately for HTML, JSON, CSV, and PDF contexts (CSV formula injection protection is required).

## 6. SSRF and Crawl Safety (Required)

- Resolve the hostname and reject:
  - Loopback (`127.0.0.0/8`, `::1`)
  - Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`)
  - Link-local (`169.254.0.0/16`, `fe80::/10`)
  - Cloud metadata endpoints (e.g., `169.254.169.254`)
  - Multicast, unspecified, and reserved ranges
  - `localhost` and internal-only DNS names
- Re-check after every redirect and at connection time to mitigate DNS rebinding.
- Do not follow redirects to out-of-scope hosts.
- Enforce same-origin by default; approved subdomains must be explicit and validated.
- Enforce timeouts, maximum response size, maximum redirects, and content-type allowlists.
- Prevent concurrent unbounded requests; enforce concurrency and delay.
- Block non-HTTP(S) schemes.
- Do not execute page scripts beyond normal browser rendering needed for analysis; do not inject privileged automation into untrusted contexts.
- Do not submit forms with side effects or perform destructive actions.
- Treat authentication cookies as highly sensitive; scope them to the target and dispose of them after the audit.

## 7. AI-Specific Security (Required)

- Treat all crawled text, documents, and metadata as untrusted input.
- Use clear instruction/data separation; never concatenate untrusted content into system instructions.
- System prompts must state that page content cannot override instructions.
- Validate all model output against strict schemas.
- Verify every cited legal provision against the internal legal source database before display or persistence.
- Reject unsupported claims and unknown citations.
- Do not let the model alone decide compliance.
- Log model calls with redacted inputs where feasible for auditability.
- Apply provider-side data-handling review; do not send sensitive personal data to providers unless necessary and authorized.
- Support a non-AI mode that makes no external model calls.

## 8. Data Protection and Privacy (Required)

- Collect only data needed for the audit.
- Redact sensitive-looking form values in stored evidence (passwords, tokens, payment data, government IDs).
- Do not store raw passwords.
- Encrypt credentials and session material at rest.
- Encrypt data in transit (TLS) for all external connections.
- Define retention periods for page snapshots, screenshots, credentials, and sessions.
- Provide deletion and retention controls for projects and audit artifacts.
- Honor data-principal requests where applicable to the platform itself.
- Mask personal data in logs and exported reports unless needed as evidence.
- Restrict access to evidence by tenant and role.
- Consider regional data residency for Indian users (recommendation; TBD).

## 9. API Security (Required)

- Require authentication on all non-public endpoints.
- Enforce object-level authorization (tenant/project/audit).
- Validate and bound pagination parameters.
- Implement per-user and per-tenant rate limits.
- Use structured error responses without internal details.
- Apply CSRF protections to cookie-authenticated state-changing requests.
- Set security headers: CSP, HSTS (production), `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`/`X-Frame-Options`, `Permissions-Policy`.
- Restrict CORS to known origins.
- Protect export endpoints against enumeration and excessive generation.
- Prevent mass assignment by using explicit request schemas.
- Log security-relevant events (auth success/failure, authorization denial, export creation) with correlation IDs.

## 10. Logging and Redaction (Required)

- Never log: passwords, cookies, authorization headers, API keys, session tokens, full form values, or raw personal data.
- Redact target URL query parameters that may contain tokens.
- Redact credentials in crawl logs; exports must be safe to share.
- Use structured logs with levels and correlation IDs.
- Avoid logging full page bodies; store them as controlled evidence instead.
- Protect log storage with access controls and retention limits.
- Provide an incident-response path for suspected log leakage.

## 11. Dependency and Vulnerability Management

- No automated scanning is configured today.
- Recommended: enable Dependabot/Renovate, `npm audit` in CI, and Python dependency scanning (`pip-audit`) once the backend exists.
- Pin lockfiles and review dependency changes.
- Monitor Next.js, React, Playwright, Crawlee, FastAPI, and database driver advisories.
- Remove unused dependencies.
- Do not add unmaintained packages.
- Container images (when added) must be minimal, pinned, and scanned.

## 12. Security Testing (Required)

Planned coverage (see [TESTCASE.md](./TESTCASE.md)):

- SSRF and redirect escape attempts.
- DNS rebinding behavior.
- Private/metadata endpoint blocking.
- Authentication and session-expiry handling.
- Cross-tenant access attempts.
- Credential redaction in logs and exports.
- Malformed/hostile HTML handling.
- Prompt injection resistance.
- Legal citation validation against unknown provisions.
- CSV formula injection.
- File upload/type/size limits.
- Rate limiting behavior.

No security tests exist today.

## 13. Incident Handling (Proposed)

1. Contain affected services and revoke exposed credentials.
2. Preserve relevant redacted logs; do not delete evidence needed for investigation.
3. Assess scope: tenants, projects, credentials, personal data.
4. Notify affected parties and authorities as required by applicable law and contracts.
5. Remediate root cause and add regression tests.
6. Record the incident and follow-up tasks in [MEMORY.md](./MEMORY.md) and [TASKS.md](./TASKS.md) without exposing sensitive details.

## 14. Open Security Decisions

| ID | Question | Status |
| --- | --- | --- |
| SEC-01 | Platform auth provider/library | TBD |
| SEC-02 | Secret storage and key management | TBD |
| SEC-03 | Credential encryption approach and key rotation | TBD |
| SEC-04 | Session storage (Redis vs DB) and TTL | TBD |
| SEC-05 | SSRF enforcement implementation details | TBD |
| SEC-06 | File storage encryption and retention | TBD |
| SEC-07 | AI provider data-handling and opt-out policy | TBD |
| SEC-08 | Audit log retention and access controls | TBD |

## 15. Implemented Engine Security Controls (2026-10-20)

Controls implemented in `dpdp-compliance-auditor/lib/audit/`:

- **SSRF / scope:** `lib/audit/url.ts` allows only `http`/`https`, rejects embedded credentials, resolves DNS, and blocks loopback, private, link-local, and reserved IPv4/IPv6 ranges. Redirects are capped and re-validated, and cross-origin redirects are refused. Private targets are permitted only when `AUDIT_ALLOW_PRIVATE_TARGETS=1` or `allowPrivateNetworks` is set (used for synthetic local fixtures in tests).
- **Bounded crawl:** `lib/audit/crawler.ts` enforces `timeBudgetMs` (fixed 5-minute engine deadline), per-request timeout clamped to the remaining budget, `maxRedirects`, and `maxBytes`, and records failed/blocked/out-of-scope attempts rather than silently skipping them. There is no operator-settable page or depth cap; `maxDepthReached` is statistics only.
- **Login-wall detection and credentials:** `lib/audit/login-wall.ts` inspects only already-fetched pages (status, URL, heading/text excerpt, password field, login language) and never submits anything; `findLoginSurfaces` reuses the same passive classifier across the crawl, so detecting a login page on a public site performs no additional requests. `lib/audit/auth.ts` supports a single-step username/password form, detects MFA/CAPTCHA/SSO and rejected logins, and returns cookies only for same-site hosts. Credentials travel from `POST /api/audits/{id}/credentials` to the detached worker over the child's stdin, are never written to `run.json`, logs, errors, exports, or the API response, and are discarded after `runAudit` returns. The report records only `auth` metadata and the fact that credentials are not stored.
- **Redaction:** `lib/audit/redact.ts` replaces emails, phone numbers, Aadhaar-like, PAN-like, and long digit sequences, JWTs, and common API-key patterns in stored text; sensitive query parameters are masked; only a safe allowlist of response headers is stored. Form field values are never stored, only metadata (`redacted: true`).
- **No mutation:** the engine never submits data forms or performs purchases/irreversible actions. It authenticates only through the operator-supplied single-step sign-in form; browser evidence (when enabled) only clicks accept/reject/withdraw controls in a fresh context and never fills or submits data fields.
- **Prompt-injection resistance:** rule evaluation is deterministic over structured evidence; page text cannot change test status. A fixture test (`tests/audit/rules.integration.test.ts`, "does not let page text manipulate deterministic results") asserts this.
- **No secrets in output:** exports (`lib/audit/export.ts`) serialize only stored, redacted evidence.
- **Screenshot capture and serving:** `lib/audit/screenshots.ts` writes PNGs only under `.data/audits/<runId>/screenshots/`; names are generated and validated against `^[A-Za-z0-9][A-Za-z0-9._-]*\.png$` with `..` rejected. Stored/returned screenshot references carry a name only, never an absolute path. `app/api/audits/[id]/screenshots/[name]/route.ts` resolves and re-checks the path, returning `404` for unsafe or missing names (verified: a `..%2Frun.json` request returned `404`). Screenshots are unfocused on form values (capture does not submit forms or type into fields), but a page may still render personal data in the captured regions.

Residual risks (not yet resolved): DNS-rebinding TOCTOU between resolution and connection; no authentication, authorization, rate limiting, or tenant isolation on `/api/audits*` (including the screenshot-serving and credentials routes), so anyone who can reach the app can submit credentials for any waiting audit; Playwright login navigates the browser outside the fetch-layer SSRF checks; credentials exist in process memory during a run; authenticated cookies are held only in memory for the run but are not separately encrypted; screenshots may contain personal data and are stored unredacted in the local file store; file store is readable by any local process with filesystem access; `npm audit` reports 8 high-severity advisories in frontend dependencies.
