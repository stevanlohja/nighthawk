# Feature Backlog

Single list of capability areas: what's shipped (the contract the app must keep honoring) and candidate work. Keep this in sync as features land or are cut.

## ✅ Shipped (must keep working)

- [x] **Network health** (`/dashboard`) — see `epic-01-network-health.md`.
- [x] **Cardano partner-chain epoch** (homepage) — Midnight + Cardano epoch cards side by side (the old hero animation was removed). Midnight's epoch is derived from block height (300-slot AURA epochs); Cardano's comes from Blockfrost `GET /blocks/latest` with a 15-minute `localStorage` cache (budget: ~40k of the 50k free req/mo; failures never retry within a session). Key: `BLOCKFROST_API_MAINNET` — `.env` locally, GitHub Actions secret for Pages; inlined into the static bundle, public by design, read-only.
- [x] **Validator attestation** (`/attestation`) — authorship share vs expected round-robin, finality lag, propagation, uptime, disconnect flaps, composite 0–100 score. Methodology caveat shown (first-report heuristic, session-scoped).
- [x] **Report builder** (`/reports`) — frozen `ReportModel` → Markdown / **Notifi-safe plain text** / JSON / CSV; copy/download/print.
- [x] **Discord alerting** (nav bell) — browser → webhook, edge-triggered, dedup/escalation/recovery, role-mention guardrails. Config in `localStorage`.
- [x] **Subscribe to official announcements** (nav bell, top section) — outbound link to Midnight Notifi (`https://midnight.notifi.network/`) so any visitor can subscribe to the Midnight Network Operations topic (Discord/Email/SMS/Telegram). Distinct from the personal Discord-webhook config below it. The bell does a one-time periodic wiggle (+ accent dot) for first-time visitors to invite a click, stopping once the menu is opened (remembered in `localStorage`); honors `prefers-reduced-motion`.
- [x] **Diagnostic tree** (`/diagnostic`) — guided incident triage.
- [x] **Runbooks** (`/runbooks`) — MDX runbooks via static import registry + manifest.
- [x] **FNO docs** (`/docs`) — maintained in `content/docs/**` in this repo, rendered in-theme (admonitions → directives, mermaid client-side).
- [x] **Executive overview** (`/executive`) — resilience score (availability 45% / finality 35% / stability 20% — decentralization is intentionally **not** scored), RAG domains, a **Network Model** card stating the federated-by-design posture per environment, validator globe (real continents, d3-geo), distribution panels (a Geographic Zone panel buckets validators into continental zones by lat/lng — Europe, Americas, etc. — folding any tail into an "Other" bucket so shares sum to 100%; an Infrastructure Provider panel is a "coming soon" placeholder until the feed exposes that data), reliability strip; "Present" link to board. No operating-cost/economics figures are shown.
- [x] **Board mode** (`/board`) — full-screen kiosk: resilience gauge, globe, rotating KPI spotlight, block/alert tickers; wake-lock, fullscreen, idle-cursor; nav chrome suppressed.
- [x] **Theming** — dark/light on the Midnight palette via `mn-*` CSS-variable tokens.
- [x] **Configurable telemetry endpoints** (nav settings gear) — user-editable ordered feed-URL list (primary + fallbacks), persisted in `localStorage`, with automatic failover when a provider is unreachable and reset-to-default. Logic in `lib/telemetry/endpoints.ts` + `TelemetryProvider`.
- [x] **First-visit product tour** — a guided spotlight overlay that auto-opens once (tracked by a `localStorage` "seen" flag) and walks through the key nav features (network switcher, Overview/Dashboard/Attestation/Reports, Resources, notifications, settings, theme). Replayable anytime via the nav "?" button. In-house (no tour dependency); steps in `lib/tour/steps.ts`, state in `TourProvider`, rendered by `TourOverlay` against `data-tour` anchors. Suppressed in board kiosk mode.

- [x] **Product roadmap** (`/roadmap`, Resources dropdown) — hand-maintained directional workstreams for Nighthawk itself: Cardano availability, non-db-sync infrastructure topology, SOC-2-oriented runbooks/templates, Midnight fork watcher, network agents with gated self-improvement, and Substrate governance + Cardano partner-chain contract-event monitoring. Static curated data in `lib/roadmap/product-roadmap.ts`, rendered in-theme. Deliberately **not** the removed calendar or change board: no dates, no projections, no telemetry — undated intentions with honest hand-flipped statuses.

## 💡 Candidate / not committed

Ideas surfaced but **not** in scope until explicitly accepted (and only if they respect the OUT-of-scope guardrails in `../project-purpose.md`):

- [ ] Living-globe propagation arcs (great-circle peer mesh + per-block pulse).
- [ ] AI "State of the Network" briefing from a `ReportModel` snapshot (needs an API-key/proxy decision — currently no backend).
- [ ] Persisted local time-series for real trend windows (needs an explicit, labeled persistence design — today the app is session-scoped by design).
- [ ] Availability / network-health report card export.
- [ ] Automated test runner (Vitest) — see `../standards/hygiene-rules.md`.

> A previous broad "FNO Coordination" suite (readiness/versions/epoch) was prototyped and **removed** at the user's request. A **focused, telemetry-backed readiness signal** was later re-added (2026-06-26, by user request) on the Network Change board/banner; the **Network Change board, the Roadmap calendar, and all SLA/target wording** were then cut entirely (2026-10-09, by user request) — availability is reported as a plain figure with no target. Don't rebuild a change board, a planning calendar, or an availability target without a fresh decision. (Later on 2026-10-09 a **product** roadmap page was added — static, undated workstreams for the dashboard itself — which is deliberately none of those three things.)
