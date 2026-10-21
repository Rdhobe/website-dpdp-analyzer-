import { connection } from "next/server";
import { z } from "zod";
import { createQueuedAudit } from "@/lib/audit/launcher";
import { getAudit } from "@/lib/audit/store";
import { UnsafeTargetError } from "@/lib/audit/url";

const credentialsSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(500),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  await connection();
  const { id } = await context.params;
  const run = await getAudit(id);
  if (!run) {
    return Response.json({ error: "Audit not found." }, { status: 404 });
  }

  const loginDetected =
    run.auth?.loginWallDetected === true || run.auth?.loginSurfaceDetected === true;
  const busy = run.status === "queued" || run.status === "running";
  if (!loginDetected || busy) {
    return Response.json(
      { error: "This audit is not ready to accept sign-in credentials." },
      { status: 409 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid credentials request.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const next = await createQueuedAudit({
      targetUrl: run.targetUrl,
      config: run.config,
      auth: {
        loginWallDetected: run.auth?.loginWallDetected === true,
        loginSurfaceDetected: true,
        loginUrl: run.auth?.loginUrl ?? null,
        authenticated: false,
        failureReason: null,
      },
      credentials: {
        username: parsed.data.username,
        password: parsed.data.password,
      },
    });
    return Response.json({ id: next.id, status: next.status }, { status: 202 });
  } catch (error) {
    if (error instanceof UnsafeTargetError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The authenticated audit could not be queued.",
      },
      { status: 500 },
    );
  }
}
