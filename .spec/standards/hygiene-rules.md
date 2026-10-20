# Hygiene Rules — Linting, Verification, "Done"

## The verification gate

Before declaring any change done, both must be clean:

```bash
pnpm lint     # eslint (flat config: eslint.config.mjs)
pnpm build    # next build — also runs the TypeScript typecheck
```

- A change that doesn't compile or introduces a lint **error** is not done.
- **The nav brand mark is pure SVG** (`components/ui/NighthawkWordmark.tsx` + the eye `ThemeToggle`) — no `<img>` elements, so no `@next/next/no-img-element` warnings to accept. Keep new chrome SVG/stroke-based rather than image assets.

> **There is no `pnpm test`.** Do not run or reference it. If asked to "add tests," first wire a runner (see below) — don't fabricate a passing test step.

## When a change touches docs

- Docs live in `content/docs/**` and are **hand-maintained**. When you add, rename, or remove a page, update `lib/docs/manifest.ts` (sidebar tree) **and** `lib/docs/loader.ts` (import registry) in the same change — a manifest slug with no importer renders nothing at `/docs/[...slug]`.

## Verifying behavior (not just compiling)

For anything visual or telemetry-driven, a clean build isn't proof it *works*. Run `pnpm dev`, open the affected route, and confirm the real behavior (the `/verify` and `review-and-verify` workflow). Canvas/live-data features (globe, board, tickers) only fully exercise in a browser against the live feed.

## PR / change criteria

- Scope the change; don't bundle unrelated refactors.
- Respect the Critical Constraints in `../../CLAUDE.md` (no React in `lib/`, `mn-*` tokens, no backend, reducer purity, no `setState` in effects, string remark plugins, honest data labels).
- If the change alters anything a `.spec/` file describes, follow the **Spec Maintenance & Synchronization Protocol** (`../workflows/spec-sync.md`) and update the spec + router in the same change.
- Clean up dev servers/background processes you start. Don't leave `next dev` running.
- Commit/push only when the user asks.

## Tracked gaps (intentional, not yet done)

- [ ] **No automated test runner.** `lib/` is pure and designed for unit tests, but none are wired. To add: prefer **Vitest** (fast, ESM/TS-native), put specs next to modules as `*.test.ts`, add a `test` script, and update `../../CLAUDE.md` Operational Commands + this file when it lands.
- [ ] No CI workflow. Lint/build are run locally.
