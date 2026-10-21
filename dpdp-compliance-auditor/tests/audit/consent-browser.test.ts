import { describe, expect, it } from "vitest";
import { ALL_RULES } from "@/lib/audit/rules";
import { browserEvidence, makeContext, snapshot, trackerRequest } from "./helpers";

function evaluate(testId: string, context = makeContext()) {
  const evaluator = ALL_RULES[testId];
  if (!evaluator) throw new Error(`Missing evaluator for ${testId}`);
  return evaluator(context);
}

describe("browser-based consent rules", () => {
  it("fails CONSENT-005 when known trackers fire before any consent action", () => {
    const context = makeContext({
      browser: browserEvidence({
        initial: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
      }),
    });
    expect(evaluate("CONSENT-005", context).status).toBe("FAIL");
  });

  it("passes CONSENT-005 when the clean initial state is tracker-free", () => {
    const context = makeContext({ browser: browserEvidence({ initial: snapshot() }) });
    expect(evaluate("CONSENT-005", context).status).toBe("PASS");
  });

  it("fails CONSENT-006 when trackers persist after rejection", () => {
    const context = makeContext({
      browser: browserEvidence({
        initial: snapshot({
          rejectVisible: true,
          requests: [trackerRequest("www.google-analytics.com")],
        }),
        afterReject: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
      }),
    });
    expect(evaluate("CONSENT-006", context).status).toBe("FAIL");
  });

  it("passes CONSENT-006 when trackers stop after rejection", () => {
    const context = makeContext({
      browser: browserEvidence({
        initial: snapshot({
          rejectVisible: true,
          requests: [trackerRequest("www.google-analytics.com")],
        }),
        afterReject: snapshot({ requests: [] }),
      }),
    });
    expect(evaluate("CONSENT-006", context).status).toBe("PASS");
  });

  it("does not assess CONSENT-006 when no reject control was visible", () => {
    const context = makeContext({
      browser: browserEvidence({
        initial: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
        afterReject: snapshot(),
      }),
    });
    expect(evaluate("CONSENT-006", context).status).toBe("NOT_ASSESSED");
  });

  it("fails CONSENT-010 when trackers continue after a withdrawal attempt", () => {
    const context = makeContext({
      browser: browserEvidence({
        afterAccept: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
        afterWithdraw: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
        interactionLog: ["Clicked accept", "Clicked withdrawal control"],
      }),
    });
    expect(evaluate("CONSENT-010", context).status).toBe("FAIL");
  });

  it("passes CONSENT-010 when withdrawal reduces tracker requests", () => {
    const context = makeContext({
      browser: browserEvidence({
        afterAccept: snapshot({
          requests: [
            trackerRequest("www.google-analytics.com"),
            trackerRequest("connect.facebook.net"),
          ],
        }),
        afterWithdraw: snapshot({ requests: [trackerRequest("connect.facebook.net")] }),
        interactionLog: ["Clicked accept", "Withdrawal requested"],
      }),
    });
    expect(evaluate("CONSENT-010", context).status).toBe("PASS");
  });

  it("warns CONSENT-012 when known tracker hosts are observed", () => {
    const context = makeContext({
      browser: browserEvidence({
        initial: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
      }),
    });
    expect(evaluate("CONSENT-012", context).status).toBe("WARNING");
  });

  it("reports CONSENT-007 once post-accept state is captured", () => {
    const context = makeContext({
      browser: browserEvidence({
        initial: snapshot({ acceptVisible: true }),
        afterAccept: snapshot({ requests: [trackerRequest("www.google-analytics.com")] }),
      }),
    });
    expect(evaluate("CONSENT-007", context).status).toBe("PASS");
  });

  it("does not assess browser-only checks when no browser evidence exists", () => {
    const context = makeContext();
    expect(evaluate("CONSENT-005", context).status).toBe("NOT_ASSESSED");
    expect(evaluate("CONSENT-014", context).status).toBe("NOT_ASSESSED");
  });
});
