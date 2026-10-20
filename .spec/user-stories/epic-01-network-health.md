# Epic 01 — Network Health Monitoring

**Status:** Shipped (`/dashboard`). This is the worked example of how to write a story in this repo: `As a… I want… So that…` + checkable acceptance criteria. AIs should tick `- [ ]` → `- [x]` as criteria are met and link the implementing files.

---

## Story 1.1 — At-a-glance network status

> **As a** Midnight network observer
> **I want** the current best block, finalized block, finality gap, and average block time on one screen
> **So that** I can tell within seconds whether the network is producing and finalizing blocks.

**Acceptance criteria**
- [x] Best/finalized block and finality gap render from `useTelemetry()` summary.
- [x] Average block time shown in seconds.
- [x] Values update live as feed messages arrive (one render per message via the reducer).
- [x] Severity coloring uses `mn-*` tokens and the thresholds in `lib/telemetry/networks.ts` / `lib/health/health.ts`.

_Implemented in:_ `components/dashboard/*`, `lib/health/health.ts`.

## Story 1.2 — Severity alerts with runbook links

> **As an** on-call operator
> **I want** active alerts (low validator count, finality gap, block time, isolated peers) with a link to the matching runbook
> **So that** I can go from "something's wrong" to "here's the procedure" in one click.

**Acceptance criteria**
- [x] `buildAlerts()` derives alerts purely from nodes + summary + network.
- [x] Each alert shows severity (ok/warning/critical) and message.
- [x] Alerts deep-link to `/runbooks/<slug>` where one exists.
- [x] Validator-count severity is network-aware: derived from each network's expected set and the GRANDPA 2/3 finality floor (`floor(2N/3)+1`) — warning at the floor, critical below it; networks with no fixed set are not count-judged. Finality gap ≥4/≥7; block time >10s/>30s; peers: 0 = critical isolation on any network, and **mainnet alone warns at 1 peer** (`peerSeverity()` in `lib/health/health.ts`) — sitting under the healthy 17-peer target is deliberately NOT flagged, since mainnet routinely reports fewer peers than the target.
- [x] **Roll-call alerts name the absent node.** Every expected-roster validator (`lib/telemetry/roster.ts`) with nothing in the feed raises its own `warning` alert naming it — a count ("12/13") does not say which node to chase, and a set above the finality floor raises no count alert at all. Warning, not critical, and worded "may be offline": absence from telemetry can be a broken telemetry link rather than a down validator.

## Story 1.3 — Per-node card grid with detail

> **As an** operator
> **I want** validator/gateway/boot-node cards in a grid, with details expanding on click
> **So that** I can inspect a specific node's peers, version, software, and blocks.

**Acceptance criteria**
- [x] Nodes grouped by type; metrics configurable via the **Metrics** picker and persisted to `localStorage`. A **Version** metric (reported client version) shows by default alongside peers/blocks/gap; the first four metrics show on the collapsed card, the rest on expand.
- [x] Clicking a card expands its details inline (blocks, hashes, software, system) with a subtle hover state; clicking again collapses it. Node location is deliberately NOT shown per node — geography is aggregated on the executive globe only.
- [x] Peer count and finality gap colored by severity.
- [x] **The validator list is a roll-call, not just a list.** Where the network has an expected roster (`lib/telemetry/roster.ts` — mainnet's 13), entries with nothing in the feed render as their own cards tagged **not reporting** (red dot, dashes for every metric), so the answer to "which one is down?" is on screen instead of implied by a count. A reporting validator that is *not* on the roster is tagged **unlisted**, which makes roster drift (a rename, a new node) visible rather than silently miscounted. Misses read **waiting for feed** until the feed has been continuously live for 20s (`components/dashboard/useFeedSettled.ts`) — the node list fills in over several seconds after connect, and bootstrap is not an outage. A footnote states that absence from telemetry may be a broken telemetry link rather than a down node.

---

## Template for new stories

```md
## Story X.Y — <short title>
> As a <persona> I want <capability> So that <value>.

**Acceptance criteria**
- [ ] <observable, testable condition>
- [ ] <…>

_Notes:_ edge cases, OUT-of-scope, data caveats (label modeled/approx/session-scoped).
_Implemented in:_ <paths once built>
```
