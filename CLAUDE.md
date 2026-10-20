# Nighthawk — AI Development Guide

Welcome, Assistant. This file is the always-loaded operational guide for the **Midnight network observability dashboard** (`nighthawk`).

> **CRITICAL:** The complete specification — purpose, architecture, standards, and user stories — lives in [`.spec/`](.spec/). **Read the relevant `.spec/` file(s) before writing code or proposing architecture changes.** Use the router below to pull in only what the task needs (don't load the whole directory).

This is a **100% client-side** Next.js app that visualizes the live Substrate telemetry feed, plus a single cached Blockfrost call for Cardano epoch context. There is no backend or database; the only embedded credential is the **public-by-design, read-only Blockfrost project id** (`BLOCKFROST_API_MAINNET` — see constraint 3).

---

## 🛠️ Operational Commands

Package manager is **pnpm** (Node 20+, tested on 22). Use these exact scripts; do not invent others.

- **Install:** `pnpm install`
- **Dev server:** `pnpm dev` → http://localhost:3000
- **Production build:** `pnpm build` (this also runs the TypeScript typecheck)
- **Serve build:** `pnpm start`
- **Lint:** `pnpm lint`

> **There is no test runner configured.** Do **not** run `pnpm test`. The verification gate is **`pnpm lint && pnpm build`** (a clean typecheck + lint). Adding a test framework is a tracked item in [`.spec/standards/hygiene-rules.md`](.spec/standards/hygiene-rules.md).

---

## 🎯 Project Blueprint Router (`.spec`)

| Read this… | …before you |
|---|---|
| [`.spec/project-purpose.md`](.spec/project-purpose.md) | Make any scope decision (prevents feature creep) |
| [`.spec/architecture/system-design.md`](.spec/architecture/system-design.md) | Add/modify data flow, state, providers, or routes |
| [`.spec/architecture/tech-stack.md`](.spec/architecture/tech-stack.md) | Add a dependency or use a framework feature |
| [`.spec/standards/coding-standards.md`](.spec/standards/coding-standards.md) | Write or refactor any component/module |
| [`.spec/standards/hygiene-rules.md`](.spec/standards/hygiene-rules.md) | Open a PR / decide "done" |
| [`.spec/user-stories/`](.spec/user-stories/) | Build a feature (read its acceptance criteria first) |
| [`.spec/workflows/`](.spec/workflows/) | Run a recurring task (onboarding, add-feature, review, spec-sync) |

---

## 🚫 Critical Constraints & Guardrails

These are the load-bearing rules of this codebase. Violating them breaks the architecture.

1. **`lib/` is pure TypeScript — ZERO React imports.** Domain logic lives in `lib/` (framework-free, unit-testable). `providers/` bind it to React, `components/` render it, `app/` only routes. Never put logic in a route or a `<Component>`.
2. **Theme tokens only.** Components reference `mn-*` Tailwind utilities (which resolve through `data-theme` CSS variables). **Never hardcode colors** — every component must work in dark and light.
3. **No backend, no DB.** Everything runs in the browser against a Substrate telemetry WebSocket feed — default `wss://telemetry.shielded.tools/feed/`, but **user-configurable with ordered failover** (see `lib/telemetry/endpoints.ts` + the provider's rotation loop). Persist user state in `localStorage`; **feature-detect** browser APIs (e.g. `wakeLock`, `requestFullscreen`). The one external API is **Cardano via Blockfrost** (`lib/cardano/blockfrost.ts`, homepage epoch card only): the project id `BLOCKFROST_API_MAINNET` comes from `.env` locally and a GitHub Actions secret for Pages, and is **inlined into the static bundle — public by design** (no server to proxy it). Keep that Blockfrost project read-only and the spend inside the ~40k/month budget: one cached endpoint (`GET /blocks/latest`, 15-minute `localStorage` TTL, no retry loops). Never add an uncached Blockfrost call.
4. **One pure reducer owns telemetry state** ([`lib/state/telemetry-reducer.ts`](lib/state/telemetry-reducer.ts)): each WebSocket message → one event batch → one render. Attestation is keyed by node **name** (telemetry ids churn on reconnect).
5. **No `setState` directly in a `useEffect` body** (the `react-hooks/set-state-in-effect` rule is enforced). Defer to a timer/`requestAnimationFrame`/event callback.
6. **Turbopack is the default bundler.** MDX remark plugins in [`next.config.ts`](next.config.ts) must be passed as **string paths**, never function references (Turbopack can't serialize functions across the loader boundary).
7. **Be honest about data.** The feed is session-scoped with only capped buffers — there is **no historical persistence**. Label anything modeled/approximate/session-scoped as such; never imply multi-day history.
8. **The expected validator set is a named roster.** [`lib/telemetry/roster.ts`](lib/telemetry/roster.ts) is the source of truth for which validators a network *should* have (mainnet: 13); `networks.ts` derives `expectedValidators` from it. Never take a denominator from "what the feed currently shows" — that hides a validator that has vanished ("12/12 online"). A roster miss is **"not reporting to telemetry"**, never asserted as a down node, and never claimed until the feed has settled (`useFeedSettled`). Telemetry names only in that file: no operator entities, no overlay addresses, no endpoints (this repo is public).
9. **Docs are hand-maintained in this repo.** `content/docs/**` is the source of truth — edit it directly; there is no external docs source to re-sync from. `lib/docs/manifest.ts` (sidebar nav) and `lib/docs/loader.ts` (import registry) must stay in sync with it: every manifest slug needs a matching loader key and a real file, or `/docs/[...slug]` renders nothing. The only remaining vendored file is `lib/executive/land-110m.json`.
10. **Verify before declaring done:** `pnpm lint && pnpm build` must be clean.
11. **Keep the spec in sync (mandatory).** Whenever a change introduces or alters a rule, constraint, command, dependency, route, or behavior that a [`.spec/`](.spec/) file or this `CLAUDE.md` describes, you **must** update the affected spec file(s) **and** this file in the *same* change — never let code and spec drift. Run the Spec Maintenance & Synchronization Protocol below (and [`.spec/workflows/spec-sync.md`](.spec/workflows/spec-sync.md)); if the impact is ambiguous, stop and emit a Context Gap Report instead of guessing.

---

## 🔄 Spec Maintenance & Synchronization Protocol

When you **add, modify, or delete anything under `.spec/`** (or change behavior that a spec describes), run this loop before finishing:

**1. Cross-check the root.** Re-read this `CLAUDE.md`. Ensure spec changes don't conflict with the Operational Commands, the Router, or the Critical Constraints. If a spec change invalidates this file (e.g. a new script, a renamed spec file, a changed constraint), **update this file in the same change.**

**2. Clarification gate — don't guess.** If you hit a vague acceptance criterion, a conflict with existing standards, or a missing schema/dependency/decision, **stop** and emit a Context Gap Report, then wait for the user:

```
### 🔍 Context Gap Report
- Ambiguity: <what is unclear or conflicting>
- Impact if guessed: <e.g. tech debt, broken build, wrong scope>
- Options:
  1. <option A>
  2. <option B>
- Need from you: <1–2 direct questions>
```

**3. Bidirectional update.** After clarification: update the target `.spec/` file, update the Router table above if a spec file was added/renamed, and summarize what changed and which constraints you checked.

---

## Tooling note

This file is the canonical router. [`LLM.md`](LLM.md) is a thin pointer to it for non-Claude tools; if you maintain `.cursorrules` or similar, mirror the constraints above.
