import { connection } from "next/server";
import {
  toCsvExport,
  toJsonExport,
  toPdfExport,
} from "@/lib/audit/export";
import { getAudit } from "@/lib/audit/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  await connection();
  const { id } = await context.params;
  const run = await getAudit(id);
  if (!run) {
    return Response.json({ error: "Audit not found." }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const baseName = `dpdp-audit-${run.id}`;

  if (format === "csv") {
    return new Response(toCsvExport(run), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${baseName}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  if (format === "pdf") {
    const pdf = await toPdfExport(run);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${baseName}.pdf"`,
        "cache-control": "no-store",
      },
    });
  }

  if (format !== "json") {
    return Response.json(
      { error: "Unsupported export format. Use json, csv, or pdf." },
      { status: 400 },
    );
  }

  return new Response(toJsonExport(run), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${baseName}.json"`,
      "cache-control": "no-store",
    },
  });
}
