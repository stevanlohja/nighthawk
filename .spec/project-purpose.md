# Project Purpose

## Elevator pitch

**Nighthawk** is a **general observability dashboard for the core Midnight blockchain network** and the Federated Node Operators (FNOs) that run it. It reads the public Substrate telemetry feed live in the browser and turns it into network health, per-validator attestation, exportable reports, incident diagnostics, and an at-a-glance overview/board view. It runs entirely client-side — no backend, no database, no API keys — so it deploys anywhere static and exposes no secrets.

## North star

> Give **anyone watching the Midnight network** a **truthful, real-time, single-pane** view of network health and validator behavior — fast enough to catch a consensus or finality problem before it escalates, and honest about the limits of what telemetry can prove.

## Primary users / personas

- **Node operator / FNO** (primary): watches finality/consensus, triages incidents, generates reports, fields FNO issues.
- **Independent observer**: wants a glanceable "is the network healthy?" read — the Overview (`/executive`) and Board (kiosk) mode.
- **Documentation reader**: uses the rendered FNO docs and runbooks as reference.

The audience is technical, independent, and time-pressured. Lead with signal; never bury the one number that matters.

## Networks

Mainnet, Preprod, Preview — switchable in the nav. Thresholds (expected validator count, peer target) are parameterized per network in `lib/telemetry/networks.ts`.

Cardano mainnet is shown as partner-chain context on the homepage (epoch + progress) via the Blockfrost API — budgeted at ~40k requests/month with a 15-minute cache. It is not a switchable network; Midnight remains the subject.

## In scope

- Live network health (best/finalized block, finality gap, block time, per-node cards, alerts).
- Validator attestation (authorship share, finality lag, propagation, uptime, composite score) — as an **observability heuristic**, not cryptographic proof.
- Report generation (Markdown / Notifi-safe plain text / JSON / CSV) from a frozen snapshot.
- Discord webhook alerting (browser → webhook, edge-triggered).
- Incident diagnostic tree + rendered FNO runbooks + vendored ops docs.
- Product roadmap (`/roadmap`) — hand-maintained, clearly-labeled directional workstreams for Nighthawk itself; intentions, not dated commitments and not telemetry.
- Overview (`/executive`) and full-screen Board (kiosk) mode.
- Dark/light theming on the dashboard's tactical palette.

## OUT of scope (guardrails against creep)

- **No backend, server state, database, or authenticated API.** If a feature needs one, it does not belong here — raise it instead of adding a server.
- **No historical/time-series persistence.** Telemetry is session-scoped (only capped in-memory buffers). Do not imply multi-day trends without an explicit, labeled persistence design.
- **No secrets in the client.** No private keys, no privileged API tokens.
- **Not the source of truth for ops data.** Operator identities, IPs, and runbook *content* live upstream (e.g. the `midnight-network-ops` repo), not in this app. This app *visualizes* and *links*, it doesn't own that data.
- **Attestation is not consensus-grade proof.** It attributes a block to the first node to report a height — good for spotting silent stoppage, not for slashing/rewards decisions.

## Definition of success

Anyone can open the dashboard and, within seconds, know whether the network is healthy, which validators are misbehaving, and where the matching runbook is — and can export a shareable snapshot without touching a terminal.
