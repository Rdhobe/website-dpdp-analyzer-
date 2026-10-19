# PRD.md — Product Requirements Document

**Product:** DPDP Website Compliance Auditor
**Version:** 0.1 (derived from `Project requirements.md`)
**Last updated:** 2026-10-19

> **Status note:** This PRD is derived from the requirements brief. Product decisions not present in that brief are marked `TBD`. This document defines requirements; it does not claim they are implemented. See [FEATURES.md](./FEATURES.md) for verified status.

## 1. Product Vision

Build a production-oriented compliance assessment platform that crawls an authorized website, optionally authenticates to reach gated pages, collects evidence, and evaluates it against India's Digital Personal Data Protection Act, 2023 and applicable DPDP Rules, 2025.

The product must explain **what** is wrong, **where** it was found, **why** it matters, **which verified legal provision** applies, **what to change**, and **how to verify the fix**.

It is explicitly **not**:
- A generic website scraper.
- A cookie scanner only.
- A generic AI chatbot.
- A legal certification service.
- A penetration-testing tool.

## 2. Problem Statement

Organizations operating in India need practical visibility into website-level DPDP compliance. Manual review is slow, inconsistent, and hard to evidence. Existing tools rarely connect observed website behavior to verified legal provisions with page-level evidence and remediation guidance. Teams also lack a defensible way to show what was checked, what was not, and what still requires human or organizational review.

## 3. Target Users

| User | Needs |
| --- | --- |
| Privacy/compliance officer | Understand gaps, assign remediation, track resolution, produce evidence |
| Legal counsel | Verify applicable provisions and limitations; review flagged findings |
| Web/engineering team | Precise affected URLs and concrete remediation steps |
| Security team | Limited authorized technical checks without intrusive testing |
| Agency/consultant | Run repeated audits across client websites and demonstrate progress |
| Organization leadership | Executive summary without legal overstatement |

**Primary user (assumption):** A privacy or compliance professional running audits for an organization. Marked as an assumption; `TBD` to confirm.

## 4. Goals and Objectives

1. Discover accessible pages within an authorized scope.
2. Capture evidence: content, forms, notices, cookies/scripts, links, screenshots, technical indicators.
3. Evaluate evidence with versioned, deterministic DPDP checks.
4. Optionally assist interpretation with retrieval-grounded AI.
5. Produce actionable, evidence-linked findings with verified legal references.
6. Support review, remediation tracking, re-audits, and comparison.
7. Export professional PDF and machine-readable JSON/CSV reports.
8. Remain safe, tenant-isolated, and honest about limitations.

## 5. Scope

### In Scope

- Website audit project management.
- Public and authorized authenticated crawling (credentials or manual browser login).
- URL discovery, deduplication, limits, and progress tracking.
- Extraction of pages, text, forms, notices, cookies, scripts, links, screenshots, metadata.
- Deterministic compliance checks across areas A–I in the requirements.
- Optional AI-assisted analysis with legal-citation validation.
- Findings with severity, confidence, evidence, legal references, remediation, and review status.
- Dashboard, legal framework view, crawl monitor, audit history and comparison.
- PDF, JSON, and CSV exports.
- Multi-tenant access control.
- Security controls, tests, Docker-based local development, and deployment documentation.

### Out of Scope (per requirements or explicit exclusions)

- Legal certification or guaranteed compliance.
- Intrusive penetration testing.
- Bypassing MFA, CAPTCHA, authentication, or authorization.
- Purchasing products, sending messages, or irreversible actions.
- Automatically modifying the target website.
- Verifying backend retention, internal contracts, or internal governance solely from a crawl.
- Mobile app auditing (not specified).
- Non-web systems.
- Full legal advice; outputs are assessment inputs requiring human review.

### TBD Scope Items

- Supported document formats beyond HTML/PDF/common documents.
- Maximum supported crawl size and pricing/quota model.
- Multi-language notice analysis beyond English (requirements mention language clarity).
- Whether audits can be scheduled/recurring.
- Whether multiple users per organization and role granularity are required (assumed yes for tenant isolation).
- Data residency requirements for Indian customers.

## 6. Functional Requirements

### FR-1 — Account and Access

- FR-1.1 User registration and sign-in.
- FR-1.2 Organizations/tenants with isolated projects and data.
- FR-1.3 Role-based permissions (roles `TBD`).
- FR-1.4 Secure sessions and logout.
- FR-1.5 Deletion and retention controls for projects and audit artifacts.

### FR-2 — Project and Audit Configuration

