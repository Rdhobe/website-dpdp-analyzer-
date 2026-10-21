# DESIGN.md — UI and UX Design System

**Status:** The audit dashboard is implemented with Tailwind utility styles, and the landing-page inspector was removed on 2026-10-19. The broader compliance dashboard design system below remains **Proposed**.

## 1. My Understanding of the Design Challenge

The product is a professional compliance tool. The interface must communicate evidence, uncertainty, legal applicability, and remediation without implying legal certification. The UI should feel trustworthy, analytical, and calm — closer to an audit workspace than a marketing site.

Core UX principles:

1. **Show evidence, not verdicts.** Every finding links to its source URL, captured evidence, and limitations.
2. **Separate confidence from severity.** Visual treatment must not conflate the two.
3. **Distinguish observed / potential / unverified states.** Use explicit labels and colors; never present "not assessed" as safe.
4. **Progressive disclosure.** Summary first, then pages, then evidence and legal references.
5. **No fake precision.** Progress uses real counts; no invented percentages or ETAs.
6. **Accessible by default.** Keyboard, screen reader, contrast, and reduced-motion support.
7. **Draft content is labeled.** AI-generated remediation copy must be marked as a draft for review.

## 2. Current Design Implementation (Verified)

| Item | Current value | Location |
| --- | --- | --- |
| Framework | Next.js App Router | `app/layout.tsx` |
| Styling | Tailwind CSS 4 | `app/globals.css` |
| Fonts | Geist Sans + Geist Mono via `next/font/google` | `app/layout.tsx` |
| Background (light) | `#ffffff` | `app/globals.css` |
| Foreground (light) | `#171717` | `app/globals.css` |
| Background (dark) | `#0a0a0a` | `app/globals.css` |
| Foreground (dark) | `#ededed` | `app/globals.css` |
| Body font | Geist Sans via `var(--font-geist-sans)` | `app/globals.css` |
| Dark mode | Follows `prefers-color-scheme` | `app/globals.css` |
| Page | Audit dashboard: run form, audit history table, links to run detail and comparison, rendered at `/` and `/audits` | `components/audit/audit-dashboard.tsx` |
| Components | `AuditDashboard` server component + `NewAuditForm`, `AuditReport`, `AuditLive`, `StatusBadge` | `components/audit/` |
| shadcn/ui | Not installed | — |
| Recharts | Not installed | — |

**Path note:** locations above reflect the current scaffold. Under the approved DEC-008 structure, these files move to `src/app/layout.tsx`, `src/app/globals.css`, and `src/app/page.tsx`; shared UI goes to `src/components/`, feature-specific UI to `src/features/<domain>/`, and route screens to `src/app/`.

**Font fix (2026-10-19):** the body now uses `var(--font-geist-sans)` instead of Arial, so the loaded Geist font is applied.

**Metadata (2026-10-19):** title and description now describe the website audit engine rather than the removed landing-page inspector.

## 3. Proposed Design Tokens

These are proposals; they must be implemented in Tailwind theme variables before being treated as real.

### Color

Semantic tokens should map to roles, not raw colors, so dark mode and contrast can be managed centrally.

| Token | Purpose | Proposed value (light) | Proposed value (dark) |
| --- | --- | --- | --- |
| `--background` | App background | `#F8FAFC` | `#0B1220` |
| `--surface` | Cards/panels | `#FFFFFF` | `#111A2B` |
| `--surface-muted` | Table stripes, secondary panels | `#F1F5F9` | `#16223A` |
| `--border` | Dividers, input borders | `#E2E8F0` | `#24344F` |
| `--foreground` | Primary text | `#0F172A` | `#E6EDF7` |
| `--muted-foreground` | Secondary text | `#475569` | `#94A3B8` |
| `--primary` | Primary actions | `#1D4ED8` | `#60A5FA` |
| `--primary-foreground` | Text on primary | `#FFFFFF` | `#0B1220` |
| `--focus` | Focus ring | `#2563EB` | `#93C5FD` |

### Status and severity colors

Severity and finding status must be visually distinct and always accompanied by text labels (never color-only).

| Semantic | Use | Proposed |
| --- | --- | --- |
| Critical | Critical severity | deep red `#B91C1C` on light red background |
| High | High severity | orange-red `#C2410C` |
| Medium | Medium severity | amber `#B45309` |
| Low | Low severity | blue/slate `#1D4ED8` |
| Pass | Check passed | green `#15803D` |
| Potential issue | Observed possible gap | amber `#B45309` |
| Needs review | Human review required | violet `#6D28D9` |
| Not assessed | Not evaluated | slate `#475569` |
| Not applicable | Out of scope | neutral gray `#64748B` |

