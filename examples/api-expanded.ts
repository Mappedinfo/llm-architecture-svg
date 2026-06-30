import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderGptArchitectureSvg } from "../src";

const outDir = "artifacts/demo";
mkdirSync(outDir, { recursive: true });

const svg = renderGptArchitectureSvg({
  T: 64,
  C: 192,
  nHeads: 3,
  nBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
}, {
  title: "GPT architecture with transformer 0 expanded",
  expandedGroups: ["block_0"],
  showShapes: true,
  showParamCounts: true,
  theme: "blueprint"
});

const outPath = join(outDir, "api-expanded.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
