import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createModelGraphFromHfConfig, renderModelGraphSvg } from "../src";

const outDir = "artifacts/demo/model-graph";
mkdirSync(outDir, { recursive: true });

const llama100 = createModelGraphFromHfConfig({
  model_type: "llama",
  hidden_size: 4096,
  num_attention_heads: 32,
  num_hidden_layers: 100,
  vocab_size: 32000,
  max_position_embeddings: 4096,
  intermediate_size: 11008,
  tie_word_embeddings: false
}, { modelName: "LLaMA-like 100-layer model" });

const bert = createModelGraphFromHfConfig({
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
  ["llama-overview.svg", renderModelGraphSvg(llama100, { level: "overview", profile: "textbook-overview" })],
  ["llama-representative-block.svg", renderModelGraphSvg(llama100, { level: "representative-block", profile: "expanded-gpt-block", width: 1500 })],
  ["llama-layer-strip.svg", renderModelGraphSvg(llama100, { level: "layer-strip", profile: "slide-dark", width: 1180 })],
  ["bert-overview.svg", renderModelGraphSvg(bert, { level: "overview", profile: "textbook-overview" })]
];

for (const [name, svg] of outputs) {
  const outPath = join(outDir, name);
  writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath}`);
}
