import { describe, expect, it } from "vitest";
import {
  COMMENCEMENT_SUMMARY,
  LEGAL_REFERENCES,
  resolveLegalReferences,
} from "@/lib/audit/legal";
import { COMMENCEMENT_GROUPS } from "@/lib/audit/types";

describe("legal references", () => {
  it("stores a commencement group and effective date for every provision", () => {
    for (const reference of Object.values(LEGAL_REFERENCES)) {
      expect(reference.sourceUrl, reference.id).toMatch(/^https:\/\//);
      expect(reference.verifiedOn, reference.id).toBeTruthy();
      expect(reference.effectiveFrom, reference.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(COMMENCEMENT_GROUPS).toContain(reference.commencementGroup);
    }
  });

  it("places the main notice and consent provisions in the eighteen-month group", () => {
    expect(LEGAL_REFERENCES["ACT-S5"].effectiveFrom).toBe("2027-05-13");
    expect(LEGAL_REFERENCES["ACT-S5"].commencementGroup).toBe("eighteen_months");
    expect(LEGAL_REFERENCES["ACT-S6"].effectiveFrom).toBe("2027-05-13");
  });

  it("places Section 6(9) Consent Manager registration in the one-year group", () => {
    expect(LEGAL_REFERENCES["ACT-S6-9"]).toBeDefined();
    expect(LEGAL_REFERENCES["ACT-S6-9"].effectiveFrom).toBe("2026-11-13");
    expect(LEGAL_REFERENCES["ACT-S6-9"].commencementGroup).toBe("one_year");
  });

  it("marks every provision as not yet effective and resolves ids", () => {
    for (const reference of Object.values(LEGAL_REFERENCES)) {
      expect(reference.effectiveStatus).toBe("not_yet_effective");
    }
    expect(resolveLegalReferences(["ACT-S5", "UNKNOWN"]).map((item) => item.id)).toEqual([
      "ACT-S5",
    ]);
  });

  it("summarises the phased commencement without a single blanket date", () => {
    expect(COMMENCEMENT_SUMMARY).toContain("2027-05-13");
    expect(COMMENCEMENT_SUMMARY).toContain("2026-11-13");
    expect(COMMENCEMENT_SUMMARY).toContain("Section 6(9)");
  });
});
