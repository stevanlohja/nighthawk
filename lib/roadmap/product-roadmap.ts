/**
 * Nighthawk product roadmap — hand-maintained directional workstreams.
 *
 * This is a *product* roadmap for the dashboard itself: intentions, not dated
 * commitments. It is deliberately not telemetry and not a calendar (see the
 * OUT-of-scope guardrails in ../project-purpose.md) — nothing here is measured,
 * projected, or dated. Keep statuses honest: flip an item to "in-flight" only
 * when work has actually started, and to "delivered" only when what actually
 * shipped matches the summary — trim the summary to what shipped and move the
 * unshipped remainder to the rationale; never claim scope that isn't live.
 */

export type RoadmapArea =
  | "Observability"
  | "Infrastructure"
  | "Assurance"
  | "Automation"
  | "Governance";

export type RoadmapStatus = "planned" | "in-flight" | "delivered";

export interface RoadmapItem {
  id: string;
  /** Short tactical call-sign, rendered as a mono/display tag. */
  codename: string;
  area: RoadmapArea;
  status: RoadmapStatus;
  title: string;
  summary: string;
  /** The payoff — why the workstream is on the roadmap. */
  rationale?: string;
}

export const PRODUCT_ROADMAP: RoadmapItem[] = [
  {
    id: "cardano-availability",
    codename: "AEGIS",
    area: "Observability",
    status: "delivered",
    title: "Cardano availability",
    summary:
      "Cardano context is live on the homepage: epoch and in-epoch progress beside Midnight's, fed by a single budget-cached Blockfrost call (GET /blocks/latest, 15-minute localStorage TTL — ~40k of the 50k free requests/month reserved). Read-only key, public by design — the dashboard stays a static client-side app.",
    rationale:
      "First increment of the wider availability domain: pool and relay liveness, block-production continuity, and availability reporting an operator can hand to a counterpart are the natural next phases.",
  },
  {
    id: "non-dbsync-topology",
    codename: "FEATHER",
    area: "Infrastructure",
    status: "planned",
    title: "Non-db-sync infrastructure topology",
    summary:
      "Map and validate a Midnight reference topology that runs without Cardano db-sync, then publish it as an observable, adoptable architecture.",
    rationale:
      "db-sync dominates node cost and is a bottleneck to decentralization — removing it is a massive reduction in Midnight infrastructure and widens who can realistically run a node.",
  },
  {
    id: "soc2-runbooks",
    codename: "BASTION",
    area: "Assurance",
    status: "planned",
    title: "SOC-2-oriented runbooks & templates",
    summary:
      "Incident, change, and control templates oriented to SOC-2-style assurance — evidence-ready procedures institutions, SPOs, and other operators can adopt to run Midnight with an audit-ready posture.",
  },
  {
    id: "fork-watcher",
    codename: "SENTRY",
    area: "Observability",
    status: "planned",
    title: "Midnight fork watcher",
    summary:
      "Run legacy Midnight releases alongside mainnet and diff them continuously: detect validator-set version drift, surface consensus-split intelligence early, and flag any node whose view of the chain diverges from canonical.",
  },
  {
    id: "network-agents",
    codename: "WINGMAN",
    area: "Automation",
    status: "planned",
    title: "Network agents & self-improvement",
    summary:
      "Agents with scoped, gated access to live nodes that inspect and debug during incidents — plus a self-improving loop where agents draft features from GitHub issues and open pull requests.",
    rationale:
      "Nothing merges unattended: every agent-authored change lands behind gated human review.",
  },
  {
    id: "governance-events",
    codename: "ORACLE",
    area: "Governance",
    status: "planned",
    title: "Governance & partner-chain contract events",
    summary:
      "Monitor Substrate on-chain governance — referenda, votes, treasury and fellowship motions — alongside Cardano partner-chain contract events, so cross-chain triggers surface in the same pane as network health.",
  },
];