"use client";

/**
 * Nighthawk brand mark — a watchful eye outline (the hawk's eye on the
 * network). Uses `currentColor` so it follows the surrounding text token
 * (theme-aware, no invert hacks). Pure SVG, no image asset to keep in sync.
 */
export function NighthawkSymbol({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Eye outline */}
      <path d="M2 12s3.6-6.2 10-6.2S22 12 22 12s-3.6 6.2-10 6.2S2 12 2 12Z" />
      {/* Iris + pupil */}
      <circle cx="12" cy="12" r="2.8" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Symbol + stencil wordmark. Used in the nav and the board kiosk header. */
export default function NighthawkWordmark({
  className = "",
  labelClassName = "",
}: {
  className?: string;
  /** Extra classes for the "Nighthawk" text (e.g. collapse it on phones). */
  labelClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <NighthawkSymbol className="h-[1.4em] w-[1.4em] shrink-0 text-mn-accent" />
      <span
        className={`font-display font-semibold uppercase tracking-[0.28em] leading-none ${labelClassName}`}
      >
        Nighthawk
      </span>
    </span>
  );
}
