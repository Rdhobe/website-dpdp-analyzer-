import type { AuditProgressEntry, AuditRun } from "@/lib/audit/types";

const LEVEL_STYLES: Record<AuditProgressEntry["level"], string> = {
  info: "bg-zinc-400 dark:bg-zinc-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
};

const LEVEL_TEXT: Record<AuditProgressEntry["level"], string> = {
  info: "text-zinc-700 dark:text-zinc-200",
  success: "text-emerald-800 dark:text-emerald-200",
  warning: "text-amber-800 dark:text-amber-200",
  error: "text-rose-800 dark:text-rose-200",
};

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString();
}

export default function AuditProgress({
  run,
  open = false,
}: {
  run: AuditRun;
  open?: boolean;
}) {
  const entries = run.progress ?? [];
  const stats = [...entries].reverse().find((entry) => typeof entry.attempted === "number");
  const running = run.status === "queued" || run.status === "running";

  return (
    <details
      open={open}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        <span>Run log</span>
        {running ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            Live
          </span>
        ) : (
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            Finished
          </span>
        )}
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {entries.length} event(s)
        </span>
      </summary>

      {stats ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Attempted", stats.attempted ?? 0],
            ["Fetched", stats.succeeded ?? 0],
            ["Failed", stats.failed ?? 0],
            ["Queued", stats.pending ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No progress events yet. The worker writes one entry as it starts and then for each page.
        </p>
      ) : (
        <ol className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {[...entries].reverse().map((entry, index) => (
            <li
              key={`${entry.at}-${index}`}
              className="flex items-start gap-3 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_STYLES[entry.level]}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm break-words ${LEVEL_TEXT[entry.level]}`}>
                  {entry.message}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatTime(entry.at)}
                  {typeof entry.attempted === "number"
                    ? ` · ${entry.attempted} attempted · ${entry.succeeded ?? 0} fetched · ${entry.failed ?? 0} failed · ${entry.pending ?? 0} queued`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
