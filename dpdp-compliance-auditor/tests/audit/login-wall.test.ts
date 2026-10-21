import { describe, expect, it } from "vitest";
import { detectLoginWall, findLoginSurfaces, pageLooksLikeLogin } from "@/lib/audit/login-wall";
import { pageEvidence, passwordForm } from "./helpers";

describe("detectLoginWall", () => {
  it("detects a 401 start page", () => {
    const detection = detectLoginWall([
      pageEvidence({ status: 401, ok: false, title: "Unauthorized", textExcerpt: "Unauthorized" }),
    ]);
    expect(detection.loginWallDetected).toBe(true);
    expect(detection.reason).toContain("401");
  });

  it("detects a redirect to a sign-in URL", () => {
    const detection = detectLoginWall([
      pageEvidence({
        requestedUrl: "https://example.test/account",
        finalUrl: "https://example.test/login",
        redirectChain: ["https://example.test/account", "https://example.test/login"],
      }),
    ]);
    expect(detection.loginWallDetected).toBe(true);
    expect(detection.loginUrl).toBe("https://example.test/login");
  });

  it("detects a password form on a login-labelled page", () => {
    const detection = detectLoginWall([
      pageEvidence({
        finalUrl: "https://example.test/session/new",
        title: "Sign in",
        textExcerpt: "Please sign in to continue.",
        forms: [passwordForm()],
      }),
    ]);
    expect(detection.loginWallDetected).toBe(true);
  });

  it("does not flag a homepage that only links to a login page", () => {
    const detection = detectLoginWall([
      pageEvidence({
        title: "Welcome",
        textExcerpt: "Welcome to our homepage. Login to manage your account.",
      }),
    ]);
    expect(detection.loginWallDetected).toBe(false);
    expect(detection.reason).toBeNull();
  });

  it("returns no wall when there are no pages", () => {
    expect(detectLoginWall([]).loginWallDetected).toBe(false);
  });
});

describe("findLoginSurfaces", () => {
  it("finds a login page reached from a public homepage", () => {
    const home = pageEvidence({
      finalUrl: "https://example.test/",
      title: "Welcome",
      textExcerpt: "Welcome to our homepage.",
    });
    const login = pageEvidence({
      id: "page-2",
      finalUrl: "https://example.test/login",
      title: "Sign in",
      textExcerpt: "Please sign in to continue.",
      forms: [passwordForm()],
    });
    const surfaces = findLoginSurfaces([home, login]);
    expect(surfaces.loginSurfaceDetected).toBe(true);
    expect(surfaces.loginUrls).toEqual(["https://example.test/login"]);
  });

  it("does not treat a homepage mentioning login as a surface", () => {
    const surfaces = findLoginSurfaces([
      pageEvidence({ textExcerpt: "Welcome. Login to manage your account." }),
    ]);
    expect(surfaces.loginSurfaceDetected).toBe(false);
  });

  it("returns an empty result for no pages", () => {
    expect(findLoginSurfaces([])).toEqual({ loginSurfaceDetected: false, loginUrls: [] });
  });

  it("classifies a password form on a login-labelled page", () => {
    expect(
      pageLooksLikeLogin(
        pageEvidence({
          finalUrl: "https://example.test/session/new",
          title: "Sign in",
          textExcerpt: "Please sign in.",
          forms: [passwordForm()],
        }),
      ),
    ).toBe(true);
  });
});