Accessibility requirement: validate contrast at WCAG AA (4.5:1 for normal text, 3:1 for large text and UI boundaries).

### Typography

| Role | Font | Size / line height | Weight |
| --- | --- | --- | --- |
| Display / page title | Geist Sans | 30/36 | 600 |
| Section heading | Geist Sans | 22/30 | 600 |
| Card title | Geist Sans | 16/24 | 600 |
| Body | Geist Sans | 14/22 | 400 |
| Small / meta | Geist Sans | 12/18 | 400 |
| Mono / URLs, IDs, code | Geist Mono | 12/18 | 400 |

### Spacing and layout

- Base spacing unit: 4px. Common steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Content max width: 1440px for dashboards; readable text column 720px.
- Dashboard shell: fixed left sidebar (240px) + top bar (56px) + content area.
- Card radius: 12px. Input radius: 8px. Buttons: 8px.
- Borders: 1px. Shadows: subtle, used only for elevated panels/menus.
- Table row height: 44px; sticky header.

### Breakpoints

| Name | Width | Behavior |
| --- | --- | --- |
| Mobile | < 640px | Single column; sidebar becomes a drawer; tables become stacked cards |
| Tablet | 640–1023px | Two-column grids; compact sidebar |
| Desktop | ≥ 1024px | Full sidebar and multi-column dashboard |
| Wide | ≥ 1440px | Max-width centered content |

## 4. Proposed Component Inventory

| Component | Purpose | Required states |
| --- | --- | --- |
| App shell / sidebar | Navigation across Overview, Pages, Findings, Legal, Crawl, History | active, collapsed, mobile drawer |
| Project card/list | Project summary and last audit | default, empty, loading |
| Audit configuration form | URL, auth mode, limits, toggles | default, validation error, submitting, disabled |
| URL input | Target website | valid, invalid, blocked destination |
| Auth mode selector | Public / credentials / manual | selected, warning for credentials |
| Crawl progress panel | Live counts and controls | idle, crawling, paused, cancelling, failed, complete |
| Stat cards | Overview metrics | default, loading, no-data |
| Severity/chart | Findings distribution | default, empty, accessible table alternative |
| Page inventory table | URLs, type, status, findings | loading, empty, filtered-empty, error |
| Finding card/detail | Evidence, legal refs, remediation | collapsed, expanded, reviewing, resolved |
| Evidence viewer | Text/DOM/screenshot evidence | available, redacted, unavailable |
| Legal reference block | Provision, version, effective date, source | verified, applicability unknown |
| Review workflow | Assign reviewer, status, notes | unassigned, in review, resolved, reopened |
| Export menu | PDF/JSON/CSV | enabled, generating, failed |
| Toast/alert | Feedback | info, success, warning, error |
| Empty state | Explain absence of data and next step | — |
| Skeleton | Loading placeholders | — |
| Dialog/confirm | Destructive actions (delete project, cancel audit) | confirm, cancel |

Use shadcn/ui primitives when adopted; do not build a parallel component library. Recharts (or an accessible alternative) for charts; always provide a table/text summary of chart data.

## 5. Proposed Key Screens

### Overview

- Metric cards: URLs discovered, pages analyzed, failed, skipped, checks completed, checks needing review.
- Findings by severity (stacked bar or donut) with a table equivalent.
- Coverage percentage with an explicit denominator (for example "analyzed / discovered in scope") and a tooltip explaining exclusions.
- Last audit date and comparison with the previous audit.
- Prominent disclaimer: no legal certification.

### Pages

- Search and filters: auth status, crawl errors, risk category, page type.
- Columns: URL, page type, crawl status, findings count, last crawled.
- Row opens an evidence viewer with tabs: overview, text, forms, cookies/scripts, screenshot.

### Findings

- List with severity, confidence, status, affected URL count, category, reviewer.
- Detail: title, reasoning, evidence excerpts with source links, legal references, recommended fix, verification steps, limitations, human-review questions.
- Review actions: assign, set status, add resolution notes.
- "Draft" badge on AI-generated remediation text.

### Legal Framework

