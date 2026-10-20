import { NodeState, NetworkSummary } from "@/lib/telemetry/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { rosterStatus } from "@/lib/telemetry/roster";

export type Severity = "ok" | "warning" | "critical";

export interface HealthStatus {
  validatorCount: Severity;
  blockTime: Severity;
  finalityGap: Severity;
  peerCount: Severity; // worst across FNO nodes
  overall: Severity;
}

export interface Alert {
  id: string;
  severity: Severity;
  message: string;
  runbook?: string;
}

export function worstSeverity(a: Severity, b: Severity): Severity {
  const rank: Record<Severity, number> = { ok: 0, warning: 1, critical: 2 };
  return rank[a] >= rank[b] ? a : b;
}

const BLOCKTIME_WARNING_MS = 10_000;
const BLOCKTIME_CRITICAL_MS = 30_000;
const FINALITY_GAP_WARNING = 4;
const FINALITY_GAP_CRITICAL = 7;

/**
 * GRANDPA finalizes with more than 2/3 of an equal-weight validator set voting,
 * so the minimum online count that still finalizes on an N-validator network is
 * floor(2N/3)+1 (the fault-tolerance table in the consensus doc).
 */
function finalityFloor(expected: number): number {
  return Math.floor((2 * expected) / 3) + 1;
}

/**
 * Validator-count severity, network-aware. The set is federated by design, so we
 * only flag when the online count approaches the finality floor — a healthy set
 * with spare margin (e.g. 13/13, or 10 of a 13-set) is NOT "reduced resilience".
 * Networks with no fixed federated set (expectedValidators: null) are not
 * count-judged here; a genuine stall still surfaces via the finality-gap check.
 */
function validatorSeverity(online: number, expected: number | null): Severity {
  if (expected == null) return "ok";
  const floor = finalityFloor(expected);
  if (online < floor) return "critical"; // below GRANDPA 2/3 → finality at risk
  if (online === floor) return "warning"; // exactly at the floor → one fault from a stall
  return "ok";
}

/**
 * Peer-count severity for a node, network-aware. Zero peers is isolation
 * (critical) on any network; on mainnet ONLY, a single peer also warns —
 * "1 or less" is near-isolation. Sitting under the healthy peer target
 * (`expectedPeers`, 17 on mainnet) is deliberately NOT flagged: mainnet
 * routinely reports fewer peers than the target, so the warning is reserved
 * for nodes about to drop off the mesh entirely.
 */
export function peerSeverity(peers: number, network: NetworkId): Severity {
  if (peers === 0) return "critical";
  if (network === "mainnet" && peers === 1) return "warning";
  return "ok";
}

export function evaluateHealth(
  nodes: NodeState[],
  summary: NetworkSummary | null,
  network: NetworkId = "mainnet"
): HealthStatus {
  const cfg = NETWORKS[network];
  const fnoNodes = nodes.filter((n) => n.isFno);
  const onlineCount = fnoNodes.length;

  const validatorCount = validatorSeverity(onlineCount, cfg.expectedValidators);

  const avgMs = summary?.avgBlockTime ?? null;
  let blockTime: Severity = "ok";
  if (avgMs !== null) {
    if (avgMs > BLOCKTIME_CRITICAL_MS) blockTime = "critical";
    else if (avgMs > BLOCKTIME_WARNING_MS) blockTime = "warning";
  }

  let finalityGap: Severity = "ok";
  if (summary && summary.bestBlock > 0 && summary.finalizedBlock > 0) {
    const gap = summary.bestBlock - summary.finalizedBlock;
    if (gap >= FINALITY_GAP_CRITICAL) finalityGap = "critical";
    else if (gap >= FINALITY_GAP_WARNING) finalityGap = "warning";
  }

  // Peer count (worst FNO) — judged only on networks with a peer target;
  // the mainnet ≤1-peer warning policy lives in peerSeverity.
  let peerCount: Severity = "ok";
  if (cfg.expectedPeers !== null) {
    for (const node of fnoNodes) {
      peerCount = worstSeverity(peerCount, peerSeverity(node.peers, network));
      if (peerCount === "critical") break;
    }
  }

  // Only zero-peer isolation (critical) affects overall status — low peer
  // counts are informational.
  const peerImpact: Severity = peerCount === "critical" ? "critical" : "ok";
  const overall = [validatorCount, blockTime, finalityGap, peerImpact].reduce(worstSeverity, "ok");

  return { validatorCount, blockTime, finalityGap, peerCount, overall };
}

