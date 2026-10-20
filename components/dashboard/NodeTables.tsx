"use client";

import { useState, useEffect, useRef } from "react";
import { NodeState } from "@/lib/telemetry/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { RosterEntry, rosterStatus } from "@/lib/telemetry/roster";
import { peerSeverity, Severity } from "@/lib/health/health";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { formatUptime } from "@/lib/format";
import { useFeedSettled } from "./useFeedSettled";

// ── Metric configuration ────────────────────────────────────────────────────────

type ColKey = "version" | "peers" | "bestBlock" | "finalizedBlock" | "gap" | "txCount" | "bestHash" | "finalizedHash";

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: "version",        label: "Version" },
  { key: "peers",          label: "Peers" },
  { key: "bestBlock",      label: "Best Block" },
  { key: "finalizedBlock", label: "Finalized" },
  { key: "gap",            label: "Gap" },
  { key: "txCount",        label: "Tx Count" },
  { key: "bestHash",       label: "Block Hash" },
  { key: "finalizedHash",  label: "Fin. Hash" },
];

const DEFAULT_COLS: ColKey[] = ["version", "peers", "bestBlock", "finalizedBlock", "gap"];
const LS_KEY = "mn-node-cols";

/** Metrics shown on the collapsed card; the rest appear once it expands. */
const PRIMARY_METRIC_COUNT = 4;

function renderCell(key: ColKey, node: NodeState, network: NetworkId) {
  switch (key) {
    case "version":
      return node.version
        ? <span className="text-mn-text-2" title={node.version}>{node.version}</span>
        : <span className="text-mn-muted">—</span>;
    case "peers":
      return <span className={SEV_TEXT[peerSeverity(node.peers, network)]}>{node.peers}</span>;
    case "bestBlock":
      return node.bestBlock > 0 ? `#${node.bestBlock.toLocaleString()}` : "—";
    case "finalizedBlock":
      return node.finalizedBlock > 0 ? `#${node.finalizedBlock.toLocaleString()}` : "—";
    case "gap": {
      const gap =
        node.bestBlock > 0 && node.finalizedBlock > 0
          ? node.bestBlock - node.finalizedBlock
          : null;
      if (gap === null) return "—";
      const c = gap >= 7 ? "text-mn-p1" : gap >= 4 ? "text-mn-p3" : "text-mn-ok";
      return <span className={c}>{gap}</span>;
    }
    case "txCount":
      return node.txCount.toLocaleString();
    case "bestHash":
      return node.bestHash
        ? <span className="text-mn-muted" title={node.bestHash}>{node.bestHash.slice(0, 10)}…</span>
        : "—";
    case "finalizedHash":
      return node.finalizedHash
        ? <span className="text-mn-muted" title={node.finalizedHash}>{node.finalizedHash.slice(0, 10)}…</span>
        : "—";
  }
}

// ── Severity palette (mn-* tokens only) ────────────────────────────────────────