- Rule version selector and effective-date display.
- Requirements grouped by area (A–I from requirements).
- In-force vs notified-not-effective labels.
- Source document links and last-verified date.
- Coverage limitations.

### Crawl Monitor

- Current URL, queue depth, processed/failed/skipped counts, retries.
- Pause, resume, cancel controls with confirmation.
- Live log with redacted secrets; export option.
- No fabricated completion percentage or ETA.

### Audit History

- Run list with timestamps, coverage, finding counts.
- Diff view: new, resolved, unchanged, regressed findings.
- Comparison of coverage and crawl limits between runs.

## 6. Interaction Patterns

- Destructive actions require confirmation and explain consequences.
- Long-running actions show real status and are cancelable.
- Filters persist in the URL for shareable views.
- Tables support keyboard navigation and sortable headers.
- Finding status changes are optimistic only with rollback on failure; otherwise show pending state.
- All timestamps display in the user's timezone with ISO value available on hover/copy.
- External links open in a new tab with `rel="noopener noreferrer"` and a visible external indicator.
- Never auto-scroll the crawl monitor away from user-selected content.
- Respect `prefers-reduced-motion`.

## 7. Required UI States

| State | Requirement |
| --- | --- |
| Loading | Skeletons for tables/cards; no layout shift |
| Empty | Explain why there is no data and the next action |
| Error | Specific message, retry action, correlation ID for support |
| Success | Confirmation with a link to the result |
| Partial | Show what succeeded and what failed; never hide failures |
| Not assessed | Explicit neutral label, not green/success styling |
| Redacted | Show that evidence was redacted and why |
| Permission denied | Explain required access without leaking resource existence |

## 8. Accessibility Requirements

- WCAG 2.1 AA target.
- Keyboard access to all controls; visible focus indicators.
- Semantic landmarks and heading order.
- Form labels and descriptions tied to inputs; error messages announced.
- Color is never the only carrier of meaning.
- Charts have text/table alternatives.
- Sufficient contrast in light and dark modes.
- Live progress updates use polite ARIA live regions; avoid constant announcements.
- Screenshots include alt text describing the captured state.
- Support 200% zoom and reflow.

## 9. Content and Tone

- Be precise and non-alarmist.
- Use "potential issue", "needs review", "not assessed", "observed" instead of "violation" unless a verified legal conclusion is explicitly supported.
- Distinguish "observed on page" from "confirmed organizationally".
- Label AI-generated text as a draft.
- Always include limitations and verification steps.

## 10. Implementation Notes

- Replace default metadata in the root layout (`app/layout.tsx` now; `src/app/layout.tsx` after T-125).
- Apply the Geist font correctly (remove the Arial override or intentionally adopt Arial).
- Introduce design tokens in the global stylesheet (`app/globals.css` now; `src/app/globals.css` after T-125).
- Install shadcn/ui and Recharts only through a documented dependency decision.
- Place primitives in `src/components/ui/`, app shell/navigation in `src/components/{layout,navigation}/`, shared presentational components in `src/components/shared/`, and domain-specific UI inside `src/features/<domain>/components/`.
- Keep `src/app/` route files thin: screens compose feature modules rather than embedding business logic.
- Do not ship placeholder dashboards that present fabricated data.

## 11. Implemented Audit UI (2026-10-20)

Four server-rendered page entries and six components exist under `dpdp-compliance-auditor/`, styled with Tailwind utilities and supporting light/dark backgrounds:

- **`/`** (`app/page.tsx`) — the product home now runs the full website audit: header plus `AuditDashboard` (the `NewAuditForm` and Suspense-streamed audit history). The landing-page inspector was removed.
- **`/audits`** (`app/audits/page.tsx`) — renders the same `AuditDashboard`. Empty and loading states are explicit.
- **`/audits/[id]`** (`app/audits/[id]/page.tsx`) — renders `AuditLive`, which polls `/api/audits/{id}` every 3 seconds while the run is not terminal, then renders `AuditReport`.
- **`/audits/compare`** (`app/audits/compare/page.tsx`) — two run selectors (GET form) and a table of changed test statuses only.
- **Components** (`components/audit/`): `status-badge.tsx` (status and test-status badges, including `requires_credentials`), `new-audit-form.tsx` (client form with authorized checkbox; screenshots on by default; no page/depth inputs; states the 5-minute crawl limit and sign-in behaviour), `credentials-prompt.tsx` (username/password form with `blocked` and `optional` variants for a detected login wall or surface), `audit-dashboard.tsx` (shared home/history dashboard), `audit-report.tsx` (outcome banner, summary, findings, all tests, limitations, large `robots.txt`/`sitemap.xml` discovery cards), `export-menu.tsx` (single `Export ▾` dropdown for JSON/CSV/PDF, built on native `<details>` so it renders without client JS), `audit-live.tsx` (client polling wrapper, stops on `requires_credentials`), `screenshot-gallery.tsx` (server-safe screenshot figures).
- **Report outcome:** `audit-report.tsx` renders a plain-language readiness banner from `deriveAuditOutcome()` (lib/audit/summary.ts) at the top of every completed run: "Needs work" when any check failed, "Review warnings" when only warnings remain, "Inconclusive" when checks need review or could not be assessed, and "No failing checks" when everything passed or was not applicable. The banner states explicitly that there is no single pass/fail certificate and that it covers automated checks only — no numeric compliance score is shown. Each finding shows its own remediation and verification text (authored per test in `lib/audit/registry.ts`), and the missing-screenshot message states the actual reason (not enabled, browser could not render, no page was fetched, or no matching element).
- **Findings consolidation and claim labels:** related checks are shown as one consolidated finding (`lib/audit/presentation.ts`, `lib/audit/groups.ts`) with a worst-case status and severity, while the "All test results" table still lists every test. Every finding carries a claim-type badge — "Verified legal requirement", "Regulatory readiness", "Potential privacy gap", or "Technical recommendation" — with a legend in the banner explaining that "Regulatory readiness" covers provisions not yet in force and controls not verifiable from outside.
- **Coverage measures:** the report replaces the single "evidence coverage %" with four independent tiles — Page crawl, Site discovery, Test execution, Evidence sufficiency — and states that none is a compliance score.
- **Legal mapping:** each provision shows its own effective date and commencement group (e.g. Section 6(9) `2026-11-13`, main notice/consent provisions `2027-05-13`) with a caveat that dates derive from the 2025-11-13 Gazette.
- **Crawl budget and slowness:** the form and report state the fixed 5-minute budget; there are no page/depth controls. When the budget stops a crawl, the report shows the time-limit limitation (site may be large or slow to load) and marks the run `partial` or `failed`; browser checks skipped for time are named in the limitations.
- **Sign-in prompt:** a `requires_credentials` run shows the amber "Sign-in required to continue" state with the detected login URL and a username/password form. When the start page is public but the crawl reaches a login page, the report shows the optional "Sign-in area detected — optional authenticated run" variant instead, so an operator can choose to audit the signed-in experience. The copy states that only single-step username/password is supported, that MFA/CAPTCHA/SSO is not bypassed, and that credential values are not stored with the report. Submitting routes to the new authenticated run; a completed authenticated run is labelled as such.
- **Discovery notices:** the report renders `robots.txt` and `sitemap.xml` as two large, labelled cards (value at 2xl font) with a plain-language note. "Found (HTTP 200)", "Not found (HTTP 404)", and error states each use a distinct tone so an operator cannot miss that crawl coverage relied on followed links.
- **Run log:** queued/running audits show a live "Run log" card (`components/audit/audit-progress.tsx`) with attempted/fetched/failed/queued tiles, the latest step as the page headline, and a newest-first coloured event list; finished and `requires_credentials` reports expose the same log, collapsed or open respectively. Sign-in diagnostics appear as a separate collapsible section.
- **Visual evidence:** each finding and review item can display a screenshot of the page and the element it concerns (consent interface, privacy/cookie/terms link, contact/grievance link, form, or primary heading), with a run-level gallery and per-page browser snapshots. Images load from `/api/audits/{id}/screenshots/{name}`; when no screenshot exists the block is omitted so missing evidence is never implied.

Design rules followed: statuses use a neutral badge vocabulary rather than pass/fail colors alone; findings and limitations are always shown together; the UI never displays a compliance score; `NOT_ASSESSED` is neutral; screenshots are presented as supporting evidence, not as proof of compliance. The pages intentionally do not use the planned `src/` layout yet (see DEC-008 / T-125).

## 12. Related Documents

- [FEATURES.md](./FEATURES.md) — what screens support which features.
- [FLOW.md](./FLOW.md) — user journeys behind these screens.
- [PRD.md](./PRD.md) — product requirements.
- [SECURITY.md](./SECURITY.md) — data display and redaction requirements.