- FR-2.1 Create a website audit project.
- FR-2.2 Configure: project name, root URL, optional username/password, login URL, auth instructions, auth mode (public/credentials/manual), max depth, max pages, max concurrency, delay, timeout, same-origin-only (default on), approved subdomains, include/exclude paths, max file size, supported content types, JS rendering toggle, screenshot toggle, cookie/tracking toggle, form/notice toggle, AI toggle, legal framework version, organization details/business context.
- FR-2.3 Validate every setting with safe defaults and clear errors.
- FR-2.4 Require user attestation of authorization to audit the target.

### FR-3 — Crawling

- FR-3.1 Discover URLs via anchors, sitemaps (including index files and robots.txt references), canonicals, pagination, JS-rendered links, navigation menus, seed URLs, and authenticated pages.
- FR-3.2 Normalize and deduplicate URLs; track discovery source.
- FR-3.3 Handle query parameters to avoid infinite crawling.
- FR-3.4 Support HTML and downloadable PDFs/common documents.
- FR-3.5 Enforce depth, page count, concurrency, delay, timeout, file size, content-type, and scope limits.
- FR-3.6 Support authentication: login URL, form detection, optional selectors, workflows, session/cookie persistence, redirect handling, session-expiry detection, auth-state verification, manual MFA/CAPTCHA login, secure logout/cleanup.
- FR-3.7 Verify authenticated coverage; do not assume login equals full discovery.
- FR-3.8 Show live progress: discovered, processed, failed, skipped, current URL, queue depth, retries, activity.
- FR-3.9 Support pause, resume, and cancel.
- FR-3.10 Record per-URL failures with reasons.

### FR-4 — Extraction

- FR-4.1 Per page collect: URL, canonical, HTTP status, title, meta description, headings, visible text, DOM evidence, internal/external links, forms and fields, interactive controls, privacy/cookie links, consent controls, script/third-party metadata, screenshots, page type, timestamp, extraction errors.
- FR-4.2 Classify page types.
- FR-4.3 Redact sensitive form values and evidence.
- FR-4.4 Do not claim extraction of inaccessible or unparseable content.

### FR-5 — Compliance Rules Engine

- FR-5.1 Versioned rule set independent of the LLM.
- FR-5.2 Legal references sourced from official Indian government publications with document, version/date, section/rule, URL, applicability, commencement, effective date, requirement summary, observable indicators, evidence needed, deterministic logic, human-review need, remediation, last-verified date.
- FR-5.3 Accurately represent phased commencement.
- FR-5.4 Evaluate areas: privacy notices/transparency; consent/choice; personal-data collection; data-principal rights/grievance; children's data; security/data handling; retention/deletion/purpose limitation; third-party processing/sharing; accountability disclosures.
- FR-5.5 Do not invent legal provisions, deadlines, or mandatory controls.
- FR-5.6 Do not conclude child obligations apply solely from the absence of an age gate.
- FR-5.7 Do not equate missing visible controls with legal violation.
- FR-5.8 Do not treat a detected third-party request as proof of unlawful sharing.

### FR-6 — Findings

- FR-6.1 Structured finding schema: ID, title, category, status, severity, confidence, affected URLs, evidence, legal references, reasoning, recommended fix, verification steps, human-review flag.
- FR-6.2 Status enum: `Pass`, `Potential issue`, `Needs review`, `Not assessed`, `Not applicable`.
- FR-6.3 Severity separate from confidence.
- FR-6.4 Severity rubric documented before severity labels are used.
- FR-6.5 Each finding identifies evidence, reasoning, legal applicability, and limitations.
- FR-6.6 Support reviewer assignment, review status, and resolution notes.

### FR-7 — AI Analysis (Optional)

- FR-7.1 Page classification, notice extraction, statement-vs-behavior comparison, missing-information detection, remediation suggestions, summaries, plain-language explanations.
- FR-7.2 Retrieval-grounded pipeline: retrieve official text, check applicability, retrieve evidence, analyze, require structured output, validate citations, reject unsupported claims, flag uncertainty.
- FR-7.3 Treat website content as untrusted data.
- FR-7.4 Never let the LLM alone determine compliance where behavior/organizational evidence is needed.
- FR-7.5 Configurable model/provider.
- FR-7.6 Non-AI fallback mode.

### FR-8 — Dashboard

