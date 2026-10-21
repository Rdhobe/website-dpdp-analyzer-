const FORMATS = [
  { id: "json", label: "JSON", hint: "Full structured run" },
  { id: "csv", label: "CSV", hint: "Findings spreadsheets" },
  { id: "pdf", label: "PDF", hint: "Shareable report" },
] as const;

export default function ExportMenu({ runId }: { runId: string }) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
        Export
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {FORMATS.map((format) => (
          <a
            key={format.id}
            href={`/api/audits/${runId}/export?format=${format.id}`}
            className="flex flex-col px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
              {format.label}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{format.hint}</span>
          </a>
        ))}
      </div>
    </details>
  );
}
