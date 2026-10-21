import { describe, expect, it } from "vitest";
import { runAudit } from "@/lib/audit/runner";
import {
  brokenPagesSite,
  completeSite,
  consentSite,
  contradictoryNoticeSite,
  jsRenderedSite,
  missingHeadersSite,
  missingNoticeSite,
  noRightsNoticeSite,
  preselectedConsentSite,
  promptInjectionSite,
  rightsRouteSite,
} from "./fixtures";
import { runLocalAudit, statusOf, testConfig, withFixture } from "./helpers";

describe("deterministic rules against synthetic sites", () => {
  it("reports which deterministic test is being evaluated", async () => {
    const messages: string[] = [];
    await withFixture(completeSite(), async (fixture) =>
      runAudit({
        targetUrl: `${fixture.url}/`,
        config: testConfig(),
        allowPrivateNetworks: true,
        onProgress: (event) => messages.push(event.message),
      }),
    );

    expect(messages, messages.join("\n")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Evaluating test 1\/\d+: CRAWL-001 —/),
        expect.stringMatching(/^Completed test 1\/\d+: CRAWL-001 — PASS$/),
      ]),
    );
  });

  it("passes notice, discovery and security-header checks on a complete site", async () => {
    const run = await withFixture(completeSite(), (fixture) => runLocalAudit(fixture));

    expect(statusOf(run, "CRAWL-001")).toBe("PASS");
    expect(statusOf(run, "CRAWL-002")).toBe("PASS");
    expect(statusOf(run, "CRAWL-006")).toBe("PASS");
    expect(statusOf(run, "NOTICE-001")).toBe("PASS");
    expect(statusOf(run, "NOTICE-003")).toBe("PASS");
    expect(statusOf(run, "NOTICE-005")).toBe("PASS");
    expect(statusOf(run, "NOTICE-009")).toBe("PASS");
    expect(statusOf(run, "RIGHTS-001")).toBe("PASS");
    expect(statusOf(run, "SEC-002")).toBe("PASS");
    expect(statusOf(run, "SEC-003")).toBe("PASS");
  });

  it("fails the notice check when no notice exists", async () => {
    const run = await withFixture(missingNoticeSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "NOTICE-001")).toBe("FAIL");
    expect(statusOf(run, "CRAWL-002")).toBe("FAIL");
    expect(statusOf(run, "SEC-001")).toBe("FAIL");
  });

  it("detects a consent banner with accept and reject controls from static text", async () => {
    const run = await withFixture(consentSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "CONSENT-001")).toBe("PASS");
    expect(statusOf(run, "CONSENT-002")).toBe("PASS");
  });

  it("fails preselected optional consent in HTML forms", async () => {
    const run = await withFixture(preselectedConsentSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "CONSENT-004")).toBe("FAIL");
  });

  it("flags contradictory notice statements for review", async () => {
    const run = await withFixture(contradictoryNoticeSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "NOTICE-009")).toBe("WARNING");
  });

  it("warns when rights language is absent and treats JS-only rendering as not assessed", async () => {
    const noRights = await withFixture(noRightsNoticeSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(noRights, "RIGHTS-001")).toBe("WARNING");

    const jsRendered = await withFixture(jsRenderedSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(jsRendered, "CRAWL-007")).toBe("NOT_ASSESSED");
  });

  it("passes the rights mechanism only on a dedicated rights route", async () => {
    const withRights = await withFixture(rightsRouteSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(withRights, "RIGHTS-002")).toBe("PASS");

    const noRights = await withFixture(noRightsNoticeSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(noRights, "RIGHTS-002")).toBe("WARNING");
  });

  it("fails failed pages and marks the run partial", async () => {
    const run = await withFixture(brokenPagesSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "CRAWL-008")).toBe("FAIL");
    expect(run.status).toBe("partial");
  });

  it("warns on missing security headers without treating them as violations", async () => {
    const run = await withFixture(missingHeadersSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "SEC-002")).toBe("WARNING");
    expect(statusOf(run, "SEC-003")).toBe("WARNING");
    expect(statusOf(run, "SEC-005")).toBe("WARNING");
  });

  it("does not let page text manipulate deterministic results", async () => {
    const run = await withFixture(promptInjectionSite(), (fixture) => runLocalAudit(fixture));
    expect(statusOf(run, "NOTICE-001")).toBe("FAIL");
    expect(statusOf(run, "CRAWL-006")).toBe("NOT_APPLICABLE");
    expect(statusOf(run, "CONSENT-004")).toBe("NOT_ASSESSED");
    expect(run.tests.every((test) => test.status !== "PASS" || test.testId !== "NOTICE-001")).toBe(true);
  });
});
