"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TREE,
  TOTAL_STEPS,
  NodeKey,
  QuestionNode,
  OutcomeNode,
} from "@/lib/diagnostic/tree-data";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NodeState, NetworkSummary } from "@/lib/telemetry/types";
import { peerSeverity, Severity } from "@/lib/health/health";

interface TreeState {
  current: NodeKey;
  history: NodeKey[];
  crumbs: string[];
}

const INITIAL: TreeState = { current: "start", history: [], crumbs: [] };

const SEV_BG: Record<Severity, string> = {
  ok: "bg-mn-ok",
  warning: "bg-mn-p3",
  critical: "bg-mn-p1",
};
const SEV_TEXT: Record<Severity, string> = {
  ok: "text-mn-ok",
  warning: "text-mn-p3",
  critical: "text-mn-p1",
};

export default function DiagnosticTree() {
  const [state, setState] = useState<TreeState>(INITIAL);
  const { nodes, summary } = useTelemetry();
  const fnoNodes = nodes.filter((n) => n.isFno);

  function choose(side: "yes" | "no") {
    const node = TREE[state.current];
    if (node.type !== "question") return;
    const chosen = node[side];
    setState((prev) => ({
      current: chosen.next,
      history: [...prev.history, prev.current],
      crumbs: [...prev.crumbs, chosen.crumb],
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      return {
        current: prev.history[prev.history.length - 1],
        history: prev.history.slice(0, -1),
        crumbs: prev.crumbs.slice(0, -1),
      };
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    setState(INITIAL);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const node = TREE[state.current];
  const progress = Math.min(100, (state.crumbs.length / TOTAL_STEPS) * 100);
  const canGoBack = state.history.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-0">
      {/* Progress bar */}
      <div className="w-full h-0.5 bg-mn-border rounded-full mb-8">
        <div
          className="h-full bg-mn-accent rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Breadcrumb */}
      {state.crumbs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-7 font-mono text-[10px]">
          {state.crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-mn-accent">{crumb}</span>
              {i < state.crumbs.length - 1 && (
                <span className="text-mn-border">›</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Main card */}
      {node.type === "question" && (
        <QuestionCard
          node={node}
          nodeKey={state.current}
          nodes={nodes}
          fnoNodes={fnoNodes}
          summary={summary}
          onChoose={choose}
          onBack={goBack}
          canGoBack={canGoBack}
        />
      )}
      {node.type === "outcome" && (
        <OutcomeCard
          node={node}
          crumbs={state.crumbs}
          onRestart={restart}
          onBack={goBack}
          canGoBack={canGoBack}
        />
      )}
      {node.type === "healthy" && (
        <HealthyCard onRestart={restart} onBack={goBack} canGoBack={canGoBack} />
      )}
    </div>
  );
}

// ── Live data panels ───────────────────────────────────────────────────────────

function LiveDataPanel({
  nodeKey,
  nodes,
  fnoNodes,
  summary,
}: {
  nodeKey: NodeKey;
  nodes: NodeState[];
  fnoNodes: NodeState[];
  summary: NetworkSummary | null;
}) {
  const content = renderLiveContent(nodeKey, nodes, fnoNodes, summary);
  if (!content) return null;

  return (
    <div className="mt-5 rounded-lg border border-mn-border bg-mn-bg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-mn-border bg-mn-surface">
        <span className="w-1.5 h-1.5 rounded-full bg-mn-ok animate-pulse" />
        <span className="font-mono text-[10px] font-semibold text-mn-muted uppercase tracking-widest">
          Live Telemetry
        </span>
      </div>
      {content}
    </div>
  );
}

function renderLiveContent(
  nodeKey: NodeKey,
  nodes: NodeState[],
  fnoNodes: NodeState[],
  summary: NetworkSummary | null
) {
  switch (nodeKey) {
    case "start":
    case "q2_incrementing":
    case "q_slow_monitor":
      return <NetworkSummaryPanel summary={summary} />;

    case "q3_all_fno_visible":
    case "q6_all_fno_visible_ok":
      return <ValidatorPresencePanel fnoNodes={fnoNodes} />;

    case "q4_node_on_telemetry":
      return <AllNodesPanel nodes={nodes} />;

    case "q4b_peer_zero":
    case "q5_peer_count_zero":
    case "q7_mesh_ok":
    case "q9_peer_count":
      return <PeerCountPanel fnoNodes={fnoNodes} />;

    case "q8_block_hash":
      return <BlockHashPanel fnoNodes={fnoNodes} />;

    case "q10_finality":
      return <FinalityPanel summary={summary} />;

    default:
      return null;
  }
}

// ── Panel sub-components ───────────────────────────────────────────────────────

function Metric({
  label,
  value,
  cls = "text-mn-text",
}: {
  label: string;
  value: string;
  cls?: string;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] text-mn-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

function NetworkSummaryPanel({ summary }: { summary: NetworkSummary | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const avgMs = summary?.avgBlockTime ?? null;
  const btCls =
    avgMs === null
      ? "text-mn-muted"
      : avgMs > 30_000
      ? "text-mn-p1"
      : avgMs > 10_000
      ? "text-mn-p3"
      : "text-mn-ok";

  const ageSec =
    summary?.timestamp && summary.timestamp > 0
      ? (now - summary.timestamp) / 1000
      : null;
  const ageLabel =
    ageSec === null
      ? "—"
      : ageSec < 60
      ? `${ageSec.toFixed(1)}s`
      : `${Math.floor(ageSec / 60)}m ${String(Math.floor(ageSec % 60)).padStart(2, "0")}s`;
  const ageCls =
    ageSec === null
      ? "text-mn-muted"
      : ageSec >= 30
      ? "text-mn-p1"
      : ageSec >= 10
      ? "text-mn-p3"
      : "text-mn-ok";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-mn-border">
      <Metric
        label="Best Block"
        value={
          summary?.bestBlock && summary.bestBlock > 0
            ? `#${summary.bestBlock.toLocaleString()}`
            : "—"
        }
      />
      <Metric
        label="Finalized"
        value={
          summary?.finalizedBlock && summary.finalizedBlock > 0
            ? `#${summary.finalizedBlock.toLocaleString()}`
            : "—"
        }
      />
      <Metric
        label="Avg Block Time"
        value={avgMs !== null ? `${(avgMs / 1000).toFixed(3)}s` : "—"}
        cls={btCls}
      />
      <Metric label="Last Block" value={ageLabel} cls={ageCls} />
    </div>
  );
}

function ValidatorPresencePanel({ fnoNodes }: { fnoNodes: NodeState[] }) {
  const { network } = useTelemetry();
  const count = fnoNodes.length;
  const countCls =
    count >= 10 ? "text-mn-ok" : count >= 7 ? "text-mn-p3" : "text-mn-p1";

  return (
    <div>
      <div className="px-4 py-3 border-b border-mn-border flex items-baseline gap-2">
        <span className={`text-lg font-mono font-bold ${countCls}`}>{count}</span>
        <span className="text-sm text-mn-muted font-mono">/ 10 validators visible</span>
      </div>
      {count === 0 ? (
        <p className="px-4 py-3 text-xs text-mn-muted font-mono">No FNO validators detected yet</p>
      ) : (
        <div className="divide-y divide-mn-border">
          {fnoNodes.map((n) => {
            const dot = SEV_BG[peerSeverity(n.peers, network)];
            return (
              <div key={n.id} className="flex items-center gap-2.5 px-4 py-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                <span className="text-xs font-mono text-mn-text">{n.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AllNodesPanel({ nodes }: { nodes: NodeState[] }) {
  const fno = nodes.filter((n) => n.isFno);
  const other = nodes.filter((n) => !n.isFno);

  return (
    <div className="max-h-60 overflow-y-auto">
      {fno.length > 0 && (
        <>
          <p className="px-4 pt-3 pb-1 text-[10px] font-mono text-mn-muted uppercase tracking-widest">
            FNO Validators ({fno.length})
          </p>
          {fno.map((n) => (
            <NodeRow key={n.id} node={n} highlight />
          ))}
        </>
      )}
      {other.length > 0 && (
        <>
          <p className="px-4 pt-3 pb-1 text-[10px] font-mono text-mn-muted uppercase tracking-widest border-t border-mn-border mt-1">
            Other Nodes ({other.length})
          </p>
          {other.map((n) => (
            <NodeRow key={n.id} node={n} highlight={false} />
          ))}
        </>
      )}
      {nodes.length === 0 && (
        <p className="px-4 py-3 text-xs text-mn-muted font-mono">
          No nodes visible yet — feed connecting…
        </p>
      )}
    </div>
  );
}

function NodeRow({ node, highlight }: { node: NodeState; highlight: boolean }) {
  const { network } = useTelemetry();
  const sev = peerSeverity(node.peers, network);
  const dot = SEV_BG[sev];
  return (
    <div
      className={`flex items-center justify-between px-4 py-1.5 border-b border-mn-border last:border-0 ${
        highlight ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <span className="text-xs font-mono text-mn-text">{node.name}</span>
      </div>
      <span
        className={`text-xs font-mono ${
          sev === "critical" ? "text-mn-p1" : sev === "warning" ? "text-mn-p3" : "text-mn-muted"
        }`}
      >
        {node.peers}p
      </span>
    </div>
  );
}

function PeerCountPanel({ fnoNodes }: { fnoNodes: NodeState[] }) {
  const { network } = useTelemetry();
  if (fnoNodes.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-mn-muted font-mono">
        No FNO validators detected yet
      </p>
    );
  }

  const sorted = [...fnoNodes].sort((a, b) => a.peers - b.peers);

  return (
    <div className="divide-y divide-mn-border">
      {sorted.map((n) => {
        const sev = peerSeverity(n.peers, network);
        const cls = SEV_TEXT[sev];
        const dot = SEV_BG[sev];
        const label =
          sev === "critical"
            ? "ISOLATED"
            : sev === "warning"
            ? `${n.peers} peer — low`
            : `${n.peers} peers`;
        return (
          <div key={n.id} className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
              <span className="text-xs font-mono text-mn-text">{n.name}</span>
            </div>
            <span className={`text-xs font-mono font-semibold ${cls}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BlockHashPanel({ fnoNodes }: { fnoNodes: NodeState[] }) {
  if (fnoNodes.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-mn-muted font-mono">
        No FNO validators detected yet
      </p>
    );
  }

  // Detect divergence: group by block height, flag heights with >1 unique hash
  const byHeight = new Map<number, Set<string>>();
  for (const n of fnoNodes) {
    if (!n.bestBlock) continue;
    if (!byHeight.has(n.bestBlock)) byHeight.set(n.bestBlock, new Set());
    byHeight.get(n.bestBlock)!.add(n.bestHash);
  }
  const divergedHeights = new Set(
    [...byHeight.entries()].filter(([, hashes]) => hashes.size > 1).map(([h]) => h)
  );

  return (
    <div className="divide-y divide-mn-border">
      {fnoNodes.map((n) => {
        const diverged = divergedHeights.has(n.bestBlock);
        return (
          <div key={n.id} className="flex items-center justify-between px-4 py-2 gap-4">
            <span className="text-xs font-mono text-mn-text truncate">{n.name}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-mn-muted">
                {n.bestBlock > 0 ? `#${n.bestBlock.toLocaleString()}` : "—"}
              </span>
              <span
                className={`text-xs font-mono ${diverged ? "text-mn-p1 font-semibold" : "text-mn-muted"}`}
                title={n.bestHash}
              >
                {n.bestHash ? n.bestHash.slice(0, 10) + "…" : "—"}
                {diverged && " ⚠"}
              </span>
            </div>
          </div>
        );
      })}
      {divergedHeights.size > 0 && (
        <div className="px-4 py-2 bg-mn-p1/10">
          <p className="text-xs font-mono text-mn-p1 font-semibold">
            ⚠ Hash divergence detected at{" "}
            {[...divergedHeights].map((h) => `#${h.toLocaleString()}`).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function FinalityPanel({ summary }: { summary: NetworkSummary | null }) {
  const best = summary?.bestBlock ?? null;
  const fin = summary?.finalizedBlock ?? null;
  const gap = best !== null && fin !== null && fin > 0 ? best - fin : null;
  const gapCls =
    gap === null
      ? "text-mn-muted"
      : gap >= 7
      ? "text-mn-p1"
      : gap >= 4
      ? "text-mn-p3"
      : "text-mn-ok";

  return (
    <div className="grid grid-cols-3 divide-x divide-mn-border">
      <Metric
        label="Best Block"
        value={best && best > 0 ? `#${best.toLocaleString()}` : "—"}
      />
      <Metric
        label="Finalized"
        value={fin && fin > 0 ? `#${fin.toLocaleString()}` : "—"}
      />
      <Metric
        label="Gap"
        value={gap !== null ? `${gap} block${gap === 1 ? "" : "s"}` : "—"}
        cls={gapCls}
      />
    </div>
  );
}

// ── Question card ──────────────────────────────────────────────────────────────

function QuestionCard({
  node,
  nodeKey,
  nodes,
  fnoNodes,
  summary,
  onChoose,
  onBack,
  canGoBack,
}: {
  node: QuestionNode;
  nodeKey: NodeKey;
  nodes: NodeState[];
  fnoNodes: NodeState[];
  summary: NetworkSummary | null;
  onChoose: (side: "yes" | "no") => void;
  onBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-xl p-7 animate-[fadeSlide_0.2s_ease]">
      <p className="font-mono text-[10px] text-mn-muted uppercase tracking-widest mb-3">
        {node.step}
      </p>
      <p className="text-lg font-medium text-mn-text leading-snug mb-3">{node.q}</p>
      <div className="font-mono text-xs text-mn-muted leading-relaxed mb-0 px-3 py-2.5 bg-white/2 border-l-2 border-mn-border rounded-r">
        <span dangerouslySetInnerHTML={{ __html: node.hint }} />
      </div>

      <LiveDataPanel
        nodeKey={nodeKey}
        nodes={nodes}
        fnoNodes={fnoNodes}
        summary={summary}
      />

      <div className="flex flex-wrap gap-2.5 mt-6">
        <button
          onClick={() => onChoose("yes")}
          className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-mn-ok/8 border-green-900 text-green-400 hover:bg-mn-ok/15 hover:border-mn-ok uppercase tracking-wider transition-colors"
        >
          ✓ {node.yes.label}
        </button>
        <button
          onClick={() => onChoose("no")}
          className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-mn-p1/8 border-red-900 text-red-400 hover:bg-mn-p1/15 hover:border-mn-p1 uppercase tracking-wider transition-colors"
        >
          ✗ {node.no.label}
        </button>
        {canGoBack && (
          <button
            onClick={onBack}
            className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-transparent border-mn-border text-mn-muted hover:border-mn-border hover:text-mn-text ml-auto uppercase tracking-wider transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

// ── Outcome / Healthy cards (unchanged) ───────────────────────────────────────

const OUTCOME_STYLES: Record<
  string,
  { card: string; badge: string; badgeText: string; label: string }
> = {
  p1: {
    card: "bg-mn-p1/10 border-mn-p1/30",
    badge: "bg-mn-p1 text-white",
    badgeText: "text-mn-p1",
    label: "P1 CRITICAL",
  },
  p2: {
    card: "bg-mn-p2/10 border-mn-p2/30",
    badge: "bg-mn-p2 text-white",
    badgeText: "text-mn-p2",
    label: "P2 HIGH",
  },
  p3: {
    card: "bg-mn-p3/10 border-mn-p3/30",
    badge: "bg-mn-p3 text-black",
    badgeText: "text-mn-p3",
    label: "P3 MEDIUM",
  },
  ok: {
    card: "bg-mn-ok/10 border-mn-ok/30",
    badge: "bg-mn-ok text-black",
    badgeText: "text-mn-ok",
    label: "MONITOR",
  },
  escalate: {
    card: "bg-mn-escalate/10 border-mn-escalate/30",
    badge: "bg-mn-escalate text-white",
    badgeText: "text-mn-escalate",
    label: "ESCALATE",
  },
};

function OutcomeCard({
  node,
  crumbs,
  onRestart,
  onBack,
  canGoBack,
}: {
  node: OutcomeNode;
  crumbs: string[];
  onRestart: () => void;
  onBack: () => void;
  canGoBack: boolean;
}) {
  const s = OUTCOME_STYLES[node.priority] ?? OUTCOME_STYLES.p3;

  return (
    <div className={`border rounded-xl p-7 animate-[fadeSlide_0.25s_ease] ${s.card}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded tracking-widest ${s.badge}`}
        >
          {s.label}
        </span>
        {node.runbookLabel && node.runbookSlug && (
          <Link
            href={`/runbooks/${node.runbookSlug}`}
            className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border tracking-wider ${s.badgeText} border-current hover:opacity-75 transition-opacity`}
          >
            {node.runbookLabel}
          </Link>
        )}
        {node.runbookLabel && !node.runbookSlug && (
          <span
            className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border tracking-wider ${s.badgeText} border-current`}
          >
            {node.runbookLabel}
          </span>
        )}
      </div>

      <h2 className="text-base font-semibold text-mn-text mb-4">{node.title}</h2>
      <p className="text-sm text-mn-text/80 leading-relaxed mb-5">{node.desc}</p>

      <ul className="font-mono text-xs text-mn-muted space-y-2 mb-6">
        {node.actions.map((action, i) => (
          <li
            key={i}
            className="flex gap-2 pb-2 border-b border-white/4 last:border-0"
          >
            <span className="text-mn-muted shrink-0">→</span>
            <span>{action}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={onRestart}
          className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-transparent border-mn-border text-mn-muted hover:border-mn-border hover:text-mn-text uppercase tracking-wider transition-colors"
        >
          ↺ Restart Diagnostic
        </button>
        {canGoBack && (
          <button
            onClick={onBack}
            className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-transparent border-mn-border text-mn-muted hover:border-mn-border hover:text-mn-text uppercase tracking-wider transition-colors"
          >
            ← Back
          </button>
        )}
      </div>

      {crumbs.length > 0 && (
        <div className="mt-5 px-4 py-3 bg-black/30 border border-mn-border rounded-lg">
          <p className="font-mono text-[9px] text-mn-muted uppercase tracking-widest mb-2">
            Decision path
          </p>
          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-mn-accent">{crumb}</span>
                {i < crumbs.length - 1 && (
                  <span className="text-mn-border text-[10px]">›</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthyCard({
  onRestart,
  onBack,
  canGoBack,
}: {
  onRestart: () => void;
  onBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <div className="bg-mn-ok/10 border border-mn-ok/30 rounded-xl p-7 animate-[fadeSlide_0.25s_ease]">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-mn-ok text-black tracking-widest">
          HEALTHY
        </span>
      </div>

      <div className="text-2xl mb-3">✓</div>
      <h2 className="text-base font-semibold text-mn-ok mb-4">
        Network is operating normally
      </h2>
      <p className="text-sm text-mn-text/80 leading-relaxed mb-5">
        All 10 FNO validators are online · Peer counts at baseline · No block hash
        divergence · Finality gap within normal range (2–3 blocks) · Average block
        time ~6s.
      </p>

      <ul className="font-mono text-xs text-mn-muted space-y-2 mb-6">
        {[
          "Continue monitoring telemetry at regular intervals",
          "Check back if you receive an alert or notice a change",
          "Review Runbook 05 if telemetry data itself appears incomplete or stale",
        ].map((action, i) => (
          <li
            key={i}
            className="flex gap-2 pb-2 border-b border-white/4 last:border-0"
          >
            <span className="shrink-0">→</span>
            <span>{action}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={onRestart}
          className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-transparent border-mn-border text-mn-muted hover:border-mn-border hover:text-mn-text uppercase tracking-wider transition-colors"
        >
          ↺ Run Diagnostic Again
        </button>
        {canGoBack && (
          <button
            onClick={onBack}
            className="font-mono text-xs font-medium px-4 py-2.5 rounded border bg-transparent border-mn-border text-mn-muted hover:border-mn-border hover:text-mn-text uppercase tracking-wider transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