export function buildAlerts(
  nodes: NodeState[],
  summary: NetworkSummary | null,
  network: NetworkId = "mainnet"
): Alert[] {
  const cfg = NETWORKS[network];
  const isMainnet = network === "mainnet";
  const alerts: Alert[] = [];
  const fnoNodes = nodes.filter((n) => n.isFno);
  const vLabel = isMainnet ? "FNO validators" : "validators";
  const total = cfg.expectedValidators;
  const onlineCount = fnoNodes.length;

  const vSev = validatorSeverity(onlineCount, total);
  if (vSev === "critical") {
    alerts.push({
      id: "validators-critical",
      severity: "critical",
      message: `Only ${onlineCount}${total ? `/${total}` : ""} ${vLabel} online — below GRANDPA 2/3, finality at risk`,
      runbook: "runbook-04-outage",
    });
  } else if (vSev === "warning") {
    alerts.push({
      id: "validators-warning",
      severity: "warning",
      message: `${onlineCount}${total ? `/${total}` : ""} ${vLabel} online — at the finality floor`,
      runbook: "runbook-04-outage",
    });
  }

  // Name the roll-call misses. A count alone ("12/13") does not tell an operator
  // WHICH node to chase, and a set well above the finality floor raises no count
  // alert at all — so one absent validator would otherwise pass unmentioned.
  // Warning, not critical: absence from telemetry can be a broken telemetry link
  // rather than a down validator, and the caller must not assume an outage.
  const roll = rosterStatus(nodes, network);
  for (const entry of roll?.missing ?? []) {
    alerts.push({
      id: `validator-missing-${entry.name}`,
      severity: "warning",
      message: `${entry.name}: on the expected ${cfg.label} set but reporting nothing to telemetry — may be offline`,
      runbook: "runbook-04-outage",
    });
  }

  if (cfg.expectedPeers !== null) {
    for (const node of fnoNodes) {
      const sev = peerSeverity(node.peers, network);
      if (sev === "critical") {
        alerts.push({
          id: `peers-zero-${node.id}`,
          severity: "critical",
          message: `${node.name}: 0 peers — validator isolated from network`,
          runbook: "runbook-03-isolation",
        });
      } else if (sev === "warning") {
        alerts.push({
          id: `peers-low-${node.id}`,
          severity: "warning",
          message: `${node.name}: ${node.peers} peer — near isolation (mainnet warns at ≤1; healthy target ${cfg.expectedPeers})`,
          runbook: "runbook-02-peers",
        });
      }
    }
  }

  if (summary && summary.bestBlock > 0 && summary.finalizedBlock > 0) {
    const gap = summary.bestBlock - summary.finalizedBlock;
    if (gap >= FINALITY_GAP_CRITICAL) {
      alerts.push({
        id: "finality-critical",
        severity: "critical",
        message: `Finality gap is ${gap} blocks — GRANDPA stalled`,
        runbook: "runbook-07-finality",
      });
    } else if (gap >= FINALITY_GAP_WARNING) {
      alerts.push({
        id: "finality-warning",
        severity: "warning",
        message: `Finality gap is ${gap} blocks — monitor closely`,
        runbook: "runbook-07-finality",
      });
    }
  }

  if (summary?.avgBlockTime && summary.avgBlockTime > BLOCKTIME_CRITICAL_MS) {
    alerts.push({
      id: "blocktime-critical",
      severity: "critical",
      message: `Avg block time ${(summary.avgBlockTime / 1000).toFixed(1)}s — block production stalled`,
      runbook: "runbook-04-outage",
    });
  } else if (summary?.avgBlockTime && summary.avgBlockTime > BLOCKTIME_WARNING_MS) {
    alerts.push({
      id: "blocktime-warning",
      severity: "warning",
      message: `Avg block time ${(summary.avgBlockTime / 1000).toFixed(1)}s — above normal`,
    });
  }

  return alerts;
}
