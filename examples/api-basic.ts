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
  title: "GPT architecture overview",
  showShapes: true,
  showParamCounts: true
});

const outPath = join(outDir, "api-basic.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
