"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/providers/ThemeProvider";

/**
 * Theme switch as an eye: a plain outline in light theme; in dark theme the
 * iris ignites — an orange ember with a slow glow. Clicking makes the eye
 * blink and flips the theme while the lid is shut. All motion honors
 * prefers-reduced-motion: instant toggle, no glow pulse.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [blinking, setBlinking] = useState(false);
  const timers = useRef<number[]>([]);

  // Don't leave a pending blink callback behind on unmount.
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  function handleClick() {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      toggleTheme();
      return;
    }
    // Drop the lid, swap the theme mid-blink, then reopen.
    timers.current.forEach(window.clearTimeout);
    setBlinking(true);
    timers.current = [
      window.setTimeout(() => toggleTheme(), 140),
      window.setTimeout(() => setBlinking(false), 320),
    ];
  }

  return (
    <button
      onClick={handleClick}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="p-1.5 rounded-lg border border-mn-border text-mn-muted hover:text-mn-text hover:bg-mn-surface-2 transition-colors"
    >
      <svg
        className={`w-4 h-4 ${blinking ? "eye-blink" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Eye outline */}
        <path d="M2 12s3.6-6.2 10-6.2S22 12 22 12s-3.6 6.2-10 6.2S2 12 2 12Z" />
        {/* Iris — plain outline in light, glowing ember in dark */}
        {isDark ? (
          <circle
            className="theme-eye-glow"
            cx="12"
            cy="12"
            r="2.8"
            fill="var(--mn-iris, #ff7a1a)"
            stroke="none"
          />
        ) : (
          <circle cx="12" cy="12" r="2.8" />
        )}
      </svg>
    </button>
  );
}
