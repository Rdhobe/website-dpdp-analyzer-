import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildFindingGroups } from "./groups";
import { findLoginSurfaces } from "./login-wall";
import { TEST_REGISTRY } from "./registry";
import { ENGINE_TIME_BUDGET_MS } from "./runner";
import { computeSummary } from "./summary";
import type {
  AuditAuthState,
  AuditConfig,
  AuditListItem,
  AuditRun,
  TestResult,
} from "./types";

const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const pendingWrites = new Map<string, Promise<void>>();

const CLAIM_TYPE_BY_TEST = new Map(
  TEST_REGISTRY.map((test) => [test.id, test.claimType] as const),
);

function normalizeConfig(config: AuditConfig | undefined): AuditConfig | undefined {
  if (!config) return config;
  if (typeof config.timeBudgetMs === "number") return config;
  return { ...config, timeBudgetMs: ENGINE_TIME_BUDGET_MS };
}

function normalizeRun(run: AuditRun): AuditRun {
  let changed = false;
  const tests: TestResult[] = run.tests.map((test) => {
    if (test.claimType) return test;
    changed = true;
    return {
      ...test,
      claimType: CLAIM_TYPE_BY_TEST.get(test.testId) ?? "potential_privacy_gap",
    };
  });
  let summary = run.summary;
  if (summary && !summary.coverage && run.crawlStats) {
    changed = true;
    summary = computeSummary(tests, run.crawlStats, {
      robots: run.robots,
      sitemap: run.sitemap,
    });
  }
  const findingGroups = run.findingGroups;
  if (!findingGroups) changed = true;
  if (run.progress === undefined) changed = true;
  const config = normalizeConfig(run.config);
  if (config !== run.config) changed = true;

  const surfaces = findLoginSurfaces(run.pages);
  let auth: AuditAuthState | null = run.auth ?? null;
  if (!auth) {
    if (surfaces.loginSurfaceDetected) {
      auth = {
        loginWallDetected: false,
        loginSurfaceDetected: true,
        loginUrl: surfaces.loginUrls[0] ?? null,
        authenticated: false,
        failureReason: null,
      };
      changed = true;
    } else if (run.auth === undefined) {
      changed = true;
    }
  } else if (typeof auth.loginSurfaceDetected !== "boolean") {
    auth = {
      ...auth,
      loginSurfaceDetected: auth.loginWallDetected || surfaces.loginSurfaceDetected,
      loginUrl: auth.loginUrl ?? surfaces.loginUrls[0] ?? null,
    };
    changed = true;
  }

  if (!changed) return run;
  return {
    ...run,
    config: config ?? run.config,
    auth,
    tests,
    summary,
    progress: run.progress ?? [],
    findingGroups: findingGroups ?? buildFindingGroups(tests),
  };
}

export function auditDataDir(): string {
  return (
    process.env.AUDIT_DATA_DIR ??
    join(process.cwd(), ".data", "audits")
  );
}

function auditPath(id: string): string {
  if (!SAFE_ID.test(id)) {
    throw new Error("Invalid audit identifier.");
  }
  return join(auditDataDir(), `${id}.json`);
}

export async function ensureAuditDataDir(): Promise<void> {
  await mkdir(auditDataDir(), { recursive: true });
}

export async function saveAudit(run: AuditRun): Promise<AuditRun> {
  const target = auditPath(run.id);
  const previousWrite = pendingWrites.get(run.id) ?? Promise.resolve();
  const write = previousWrite.catch(() => undefined).then(async () => {
    await ensureAuditDataDir();
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(run, null, 2), "utf8");
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  });
  pendingWrites.set(run.id, write);
  try {
    await write;
  } finally {
    if (pendingWrites.get(run.id) === write) {
      pendingWrites.delete(run.id);
    }
  }
  return run;
}

export async function getAudit(id: string): Promise<AuditRun | null> {
  try {
    const body = await readFile(auditPath(id), "utf8");
    return normalizeRun(JSON.parse(body) as AuditRun);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export async function listAudits(): Promise<AuditListItem[]> {
  try {
    const directory = auditDataDir();
    const entries = await readdir(
      /* turbopackIgnore: true */ directory,
      { withFileTypes: true },
    );
    const runs = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          try {
            const body = await readFile(
              join(/* turbopackIgnore: true */ directory, entry.name),
              "utf8",
            );
            const run = normalizeRun(JSON.parse(body) as AuditRun);
            const item: AuditListItem = {
              id: run.id,
              status: run.status,
              targetUrl: run.targetUrl,
              createdAt: run.createdAt,
              completedAt: run.completedAt,
              summary: run.summary,
              errorCount: run.errors.length,
            };
            return item;
          } catch {
            return null;
          }
        }),
    );
    return runs
      .filter((item): item is AuditListItem => Boolean(item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}
