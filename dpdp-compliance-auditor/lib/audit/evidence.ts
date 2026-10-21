import { randomUUID } from "node:crypto";
import type { EvidenceItem } from "./types";

export function createEvidence(
  kind: string,
  pageUrl: string | null,
  summary: string,
  data: unknown,
): EvidenceItem {
  return {
    id: `evidence_${randomUUID()}`,
    kind,
    pageUrl,
    summary,
    data,
  };
}

export function createFindingId(testId: string): string {
  return `finding_${testId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${randomUUID().slice(0, 8)}`;
}
