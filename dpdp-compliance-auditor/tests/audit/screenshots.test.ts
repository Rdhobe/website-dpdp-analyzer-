import { describe, expect, it } from "vitest";
import {
  attachFindingScreenshots,
  isSafeScreenshotName,
  resolveScreenshotPath,
} from "@/lib/audit/screenshots";
import type { CategoryCode, ScreenshotRef, TestResult, VisualEvidence } from "@/lib/audit/types";

function screenshot(overrides: Partial<ScreenshotRef> = {}): ScreenshotRef {
  return {
    name: "00-full.png",
    kind: "full-page",
    label: "Full page",
    pageUrl: "https://example.test/",
    selector: null,
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

function testResult(category: CategoryCode, overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: "finding_x",
    testId: "X-001",
    title: "Example test",
    category,
    categoryName: "Example",
    status: "FAIL",
    severity: "medium",
    confidence: "medium",
    claimType: "potential_privacy_gap",
    affectedUrls: ["https://example.test/"],
    evidence: [],
    screenshots: [],
    legalReferences: [],
    reasoning: "reason",
    remediation: "fix",
    verificationSteps: "verify",
    humanReviewRequired: false,
    timestamp: new Date().toISOString(),
    testVersion: "1.0.0",
    knownLimitations: "none",
    ...overrides,
  };
}

describe("screenshot name safety", () => {
  it("accepts generated file names", () => {
    expect(isSafeScreenshotName("00-full.png")).toBe(true);
    expect(isSafeScreenshotName("audit_abc-01-form.png")).toBe(true);
  });

  it("rejects traversal, separators, and non-png names", () => {
    expect(isSafeScreenshotName("../secret.png")).toBe(false);
    expect(isSafeScreenshotName("a..b.png")).toBe(false);
    expect(isSafeScreenshotName("sub/dir.png")).toBe(false);
    expect(isSafeScreenshotName("sub\\dir.png")).toBe(false);
    expect(isSafeScreenshotName(".hidden.png")).toBe(false);
    expect(isSafeScreenshotName("shot.jpg")).toBe(false);
  });
});

describe("resolveScreenshotPath", () => {
  it("resolves a safe name inside the audit directory", () => {
    const path = resolveScreenshotPath("audit_123", "00-full.png");
    expect(path).toBeTruthy();
    expect(path).toContain("audit_123");
    expect(path?.endsWith(".png")).toBe(true);
  });

  it("returns null for unsafe ids or names", () => {
    expect(resolveScreenshotPath("audit_123", "../x.png")).toBeNull();
    expect(resolveScreenshotPath("../etc", "00-full.png")).toBeNull();
  });
});

describe("attachFindingScreenshots", () => {
  it("attaches a category element screenshot plus the full page", () => {
    const visual: VisualEvidence = {
      available: true,
      limitations: [],
      screenshots: [
        screenshot(),
        screenshot({
          name: "00-form.png",
          kind: "element",
          label: "Data collection form",
          selector: "form",
        }),
      ],
    };

    const [result] = attachFindingScreenshots([testResult("D")], visual);
    const names = result.screenshots.map((shot) => shot.name);
    expect(names).toContain("00-form.png");
    expect(names).toContain("00-full.png");
  });

  it("falls back to the first full-page screenshot when the affected URL was not captured", () => {
    const visual: VisualEvidence = {
      available: true,
      limitations: [],
      screenshots: [screenshot({ pageUrl: "https://other.test/page" })],
    };

    const [result] = attachFindingScreenshots(
      [testResult("B", { affectedUrls: ["https://example.test/missing"] })],
      visual,
    );
    expect(result.screenshots).toHaveLength(1);
    expect(result.screenshots[0].kind).toBe("full-page");
  });

  it("returns tests unchanged when no visual evidence exists", () => {
    const tests = [testResult("A")];
    expect(attachFindingScreenshots(tests, null)).toBe(tests);
  });
});
