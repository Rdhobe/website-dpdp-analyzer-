import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { LoginCredentials } from "./auth";
import { LEGAL_FRAMEWORK_VERSION } from "./legal";
import { REGISTRY_VERSION } from "./registry";
import { ENGINE_VERSION } from "./runner";
import { saveAudit } from "./store";
import { assertPublicTarget } from "./url";
import type { AuditAuthState, AuditConfig, AuditRun } from "./types";

export function privateTargetsAllowed(): boolean {
  return process.env.AUDIT_ALLOW_PRIVATE_TARGETS === "1";
}

export interface CreateAuditInput {
  targetUrl: string;
  config: AuditConfig;
  auth?: AuditAuthState | null;
  credentials?: LoginCredentials | null;
}

export async function createQueuedAudit(
  input: CreateAuditInput,
): Promise<AuditRun> {
  const target = await assertPublicTarget(input.targetUrl, {
    allowPrivateNetworks: privateTargetsAllowed(),
  });
  const id = `audit_${randomUUID()}`;
  const now = new Date().toISOString();
  const run: AuditRun = {
    id,
    status: "queued",
    targetUrl: target.toString(),
    finalOrigin: null,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    config: input.config,
    engineVersion: ENGINE_VERSION,
    registryVersion: REGISTRY_VERSION,
    legalFrameworkVersion: LEGAL_FRAMEWORK_VERSION,
    pages: [],
    tests: [],
    findings: [],
    auth: input.auth ?? null,
    summary: null,
    crawlStats: null,
    robots: null,
    sitemap: null,
    browser: null,
    visual: null,
    limitations: [
      "Audit queued. A separate worker process performs the crawl and evaluation.",
    ],
    errors: [],
  };

  await saveAudit(run);
  spawnAuditWorker(id, input.credentials ?? null);
  return run;
}

export function spawnAuditWorker(
  runId: string,
  credentials: LoginCredentials | null = null,
): void {
  const tsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const worker = join(process.cwd(), "workers", "audit-worker.ts");
  const child = spawn(process.execPath, [tsxCli, worker, runId], {
    cwd: process.cwd(),
    detached: false,
    windowsHide: true,
    stdio: ["pipe", "ignore", "ignore"],
    env: process.env,
  });
  if (credentials) {
    child.stdin?.end(JSON.stringify(credentials), "utf8");
  } else {
    child.stdin?.end();
  }
}
