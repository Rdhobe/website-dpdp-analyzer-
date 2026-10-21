import type { LoginCredentials } from "../lib/audit/auth";
import { runAudit } from "../lib/audit/runner";
import { getAudit, saveAudit } from "../lib/audit/store";
import type { AuditProgressEntry, AuditProgressEvent } from "../lib/audit/types";

const MAX_PROGRESS_ENTRIES = 400;
const PROGRESS_SAVE_INTERVAL_MS = 750;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseCredentials(body: string): LoginCredentials | null {
  if (!body.trim()) return null;
  try {
    const parsed = JSON.parse(body) as Partial<LoginCredentials>;
    if (
      typeof parsed.username === "string" &&
      typeof parsed.password === "string" &&
      parsed.username.length > 0 &&
      parsed.password.length > 0
    ) {
      return { username: parsed.username, password: parsed.password };
    }
    return null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const runId = process.argv[2];
  if (!runId) {
    process.stderr.write("Usage: audit-worker <runId>\n");
    process.exitCode = 1;
    return;
  }

  const queued = await getAudit(runId);
  if (!queued) {
    process.stderr.write(`Audit ${runId} was not found.\n`);
    process.exitCode = 1;
    return;
  }

  const stdin = await readStdin();
  const credentials = parseCredentials(stdin);

  if (stdin.trim() && !credentials) {
    const completedAt = new Date().toISOString();
    await saveAudit({
      ...queued,
      status: "failed",
      startedAt: completedAt,
      completedAt,
      auth: {
        loginWallDetected: true,
        loginSurfaceDetected: true,
        loginUrl: queued.auth?.loginUrl ?? null,
        authenticated: false,
        failureReason:
          "The supplied sign-in credentials could not be read and were discarded.",
      },
      errors: [
        ...queued.errors,
        "The sign-in credentials could not be read and were discarded before use.",
      ],
      limitations: [
        "The audit did not run because the sign-in credentials were unavailable. Do not draw compliance conclusions from this run.",
      ],
    });
    return;
  }

  const startedAt = new Date().toISOString();
  const initialEntries: AuditProgressEntry[] = [
    ...(queued.progress ?? []),
    {
      at: startedAt,
      level: "info",
      message: credentials
        ? "Worker started. Signing in before crawling."
        : "Worker started. Crawling without credentials.",
    },
  ];
  const progress: AuditProgressEntry[] = initialEntries;
  const snapshot = (): AuditProgressEntry[] => progress.slice(-MAX_PROGRESS_ENTRIES);
  let lastSaved = Date.now();
  let pendingSave: ReturnType<typeof setTimeout> | null = null;
  await saveAudit({
    ...queued,
    status: "running",
    startedAt,
    completedAt: null,
    errors: [],
    progress: snapshot(),
    limitations: ["Audit is running in a separate worker process."],
  });

  const flush = async (status: "queued" | "running") => {
    const current = await getAudit(runId);
    if (!current) return;
    if (current.status !== "queued" && current.status !== "running") return;
    lastSaved = Date.now();
    await saveAudit({ ...current, status, progress: snapshot() });
  };

  const recordEvent = (event: AuditProgressEvent) => {
    progress.push({
      at: new Date().toISOString(),
      level: event.level ?? "info",
      message: event.message,
      url: event.url,
      attempted: event.attempted,
      succeeded: event.succeeded,
      failed: event.failed,
      pending: event.pending,
    });
    if (progress.length > MAX_PROGRESS_ENTRIES) {
      progress.splice(0, progress.length - MAX_PROGRESS_ENTRIES);
    }
    if (Date.now() - lastSaved >= PROGRESS_SAVE_INTERVAL_MS) {
      void flush("running");
    } else if (!pendingSave) {
      pendingSave = setTimeout(() => {
        pendingSave = null;
        void flush("running");
      }, PROGRESS_SAVE_INTERVAL_MS);
    }
  };

  try {
    const result = await runAudit({
      runId,
      targetUrl: queued.targetUrl,
      config: queued.config,
      allowPrivateNetworks: process.env.AUDIT_ALLOW_PRIVATE_TARGETS === "1",
      credentials: credentials ?? undefined,
      onProgress: recordEvent,
    });
    await saveAudit({ ...result, progress: snapshot() });
  } catch (error) {
    const completedAt = new Date().toISOString();
    recordEvent({
      message: `Worker failure: ${error instanceof Error ? error.message : "unexpected error"}`,
      level: "error",
    });
    await saveAudit({
      ...queued,
      status: "failed",
      startedAt,
      completedAt,
      progress: snapshot(),
      errors: [
        ...queued.errors,
        error instanceof Error ? error.message : "The audit worker failed.",
      ],
      limitations: [
        "The audit worker failed before producing a complete result. Do not draw compliance conclusions from this run.",
      ],
    });
    process.stderr.write(
      `[${runId}] ${error instanceof Error ? error.message : "worker failure"}\n`,
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(
    `Unexpected worker failure: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exitCode = 1;
});
