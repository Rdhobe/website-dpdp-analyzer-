import { describe, expect, it } from "vitest";
import { ALL_RULES } from "@/lib/audit/rules";
import { REGISTRY_VERSION, TEST_REGISTRY } from "@/lib/audit/registry";
import { CATEGORIES, CLAIM_TYPES } from "@/lib/audit/types";

describe("test registry", () => {
  it("declares a stable registry version", () => {
    expect(REGISTRY_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  });

  it("contains the expected number of tests with unique identifiers", () => {
    expect(TEST_REGISTRY.length).toBe(75);
    const ids = TEST_REGISTRY.map((test) => test.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("populates every required definition field", () => {
    for (const test of TEST_REGISTRY) {
      expect(test.id, test.id).toMatch(/^[A-Z]+-\d{3}$/);
      expect(test.name.length, test.id).toBeGreaterThan(3);
      expect(test.category in CATEGORIES, test.id).toBe(true);
      expect(test.description.length, test.id).toBeGreaterThan(10);
      expect(test.preconditions.length, test.id).toBeGreaterThan(0);
      expect(test.evidenceRequired.length, test.id).toBeGreaterThan(0);
      expect(test.executionMethod.length, test.id).toBeGreaterThan(5);
      expect(test.applicability.length, test.id).toBeGreaterThan(5);
      expect(test.remediationTemplate.length, test.id).toBeGreaterThan(5);
      expect(test.verificationProcedure.length, test.id).toBeGreaterThan(5);
      expect(test.limitations.length, test.id).toBeGreaterThan(5);
      expect(test.version).toBe("1.0.0");
      expect(typeof test.automated).toBe("boolean");
    }
  });

  it("registers a deterministic evaluator for every test definition", () => {
    for (const test of TEST_REGISTRY) {
      expect(typeof ALL_RULES[test.id], test.id).toBe("function");
    }
  });

  it("covers all ten categories", () => {
    const categories = new Set(TEST_REGISTRY.map((test) => test.category));
    expect([...categories].sort()).toEqual(Object.keys(CATEGORIES).sort());
  });

  it("includes the supplementary third-party and retention tests required for full category coverage", () => {
    const ids = TEST_REGISTRY.map((test) => test.id);
    expect(ids).toContain("THIRD-001");
    expect(ids).toContain("RETENTION-001");
  });

  it("assigns a valid claim type to every test", () => {
    for (const test of TEST_REGISTRY) {
      expect(CLAIM_TYPES, test.id).toContain(test.claimType);
    }
  });

  it("defaults implementation-only security checks to technical recommendations", () => {
    const byId = new Map(TEST_REGISTRY.map((test) => [test.id, test]));
    expect(byId.get("SEC-002")?.claimType).toBe("technical_recommendation");
    expect(byId.get("SEC-005")?.claimType).toBe("technical_recommendation");
  });

  it("labels tests mapped to not-yet-effective provisions as regulatory readiness", () => {
    const byId = new Map(TEST_REGISTRY.map((test) => [test.id, test]));
    expect(byId.get("NOTICE-001")?.claimType).toBe("regulatory_readiness");
    expect(byId.get("CONSENT-001")?.claimType).toBe("regulatory_readiness");
    expect(byId.get("ORG-001")?.claimType).toBe("regulatory_readiness");
  });
});
