/**
 * Cardano mainnet observability via the Blockfrost REST API — homepage epoch
 * card only. Midnight remains the subject of this dashboard; Cardano is
 * partner-chain context.
 *
 * BUDGET: the free tier is 50k requests/month and this app is budgeted for
 * 40k. The app asks for exactly ONE endpoint (GET /blocks/latest) and caches
 * the answer in localStorage for EPOCH_TTL_MS, so an active tab spends at
 * most one request per 15 minutes and a returning visitor inside the TTL
 * spends none. A Cardano epoch turns over every ~5 days and the tip every
 * ~20s — 15-minute granularity is far more than the display needs. Failed
 * fetches (429/5xx/offline) never retry within a session: the UI falls back
 * to the cached tip. Do not add uncached Blockfrost calls.
 *
 * SECURITY: the project id is inlined into the static bundle at build time
 * (next.config.ts `env`) because GitHub Pages has no server to proxy the
 * call — the key is PUBLIC by design. Keep the Blockfrost project read-only
 * and rotate it from the dashboard if the quota is ever drained.
 */

export const BLOCKFROST_BASE_URL = "https://cardano-mainnet.blockfrost.io/api/v0";

/** Cardano epoch length: 432,000 one-second slots ≈ 5 days (protocol constant). */
export const CARDANO_SLOTS_PER_EPOCH = 432_000;

/** Freshness window for the cached tip — see the budget note above. */
export const EPOCH_TTL_MS = 15 * 60 * 1000;

const CACHE_KEY = "mn-cardano-tip";

export interface CardanoTip {
  epoch: number;
  /** Slots elapsed in the current epoch (0..431_999). */
  epochSlot: number;
  /** Best block height at fetch time. */
  height: number;
  /** Wall-clock ms when Blockfrost answered. */
  fetchedAt: number;
}

/** Inlined at build time (next.config.ts `env`). Null when not configured. */
export function blockfrostKey(): string | null {
  const key = process.env.BLOCKFROST_API_MAINNET;
  return key ? key : null;
}

/** GET /blocks/latest — the only Blockfrost request this app makes. */
export async function fetchTip(projectId: string): Promise<CardanoTip> {
  const res = await fetch(`${BLOCKFROST_BASE_URL}/blocks/latest`, {
    headers: { project_id: projectId },
  });
  if (!res.ok) throw new Error(`Blockfrost /blocks/latest failed: ${res.status}`);
  const data = (await res.json()) as { epoch?: number; epoch_slot?: number; height?: number };
  if (typeof data.epoch !== "number" || typeof data.epoch_slot !== "number") {
    throw new Error("Blockfrost /blocks/latest returned an unexpected shape");
  }
  return {
    epoch: data.epoch,
    epochSlot: data.epoch_slot,
    height: data.height ?? 0,
    fetchedAt: Date.now(),
  };
}

/** Cached tip from an earlier visit, or null. Never throws (private mode, quota). */
export function readTipCache(): CardanoTip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const tip = JSON.parse(raw) as CardanoTip;
    if (
      typeof tip?.epoch !== "number" ||
      typeof tip?.epochSlot !== "number" ||
      typeof tip?.fetchedAt !== "number"
    ) {
      return null;
    }
    return tip;
  } catch {
    return null;
  }
}

export function writeTipCache(tip: CardanoTip): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tip));
  } catch {
    /* storage full/unavailable — the in-memory tip still renders */
  }
}
