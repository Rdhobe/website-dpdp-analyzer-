import Link from "next/link";
import { TestStatusBadge } from "@/components/audit/status-badge";
import { getAudit, listAudits } from "@/lib/audit/store";

export const instant = false;

function difference(a: string, b: string): string {
  if (a === b) return "unchanged";
  return `${a} → ${b}`;
}

export default async function CompareAuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const audits = await listAudits();
  const left = a ? await getAudit(a) : null;
  const right = b ? await getAudit(b) : null;

  const changes =
    left && right
      ? left.tests
          .map((test) => {
            const other = right.tests.find((candidate) => candidate.testId === test.testId);
            return other && other.status !== test.status
              ? { testId: test.testId, title: test.title, from: test.status, to: other.status }
              : null;
          })
          .filter((change): change is NonNullable<typeof change> => Boolean(change))
      : [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12 sm:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Compare audit runs</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Select two completed runs to see test-status changes between them.
            </p>
          </div>
          <Link
            href="/audits"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Audit history
          </Link>
        </header>

        <form className="flex flex-wrap items-end gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Baseline
            <select
              name="a"
              defaultValue={a ?? ""}
              className="h-10 min-w-[280px] rounded-lg border border-zinc-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">Select a run</option>
              {audits.map((audit) => (
                <option key={audit.id} value={audit.id}>
                  {audit.targetUrl} — {audit.id}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Compare with
            <select
              name="b"
              defaultValue={b ?? ""}
              className="h-10 min-w-[280px] rounded-lg border border-zinc-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">Select a run</option>
              {audits.map((audit) => (
                <option key={audit.id} value={audit.id}>
                  {audit.targetUrl} — {audit.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Compare
          </button>
        </form>

        {!left || !right ? (
          <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Select two runs to compare. Only runs present in local audit storage can be
            compared.
          </p>
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">
              {changes.length} changed test result(s)
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {left.id} ({new Date(left.createdAt).toLocaleString()}) vs {right.id} (
              {new Date(right.createdAt).toLocaleString()})
            </p>
            {changes.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                No status changes were detected for the tests present in both runs.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      <th className="py-2 pr-4">Test</th>
                      <th className="py-2 pr-4">Change</th>
                      <th className="py-2">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((change) => (
                      <tr
                        key={change.testId}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">{change.testId}</td>
                        <td className="py-2 pr-4">
                          <span className="flex items-center gap-2">
                            <TestStatusBadge status={change.from} />
                            <span className="text-xs text-zinc-400">→</span>
                            <TestStatusBadge status={change.to} />
                          </span>
                          <span className="sr-only">{difference(change.from, change.to)}</span>
                        </td>
                        <td className="py-2">{change.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
