import Link from "next/link";
import { COMMENCEMENT_SUMMARY } from "@/lib/audit/legal";
import {
  displayFindings,
  type DisplayFinding,
} from "@/lib/audit/presentation";
import { deriveAuditOutcome } from "@/lib/audit/summary";
import {
  CLAIM_TYPES,
  CLAIM_TYPE_LABELS,
  type AuditRun,
  type ClaimType,
  type OutcomeTone,
  type ResourceDiscoveryEvidence,
} from "@/lib/audit/types";
import ExportMenu from "./export-menu";
import CredentialsPrompt from "./credentials-prompt";
import AuditProgress from "./audit-progress";
import { ScreenshotFigure, ScreenshotGallery } from "./screenshot-gallery";
import { AuditStatusBadge, TestStatusBadge } from "./status-badge";

const CLAIM_TONES: Record<ClaimType, string> = {
  verified_legal_requirement:
    "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200",
  regulatory_readiness:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
  potential_privacy_gap:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  technical_recommendation:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
};

function ClaimBadge({ claimType }: { claimType: ClaimType }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CLAIM_TONES[claimType]}`}
    >
      {CLAIM_TYPE_LABELS[claimType]}
    </span>
  );
}

function ClaimLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {CLAIM_TYPES.map((claimType) => (
        <span
          key={claimType}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CLAIM_TONES[claimType]}`}
        >
          {CLAIM_TYPE_LABELS[claimType]}
        </span>
      ))}
    </div>
  );
}

const OUTCOME_TONES: Record<OutcomeTone, string> = {
  danger:
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
  caution:
    "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100",
  neutral:
    "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100",
};

const OUTCOME_LABELS: Record<OutcomeTone, string> = {
  danger: "Needs work",
  warning: "Review warnings",
  caution: "Inconclusive",
  neutral: "No result",
  success: "No failing checks",
};

const DISCOVERY_TONES = {
  found:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40",
  missing: "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40",
  error: "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40",
  neutral: "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950",
} as const;

function discoverySummary(resource: ResourceDiscoveryEvidence | null): {
  value: string;
  tone: string;
  note: string;
} {
  if (!resource) {
    return {
      value: "Not checked",
      tone: DISCOVERY_TONES.neutral,
      note: "This discovery file was not requested in this run, so it contributed no URLs.",
    };
  }
  if (resource.status !== null && resource.status >= 200 && resource.status < 300) {
    const count = resource.discoveredUrls.length;
    return {
      value: `Found (HTTP ${resource.status})`,
      tone: DISCOVERY_TONES.found,
      note:
        count > 0
          ? `${count} URL(s) were discovered and added to the crawl queue.`
          : "The file was reachable but listed no additional URLs to crawl.",
    };
  }
  if (resource.status === 404 || resource.status === 410) {
    return {
      value: `Not found (HTTP ${resource.status})`,
      tone: DISCOVERY_TONES.missing,
      note: "The site does not publish this file, so crawl discovery relied on following links from the start page. Coverage may be incomplete.",
    };
  }
  if (resource.status !== null) {
    return {
      value: `HTTP ${resource.status}`,
      tone: DISCOVERY_TONES.error,
      note: "The file could not be read successfully, so it contributed no URLs to the crawl.",
    };
  }
  return {
    value: "Not fetched",
    tone: DISCOVERY_TONES.error,
    note: resource.error
      ? `The request failed: ${resource.error}. It contributed no URLs to the crawl.`
      : "The file could not be fetched, so it contributed no URLs to the crawl.",
  };
}

