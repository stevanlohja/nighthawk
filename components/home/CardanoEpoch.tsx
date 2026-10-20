"use client";

import { useEffect, useState } from "react";
import {
  CARDANO_SLOTS_PER_EPOCH,
  EPOCH_TTL_MS,
  blockfrostKey,
  fetchTip,
  readTipCache,
  writeTipCache,
  type CardanoTip,
} from "@/lib/cardano/blockfrost";
import { formatAgo } from "@/lib/format";
import EpochCard from "./EpochCard";

const SLOTS_PER_DAY = 86_400; // 1s slots → a Cardano day inside the epoch

type TipStatus = "loading" | "live" | "cached" | "error" | "unconfigured";

/**
 * Cardano epoch card. Budget guard: a cached tip inside EPOCH_TTL_MS renders
 * as-is and NO request is made; only an absent or stale cache spends one
 * GET /blocks/latest. Failures never retry within a session (429/5xx/offline
 * fall back to the cached tip or an "unavailable" note) — see
 * lib/cardano/blockfrost.ts for the monthly request budget math.
 */
export default function CardanoEpoch() {
  const [tip, setTip] = useState<CardanoTip | null>(null);
  const [status, setStatus] = useState<TipStatus>("loading");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const key = blockfrostKey();
      if (!key) {
        setStatus("unconfigured");
        return;
      }
      const cached = readTipCache();
      if (cached) {
        setTip(cached);
        if (Date.now() - cached.fetchedAt < EPOCH_TTL_MS) {
          setStatus("live"); // fresh enough — spend no request
          return;
        }
        setStatus("cached"); // show stale data while we try to refresh
      }
      try {
        const fresh = await fetchTip(key);
        if (cancelled) return;
        writeTipCache(fresh);
        setTip(fresh);
        setStatus("live");
      } catch {
        if (!cancelled) setStatus((s) => (s === "loading" ? "error" : s));
      }
    }

    // Deferred to a timer so setState never runs directly in the effect body
    // (react-hooks/set-state-in-effect) — same pattern as useFeedSettled.
    const kick = setTimeout(load, 0);
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      clearTimeout(kick);
      clearInterval(clock);
    };
  }, []);

  const progress = tip ? tip.epochSlot / CARDANO_SLOTS_PER_EPOCH : null;
  const day = tip ? Math.min(5, Math.floor(tip.epochSlot / SLOTS_PER_DAY) + 1) : null;

  const footer =
    status === "unconfigured" ? (
      <span className="font-mono text-[10px] text-mn-muted">key not configured</span>
    ) : status === "loading" ? (
      <span className="font-mono text-[10px] text-mn-muted">loading…</span>
    ) : status === "error" ? (
      <span className="font-mono text-[10px] text-mn-p3">Blockfrost unavailable</span>
    ) : status === "cached" ? (
      <span className="font-mono text-[10px] text-mn-p3">cached · refresh failed</span>
    ) : (
      <span className="font-mono text-[10px] text-mn-muted">
        Blockfrost · updated {formatAgo(tip?.fetchedAt ?? null, now)}
      </span>
    );

  return (
    <EpochCard
      label="Cardano"
      source="Blockfrost · mainnet"
      epoch={tip?.epoch ?? null}
      progress={progress}
      progressLabel={day !== null ? `Day ${day}/5` : "waiting for data"}
      footer={footer}
    />
  );
}
