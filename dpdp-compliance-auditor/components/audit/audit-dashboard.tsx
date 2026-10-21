import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import NewAuditForm from "./new-audit-form";
import { AuditStatusBadge } from "./status-badge";
import { listAudits } from "@/lib/audit/store";

async function AuditHistory() {
  await connection();
  const audits = await listAudits();

  if (audits.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-800">
          Audit history
        </h2>
        <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
          No audits have been queued yet. Enter an authorized website above to start one.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-800">
        Audit history
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-6 py-3">Target</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Pass</th>
              <th className="px-3 py-3">Fail</th>
              <th className="px-3 py-3">Warning</th>
              <th className="px-3 py-3">Needs review</th>
              <th className="px-3 py-3">Not assessed</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {audits.map((audit) => (
              <tr
                key={audit.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="max-w-[280px] truncate px-6 py-3 font-mono text-xs">
                  {audit.targetUrl}
                </td>
                <td className="px-3 py-3">
                  <AuditStatusBadge status={audit.status} />
                </td>
                <td className="px-3 py-3 tabular-nums">{audit.summary?.pass ?? "—"}</td>
                <td className="px-3 py-3 tabular-nums">{audit.summary?.fail ?? "—"}</td>
                <td className="px-3 py-3 tabular-nums">{audit.summary?.warning ?? "—"}</td>
                <td className="px-3 py-3 tabular-nums">
                  {audit.summary?.needsReview ?? "—"}
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {audit.summary?.notAssessed ?? "—"}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(audit.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    href={`/audits/${audit.id}`}
                    className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditHistoryFallback() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-800">
        Audit history
      </h2>
      <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading audits…</p>
    </section>
  );
}

export default function AuditDashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              Evidence-based audit engine
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Run a full website audit
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Crawl an authorized origin, collect evidence, run the versioned
              deterministic test registry, and review findings mapped to verified DPDP
              provisions. Long crawls run in a separate worker process.
            </p>
          </div>
          <Link
            href="/audits/compare"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Compare runs
          </Link>
        </header>

        <NewAuditForm />

        <Suspense fallback={<AuditHistoryFallback />}>
          <AuditHistory />
        </Suspense>
      </main>
    </div>
  );
}
