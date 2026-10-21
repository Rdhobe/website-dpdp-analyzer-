/* eslint-disable @next/next/no-img-element */
import type { ScreenshotRef } from "@/lib/audit/types";

function screenshotUrl(runId: string, name: string): string {
  return `/api/audits/${encodeURIComponent(runId)}/screenshots/${encodeURIComponent(name)}`;
}

export function ScreenshotFigure({
  runId,
  screenshot,
  size = "thumbnail",
}: {
  runId: string;
  screenshot: ScreenshotRef;
  size?: "thumbnail" | "full";
}) {
  const href = screenshotUrl(runId, screenshot.name);
  const heightClass = size === "full" ? "max-h-[560px]" : "max-h-56";
  return (
    <figure className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title="Open full screenshot"
      >
        <img
          src={href}
          alt={`${screenshot.label} — ${screenshot.pageUrl}`}
          loading="lazy"
          className={`w-full bg-white object-contain object-top ${heightClass}`}
        />
      </a>
      <figcaption className="space-y-0.5 px-3 py-2 text-[11px] leading-4">
        <span className="block font-semibold text-zinc-800 dark:text-zinc-200">
          {screenshot.label}
        </span>
        <span className="block break-all font-mono text-zinc-500 dark:text-zinc-400">
          {screenshot.pageUrl}
        </span>
      </figcaption>
    </figure>
  );
}

export function ScreenshotGallery({
  runId,
  screenshots,
  columns = 2,
}: {
  runId: string;
  screenshots: ScreenshotRef[];
  columns?: 2 | 3;
}) {
  if (screenshots.length === 0) return null;
  return (
    <div
      className={`grid gap-3 ${columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      {screenshots.map((screenshot) => (
        <ScreenshotFigure key={screenshot.name} runId={runId} screenshot={screenshot} />
      ))}
    </div>
  );
}