- FR-8.1 Overview: URLs discovered, pages analyzed, failed/skipped, checks completed, checks needing review, findings by severity, coverage with defined denominator, last audit date, comparison with previous audits.
- FR-8.2 Pages: searchable inventory with URL, page type, status, findings count, filters, evidence viewer.
- FR-8.3 Findings: title, severity, confidence, affected URLs, evidence, legal references, fix, review status, reviewer, notes.
- FR-8.4 Legal framework: provisions, effective dates, sources, rule version, coverage/limitations.
- FR-8.5 Crawl monitor: live progress, current URL, queue depth, retries, failures, pause/resume/cancel, exportable redacted logs.
- FR-8.6 Audit history: previous runs, changed/new/resolved findings, coverage changes, regression checks.
- FR-8.7 No arbitrary compliance percentage implying certification. Any score must document methodology, weighting, exclusions, coverage.

### FR-9 — Remediation

Each actionable finding provides: what was detected, where, why it matters, verified requirement, what to change, implementation example where appropriate, how to test the fix, and what cannot be established by crawling. Generated copy must be labeled as a draft and never auto-applied to the target site.

### FR-10 — Reporting and Export

- FR-10.1 PDF report: executive summary, scope/config, coverage/limitations, methodology, findings by priority, affected URLs, evidence/screenshots, legal references, remediation, human-review questions, framework version/effective dates, timestamp.
- FR-10.2 JSON report.
- FR-10.3 CSV findings and page inventory.
- FR-10.4 Reproducible by audit ID; preserve evidence.
- FR-10.5 Redact secrets from exports.

### FR-11 — Audit History and Re-checks

- FR-11.1 Re-run selected checks or the entire audit.
- FR-11.2 Compare findings and coverage between runs.
- FR-11.3 Identify new, resolved, unchanged, and regressed findings.

### FR-12 — Platform Operations

- FR-12.1 Docker Compose local development.
- FR-12.2 Environment variable examples.
- FR-12.3 Database migrations and seed data.
- FR-12.4 Setup and production deployment documentation.
- FR-12.5 Structured logging with redaction.
- FR-12.6 Rate limiting and abuse prevention.

## 7. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Security: tenant isolation, SSRF protection, encrypted credentials, redaction, no auth bypass. |
| NFR-2 | Reliability: crawl jobs survive worker restarts; cancellation and recovery are supported. |
| NFR-3 | Reproducibility: audit results tied to audit ID, rule version, and preserved evidence. |
| NFR-4 | Performance: crawl within configured concurrency; dashboard remains responsive during audits. |
| NFR-5 | Scalability: background workers can scale independently; queue bounds prevent overload. |
| NFR-6 | Accessibility: WCAG 2.1 AA target for the UI. |
| NFR-7 | Observability: structured logs, job status, failure reasons, correlation IDs. |
| NFR-8 | Maintainability: versioned rules, modular analyzers, documented decisions. |
| NFR-9 | Privacy: minimize collected data, redact sensitive evidence, retention controls. |
| NFR-10 | Legal integrity: citations must be verified against official sources; no hallucinated provisions. |
| NFR-11 | Portability: Docker-based local and deployable production setup. |
| NFR-12 | Honesty: no fake progress, scores, findings, or test claims. |

**Performance targets:** `TBD` (no numeric SLAs in requirements).
**Availability targets:** `TBD`.
**Supported browsers:** `TBD`; recommend current Chrome, Firefox, Safari, Edge.

## 8. User Stories

| ID | Story | Acceptance Criteria |
| --- | --- | --- |
| US-01 | As a compliance officer, I can create a project for my website so I can audit it. | Project persists with name, root URL, scope, and config; invalid URLs rejected. |
| US-02 | As a compliance officer, I can optionally provide authorized login details so gated pages are assessed. | Credentials encrypted; session verified; auth state and coverage reported; no bypass of MFA/CAPTCHA. |
| US-03 | As a user, I can watch crawl progress so I know what is happening. | Live counts, current URL, failures, retries; pause/resume/cancel work; no invented ETA. |
| US-04 | As an engineer, I can see exactly which URL and element caused a finding so I can fix it. | Finding shows affected URLs, evidence with source URL and location, and verification steps. |
| US-05 | As legal counsel, I can see the verified provision and its applicability. | Legal reference includes document, provision, source URL, effective/applicability status, last-verified date. |
| US-06 | As a user, I can distinguish confirmed observations from potential gaps and unanswered organizational questions. | Findings have explicit status; severity/confidence separate; limitations stated. |
| US-07 | As a compliance officer, I can export a report for stakeholders. | PDF, JSON, CSV generated; reproducible by audit ID; secrets redacted. |
| US-08 | As a user, I can re-run an audit and see what changed. | Comparison lists new, resolved, unchanged, regressed findings and coverage changes. |
| US-09 | As a user, I can see failed/skipped pages and understand coverage limits. | Failed pages listed with reasons; coverage denominator defined. |
| US-10 | As an admin, I can ensure tenants cannot access each other's data. | Cross-tenant requests denied and logged. |
| US-11 | As a user without an AI key, I can still run deterministic checks. | Crawl and non-AI checks complete without a paid provider. |
| US-12 | As a user, I can review and assign findings. | Reviewer, status, and resolution notes persist. |

