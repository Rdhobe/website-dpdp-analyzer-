# DPDP Compliance Auditor — Frontend

Next.js 16 (App Router) frontend for the DPDP Website Compliance Auditor, built around the **TypeScript audit engine**: a self-contained server-side crawl/evidence/rules pipeline with a dashboard, run detail, comparison, and exports.

The landing-page inspector has been removed. The home page (`/`) now runs the full website audit; `/audits` serves the same dashboard.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The audit dashboard and run form are on the home page; `/audits` also serves it, and run detail/compare live under `/audits/[id]` and `/audits/compare`.

Each run report opens with a plain-language readiness outcome ("Needs work", "Review warnings", "Inconclusive", or "No failing checks") so you can tell at a glance how the site did. It is a readiness signal, not a pass/fail certificate. JSON/CSV/PDF downloads live behind a single `Export ▾` dropdown.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest audit-engine suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run worker -- <runId>` | Run the audit worker for a queued run |
| `npm run prisma:generate` | Generate the Prisma client (schema present; adapter not wired) |

## Audit engine layout

- `lib/audit/` — core: `types`, `url`, `redact`, `evidence`, `trackers`, `text`, `crawler`, `browser`, `screenshots`, `legal`, `registry`, `rules/`, `runner`, `summary`, `store`, `launcher`, `export`.
- `workers/audit-worker.ts` — detached process that executes a queued run.
- `app/api/audits/` — queue/list/get/export route handlers, plus screenshot serving at `/api/audits/[id]/screenshots/[name]`.
- `app/audits/` — dashboard, detail, and compare pages. `components/audit/` — UI components (including `screenshot-gallery.tsx`).
- `tests/audit/` — Vitest suite with synthetic fixture sites.
- `prisma/schema.prisma` — PostgreSQL schema (defined, not wired).

Runs execute outside the request/response cycle: `POST /api/audits` records a queued run and spawns the worker. Persistence defaults to `.data/audits` (`AUDIT_DATA_DIR`). See the workspace `brain/` docs for architecture, security, and legal posture.

## Screenshots

With screenshot capture enabled (default in the form), the worker uses Playwright to store a full-page screenshot and element crops (consent interface, privacy/cookie/terms links, contact/grievance link, forms, primary heading) under `.data/audits/<runId>/screenshots/`. Findings, browser snapshots, and the run gallery render them from `/api/audits/{id}/screenshots/{name}`; PDF exports embed up to two per finding and CSV adds a `screenshots` column. Install browser binaries first:

```bash
npx playwright install chromium
```

If browsers are unavailable, capture is skipped and the run records a limitation instead of failing.

## Environment

Copy `.env.example` to `.env.local` and set values as needed. Notable variables: `AUDIT_DATA_DIR`, `AUDIT_ALLOW_PRIVATE_TARGETS`, `AUDIT_STORE`, `DATABASE_URL`.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
