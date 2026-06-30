import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_BERT_TEMPLATE_PARAMS,
  DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_TRANSFORMER_TEMPLATE_PARAMS,
  generateBertArchitecture,
  generateDecoderOnlyArchitecture,
  generateEncoderOnlyArchitecture,
  generateTransformerArchitecture,
  renderArchitectureSvg,
  renderBertArchitectureFigure,
  renderDecoderOnlyFigure,
  renderEncoderOnlyFigure,
  renderGptArchitectureSvg,
  renderGptDecoderFigure,
  renderLsaKvIndexingFigure,
  renderNgramEmbeddingFigure,
  renderTransformerPaperFigure
} from "../src";

const outDir = "docs/assets/gallery";
mkdirSync(outDir, { recursive: true });

const gptParams = {
  T: 64,
  C: 192,
  nHeads: 3,
  nBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
};

const outputs: Array<[string, string]> = [
  ["transformer-paper-architecture-paper.svg", renderTransformerPaperFigure({ profile: "architecture-paper", width: 1120 })],
  ["transformer-paper-blueprint.svg", renderTransformerPaperFigure({ profile: "architecture-blueprint", width: 1120 })],
  ["bert-encoder-architecture-paper.svg", renderBertArchitectureFigure({ profile: "architecture-paper", width: 1080 })],
  ["bert-encoder-architecture-dark.svg", renderBertArchitectureFigure({ profile: "architecture-dark", width: 1080 })],
  ["gpt-decoder-architecture-paper.svg", renderGptDecoderFigure({ profile: "architecture-paper", width: 1080 })],
  ["gpt-decoder-architecture-dark.svg", renderGptDecoderFigure({ profile: "architecture-dark", width: 1080 })],
  ["gpt-expanded-blueprint.svg", renderGptArchitectureSvg(gptParams, { profile: "expanded-gpt-block", title: "GPT expanded internals", width: 1120 })],
  ["gpt-textbook-overview.svg", renderGptArchitectureSvg(gptParams, { profile: "textbook-overview" })],
  ["transformer-textbook-overview.svg", renderArchitectureSvg(generateTransformerArchitecture(DEFAULT_TRANSFORMER_TEMPLATE_PARAMS), { profile: "textbook-overview" })],
  ["bert-textbook-overview.svg", renderArchitectureSvg(generateBertArchitecture(DEFAULT_BERT_TEMPLATE_PARAMS), { profile: "textbook-overview" })],
  ["encoder-only-textbook-overview.svg", renderArchitectureSvg(generateEncoderOnlyArchitecture(DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS), { profile: "textbook-overview" })],
  ["decoder-only-textbook-overview.svg", renderArchitectureSvg(generateDecoderOnlyArchitecture(DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS), { profile: "textbook-overview" })],
  ["encoder-only-comparison.svg", renderEncoderOnlyFigure({ profile: "architecture-blueprint", width: 820 })],
  ["decoder-only-comparison.svg", renderDecoderOnlyFigure({ profile: "architecture-blueprint", width: 820 })],
  ["lsa-kv-indexing-paper.svg", renderLsaKvIndexingFigure({ profile: "paper-algorithm", width: 1120 })],
  ["ngram-embedding-drawio.svg", renderNgramEmbeddingFigure({ profile: "drawio-mechanism", width: 1120 })]
];

for (const [name, svg] of outputs) {
  const outPath = join(outDir, name);
  writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath}`);
}
