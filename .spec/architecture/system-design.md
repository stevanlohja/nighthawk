# System Design

## The organizing rule: separation of concerns

```
app/         Routes only — no logic. Compose providers + components.
providers/   Bind pure logic to React (context, WebSocket lifecycle, persistence).
components/  Render state. Presentational; receive data via props or provider hooks.
lib/         Pure TypeScript domain logic. ZERO React imports. Unit-testable in isolation.
content/     MDX content (runbooks, docs). Rendered, not logic.
```

> **The cardinal rule:** if it can be a pure function, it goes in `lib/`. React only enters at `providers/` and `components/`. This is what makes the domain logic testable without a browser and keeps render churn down. A reviewer who sees `import ... from "react"` in `lib/` should reject the change.

### `lib/` modules

- `telemetry/` — feed parser, wire types, per-network config (`networks.ts`), node classifier, the expected validator roster + roll-call (`roster.ts`), feed-endpoint helpers (`endpoints.ts`: default + validation/normalization for the user-configurable failover list).
- `state/` — `telemetry-reducer.ts`: the single pure state transition.
- `attestation/` — record types + composite scoring.
- `health/` — severity evaluation (`evaluateHealth`) + alert building (`buildAlerts`).
- `notify/` — Discord alert engine (edge-trigger/dedup) + webhook payloads.
- `reports/` — report model build + md/txt/json/csv renderers.
- `runbooks/`, `docs/` — manifest + static import registries for MDX.
- `executive/` — `metrics.ts` (executive rollups), `markers.ts` (globe markers).
- `cardano/` — `blockfrost.ts`: homepage Cardano epoch via a single cached Blockfrost call (budget: ~40k req/mo; project id public by design, inlined at build).
- `roadmap/` — product roadmap data (`product-roadmap.ts`): pure, hand-maintained workstreams for the dashboard itself — undated intentions, no calendar, no telemetry.
- `format.ts` — shared display formatters.

### `providers/`

- `TelemetryProvider` — owns the WebSocket lifecycle (connect, resubscribe per network, backoff, teardown) and dispatches parsed event batches into the reducer. Exposes `useTelemetry()`.
- `NotifyProvider` — the alert watcher → Discord webhook delivery (mounted in the root layout so it runs on every page).
- `ThemeProvider` — dark/light state, `localStorage` persistence, OS sync, pre-paint init script.
- `TourProvider` — first-visit product tour: step index + active state, with a `localStorage` "seen" flag so it auto-opens once. Steps are pure data in `lib/tour/steps.ts`; `TourOverlay` spotlights `data-tour` anchors in the nav and is replayable via the nav "?" button (`TourLauncher`).

## Data flow

```
wss telemetry feed
  → parseFeedMessage()            (lib/telemetry/feed.ts: raw → typed event batch)
  → dispatch({events})            (TelemetryProvider)
  → telemetryReducer()            (lib/state: one pure transition per message)
  → useTelemetry() context        (nodes, summary, attestation, recentBlocks, …)
  → buildExecutiveMetrics() / evaluateHealth() / buildReport()  (pure derivations)
  → components render
```

## Key design decisions (and why)

- **Reducer store, one render per message.** v0.1 called `setState` per feed event (dozens of renders). 2.0 parses each message into a batch and applies it in one pure reducer transition. All attestation bookkeeping lives in the reducer, testable without a browser.
- **Attestation keyed by node name.** Telemetry ids are reassigned on reconnect; names are stable. Keying by name lets uptime/authorship survive restarts.
- **Reports are a frozen model.** `buildReport()` snapshots live state into a serializable `ReportModel`; every renderer (md/txt/json/csv) is a pure function of that snapshot — so exports never read live state mid-render.
- **Theming via CSS variables.** Components only reference `mn-*` tokens, which resolve through `data-theme`-scoped variables. Every component is theme-aware with no per-component work; an inline head script applies the persisted theme before first paint (no flash).
- **Thresholds parameterized per network.** Expected validator count and peer target live in `lib/telemetry/networks.ts`, not hardcoded in UI.
- **The expected set is a named roster, not a number.** `lib/telemetry/roster.ts` lists the validators each network *should* have (mainnet: 13, provenance and verification date in the file); `networks.ts` derives `expectedValidators` from its length so the count and the roll-call can never disagree. Counting only what the feed shows makes a vanished validator invisible — "12/12 online" — so anything that reports a denominator (validator cards, alerts) takes it from the roster. Telemetry names only in that file: no operator entities, no overlay addresses, no endpoints. A roster miss is reported as **not reporting to telemetry**, never asserted as a down node.
- **Client-only, no server state.** Deploys to any static/serverless host. Persistence is `localStorage`. Browser-only APIs are feature-detected.
- **Configurable feed endpoints with failover.** The telemetry source is an ordered list (default `wss://telemetry.shielded.tools/feed/`), editable via the nav settings gear and persisted to `localStorage`. `TelemetryProvider`'s connect loop rotates to the next endpoint on each failed connection, so the dashboard fails over to a backup provider if the primary is down.
- **Cardano is context, not a second dashboard.** Midnight remains the subject; Cardano (the partner chain) appears only as an epoch card on the homepage, fed by one Blockfrost `GET /blocks/latest` cached in `localStorage` for 15 minutes (`lib/cardano/blockfrost.ts`). The project id (`BLOCKFROST_API_MAINNET`) is inlined at build time from `.env`/Actions secrets and is public by design — read-only, and budgeted (~40k of the 50k free monthly requests) by the cache. Midnight's epoch is *derived*, not fetched: `floor(best block ÷ 300)` per the 300-slot AURA epoch, labelled as derived in the UI.

## Routes (`app/`)

`/` (home) · `/executive` · `/dashboard` · `/attestation` · `/reports` · `/diagnostic` · `/runbooks` + `/runbooks/[slug]` · `/docs` + `/docs/[...slug]` · `/roadmap` · `/board` (full-screen kiosk; nav chrome suppressed).

## 🚫 Banned practices

- React imports in `lib/`.
- Hardcoded colors / non-`mn-*` styling that breaks theming.
- Adding a backend, server-side data store, or secret-bearing API.
- `setState` synchronously inside a `useEffect` body.
- Function-reference remark/MDX plugins in `next.config.ts` (must be string paths — Turbopack).
- Implying historical/time-series data the feed cannot provide.
- Bypassing the reducer to mutate telemetry state from a component.
