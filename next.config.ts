import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import path from "node:path";

// basePath is set in CI for the GitHub Pages project subpath
// (e.g. "/nighthawk", matching the repo name) and left empty for local dev so
// the app still works at http://localhost:3000/.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export", // static HTML export to out/ for GitHub Pages
  basePath,
  trailingSlash: true, // emit out/<route>/index.html — Pages-friendly routing
  images: { unoptimized: true }, // required by export if next/image is ever used
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  // Cardano context (homepage epoch card): the Blockfrost project id is
  // inlined into the static bundle at build time. GitHub Pages has no server
  // to proxy the call, so the key is PUBLIC by design — read-only,
  // quota-capped, and budgeted (~40k of the 50k free req/mo) by the 15-minute
  // localStorage cache in lib/cardano/blockfrost.ts. Sourced from .env
  // locally and the BLOCKFROST_API_MAINNET Actions secret in CI.
  env: {
    BLOCKFROST_API_MAINNET: process.env.BLOCKFROST_API_MAINNET ?? "",
  },
};

// Remark plugins are passed as string paths (not imports): Next 16 defaults to
// Turbopack, which can't serialise function references in loader options. The
// @next/mdx loader resolves these paths itself (see node_modules/@next/mdx).
//   - remark-gfm:       GFM tables / task lists / autolinks
//   - remark-directive: parse `:::note[Title]` containers (docs admonitions)
//   - remark-admonition: render those directives as styled admonition blocks
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [
      "remark-gfm",
      "remark-directive",
      path.join(process.cwd(), "plugins", "remark-admonition.mjs"),
    ],
  },
});

export default withMDX(nextConfig);
