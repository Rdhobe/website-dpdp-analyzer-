import { describe, expect, it } from "vitest";
import {
  assertPublicTarget,
  classifyLink,
  isPrivateOrReservedIp,
  isSameOrigin,
  isSameSite,
  normalizeUrl,
  resolveLink,
  UnsafeTargetError,
  urlKey,
} from "@/lib/audit/url";

describe("normalizeUrl", () => {
  it("strips fragments, default ports and tracking parameters while sorting the query", () => {
    const url = normalizeUrl("HTTPS://Example.TEST:443/Path/?utm_source=x&b=2&a=1#section");
    expect(url.toString()).toBe("https://example.test/Path?a=1&b=2");
  });

  it("trims a trailing slash except for the origin", () => {
    expect(normalizeUrl("https://example.test/about/").toString()).toBe("https://example.test/about");
    expect(normalizeUrl("https://example.test/").toString()).toBe("https://example.test/");
  });

  it("rejects credential-bearing and non-http URLs", () => {
    expect(() => normalizeUrl("https://user:pass@example.test/")).toThrow(UnsafeTargetError);
    expect(() => normalizeUrl("ftp://example.test/")).toThrow(UnsafeTargetError);
  });

  it("produces a stable key regardless of tracking parameters", () => {
    expect(urlKey("https://example.test/a?gclid=123")).toBe(urlKey("https://example.test/a"));
  });
});

describe("site scope", () => {
  it("treats an apex domain and its www host as the same site", () => {
    expect(isSameSite("https://shakktii.in/", "https://www.shakktii.in/ecosystem")).toBe(true);
    expect(isSameSite("https://www.example.test/", "https://example.test/")).toBe(true);
  });

  it("keeps different hosts, ports and schemes as distinct sites", () => {
    expect(isSameSite("https://example.test/", "https://other.test/")).toBe(false);
    expect(isSameSite("https://example.test/", "https://example.test:8443/")).toBe(false);
    expect(isSameSite("http://example.test/", "https://example.test/")).toBe(false);
  });

  it("still distinguishes exact origins", () => {
    expect(isSameOrigin("https://example.test/", "https://www.example.test/")).toBe(false);
  });
});

describe("isPrivateOrReservedIp", () => {
  it("flags loopback, private, link-local and reserved ranges", () => {
    for (const address of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.0.1", "172.16.0.1", "::1", "fe80::1", "fc00::1"]) {
      expect(isPrivateOrReservedIp(address), address).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
      expect(isPrivateOrReservedIp(address), address).toBe(false);
    }
  });
});

describe("assertPublicTarget", () => {
  it("blocks loopback targets by default", async () => {
    await expect(assertPublicTarget("http://127.0.0.1/")).rejects.toBeInstanceOf(UnsafeTargetError);
  });

  it("allows loopback when private networks are explicitly permitted", async () => {
    await expect(
      assertPublicTarget("http://127.0.0.1:8080/", { allowPrivateNetworks: true }),
    ).resolves.toBeInstanceOf(URL);
  });
});

describe("resolveLink and classifyLink", () => {
  it("resolves relative links and ignores non-navigational schemes", () => {
    expect(resolveLink("https://example.test/a/", "../privacy")).toBe("https://example.test/privacy");
    expect(resolveLink("https://example.test/", "#top")).toBeNull();
    expect(resolveLink("https://example.test/", "mailto:a@b.test")).toBeNull();
    expect(resolveLink("https://example.test/", "javascript:alert(1)")).toBeNull();
  });

  it("classifies common policy link kinds", () => {
    expect(classifyLink("https://example.test/privacy", "Privacy Policy")).toBe("privacy");
    expect(classifyLink("https://example.test/cookies", "Cookie settings")).toBe("cookie");
    expect(classifyLink("https://example.test/grievance", "Grievance Officer")).toBe("grievance");
    expect(classifyLink("https://example.test/contact", "Contact us")).toBe("contact");
    expect(classifyLink("https://example.test/about", "About")).toBe("other");
  });
});