## 9. Constraints

- Must not require a paid AI provider for basic crawling/deterministic checks.
- Must not bypass access controls or perform intrusive testing.
- Must not claim legal certification.
- Must accurately represent phased DPDP commencement.
- Must treat crawled content as untrusted.
- Must store no plaintext passwords.
- Must enforce tenant isolation.
- Must comply with DPDP itself in handling user and crawled data.

## 10. Assumptions

- Users have authorization to audit the target websites they submit.
- Target sites are reachable over HTTP/HTTPS.
- Official legal sources are accessible for rule curation.
- Organizations are willing to provide business context for applicability decisions.
- A crawl cannot verify backend retention or internal governance.
- The requirements document is the approved product source; conflicts must be resolved by the project owner.

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Legal citation error | Incorrect advice, reputational/legal harm | Curated official sources, validation, human review, versioning |
| Overclaiming compliance | False assurance | Status vocabulary, disclaimers, limitations, no certification |
| Crawler scope escape / SSRF | Unauthorized access | URL validation, DNS re-checks, redirect scope enforcement |
| Credential compromise | Target account breach | Encryption, ephemeral sessions, redaction, retention limits |
| Prompt injection | Manipulated AI output | Content isolation, schema validation, citation verification |
| Scaling long audits | Resource exhaustion | Queue bounds, limits, worker isolation, cancellation |
| Fragmented data model | Cross-tenant leaks | Tenant-scoped queries and tests |
| Legal changes | Stale rules | Versioned framework, last-verified dates, review process |
| Missing test coverage | Regressions | Test plan in [TESTCASE.md](./TESTCASE.md), CI enforcement |
| Scope creep | Delayed MVP | Phased plan in [TASKS.md](./TASKS.md) |

## 12. Success Metrics

**Product metrics (proposed; targets TBD):**

- Time to first completed audit.
- Percentage of discovered in-scope pages successfully analyzed.
- Percentage of findings with complete evidence and legal references.
- Number of findings resolved between audit runs.
- Report export success rate.
- Number of human-review items resolved.
- Crawl failure rate by cause.
- User-reported false-positive rate.

**Quality metrics:**

- Zero security regressions in SSRF/tenant-isolation tests.
- 100% of displayed legal citations validated against the legal database.
- No plaintext credentials in storage or logs.
- Automated test coverage for critical flows (`TBD` threshold).

## 13. Definition of Done for First Usable Release

A user can:

1. Create a website audit.
2. Crawl an authorized website, including supported authenticated pages.
3. Inspect discovered URLs and evidence.
4. Run versioned, evidence-based DPDP checks.
5. Review actionable findings with affected URLs and verified legal references.
6. Export a report with remediation guidance.
7. Re-run an audit and compare changes.
8. Inspect failed pages and coverage limitations.

The application must distinguish verified observations, potential gaps, organizational questions, and confirmed legal conclusions. It must never claim guaranteed DPDP compliance or legal certification based on a crawl.

## 14. Open Product Questions

| ID | Question | Status |
| --- | --- | --- |
| PQ-01 | Who is the primary paying user and organization size? | TBD |
| PQ-02 | Pricing, quotas, and crawl-size limits | TBD |
| PQ-03 | Required languages for notices and UI | TBD |
| PQ-04 | Role model and permissions granularity | TBD |
| PQ-05 | Retention defaults for snapshots, evidence, and credentials | TBD |
| PQ-06 | Severity rubric and weighting | TBD |
| PQ-07 | Whether a compliance score is offered and how it is computed | TBD |
| PQ-08 | Legal review workflow and cadence for rules | TBD |
| PQ-09 | Data residency requirements | TBD |
| PQ-10 | Whether recurring/scheduled audits are required | TBD |

## 15. Related Documents

- [Project requirements.md](./Project%20requirements.md) — original brief.
- [FEATURES.md](./FEATURES.md) — status by feature.
- [FLOW.md](./FLOW.md) — user and system flows.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — technical design.
- [TASKS.md](./TASKS.md) — implementation backlog.
- [TESTCASE.md](./TESTCASE.md) — test plan.
