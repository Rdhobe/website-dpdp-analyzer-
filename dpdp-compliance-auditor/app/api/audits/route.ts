import { connection } from "next/server";
import { z } from "zod";
import { createQueuedAudit } from "@/lib/audit/launcher";
import { defaultAuditConfig } from "@/lib/audit/runner";
import { listAudits } from "@/lib/audit/store";
import { UnsafeTargetError } from "@/lib/audit/url";

const auditRequestSchema = z.object({
  url: z.url(),
  authorized: z.literal(true),
  browserEnabled: z.boolean().optional(),
  screenshots: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(): Promise<Response> {
  await connection();
  const audits = await listAudits();
  return Response.json({ audits });
}

export async function POST(request: Request): Promise<Response> {
  await connection();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = auditRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid audit request.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const config = defaultAuditConfig({
    browserEnabled: parsed.data.browserEnabled ?? false,
    screenshots: parsed.data.screenshots ?? false,
    notes: parsed.data.notes ?? null,
  });

  try {
    const run = await createQueuedAudit({ targetUrl: parsed.data.url, config });
    return Response.json(run, { status: 202 });
  } catch (error) {
    if (error instanceof UnsafeTargetError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The audit could not be queued.",
      },
      { status: 500 },
    );
  }
}
