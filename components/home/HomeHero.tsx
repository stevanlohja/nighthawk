"use client";

import Link from "next/link";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS, MIDNIGHT_SLOTS_PER_EPOCH } from "@/lib/telemetry/networks";
import { formatBlockNumber, formatBlockTime } from "@/lib/format";
import EpochCard from "./EpochCard";
import CardanoEpoch from "./CardanoEpoch";

/**
 * Homepage hero. The block-propagation scope animation is gone — the
 * centerpiece is now the two chains' epochs side by side: Midnight's derived
 * from the live telemetry feed, Cardano's from Blockfrost.
 */
export default function HomeHero() {
  const { nodes, summary, network, wsStatus } = useTelemetry();
  const cfg = NETWORKS[network];

  const live = wsStatus === "live";
  const validatorsOnline = nodes.filter((n) => n.isFno).length;
  const expected = cfg.expectedValidators;
  const bestBlock = summary && summary.bestBlock > 0 ? summary.bestBlock : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-5">
        <span className={`w-2 h-2 rounded-full ${live ? "bg-mn-ok animate-pulse" : "bg-mn-p3"}`} />
        <span className="font-mono text-[11px] uppercase tracking-widest text-mn-muted">
          {cfg.label} · {live ? "Live telemetry" : "Reconnecting"}
        </span>
      </div>

      <h1 className="font-display text-3xl sm:text-5xl font-semibold text-mn-text text-center uppercase tracking-[0.22em] leading-tight max-w-3xl pl-[0.22em]">
        Nighthawk
      </h1>
      <p className="text-mn-text-2 text-center mt-4 max-w-xl text-sm sm:text-base leading-relaxed">
        General observability for the Midnight blockchain network and its Cardano partner chain —
        live validator telemetry for the federated set, with Cardano epoch status alongside.
      </p>

      {/* ── Epoch status: Midnight (derived) + Cardano (Blockfrost) ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
        <MidnightEpoch bestBlock={bestBlock} networkLabel={cfg.label} />
        <CardanoEpoch />
      </div>

      {/* ── Live stat ticker ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mt-4">
        <HeroStat label="Validators" value={`${validatorsOnline}${expected ? `/${expected}` : ""}`} />
        <HeroStat
          label="Finalized"
          value={summary ? formatBlockNumber(summary.finalizedBlock) : "—"}
        />
        <HeroStat label="Block Time" value={formatBlockTime(summary?.avgBlockTime ?? null)} />
        <HeroStat label="Located Nodes" value={`${nodes.filter((n) => n.latitude != null).length}`} />
      </div>

      {/* ── CTAs ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link
          href="/executive"
          className="px-5 py-2.5 bg-mn-accent hover:bg-mn-accent-2 text-mn-on-accent text-sm font-medium rounded-full transition-colors"
        >
          Executive Overview
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border border-mn-border hover:border-mn-accent text-mn-text text-sm font-medium rounded-full transition-colors"
        >
          Network Health
        </Link>
      </div>
    </div>
  );
}

/**
 * Midnight epoch, derived: AURA epochs are 300 slots and block height doubles
 * as the slot counter (see content/docs/architecture/consensus-and-block-
 * production.md), so the epoch costs zero extra API calls. Labeled as derived
 * — it tracks block height, not an on-chain epoch announcement.
 */
function MidnightEpoch({
  bestBlock,
  networkLabel,
}: {
  bestBlock: number | null;
  networkLabel: string;
}) {
  const epoch = bestBlock !== null ? Math.floor(bestBlock / MIDNIGHT_SLOTS_PER_EPOCH) : null;
  const slot = bestBlock !== null ? bestBlock % MIDNIGHT_SLOTS_PER_EPOCH : null;

  return (
    <EpochCard
      label={networkLabel}
      source="derived · 300-slot epochs"
      epoch={epoch}
      progress={slot !== null ? slot / MIDNIGHT_SLOTS_PER_EPOCH : null}
      progressLabel={slot !== null ? `Slot ${slot}/300` : "waiting for feed"}
      footer={<span className="font-mono text-[10px] text-mn-muted">from block height</span>}
    />
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl px-4 py-3 text-center">
      <p className="text-[10px] text-mn-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono font-semibold text-mn-text mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
