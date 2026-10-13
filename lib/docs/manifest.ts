// Docs sidebar nav — hand-maintained.
// Keep in sync with DOC_IMPORTERS (lib/docs/loader.ts): every slug below must
// resolve to an importer there, and to a real file under content/docs/.
export interface DocLeaf {
  title: string;
  slug: string;
}

export interface DocSection {
  title: string;
  children: DocNode[];
}

export type DocNode = DocLeaf | DocSection;

export function isSection(n: DocNode): n is DocSection {
  return "children" in n;
}

export const DOCS_MANIFEST: DocNode[] = [
  {
    "title": "Home",
    "slug": ""
  },
  {
    "title": "FNO Guides",
    "children": [
      {
        "title": "Overview",
        "slug": "fno-guides"
      },
      {
        "title": "Preprod",
        "children": [
          {
            "title": "Overview",
            "slug": "fno-guides/preprod"
          },
          {
            "title": "1. Requirements",
            "slug": "fno-guides/preprod/requirements"
          },
          {
            "title": "2. Install Node & Generate Keys",
            "slug": "fno-guides/preprod/install-node-and-keys"
          },
          {
            "title": "3. Cardano Availability",
            "slug": "fno-guides/preprod/cardano-availability"
          },
          {
            "title": "4. Run Validator",
            "slug": "fno-guides/preprod/run-validator"
          }
        ]
      },
      {
        "title": "Mainnet",
        "children": [
          {
            "title": "Overview",
            "slug": "fno-guides/mainnet"
          },
          {
            "title": "1. Requirements",
            "slug": "fno-guides/mainnet/requirements"
          },
          {
            "title": "2. Install Node & Generate Keys",
            "slug": "fno-guides/mainnet/install-node-and-keys"
          },
          {
            "title": "3. Cardano Availability",
            "slug": "fno-guides/mainnet/cardano-availability"
          },
          {
            "title": "4. Run Validator",
            "slug": "fno-guides/mainnet/run-validator"
          }
        ]
      }
    ]
  },
  {
    "title": "Architecture",
    "children": [
      {
        "title": "Overview",
        "slug": "architecture"
      },
      {
        "title": "Consensus & Block Production",
        "slug": "architecture/consensus-and-block-production"
      }
    ]
  },
  {
    "title": "Architecture Decision Records",
    "children": [
      {
        "title": "Overview",
        "slug": "adr/README"
      },
      {
        "title": "ADR template & guide",
        "slug": "adr/architecture-decisions"
      }
    ]
  },
  {
    "title": "FAQ",
    "slug": "faq"
  }
];