function DiscoveryCard({
  name,
  resource,
}: {
  name: string;
  resource: ResourceDiscoveryEvidence | null;
}) {
  const { value, tone, note } = discoverySummary(resource);
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        {name}
      </p>
      <p className="mt-1 text-2xl font-semibold leading-tight break-words text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">{note}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function screenshotNoticeFor(run: AuditRun): string {
  const visual = run.visual;
  if (!run.config.screenshots || !visual) {
    return "Screenshots were not enabled for this audit. Re-run with screenshot capture enabled to see the exact page and element for this item.";
  }
  if (!visual.available) {
    const reason = visual.limitations[0] ?? "the browser could not launch.";
    return `Screenshots could not be captured for this audit because the browser could not render the pages. ${reason}`;
  }
  if (visual.screenshots.length === 0) {
    return "No page could be rendered for screenshots — the crawl did not fetch any page successfully, so there was nothing to capture. Review the evidence below instead.";
  }
  return "No screenshot was captured for this item — no matching element was found on the page. Review the evidence below instead.";
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function CoverageCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}

function LegalReferenceList({
  references,
}: {
  references: AuditRun["tests"][number]["legalReferences"];
}) {
  if (references.length === 0) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No verified legal provision is mapped to this test.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {references.map((reference) => (
        <li
          key={reference.id}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">
            {reference.provision}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">{reference.summary}</p>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Status: {reference.effectiveStatus.replace(/_/g, " ")}
            {reference.effectiveFrom ? ` · effective from ${reference.effectiveFrom}` : ""}
            {reference.commencementGroup
              ? ` · commencement group: ${reference.commencementGroup.replace(/_/g, " ")}`
              : ""}
            {" · verified "}
            {reference.verifiedOn}
          </p>
          <a
            href={reference.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block break-all text-teal-700 underline decoration-teal-700/30 underline-offset-2 dark:text-teal-400"
          >
            {reference.sourceUrl}
          </a>
        </li>
      ))}
    </ul>
  );
}

function FindingCard({
  finding,
  runId,
  screenshotNotice,
}: {
  finding: DisplayFinding;
  runId: string;
  screenshotNotice: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">
          {finding.heading}
        </span>
        <TestStatusBadge status={finding.status} />
        <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {finding.severity} severity
        </span>
        <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {finding.confidence} confidence
        </span>
        <ClaimBadge claimType={finding.claimType} />
        {finding.humanReviewRequired ? (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            Human review
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
        {finding.title}
      </h3>
      {finding.linkedTestIds.length > 1 ? (
        <p className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
          Consolidated from {finding.linkedTestIds.join(", ")}
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {finding.reasoning}
      </p>

      {finding.affectedUrls.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Affected URLs
          </p>
          <ul className="mt-1 space-y-1">
            {finding.affectedUrls.map((url) => (
              <li key={url} className="break-all font-mono text-xs text-zinc-600 dark:text-zinc-300">
                {url}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Visual evidence
        </p>
        {finding.screenshots.length > 0 ? (
          <div className="mt-2">
            <ScreenshotGallery runId={runId} screenshots={finding.screenshots} />
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{screenshotNotice}</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Recommended remediation
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{finding.remediation}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Verification
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
            {finding.verificationSteps}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Known limitations
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
            {finding.knownLimitations}
          </p>
        </section>
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Legal mapping
          </p>
          <div className="mt-1">
            <LegalReferenceList references={finding.legalReferences} />
          </div>
        </section>
      </div>

      {finding.evidence.length > 0 ? (
        <details className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Supporting evidence ({finding.evidence.length})
          </summary>
          <ul className="space-y-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            {finding.evidence.map((item) => (
              <li key={item.id}>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {item.kind} — {item.summary}
                </p>
                {item.pageUrl ? (
                  <p className="break-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {item.pageUrl}
                  </p>
                ) : null}
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-50 p-2 text-[11px] leading-5 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

export default function AuditReport({ run }: { run: AuditRun }) {
  if (run.status === "queued" || run.status === "running") {
    const latest = run.progress?.[run.progress.length - 1];
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-3">
            <AuditStatusBadge status={run.status} />
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              {run.status === "queued"
                ? "Waiting for the worker process to start."
                : "Crawling and evaluating tests."}
            </span>
          </div>
          <h1 className="mt-2 break-all text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {run.targetUrl}
          </h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
            {latest ? latest.message : "Waiting for the first progress event..."}
          </p>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            The page refreshes automatically. A crawl can take up to a few minutes depending
            on page count and timeouts.
          </p>
        </div>
        <AuditProgress run={run} open />
      </div>
    );
  }

  if (run.status === "requires_credentials") {
    const outcome = deriveAuditOutcome(run.status, run.summary);
    return (
      <div className="space-y-6">
        <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-2">
            <AuditStatusBadge status={run.status} />
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{run.id}</span>
          </div>
          <h1 className="mt-2 break-all text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {run.targetUrl}
          </h1>
          <div
            className={`mt-4 rounded-xl border p-4 ${OUTCOME_TONES[outcome.tone]}`}
            role="status"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {OUTCOME_LABELS[outcome.tone]}
              </span>
              <h2 className="text-base font-semibold">{outcome.headline}</h2>
            </div>
            <p className="mt-2 text-sm leading-6">{outcome.detail}</p>
          </div>

          <div className="mt-5">
            <CredentialsPrompt auditId={run.id} />
          </div>

          {run.auth?.loginUrl ? (
            <p className="mt-4 break-all text-xs text-zinc-500 dark:text-zinc-400">
              Sign-in page detected at <span className="font-mono">{run.auth.loginUrl}</span>.
            </p>
          ) : null}

          {run.auth?.diagnostics && run.auth.diagnostics.length > 0 ? (
            <details className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Sign-in diagnostics
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                {run.auth.diagnostics.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {run.limitations.length > 0 ? (
            <details className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Why no tests ran
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                {run.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </article>
        <AuditProgress run={run} open />
      </div>
    );
  }

  const summary = run.summary;
  const outcome = deriveAuditOutcome(run.status, summary);
  const screenshotNotice = screenshotNoticeFor(run);
  const findings = displayFindings(run.tests, run.findingGroups);

  return (
    <div className="space-y-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AuditStatusBadge status={run.status} />
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {run.id}
              </span>
            </div>
            <h1 className="mt-2 break-all text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {run.targetUrl}
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Created {formatDate(run.createdAt)} · Completed {formatDate(run.completedAt)}
            </p>
            {run.auth?.authenticated ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Authenticated run: signed in with credentials supplied for this run. Credential
                values are not stored with the report.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu runId={run.id} />
            <Link
              href={`/audits/compare?a=${run.id}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Compare
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Readiness assessment only. It is not legal advice or certification. {COMMENCEMENT_SUMMARY}{" "}
          Statuses are evidence-based readiness signals: missing evidence produces NOT_ASSESSED
          or NEEDS_REVIEW, never PASS.
          <ClaimLegend />
          <p className="mt-2 opacity-80">
            &quot;Verified legal requirement&quot; means the provision mapped to the check is in
            force. &quot;Regulatory readiness&quot; means the check relates to a provision that is
            not yet in force or to a control that cannot be verified from outside.
          </p>
        </div>

        <div
          className={`mt-4 rounded-xl border p-4 ${OUTCOME_TONES[outcome.tone]}`}
          role="status"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {OUTCOME_LABELS[outcome.tone]}
            </span>
            <h2 className="text-base font-semibold">{outcome.headline}</h2>
          </div>
          <p className="mt-2 text-sm leading-6">{outcome.detail}</p>
          <p className="mt-2 text-[11px] leading-5 opacity-80">
            There is no single pass/fail certificate for a DPDP website audit. The outcome
            above summarises the automated checks only and does not cover evidence that
            requires human review or documents the crawler cannot reach.
          </p>
        </div>

        {run.auth?.loginSurfaceDetected && !run.auth.authenticated ? (
          <div className="mt-4">
            <CredentialsPrompt auditId={run.id} variant="optional" />
          </div>
        ) : null}

        {summary ? (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <SummaryCard label="Tests" value={summary.total} />
              <SummaryCard label="Pass" value={summary.pass} />
              <SummaryCard label="Fail" value={summary.fail} />
              <SummaryCard label="Warning" value={summary.warning} />
              <SummaryCard label="Needs review" value={summary.needsReview} />
              <SummaryCard label="Not assessed" value={summary.notAssessed} />
              <SummaryCard label="Not applicable" value={summary.notApplicable} />
            </dl>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CoverageCard
                label="Page crawl"
                value={`${summary.coverage.pageCrawl.succeeded}/${summary.coverage.pageCrawl.attempted}`}
                detail={`${summary.coverage.pageCrawl.failed} page(s) failed to fetch.`}
              />
              <CoverageCard
                label="Site discovery"
                value={`${summary.coverage.siteDiscovery.discoveredPages}`}
                detail={
                  summary.coverage.siteDiscovery.inventoryAvailable
                    ? `${summary.coverage.siteDiscovery.declaredUrls} URL(s) declared in robots/sitemap.`
                    : "No declared inventory in robots/sitemap."
                }
              />
              <CoverageCard
                label="Test execution"
                value={`${summary.coverage.testExecution.executed}/${summary.coverage.testExecution.applicable}`}
                detail="Applicable tests that produced a result."
              />
              <CoverageCard
                label="Evidence sufficiency"
                value={`${summary.coverage.evidenceSufficiency.sufficient}/${summary.coverage.evidenceSufficiency.total}`}
                detail="Tests that recorded supporting evidence."
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              These measures are independent; none is a compliance score.{" "}
              {summary.automated} deterministic results · {summary.humanReviewRequired} item(s)
              require human review · Engine {run.engineVersion} · Registry {run.registryVersion}
            </p>
          </>
        ) : null}
      </article>

      {summary ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Category results
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Pass</th>
                  <th className="py-2 pr-4">Fail</th>
                  <th className="py-2 pr-4">Warning</th>
                  <th className="py-2 pr-4">Needs review</th>
                  <th className="py-2 pr-4">Not assessed</th>
                  <th className="py-2 pr-4">N/A</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.categoryCounts.map((category) => (
                  <tr
                    key={category.category}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs text-zinc-500">{category.category}</span>{" "}
                      {category.name}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{category.pass}</td>
                    <td className="py-2 pr-4 tabular-nums">{category.fail}</td>
                    <td className="py-2 pr-4 tabular-nums">{category.warning}</td>
                    <td className="py-2 pr-4 tabular-nums">{category.needsReview}</td>
                    <td className="py-2 pr-4 tabular-nums">{category.notAssessed}</td>
                    <td className="py-2 pr-4 tabular-nums">{category.notApplicable}</td>
                    <td className="py-2 tabular-nums">{category.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Findings and review items ({findings.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Consolidated from {run.findings.length} underlying finding(s). Related checks that
            describe the same issue are grouped to avoid duplicate entries.
          </p>
        </div>
        {findings.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            No FAIL, WARNING, or NEEDS_REVIEW finding was produced. Check the full test
            table and coverage limitations before drawing conclusions.
          </p>
        ) : (
          findings.map((finding) => (
            <FindingCard
              key={finding.key}
              finding={finding}
              runId={run.id}
              screenshotNotice={screenshotNotice}
            />
          ))
        )}
      </section>

      {run.visual && run.visual.screenshots.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Captured visual evidence ({run.visual.screenshots.length})
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Full-page and element screenshots captured during the audit so each finding can
            be traced to what the crawler actually saw. Screenshots do not prove a legal
            conclusion and may omit content that only appears after login or interaction.
          </p>
          <div className="mt-4">
            <ScreenshotGallery runId={run.id} screenshots={run.visual.screenshots} columns={3} />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Page inventory and crawl coverage
        </h2>
        {run.crawlStats ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Attempted {run.crawlStats.pagesAttempted} · Succeeded{" "}
            {run.crawlStats.pagesSucceeded} · Failed {run.crawlStats.pagesFailed} ·
            Duplicates skipped {run.crawlStats.duplicatesSkipped} · Out-of-scope skipped{" "}
            {run.crawlStats.outOfScopeSkipped} · Blocked targets{" "}
            {run.crawlStats.blockedTargets} · Deepest link level {run.crawlStats.maxDepthReached}
          </p>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4">URL</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Forms</th>
                <th className="py-2 pr-4">Headings</th>
                <th className="py-2 pr-4">Third-party hosts</th>
                <th className="py-2">Error / note</th>
              </tr>
            </thead>
            <tbody>
              {run.pages.map((page) => (
                <tr
                  key={page.id}
                  className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-800"
                >
                  <td className="py-2 pr-4 break-all font-mono text-xs">{page.finalUrl}</td>
                  <td className="py-2 pr-4 tabular-nums">{page.status ?? "—"}</td>
                  <td className="py-2 pr-4">{page.title ?? "—"}</td>
                  <td className="py-2 pr-4 tabular-nums">{page.forms.length}</td>
                  <td className="py-2 pr-4 tabular-nums">{page.headings.length}</td>
                  <td className="py-2 pr-4 text-xs">{page.thirdPartyHosts.join(", ") || "—"}</td>
                  <td className="py-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {page.error ?? (page.ok ? "" : "Page was not assessable.")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Site discovery files:
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <DiscoveryCard name="robots.txt" resource={run.robots} />
          <DiscoveryCard name="sitemap.xml" resource={run.sitemap} />
        </div>
      </section>

      {run.browser?.available ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Browser evidence
          </h2>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Fresh contexts: initial, after-reject, after-accept. Interaction steps are
            logged; no data forms are submitted.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
            {run.browser.interactionLog.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Initial", run.browser.initial],
                ["After reject", run.browser.afterReject],
                ["After accept", run.browser.afterAccept],
              ] as const
            ).map(([label, snapshot]) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
                {snapshot ? (
                  <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-300">
                    <li>Cookies: {snapshot.cookies.length}</li>
                    <li>
                      Known tracker requests:{" "}
                      {snapshot.requests.filter((request) => request.knownTracker).length}
                    </li>
                    <li>Banner visible: {snapshot.bannerVisible ? "yes" : "no"}</li>
                    <li>Accept control: {snapshot.acceptVisible ? "yes" : "no"}</li>
                    <li>Reject control: {snapshot.rejectVisible ? "yes" : "no"}</li>
                    <li>Errors: {snapshot.errors.length}</li>
                  </ul>
                ) : (
                  <p className="mt-2 text-zinc-500">Not captured.</p>
                )}
                {snapshot?.screenshot ? (
                  <div className="mt-2">
                    <ScreenshotFigure runId={run.id} screenshot={snapshot.screenshot} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            All test results ({run.tests.length})
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-2 pr-4">Test</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4">Claim</th>
                  <th className="py-2">Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {run.tests.map((test) => (
                  <tr
                    key={test.id}
                    className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-800"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{test.testId}</td>
                    <td className="py-2 pr-4">{test.category}</td>
                    <td className="py-2 pr-4">
                      <TestStatusBadge status={test.status} />
                    </td>
                    <td className="py-2 pr-4">{test.severity}</td>
                    <td className="py-2 pr-4 text-xs">
                      {CLAIM_TYPE_LABELS[test.claimType]}
                    </td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-300">{test.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Limitations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          {run.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        {run.errors.length > 0 ? (
          <>
            <h3 className="mt-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Collection errors
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-300">
              {run.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {run.auth?.diagnostics && run.auth.diagnostics.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <details>
            <summary className="cursor-pointer text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Sign-in diagnostics
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
              {run.auth.diagnostics.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      <AuditProgress run={run} />
    </div>
  );
}
