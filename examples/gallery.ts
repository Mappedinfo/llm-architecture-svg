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
  createModelGraphFromHfConfig,
  renderArchitectureSvg,
  renderBertArchitectureFigure,
  renderDecoderOnlyFigure,
  renderEncoderOnlyFigure,
  renderGptArchitectureSvg,
  renderModelGraphSvg,
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

const attentionHighlight = {
  muteUnmatched: true,
  overrides: [{
    selector: { roles: ["multi_head_attention"] },
    fill: "#ffd166",
    stroke: "#ef476f",
    strokeWidth: 4,
    highlight: { badge: "1", glow: true },
    callout: "Self-attention focus"
  }]
};

const crossAttentionHighlight = {
  muteUnmatched: true,
  overrides: [{
    selector: { roles: ["cross_attention"] },
    fill: "#ffd166",
    stroke: "#ef476f",
    strokeWidth: 4,
    highlight: { badge: "2", glow: true },
    callout: "Encoder memory enters here"
  }]
};

const bertEmbeddingHighlight = {
  overrides: [
    { selector: { roles: ["token_embedding"] }, fill: "#ffd6e0", stroke: "#ef476f", strokeWidth: 3, highlight: { badge: "A", glow: true }, callout: "token ids" },
    { selector: { roles: ["segment_embedding"] }, fill: "#d8f3dc", stroke: "#2f9e44", strokeWidth: 3, highlight: { badge: "B", glow: true }, callout: "sentence ids" },
    { selector: { roles: ["positional_encoding"] }, fill: "#dbeafe", stroke: "#2563eb", strokeWidth: 3, highlight: { badge: "C", glow: true }, callout: "positions" }
  ]
};

const encoderFfnHighlight = {
  muteUnmatched: true,
  overrides: [{
    selector: { roles: ["feed_forward"] },
    fill: "#99f6e4",
    stroke: "#0f766e",
    strokeWidth: 4,
    highlight: { badge: "3", glow: true },
    callout: "MLP transformation"
  }]
};

const llama100ModelGraph = createModelGraphFromHfConfig({
  model_type: "llama",
  hidden_size: 4096,
  num_attention_heads: 32,
  num_hidden_layers: 100,
  vocab_size: 32000,
  max_position_embeddings: 4096,
  intermediate_size: 11008,
  tie_word_embeddings: false
}, { modelName: "LLaMA-like 100-layer model" });

const bertModelGraph = createModelGraphFromHfConfig({
  model_type: "bert",
  hidden_size: 768,
  num_attention_heads: 12,
  num_hidden_layers: 12,
  vocab_size: 30522,
  max_position_embeddings: 512,
  type_vocab_size: 2,
  num_labels: 2
}, { modelName: "BERT-base from config" });

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
  ["gpt-attention-highlight.svg", renderGptArchitectureSvg(gptParams, { profile: "textbook-overview", presentation: attentionHighlight })],
  ["transformer-cross-attention-highlight.svg", renderArchitectureSvg(generateTransformerArchitecture(DEFAULT_TRANSFORMER_TEMPLATE_PARAMS), { profile: "textbook-overview", presentation: crossAttentionHighlight })],
  ["bert-embeddings-highlight.svg", renderArchitectureSvg(generateBertArchitecture(DEFAULT_BERT_TEMPLATE_PARAMS), { profile: "textbook-overview", presentation: bertEmbeddingHighlight })],
  ["encoder-ffn-highlight.svg", renderArchitectureSvg(generateEncoderOnlyArchitecture(DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS), { profile: "textbook-overview", presentation: encoderFfnHighlight })],
  ["llama-modelgraph-overview.svg", renderModelGraphSvg(llama100ModelGraph, { level: "overview", profile: "textbook-overview" })],
  ["llama-modelgraph-representative-block.svg", renderModelGraphSvg(llama100ModelGraph, { level: "representative-block", profile: "expanded-gpt-block", width: 1500 })],
  ["llama-modelgraph-layer-strip.svg", renderModelGraphSvg(llama100ModelGraph, { level: "layer-strip", profile: "slide-dark", width: 1180 })],
  ["bert-modelgraph-overview.svg", renderModelGraphSvg(bertModelGraph, { level: "overview", profile: "textbook-overview" })],
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
