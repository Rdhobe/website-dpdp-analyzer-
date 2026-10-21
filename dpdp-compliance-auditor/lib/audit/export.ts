import { existsSync } from "node:fs";
import PDFDocument from "pdfkit";
import { COMMENCEMENT_SUMMARY } from "./legal";
import { displayFindings, type DisplayFinding } from "./presentation";
import { resolveScreenshotPath } from "./screenshots";
import { CLAIM_TYPE_LABELS, type AuditRun } from "./types";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toJsonExport(run: AuditRun): string {
  return JSON.stringify(run, null, 2);
}

export function toCsvExport(run: AuditRun): string {
  const headers = [
    "testId",
    "category",
    "title",
    "status",
    "severity",
    "confidence",
    "claimType",
    "humanReviewRequired",
    "affectedUrls",
    "reasoning",
    "remediation",
    "verificationSteps",
    "screenshots",
    "legalReferences",
    "evidence",
    "knownLimitations",
  ];
  const rows = run.tests.map((test) =>
    [
      test.testId,
      test.category,
      test.title,
      test.status,
      test.severity,
      test.confidence,
      CLAIM_TYPE_LABELS[test.claimType],
      test.humanReviewRequired ? "yes" : "no",
      test.affectedUrls.join(" | "),
      test.reasoning,
      test.remediation,
      test.verificationSteps,
      test.screenshots.map((shot) => shot.name).join(" | "),
      test.legalReferences
        .map(
          (reference) =>
            `${reference.provision} (${reference.effectiveStatus}${
              reference.effectiveFrom ? `, from ${reference.effectiveFrom}` : ""
            })`,
        )
        .join(" | "),
      JSON.stringify(
        test.evidence.map((item) => ({
          kind: item.kind,
          summary: item.summary,
          pageUrl: item.pageUrl,
          data: item.data,
        })),
      ),
      test.knownLimitations,
    ]
      .map(csvCell)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

function addEvidence(
  document: PDFKit.PDFDocument,
  finding: DisplayFinding,
): void {
  document.moveDown(0.3);
  document
    .fontSize(9)
    .fillColor("#0f172a")
    .text(`Evidence (${finding.evidence.length} item(s))`);
  if (finding.evidence.length === 0) {
    document
      .fontSize(8)
      .fillColor("#64748b")
      .text("No structured evidence item was recorded for this finding.");
    return;
  }
  for (const item of finding.evidence) {
    document
      .fontSize(8)
      .fillColor("#334155")
      .text(`• ${item.kind} — ${item.summary}`);
    if (item.pageUrl) {
      document.fontSize(7).fillColor("#64748b").text(`  page: ${item.pageUrl}`);
    }
    document
      .font("Courier")
      .fontSize(7)
      .fillColor("#1e293b")
      .text(JSON.stringify(item.data, null, 2), { width: 480 });
    document.font("Helvetica");
  }
}

function addFinding(
  document: PDFKit.PDFDocument,
  finding: DisplayFinding,
  runId: string,
): void {
  document.moveDown(0.6);
  document
    .fontSize(11)
    .fillColor("#0f172a")
    .text(`${finding.heading} — ${finding.title}`, { continued: false });
  document
    .fontSize(9)
    .fillColor("#334155")
    .text(
      `Status: ${finding.status} | Severity: ${finding.severity} | Confidence: ${finding.confidence} | Claim: ${CLAIM_TYPE_LABELS[finding.claimType]}`,
    );
  if (finding.linkedTestIds.length > 1) {
    document.text(`Linked tests: ${finding.linkedTestIds.join(", ")}`);
  }
  if (finding.affectedUrls.length > 0) {
    document.text(`Affected URLs: ${finding.affectedUrls.join(", ")}`);
  }
  document.text(`Reasoning: ${finding.reasoning}`);
  document.text(`Remediation: ${finding.remediation}`);
  document.text(`Verification: ${finding.verificationSteps}`);
  if (finding.legalReferences.length > 0) {
    document.text(
      `Legal mapping: ${finding.legalReferences
        .map(
          (reference) =>
            `${reference.provision} [${reference.effectiveStatus}${
              reference.effectiveFrom ? `, effective ${reference.effectiveFrom}` : ""
            }] — ${reference.sourceUrl}`,
        )
        .join("; ")}`,
    );
  }
  document.text(`Limitations: ${finding.knownLimitations}`);
  addEvidence(document, finding);
  for (const shot of finding.screenshots.slice(0, 2)) {
    const path = resolveScreenshotPath(runId, shot.name);
    if (!path || !existsSync(path)) continue;
    try {
      document.moveDown(0.3);
      document
        .fontSize(8)
        .fillColor("#475569")
        .text(`Screenshot: ${shot.label} — ${shot.pageUrl}`);
      document.image(path, { fit: [480, 360] });
    } catch {
      // Skip screenshots that cannot be embedded.
    }
  }
}

function addCoverage(document: PDFKit.PDFDocument, run: AuditRun): void {
  const coverage = run.summary?.coverage;
  if (!coverage) return;
  document.fontSize(10);
  document.text(
    `Page crawl: ${coverage.pageCrawl.succeeded}/${coverage.pageCrawl.attempted} attempted page(s) fetched (${coverage.pageCrawl.failed} failed).`,
  );
  document.text(
    `Site discovery: ${coverage.siteDiscovery.discoveredPages} in-scope page(s) crawled; ${
      coverage.siteDiscovery.inventoryAvailable
        ? `${coverage.siteDiscovery.declaredUrls} URL(s) declared in robots/sitemap`
        : "no declared inventory in robots/sitemap"
    }.`,
  );
  document.text(
    `Test execution: ${coverage.testExecution.executed}/${coverage.testExecution.applicable} applicable test(s) produced a result.`,
  );
  document.text(
    `Evidence sufficiency: ${coverage.evidenceSufficiency.sufficient}/${coverage.evidenceSufficiency.total} test(s) recorded supporting evidence.`,
  );
  document
    .fontSize(8)
    .fillColor("#64748b")
    .text(
      "These are separate measures. None is an overall compliance score, and none certifies DPDP compliance.",
    );
}

export function toPdfExport(run: AuditRun): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `DPDP Website Audit ${run.id}`,
        Author: "DPDP Compliance Auditor",
        Subject: "Evidence-based DPDP readiness audit",
      },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const findings = displayFindings(run.tests, run.findingGroups);

    document.fontSize(18).fillColor("#0f172a").text("DPDP Website Readiness Audit");
    document
      .fontSize(9)
      .fillColor("#475569")
      .text(
        `Readiness assessment only. Not legal advice or certification. ${COMMENCEMENT_SUMMARY}`,
      );
    document.moveDown(0.5);
    document.fontSize(10).fillColor("#0f172a");
    document.text(`Audit ID: ${run.id}`);
    document.text(`Target: ${run.targetUrl}`);
    document.text(`Status: ${run.status}`);
    document.text(`Created: ${run.createdAt}`);
    document.text(`Completed: ${run.completedAt ?? "not completed"}`);
    document.text(
      `Engine: ${run.engineVersion} | Registry: ${run.registryVersion}`,
    );
    document.text(`Legal framework: ${run.legalFrameworkVersion}`);
    document.moveDown(0.6);

    if (run.summary) {
      document.fontSize(13).text("Summary");
      document.fontSize(10);
      document.text(
        `PASS ${run.summary.pass} | FAIL ${run.summary.fail} | WARNING ${run.summary.warning} | NEEDS_REVIEW ${run.summary.needsReview} | NOT_ASSESSED ${run.summary.notAssessed} | NOT_APPLICABLE ${run.summary.notApplicable}`,
      );
      document.moveDown(0.3);
      document.fontSize(11).text("Coverage measures");
      addCoverage(document, run);
      document.moveDown(0.6);
      document.fontSize(13).text("Category results");
      for (const category of run.summary.categoryCounts) {
        document
          .fontSize(9)
          .text(
            `${category.category} ${category.name}: PASS ${category.pass}, FAIL ${category.fail}, WARNING ${category.warning}, NEEDS_REVIEW ${category.needsReview}, NOT_ASSESSED ${category.notAssessed}, NOT_APPLICABLE ${category.notApplicable}`,
          );
      }
    }

    document.moveDown(0.6);
    document
      .fontSize(13)
      .text(
        `Findings and review items (${findings.length} consolidated issue(s); ${run.findings.length} underlying finding(s))`,
      );
    for (const finding of findings) {
      addFinding(document, finding, run.id);
    }

    document.moveDown(0.6);
    document.fontSize(13).text("All test results");
    for (const test of run.tests) {
      document
        .fontSize(9)
        .text(
          `${test.testId} ${test.status} (${test.severity}/${test.confidence}) [${CLAIM_TYPE_LABELS[test.claimType]}] — ${test.title}`,
        );
    }

    document.moveDown(0.6);
    document.fontSize(13).text("Limitations");
    for (const limitation of run.limitations) {
      document.fontSize(9).text(`- ${limitation}`);
    }

    document.end();
  });
}
