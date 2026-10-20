/**
 * First-visit product tour — pure data, no React.
 *
 * Each step optionally spotlights a DOM element matched by `target` (a CSS
 * selector against a `data-tour="…"` anchor). Steps with no `target` render as
 * a centered card (welcome / sign-off). The overlay that consumes these lives
 * in `components/tour/TourOverlay.tsx`; anchors are set in the nav.
 *
 * Bump the version suffix on STORAGE_KEY when the tour changes materially so
 * returning users are re-shown the updated walkthrough.
 */

export const TOUR_STORAGE_KEY = "mn-tour-seen-v3";

export interface TourStep {
  id: string;
  /** CSS selector for the element to spotlight. Omit for a centered step. */
  target?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Nighthawk",
    body: "A quick 60-second tour of the Midnight network observability dashboard — we'll point out where each key feature lives. Use Next, or press Esc to skip.",
  },
  {
    id: "network",
    target: '[data-tour="network"]',
    title: "Network switcher",
    body: "Switch between Preview, Preprod, and Mainnet. Every view re-scopes to the network you pick here.",
  },
  {
    id: "overview",
    target: '[data-tour="overview"]',
    title: "Executive Overview",
    body: "The resilience score, RAG health domains, the validator globe, and distribution panels — the whole network at a glance.",
  },
  {
    id: "dashboard",
    target: '[data-tour="dashboard"]',
    title: "Dashboard",
    body: "Live per-validator cards: health, block height, peers, and client version straight from the telemetry feed — click a card to expand the full detail.",
  },
  {
    id: "attestation",
    target: '[data-tour="attestation"]',
    title: "Attestation",
    body: "Track validator uptime and disconnects across the session to support operator attestation.",
  },
  {
    id: "reports",
    target: '[data-tour="reports"]',
    title: "Reports",
    body: "Generate and download operator reports from the current telemetry snapshot.",
  },
  {
    id: "resources",
    target: '[data-tour="resources"]',
    title: "Resources",
    body: "The product roadmap, guided diagnostic tree, runbooks, and FNO docs all live under here.",
  },
  {
    id: "notify",
    target: '[data-tour="notify"]',
    title: "Notifications",
    body: "Set up and preview alert routing for FNO communications.",
  },
  {
    id: "settings",
    target: '[data-tour="settings"]',
    title: "Telemetry settings",
    body: "Override the telemetry feed endpoint and add ordered fallbacks so the dashboard keeps running if a provider is down.",
  },
  {
    id: "theme",
    target: '[data-tour="theme"]',
    title: "That's the tour",
    body: "Toggle dark and light with the eye — it blinks. Replay this tour anytime from the ? button in the top bar.",
  },
];
