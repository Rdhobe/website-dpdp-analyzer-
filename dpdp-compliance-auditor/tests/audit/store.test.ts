import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auditDataDir, getAudit, listAudits, saveAudit } from "@/lib/audit/store";
import type { AuditRun } from "@/lib/audit/types";
import { missingNoticeSite } from "./fixtures";
import { runLocalAudit, withFixture } from "./helpers";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "dpdp-store-"));
  process.env.AUDIT_DATA_DIR = directory;
});

afterEach(async () => {
  delete process.env.AUDIT_DATA_DIR;
  await rm(directory, { recursive: true, force: true });
});

async function sampleRun(): Promise<AuditRun> {
  return withFixture(missingNoticeSite(), async (fixture) => runLocalAudit(fixture));
}

describe("file-backed audit store", () => {
  it("uses the configured data directory", () => {
    expect(auditDataDir()).toBe(directory);
  });

  it("persists, retrieves and lists a run", async () => {
    const run = await sampleRun();
    await saveAudit(run);

    const loaded = await getAudit(run.id);
    expect(loaded?.id).toBe(run.id);
    expect(loaded?.tests.length).toBe(run.tests.length);

    const list = await listAudits();
    expect(list.map((item) => item.id)).toContain(run.id);
    expect(list[0]?.targetUrl).toBe(run.targetUrl);
  });

  it("serializes concurrent saves for the same audit", async () => {
    const run = await sampleRun();

    await Promise.all([
      saveAudit({ ...run, limitations: ["first save"] }),
      saveAudit({ ...run, limitations: ["second save"] }),
    ]);

    const loaded = await getAudit(run.id);
    expect(loaded?.limitations).toEqual(["second save"]);
  });

  it("returns null for an unknown identifier and rejects unsafe identifiers", async () => {
    expect(await getAudit("audit_missing")).toBeNull();
    await expect(getAudit("../escape")).rejects.toThrow(/Invalid audit identifier/);
  });

  it("returns an empty list when the directory does not exist", async () => {
    await rm(directory, { recursive: true, force: true });
    expect(await listAudits()).toEqual([]);
  });
});
