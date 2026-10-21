import { readFile } from "node:fs/promises";
import { connection } from "next/server";
import { resolveScreenshotPath } from "@/lib/audit/screenshots";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; name: string }> },
): Promise<Response> {
  await connection();
  const { id, name } = await context.params;
  const path = resolveScreenshotPath(id, name);
  if (!path) {
    return new Response("Not found.", { status: 404 });
  }

  try {
    const image = await readFile(/* turbopackIgnore: true */ path);
    return new Response(new Uint8Array(image), {
      headers: {
        "content-type": "image/png",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found.", { status: 404 });
  }
}
