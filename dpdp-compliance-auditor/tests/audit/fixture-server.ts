import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface FixtureRoute {
  status?: number;
  headers?: Record<string, string>;
  body: string;
  contentType?: string;
}

export type FixtureSite = Record<string, FixtureRoute>;

export interface RunningFixture {
  url: string;
  close: () => Promise<void>;
}

export async function startFixtureServer(site: FixtureSite): Promise<RunningFixture> {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const route = site[path];
    if (!route) {
      response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      response.end("<!doctype html><html><body><h1>Not found</h1></body></html>");
      return;
    }
    response.writeHead(route.status ?? 200, {
      "content-type": route.contentType ?? "text/html; charset=utf-8",
      ...(route.headers ?? {}),
    });
    response.end(route.body);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