const SEV_TEXT: Record<Severity, string> = {
  ok: "text-mn-ok",
  warning: "text-mn-p3",
  critical: "text-mn-p1",
};
const SEV_BG: Record<Severity, string> = {
  ok: "bg-mn-ok",
  warning: "bg-mn-p3",
  critical: "bg-mn-p1",
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function NodeTables({ nodes }: { nodes: NodeState[] }) {
  const { network, summary } = useTelemetry();
  const cfg = NETWORKS[network];
  const isMainnet = network === "mainnet";
  const validatorLabel = isMainnet ? "FNO Validators" : "Validators";
  // Roll-call against the expected roster: which of the set is NOT reporting.
  const roll = rosterStatus(nodes, network);
  const settled = useFeedSettled();

  // Lazy init from localStorage. Safe against hydration mismatch: the cards
  // only render once live feed data arrives, long after hydration completes.
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLS;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved) as ColKey[];
    } catch { /* ignore */ }
    return DEFAULT_COLS;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const activeCols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  const fnoNodes     = nodes.filter((n) => n.nodeType === "fno-validator");
  const gatewayNodes = nodes.filter((n) => n.nodeType === "filter-gateway");
  const bootNodes    = nodes.filter((n) => n.nodeType === "boot");
  const otherNodes   = nodes.filter(
    (n) => !["fno-validator", "filter-gateway", "boot"].includes(n.nodeType)
  );

  const fnoOnline = fnoNodes.length;
  const expected = cfg.expectedValidators;
  const fnoColor =
    expected === null
      ? "text-mn-muted"
      : fnoOnline >= expected
      ? "text-mn-ok"
      : fnoOnline >= 9
      ? "text-mn-p3"
      : "text-mn-p1";

  const networkBest = summary?.bestBlock ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Shared metric picker toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-mn-muted">
          {nodes.length} nodes visible across {[fnoNodes, gatewayNodes, bootNodes, otherNodes].filter((g) => g.length > 0).length} groups
        </p>
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
              pickerOpen
                ? "border-mn-accent text-mn-text bg-mn-accent/10"
                : "border-mn-border text-mn-muted hover:border-mn-accent hover:text-mn-text"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Metrics
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 bg-mn-surface border border-mn-border rounded-xl shadow-xl py-2 min-w-40">
              <p className="px-3 pt-1 pb-2 text-[10px] font-mono text-mn-muted uppercase tracking-widest border-b border-mn-border mb-1">
                First {PRIMARY_METRIC_COUNT} show on collapsed cards
              </p>
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm text-mn-muted hover:text-mn-text hover:bg-mn-border/30 select-none"
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="w-3.5 h-3.5 accent-mn-accent"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validators */}
      <NodeSection
        label={validatorLabel}
        badge={
          <span className={`text-sm font-mono font-semibold ${fnoColor}`}>
            {fnoOnline}{expected ? `/${expected}` : ""} online
          </span>
        }
        nodes={fnoNodes}
        missing={roll?.missing ?? []}
        unlistedIds={new Set((roll?.unlisted ?? []).map((n) => n.id))}
        settled={settled}
        activeCols={activeCols}
        network={network}
        networkBest={networkBest}
        defaultOpen
        emptyMessage={`Waiting for validator data… ${validatorLabel} will appear once the feed connects.`}
      />

      {/* Filter Gateways */}
      {gatewayNodes.length > 0 && (
        <NodeSection
          label="Filter Gateways"
          nodes={gatewayNodes}
          activeCols={activeCols}
          network={network}
          networkBest={networkBest}
        />
      )}

      {/* Boot Nodes */}
      {bootNodes.length > 0 && (
        <NodeSection
          label="Boot Nodes"
          nodes={bootNodes}
          activeCols={activeCols}
          network={network}
          networkBest={networkBest}
        />
      )}

      {/* Other */}
      {otherNodes.length > 0 && (
        <NodeSection
          label="Other Nodes"
          nodes={otherNodes}
          activeCols={activeCols}
          network={network}
          networkBest={networkBest}
        />
      )}
    </div>
  );
}

// ── Shared card-grid section ───────────────────────────────────────────────────

