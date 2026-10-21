import { notFound } from "next/navigation";
import AuditLive from "@/components/audit/audit-live";
import { getAudit } from "@/lib/audit/store";

export const instant = false;

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getAudit(id);
  if (!run) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-10">
        <AuditLive initialRun={run} />
      </main>
    </div>
  );
}
