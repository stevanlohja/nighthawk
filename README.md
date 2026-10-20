# Nighthawk — Midnight Network Observability Dashboard

General observability dashboard for the core Midnight blockchain network and its FNO validators. Version 2.0 is a ground-up rework of the `po_dash_0.1` prototype with four headline additions: **validator attestation tracking**, **report generation**, **Discord webhook alerting**, and **dark/light theming** — on a modular architecture with strict separation of concerns.

Data source: the public Substrate telemetry feed at `wss://telemetry.shielded.tools/feed/` (Mainnet, Preprod, Preview), plus one cached Blockfrost call for Cardano epoch context on the homepage. Everything runs client-side in the browser; there is no backend or database. The Blockfrost project id (`BLOCKFROST_API_MAINNET`, set via `.env` locally and an Actions secret for Pages) is inlined into the static bundle — public by design, read-only, and budgeted to ~40k of the 50k free monthly requests by a 15-minute cache.

---

## Run locally

Requires Node.js 20+ (tested on 22) and pnpm (npm/yarn also work).

```bash
pnpm install
pnpm dev        # development server → http://localhost:3000
```

Production build:

```bash
pnpm build
pnpm start      # serves the optimized build → http://localhost:3000
pnpm lint       # eslint
```

The app is a Next.js App Router project with no server-side state — it deploys as-is to any serverless host (Vercel, Netlify, Cloudflare) or any box that can run `next start`.

---

## Pages

