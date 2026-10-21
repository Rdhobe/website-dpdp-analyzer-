import { connection } from "next/server";
import { getAudit } from "@/lib/audit/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  await connection();
  const { id } = await context.params;
  const run = await getAudit(id);
  if (!run) {
    return Response.json({ error: "Audit not found." }, { status: 404 });
  }
  return Response.json(run, {
    headers: { "cache-control": "no-store" },
  });
}
