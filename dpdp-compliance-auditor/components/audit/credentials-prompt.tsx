"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

export default function CredentialsPrompt({
  auditId,
  variant = "blocked",
}: {
  auditId: string;
  variant?: "blocked" | "optional";
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optional = variant === "optional";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audits/${auditId}/credentials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        throw new Error(
          body.error ?? `The sign-in audit could not be queued (HTTP ${response.status}).`,
        );
      }
      setUsername("");
      setPassword("");
      router.push(`/audits/${body.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The sign-in audit could not be queued.",
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/40"
    >
      <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
        {optional ? "Sign-in area detected — optional authenticated run" : "Sign-in required to continue"}
      </h2>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
        {optional
          ? "This site exposes a sign-in page, but pages behind the login were not audited in this run. Enter the username and password for a single sign-in form to run an additional authenticated audit. Credentials are used only to sign in for the new run and are not stored with the report."
          : "This site showed a sign-in page, so no tests were run. Enter the username and password for a single sign-in form to continue. Credentials are used only to sign in for the new run and are not stored with the report."}
      </p>
      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
        Only single username/password forms are supported. MFA, CAPTCHA, and single sign-on are
        not bypassed.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-amber-900 dark:text-amber-100">Username</span>
          <input
            type="text"
            required
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-11 rounded-xl border border-amber-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-amber-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-amber-900 dark:text-amber-100">Password</span>
          <input
            type="password"
            required
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-xl border border-amber-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-amber-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Queueing sign-in audit..." : "Sign in and run audit"}
      </button>
    </form>
  );
}
