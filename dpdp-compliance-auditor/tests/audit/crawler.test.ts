import { describe, expect, it } from "vitest";
import { completeSite } from "./fixtures";
import { runLocalAudit, withFixture } from "./helpers";

describe("bounded crawler", () => {
  it("crawls a same-origin site, discovers policies, parses forms and records resources", async () => {
    const run = await withFixture(completeSite(), (fixture) =>
      runLocalAudit(fixture),
    );

    const home = run.pages[0];
    expect(home?.ok).toBe(true);
    expect(run.pages.length).toBeGreaterThanOrEqual(4);

    const privacy = run.pages.find((page) => page.finalUrl.endsWith("/privacy"));
    expect(privacy?.signals.noticeWordCount).toBeGreaterThanOrEqual(150);
    expect(privacy?.signals.hasPrivacyNoticeLanguage).toBe(true);

    expect(home?.forms.length).toBeGreaterThanOrEqual(1);
    const field = home?.forms[0]?.fields[0];
    expect(field?.redacted).toBe(true);

    expect(home?.thirdPartyHosts).toContain("www.googletagmanager.com");
    expect(home?.setCookieNames).toContain("sessionid");
    expect(privacy?.textExcerpt).not.toContain("privacy@example.test");
    expect(privacy?.textExcerpt).toContain("[EMAIL_REDACTED]");

    expect(run.robots?.status).toBe(200);
    expect(run.sitemap?.status).toBe(200);
    expect(run.crawlStats?.pagesFailed).toBe(0);
    expect(run.status).toBe("completed");
  });

  it("keeps failed page attempts out of the success count and marks the run partial", async () => {
    const run = await withFixture(
      {
        "/": {
          body: '<!doctype html><html><body><h1>Home</h1><a href="/broken">Broken</a></body></html>',
        },
        "/broken": { status: 500, body: "<!doctype html><html><body><h1>Error</h1></body></html>" },
      },
      (fixture) => runLocalAudit(fixture),
    );

    expect(run.status).toBe("partial");
    expect(run.crawlStats?.pagesFailed).toBeGreaterThanOrEqual(1);
    expect(run.pages.some((page) => !page.ok)).toBe(true);
  });

  it("never fetches external origins", async () => {
    const run = await withFixture(
      {
        "/": {
          body: '<!doctype html><html><body><h1>Home</h1><a href="https://external.invalid/secret">External</a></body></html>',
        },
      },
      (fixture) => runLocalAudit(fixture),
    );

    expect(run.pages.every((page) => page.finalUrl.startsWith("http://127.0.0.1"))).toBe(true);
    expect(run.crawlStats?.outOfScopeSkipped).toBeGreaterThanOrEqual(1);
  });

  it("follows a same-site redirect to the canonical page", async () => {
    const run = await withFixture(
      {
        "/": { status: 301, headers: { location: "/home" }, body: "" },
        "/home": { body: '<!doctype html><html><body><h1>Home</h1></body></html>' },
      },
      (fixture) => runLocalAudit(fixture),
    );

    expect(run.pages[0]?.ok).toBe(true);
    expect(run.pages[0]?.finalUrl.endsWith("/home")).toBe(true);
  });

  it("refuses a redirect that leaves the site", async () => {
    const run = await withFixture(
      {
        "/": { status: 302, headers: { location: "http://127.0.0.1:9/elsewhere" }, body: "" },
      },
      (fixture) => runLocalAudit(fixture),
    );

    expect(run.pages[0]?.ok).toBe(false);
    expect(run.crawlStats?.blockedTargets).toBeGreaterThanOrEqual(1);
  });

  it("stops when the run time budget is exhausted and reports the limit", async () => {
    const run = await withFixture(completeSite(), (fixture) =>
      runLocalAudit(fixture, { timeBudgetMs: 1 }),
    );

    expect(run.status).toBe("failed");
    expect(run.errors.join(" ")).toMatch(/time limit/i);
  });
});
