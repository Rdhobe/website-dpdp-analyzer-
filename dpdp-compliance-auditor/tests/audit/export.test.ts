import { describe, expect, it } from "vitest";
import { toCsvExport, toJsonExport, toPdfExport } from "@/lib/audit/export";
import { missingNoticeSite } from "./fixtures";
import { runLocalAudit, withFixture } from "./helpers";

describe("audit exports", () => {
  it("produces valid JSON, CSV and PDF artifacts", async () => {
    const run = await withFixture(missingNoticeSite(), (fixture) => runLocalAudit(fixture));

    const json = toJsonExport(run);
    expect(JSON.parse(json).id).toBe(run.id);

    const csv = toCsvExport(run);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "testId,category,title,status,severity,confidence,claimType,humanReviewRequired,affectedUrls,reasoning,remediation,verificationSteps,screenshots,legalReferences,evidence,knownLimitations",
    );
    expect(lines.length).toBe(run.tests.length + 1);
    expect(csv).toContain("NOTICE-001");
    expect(csv).toContain("Regulatory readiness");

    const pdf = await toPdfExport(run);
    expect(pdf.length).toBeGreaterThan(1_000);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