| Route | What it does |
|-------|--------------|
| `/` | Homepage: Midnight and Cardano epochs side by side (Midnight derived from the live feed, Cardano via Blockfrost), live validator/finality/block-time stats, quick links. |
| `/dashboard` | Real-time network health: best/finalized block, finality gap, block time, alerts with runbook links, and per-node card grids (validators, gateways, boot nodes) with click-to-expand details. |
| `/attestation` | Per-validator attestation: block authorship counts and share vs the expected round-robin share, finality lag, block propagation, uptime, connection flaps, and a composite 0–100 score. Includes a live feed of recently authored blocks. |
| `/reports` | Report builder: snapshot the current network state into Markdown, **plain text (Notifi-safe)**, JSON, or CSV. Toggle sections, then copy to clipboard, download, or print. |
| `/diagnostic` | Guided incident diagnostic tree (carried over from v0.1). |
| `/runbooks` | Runbook index + rendered runbook pages (wired up in 2.0 — these were dead stubs in v0.1). |
| `/docs` | Operator documentation (FNO guides, architecture, ADRs, FAQ), maintained in this repo and rendered natively in the dashboard theme. See [Documentation](#documentation). |
| `/roadmap` | Product roadmap: hand-maintained directional workstreams for Nighthawk itself (Cardano availability, non-db-sync topology, SOC-2 assurance templates, fork watching, network agents, governance monitoring). Intentions, not dated commitments. |

Theme toggle (dark/light) lives in the nav. Dark is the brand default; the choice persists in `localStorage` and respects the OS preference until you choose explicitly.

## Discord alerts

The bell icon in the nav configures push alerting to a Discord channel via webhook — no backend needed (Discord's webhook endpoint accepts browser POSTs directly). Paste a webhook URL (`https://discord.com/api/webhooks/<id>/<token>`), pick a trigger level, optionally add a role mention (`<@&role-id>`), and enable. Config persists in `localStorage`; alerting runs on every page since the watcher is mounted in the root layout.

Two trigger levels:

| Level | Fires on |
|-------|----------|
| **Consensus failures only** (default) | Validators below GRANDPA 2/3 (< 9), finality gap ≥ 7 blocks, avg block time > 30s, validator isolated (0 peers) |
| **Degradation + consensus failures** | Also validators at the finality floor, low peer counts, block time > 10s, finality gap ≥ 4 |

Delivery behavior (edge-triggered, in `lib/notify/engine.ts`):

- A new or escalated alert posts immediately (throttled to one evaluation per 5s).
- Still-active **critical** alerts re-post every 15 minutes; warnings post once until resolved.
- Recoveries post a green "resolved" embed.
- Alerting arms 30s after the feed goes live (and re-arms on reconnect/network switch) so bootstrap noise — e.g. "2/13 validators online" while the node list is still filling in — never pages anyone.
- Role/user mentions are only allowed when explicitly typed into the mention field; alert text itself can never ping.

### A note on attestation methodology

Telemetry does not expose signed block authorship, so the dashboard attributes a block to the **first node that reports a new height** on the feed. That is an observability heuristic — good for spotting validators that have silently stopped producing — not a cryptographic proof. Scores accumulate per dashboard session and reset on reload or network switch. The caveat is embedded in generated reports too.

The attestation score is a weighted composite (re-normalised when a component lacks data):

| Component | Weight | Signal |
|-----------|--------|--------|
| Presence | 0.35 | online + feed freshness, minus reconnect flaps |
| Authorship | 0.25 | observed share vs expected `1/n` round-robin share |
| Finality | 0.25 | node finalized height vs network finalized head |
| Peer health | 0.15 | peer count vs the network's expected peer target |

---

## Documentation

The `/docs` section renders the operator documentation directly inside the dashboard, in the dashboard's own theme rather than as a separate site — so there is no second look-and-feel to maintain.

Content is **maintained in this repo** as plain markdown under `content/docs/`. Two registries wire it up, and both are hand-edited:

- `lib/docs/manifest.ts` — the sidebar tree.
- `lib/docs/loader.ts` — the static MDX import registry.

When you add, rename, or remove a doc, update both: every manifest `slug` needs a matching loader key and a real file under `content/docs/`, or `/docs/[...slug]` renders nothing.

Admonitions use `remark-directive` containers (`:::note[Title]` … `:::`), styled as `.admonition` blocks via `app/globals.css`; inter-doc links are dashboard routes (`](/docs/...)`). Mermaid diagrams stay as fenced blocks and render client-side via `components/docs/Mermaid.tsx` (wired through a `pre` override in `mdx-components.tsx`), theme-aware with the rest of the dashboard.

---

## Architecture

Separation of concerns is the organizing rule: **`lib/` is pure TypeScript with zero React imports** (unit-testable in isolation), `providers/` binds that logic to React, `components/` renders it, `app/` only routes.

```
nighthawk/
├── app/                        # Routes only — no logic
│   ├── layout.tsx              # Fonts, providers, nav, theme-init script
│   ├── globals.css             # Theme tokens (dark/light CSS variables)
│   ├── dashboard/ attestation/ reports/ diagnostic/ roadmap/ runbooks/[slug]/
├── lib/                        # Pure domain logic (framework-free)
│   ├── telemetry/              # types, feed parser, network configs, node classifier
│   ├── state/                  # telemetry-reducer.ts — single pure state transition
│   ├── attestation/            # record types + composite scoring
│   ├── health/                 # severity evaluation + alert building
│   ├── notify/                 # Discord alert engine (edge-trigger/dedup) + webhook payloads
│   ├── reports/                # report model build + md/txt/json/csv renderers
│   ├── runbooks/ diagnostic/   # manifest/loader, diagnostic tree data
│   ├── roadmap/                # product roadmap data (static, hand-maintained)
│   └── format.ts               # shared display formatters
├── providers/
│   ├── TelemetryProvider.tsx   # WebSocket lifecycle → dispatch into reducer
│   ├── NotifyProvider.tsx      # alert watcher → Discord webhook delivery
│   └── ThemeProvider.tsx       # dark/light state, persistence, OS sync
├── components/
│   ├── ui/                     # Badge, Stat, PageHeader primitives
│   ├── layout/                 # SiteNav, ThemeToggle
│   ├── notify/                 # NotifyMenu (bell icon webhook settings)
│   ├── dashboard/ attestation/ reports/ roadmap/ runbooks/ diagnostic/
└── content/runbooks/           # Runbook markdown (rendered via MDX)
```

Key design decisions vs v0.1:

- **Reducer store.** v0.1 called `setState` once per feed event (a busy message could trigger dozens of renders). 2.0 parses each WebSocket message into an event batch and applies it in a single pure reducer transition — one render per message, and all attestation bookkeeping lives in `lib/state/telemetry-reducer.ts` where it can be tested without a browser.
- **Attestation keyed by node name.** Telemetry ids are reassigned on reconnect; names are stable. Records survive validator restarts, which is what makes session/disconnect counting possible.
- **Reports are a frozen model.** `buildReport()` snapshots live state into a serialisable `ReportModel`; renderers never touch live state, so every export format is a pure function of the same snapshot.
- **Theming via CSS variables.** Components only reference `mn-*` Tailwind tokens, which resolve through `data-theme`-scoped CSS variables — every component (including code carried over from v0.1) is theme-aware with no per-component work. An inline head script applies the persisted theme before first paint (no flash).
- **Thresholds parameterised per network.** Expected validator count (13) and peer target (17) live in `lib/telemetry/networks.ts` instead of being hardcoded through the UI.

## Operational thresholds

| Check | Warning | Critical |
|-------|---------|----------|
| Validators online (network-aware; finality floor = `floor(2N/3)+1`, e.g. 9 of 13) | at the floor (one fault from a stall, e.g. 9/13) | below the floor (below GRANDPA 2/3 — finality at risk, e.g. < 9/13) |
| Finality gap | ≥ 4 blocks | ≥ 7 blocks |
| Avg block time | > 10s | > 30s |
| Validator peers (mainnet, 17 expected) | below target | 0 (isolated) |

The validator-count check is **network-aware**: it derives from each network's expected federated set in `lib/telemetry/networks.ts` and the GRANDPA 2/3 finality floor — so a healthy federated set with spare margin (e.g. 13/13 or 10/13) is not flagged "reduced resilience." Networks with no fixed set (testnets, `expectedValidators: null`) are not count-judged; a genuine stall still surfaces via the finality-gap check. Alerts deep-link to the matching runbook under `/runbooks`.
