import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderNgramEmbeddingFigure } from "../src";

const outDir = "artifacts/demo/figures";
mkdirSync(outDir, { recursive: true });

const svg = renderNgramEmbeddingFigure({
  title: "N-gram embedding fusion mechanism",
  width: 1200
});

const outPath = join(outDir, "ngram-embedding.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
