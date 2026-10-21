import { describe, expect, it } from "vitest";
import { classifyTracker, isThirdPartyHost } from "@/lib/audit/trackers";

describe("tracker classification", () => {
  it("returns the matched suffix for a known tracker subdomain", () => {
    expect(classifyTracker("www.googletagmanager.com")).toEqual({
      known: true,
      category: "tag-manager",
      matchedDomain: "googletagmanager.com",
    });
  });

  it("matches an exact tracker host", () => {
    expect(classifyTracker("connect.facebook.net")).toEqual({
      known: true,
      category: "social/advertising",
      matchedDomain: "connect.facebook.net",
    });
  });

  it("returns no match for an unrelated host", () => {
    expect(classifyTracker("example.com")).toEqual({
      known: false,
      category: null,
      matchedDomain: null,
    });
  });

  it("treats a subdomain of the origin as first party", () => {
    expect(isThirdPartyHost("cdn.example.com", "example.com")).toBe(false);
    expect(isThirdPartyHost("example.org", "example.com")).toBe(true);
  });
});
