import type { ReactNode } from "react";

/**
 * Shared epoch card for the homepage — one per network. Pure presentational:
 * Midnight's epoch is derived from the telemetry feed, Cardano's comes from
 * Blockfrost; both render the same shape so the two chains read side by side.
 */
export default function EpochCard({
  label,
  source,
  epoch,
  progress,
  progressLabel,
  footer,
}: {
  /** Chain name, e.g. "Mainnet" (Midnight) / "Cardano". */
  label: string;
  /** Where the number comes from, e.g. "derived · 300-slot epochs". */
  source: string;
  epoch: number | null;
  /** 0–1 through the current epoch, or null while unknown. */
  progress: number | null;
  progressLabel: string;
  /** Small right-aligned note under the bar (freshness / provenance). */
  footer?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, progress ?? 0)) * 100;
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl px-5 py-4 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-sans uppercase tracking-wider text-mn-muted">{label}</p>
        <p className="font-mono text-[10px] text-mn-muted">{source}</p>
      </div>
      <p className="font-mono text-3xl sm:text-4xl font-semibold text-mn-text tabular-nums mt-1">
        {epoch !== null ? `Epoch ${epoch.toLocaleString()}` : "Epoch —"}
      </p>
      <div className="mt-3 h-1.5 bg-mn-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-mn-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] text-mn-text-2 tabular-nums">{progressLabel}</p>
        {footer}
      </div>
    </div>
  );
}
