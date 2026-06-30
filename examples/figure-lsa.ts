import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderLsaKvIndexingFigure } from "../src";

const outDir = "artifacts/demo/figures";
mkdirSync(outDir, { recursive: true });

const svg = renderLsaKvIndexingFigure({
  title: "LSA KV indexing mechanism",
  width: 1200
});

const outPath = join(outDir, "lsa-kv-indexing.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
