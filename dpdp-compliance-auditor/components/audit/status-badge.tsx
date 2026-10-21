import type { AuditStatus, TestStatus } from "@/lib/audit/types";

const TEST_STYLES: Record<TestStatus, string> = {
  PASS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  FAIL: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  WARNING: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  NEEDS_REVIEW: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  NOT_ASSESSED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  NOT_APPLICABLE: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

const RUN_STYLES: Record<AuditStatus, string> = {
  queued: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  requires_credentials: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function TestStatusBadge({ status }: { status: TestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TEST_STYLES[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AuditStatusBadge({ status }: { status: AuditStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${RUN_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
