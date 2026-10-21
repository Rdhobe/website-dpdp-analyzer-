"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

export default function NewAuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [screenshots, setScreenshots] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authorized) {
      setError("Confirm that you are authorized to audit this website.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          authorized: true,
          browserEnabled,
          screenshots,
        }),
      });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        throw new Error(body.error ?? `Audit could not be queued (HTTP ${response.status}).`);
      }
      router.push(`/audits/${body.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Audit could not be queued.",
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Run a website audit
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        The worker crawls one authorized origin and, where possible, its whole site, collecting
        evidence and running the versioned deterministic test registry. Crawls stop after a
        5-minute time limit. It never submits forms, bypasses access controls, or signs in unless
        you provide credentials for a single sign-in form.
      </p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Website URL</span>
          <input
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </label>

        <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={browserEnabled}
            onChange={(event) => setBrowserEnabled(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Enable Playwright browser evidence (consent interface, pre-consent tracking,
            reload and withdrawal behaviour). Requires installed browser binaries.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={screenshots}
            onChange={(event) => setScreenshots(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Capture screenshots so each finding and review item shows the exact page and
            element. Requires Playwright browser binaries (`npx playwright install chromium`).
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            required
            checked={authorized}
            onChange={(event) => setAuthorized(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            I confirm I am authorized to audit this website. The crawl is same-origin and stops
            at a 5-minute time limit; it does not submit data, and it will pause for credentials
            if the site requires a single username/password sign-in.
          </span>
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Queueing audit..." : "Queue audit"}
      </button>
    </form>
  );
}
