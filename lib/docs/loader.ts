// Static import registry for the docs under content/docs/ — hand-maintained.
// Keep in sync with DOCS_MANIFEST (lib/docs/manifest.ts): every slug in the
// manifest must resolve to a key here, or /docs/[...slug] renders nothing.

export type DocImporter = () => Promise<{ default: React.ComponentType }>;

export const DOC_IMPORTERS: Record<string, DocImporter> = {
  "adr/README": () => import("@/content/docs/adr/README.md"),
  "adr/architecture-decisions": () => import("@/content/docs/adr/architecture-decisions.md"),
  "architecture/consensus-and-block-production": () => import("@/content/docs/architecture/consensus-and-block-production.md"),
  "architecture": () => import("@/content/docs/architecture/index.md"),
  "faq": () => import("@/content/docs/faq.md"),
  "fno-guides": () => import("@/content/docs/fno-guides/index.md"),
  "fno-guides/mainnet/cardano-availability": () => import("@/content/docs/fno-guides/mainnet/cardano-availability.md"),
  "fno-guides/mainnet": () => import("@/content/docs/fno-guides/mainnet/index.md"),
  "fno-guides/mainnet/install-node-and-keys": () => import("@/content/docs/fno-guides/mainnet/install-node-and-keys.md"),
  "fno-guides/mainnet/requirements": () => import("@/content/docs/fno-guides/mainnet/requirements.md"),
  "fno-guides/mainnet/run-validator": () => import("@/content/docs/fno-guides/mainnet/run-validator.md"),
  "fno-guides/preprod/cardano-availability": () => import("@/content/docs/fno-guides/preprod/cardano-availability.md"),
  "fno-guides/preprod": () => import("@/content/docs/fno-guides/preprod/index.md"),
  "fno-guides/preprod/install-node-and-keys": () => import("@/content/docs/fno-guides/preprod/install-node-and-keys.md"),
  "fno-guides/preprod/requirements": () => import("@/content/docs/fno-guides/preprod/requirements.md"),
  "fno-guides/preprod/run-validator": () => import("@/content/docs/fno-guides/preprod/run-validator.md"),
  "": () => import("@/content/docs/index.md"),
};
