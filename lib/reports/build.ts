import { NodeState, NetworkSummary, WsStatus } from "@/lib/telemetry/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { evaluateHealth, buildAlerts, peerSeverity } from "@/lib/health/health";
import { AttestationRecord, avgPropagation } from "@/lib/attestation/types";
import { scoreRecord } from "@/lib/attestation/score";
import { NODE_TYPE_LABELS } from "@/lib/telemetry/classify";
import { formatDuration, formatUtc } from "@/lib/format";
import {
  ReportModel,
  ReportSection,
  ReportValidatorRow,
  ReportAttestationRow,
  ReportInfraRow,
} from "./types";

export interface ReportInput {
  nodes: NodeState[];
  summary: NetworkSummary | null;
  attestation: AttestationRecord[];
  totalAttributed: number;
  sessionStartedAt: number;
  network: NetworkId;
  wsStatus: WsStatus;
  now: number;
  sections: ReportSection[];
}

function validatorStatus(peers: number, network: NetworkId): ReportValidatorRow["status"] {
  const sev = peerSeverity(peers, network);
  if (sev === "critical") return "isolated";
  if (sev === "warning") return "degraded";
  return "healthy";
}

const WS_STATUS_LABEL: Record<WsStatus, string> = {
  connecting: "connecting",
  live: "live",
  fallback: "reconnecting (showing last known state)",
  error: "unavailable (data may be stale)",
};

/** Snapshot live telemetry state into a frozen, serialisable report model. */
export function buildReport(input: ReportInput): ReportModel {
  const { nodes, summary, attestation, network, sections, now } = input;
  const cfg = NETWORKS[network];
  const fnoNodes = nodes.filter((n) => n.isFno);
  const onlineValidators = fnoNodes.length;

  const gap =
    summary && summary.bestBlock > 0 && summary.finalizedBlock > 0
      ? summary.bestBlock - summary.finalizedBlock
      : null;

  const health = evaluateHealth(nodes, summary, network);
  const alerts = buildAlerts(nodes, summary, network);

  const validatorRows: ReportValidatorRow[] = fnoNodes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((n) => ({
      name: n.name,
      peers: n.peers,
      bestBlock: n.bestBlock,
      finalizedBlock: n.finalizedBlock,
      finalityGap: n.bestBlock > 0 && n.finalizedBlock > 0 ? n.bestBlock - n.finalizedBlock : null,
      version: n.version,
      city: n.city,
      status: validatorStatus(n.peers, network),
    }));

  const scoreCtx = {
    now,
    networkFinalized: summary?.finalizedBlock ?? 0,
    onlineValidators,
    totalAttributed: input.totalAttributed,
    expectedPeers: cfg.expectedPeers,
  };

  const attestationRows: ReportAttestationRow[] = attestation
    .filter((r) => r.isFno)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => {
      const score = scoreRecord(r, scoreCtx);
      const share =
        input.totalAttributed > 0 ? (r.blocksAuthored / input.totalAttributed) * 100 : null;
      const expectedShare = onlineValidators > 0 ? 100 / onlineValidators : null;
      const lag =
        r.lastFinalizedBlock > 0 && (summary?.finalizedBlock ?? 0) > 0
          ? (summary?.finalizedBlock ?? 0) - r.lastFinalizedBlock
          : null;
      const prop = avgPropagation(r);
      return {
        name: r.name,
        online: r.online,
        score: score.total,
        scoreLabel: score.label,
        blocksAuthored: r.blocksAuthored,
        authorshipSharePct: share,
        expectedSharePct: expectedShare,
        finalityLag: lag,
        avgPropagationMs: prop !== null ? Math.round(prop) : null,
        sessions: r.sessions,
        disconnects: r.disconnects,
        uptime: r.startupTime ? formatDuration(now - r.startupTime) : "unknown",
      };
    });

  const infraRows: ReportInfraRow[] = nodes
    .filter((n) => !n.isFno)
    .slice()
    .sort((a, b) => a.nodeType.localeCompare(b.nodeType) || a.name.localeCompare(b.name))
    .map((n) => ({
      name: n.name,
      type: NODE_TYPE_LABELS[n.nodeType],
      peers: n.peers,
      bestBlock: n.bestBlock,
    }));

  return {
    title: `Midnight ${cfg.label} — Network Health Report`,
    generatedAtUtc: formatUtc(now),
    generatedAtMs: now,
    network,
    networkLabel: cfg.label,
    feedStatus: WS_STATUS_LABEL[input.wsStatus],
    observationWindow: formatDuration(now - input.sessionStartedAt),
    sections,

    summary: sections.includes("summary")
      ? {
          bestBlock: summary?.bestBlock ?? 0,
          finalizedBlock: summary?.finalizedBlock ?? 0,
          finalityGap: gap,
          avgBlockTimeMs: summary?.avgBlockTime ?? null,
          validatorsOnline: onlineValidators,
          validatorsExpected: cfg.expectedValidators,
          nodesVisible: nodes.length,
          blocksAttributed: input.totalAttributed,
        }
      : null,

    health: sections.includes("health")
      ? {
          overall: health.overall,
          validatorCount: health.validatorCount,
          blockTime: health.blockTime,
          finalityGap: health.finalityGap,
          peerCount: health.peerCount,
        }
      : null,

    alerts: sections.includes("alerts")
      ? alerts.map((a) => ({ severity: a.severity, message: a.message, runbook: a.runbook ?? null }))
      : null,

    validators: sections.includes("validators") ? validatorRows : null,
    attestation: sections.includes("attestation") ? attestationRows : null,
    infrastructure: sections.includes("infrastructure") ? infraRows : null,
  };
}
