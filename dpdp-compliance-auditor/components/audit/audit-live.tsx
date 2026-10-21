"use client";

import { useEffect, useState } from "react";
import type { AuditRun } from "@/lib/audit/types";
import AuditReport from "./audit-report";

const TERMINAL = new Set(["completed", "failed", "partial", "requires_credentials"]);

export default function AuditLive({ initialRun }: { initialRun: AuditRun }) {
  const [run, setRun] = useState(initialRun);

  useEffect(() => {
    if (TERMINAL.has(run.status)) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/audits/${run.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as AuditRun;
        if (!cancelled) setRun(next);
      } catch {
        // Keep the last known state; the next poll may succeed.
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [run.id, run.status]);

  return <AuditReport run={run} />;
}