function NodeSection({
  label,
  badge,
  nodes,
  missing = [],
  unlistedIds,
  settled = true,
  activeCols,
  network,
  networkBest = 0,
  defaultOpen = false,
  emptyMessage,
}: {
  label: string;
  badge?: React.ReactNode;
  nodes: NodeState[];
  /** Expected-roster entries with no node in the feed (see lib/telemetry/roster.ts). */
  missing?: RosterEntry[];
  /** Ids of nodes reporting but absent from the roster — the drift guard. */
  unlistedIds?: Set<number>;
  /** False while the feed is still filling in, so misses read "waiting", not "down". */
  settled?: boolean;
  activeCols: { key: ColKey; label: string }[];
  network: NetworkId;
  /** Network best block, for the "behind network" detail on expanded cards. */
  networkBest?: number;
  defaultOpen?: boolean;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Ticking clock for the uptime detail — only runs while a card is expanded.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expandedId === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expandedId]);

  const hasAlert = nodes.some((n) => n.peers === 0) || (settled && missing.length > 0);

  function toggleCard(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="bg-mn-surface border border-mn-border rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-mn-border/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-3.5 h-3.5 text-mn-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-mn-muted uppercase tracking-wider">
            {label}
          </span>
          {hasAlert && <span className="w-1.5 h-1.5 rounded-full bg-mn-p1" />}
        </div>
        <div className="flex items-center gap-3">
          {badge ?? (
            <span className={`text-sm font-mono font-semibold ${hasAlert ? "text-mn-p1" : "text-mn-muted"}`}>
              {nodes.filter((n) => n.peers > 0).length}/{nodes.length} online
            </span>
          )}
        </div>
      </button>

      {/* Card grid */}
      {open && (
        <div className="border-t border-mn-border">
          {nodes.length === 0 && missing.length === 0 && emptyMessage ? (
            <div className="px-4 py-8 text-center">
              <p className="text-mn-muted text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    activeCols={activeCols}
                    network={network}
                    networkBest={networkBest}
                    now={now}
                    unlisted={unlistedIds?.has(node.id) ?? false}
                    expanded={expandedId === node.id}
                    onToggle={() => toggleCard(node.id)}
                  />
                ))}

                {/* Roll-call misses: expected, but nothing in the feed. */}
                {missing.map((entry) => (
                  <MissingCard
                    key={`missing:${entry.name}`}
                    entry={entry}
                    activeCols={activeCols}
                    settled={settled}
                  />
                ))}
              </div>
              {settled && missing.length > 0 && (
                <p className="border-t border-mn-border px-4 py-2.5 text-[11px] leading-relaxed text-mn-muted">
                  {missing.length === 1 ? "1 node" : `${missing.length} nodes`} on the expected set
                  {missing.length === 1 ? " is" : " are"} sending nothing to telemetry. That can be a
                  down validator or only a broken telemetry link — confirm against the node before
                  treating it as an outage.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────────

const CARD_IDLE = "border-mn-border bg-mn-bg hover:border-mn-accent/30 hover:bg-mn-surface-2";
const CARD_OPEN = "border-mn-accent/40 bg-mn-surface-2";

function NodeCard({
  node,
  activeCols,
  network,
  networkBest,
  now,
  unlisted,
  expanded,
  onToggle,
}: {
  node: NodeState;
  activeCols: { key: ColKey; label: string }[];
  network: NetworkId;
  networkBest: number;
  now: number;
  unlisted: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sev = peerSeverity(node.peers, network);
  const primary = activeCols.slice(0, PRIMARY_METRIC_COUNT);
  const rest = activeCols.slice(PRIMARY_METRIC_COUNT);
  const gap =
    node.bestBlock > 0 && node.finalizedBlock > 0 ? node.bestBlock - node.finalizedBlock : null;
  const behind = networkBest > 0 && node.bestBlock > 0 ? networkBest - node.bestBlock : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
        expanded ? CARD_OPEN : CARD_IDLE
      }`}
    >
      {/* Header: status dot + name + roster badge */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`w-2 h-2 rounded-full shrink-0 ${SEV_BG[sev]}`} />
        <span className="font-mono text-xs text-mn-text truncate flex-1">{node.name}</span>
        {unlisted && (
          <span
            className="rounded border border-mn-p3/30 bg-mn-p3/10 px-1.5 py-0.5 text-[9px] font-sans uppercase tracking-wider text-mn-p3 shrink-0"
            title="Reporting, but not on the expected roster — a rename or an addition. Update lib/telemetry/roster.ts."
          >
            unlisted
          </span>
        )}
        <svg
          aria-hidden="true"
          className={`w-3.5 h-3.5 text-mn-muted shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {primary.map((col) => (
          <MetricCell key={col.key} label={col.label}>
            {renderCell(col.key, node, network)}
          </MetricCell>
        ))}
      </div>

      {/* Expanded: remaining metrics + full node detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-mn-border animate-[fadeSlide_0.15s_ease]">
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
              {rest.map((col) => (
                <MetricCell key={col.key} label={col.label}>
                  {renderCell(col.key, node, network)}
                </MetricCell>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {node.bestHash && (
              <DetailRow label="Best Hash" value={<span className="break-all">{node.bestHash}</span>} />
            )}
            {node.finalizedHash && (
              <DetailRow label="Fin. Hash" value={<span className="break-all">{node.finalizedHash}</span>} />
            )}
            {gap !== null && (
              <DetailRow
                label="Finality Gap"
                value={
                  <span className={gap >= 7 ? "text-mn-p1" : gap >= 4 ? "text-mn-p3" : "text-mn-ok"}>
                    {gap} blocks
                  </span>
                }
              />
            )}
            {behind !== null && behind > 0 && (
              <DetailRow
                label="Behind Network"
                value={
                  <span className={behind > 5 ? "text-mn-p1" : behind > 2 ? "text-mn-p3" : "text-mn-ok"}>
                    {behind} blocks
                  </span>
                }
              />
            )}
            {node.blockPropagationMs !== null && (
              <DetailRow label="Propagation" value={`${node.blockPropagationMs}ms`} />
            )}
            {node.implementation && <DetailRow label="Implementation" value={node.implementation} />}
            {node.version && <DetailRow label="Version" value={<span className="break-all">{node.version}</span>} />}
            {node.os && <DetailRow label="OS" value={node.os} />}
            {node.cpuArch && <DetailRow label="Architecture" value={node.cpuArch} />}
            {node.environment && <DetailRow label="Environment" value={node.environment} />}
            <DetailRow label="Uptime" value={formatUptime(node.startupTime, now)} />
          </div>
        </div>
      )}
    </button>
  );
}

/** Roll-call miss: expected on the roster, but nothing in the feed. */
function MissingCard({
  entry,
  activeCols,
  settled,
}: {
  entry: RosterEntry;
  activeCols: { key: ColKey; label: string }[];
  settled: boolean;
}) {
  return (
    <div className="rounded-xl border border-mn-border bg-mn-bg p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`w-2 h-2 rounded-full shrink-0 ${settled ? "bg-mn-p1" : "bg-mn-muted"}`} />
        <span className="font-mono text-xs text-mn-muted truncate flex-1">{entry.name}</span>
        {settled ? (
          <span
            className="rounded border border-mn-p1/30 bg-mn-p1/10 px-1.5 py-0.5 text-[9px] font-sans uppercase tracking-wider text-mn-p1 shrink-0"
            title="On the expected set, but sending nothing to telemetry. May be a down node or only a broken telemetry link."
          >
            not reporting
          </span>
        ) : (
          <span className="rounded border border-mn-border px-1.5 py-0.5 text-[9px] font-sans uppercase tracking-wider text-mn-muted shrink-0">
            waiting for feed
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {activeCols.slice(0, PRIMARY_METRIC_COUNT).map((col) => (
          <MetricCell key={col.key} label={col.label}>
            <span className="text-mn-muted">—</span>
          </MetricCell>
        ))}
      </div>
    </div>
  );
}

function MetricCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-sans uppercase tracking-wider text-mn-muted">{label}</p>
      <p className="mt-0.5 font-mono text-xs text-mn-text tabular-nums truncate">{children}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10px] font-sans uppercase tracking-wider text-mn-muted shrink-0 mt-0.5">{label}</span>
      <span className="font-mono text-xs text-mn-text text-right">{value}</span>
    </div>
  );
}

