# Usage Guide

## Install

Install from GitHub:

```bash
npm install github:Mappedinfo/llm-architecture-svg
```

This is intentionally separate from npmjs.com publishing. The package can be consumed directly from GitHub today.

## CLI

Generate a compact GPT diagram:

```bash
npx llm-architecture-svg \
  --preset gpt \
  --T 64 \
  --C 192 \
  --nHeads 3 \
  --nBlocks 3 \
  --vocabSize 1000 \
  --out artifacts/svg/gpt.svg
```

Generate an expanded transformer view:

```bash
npx llm-architecture-svg \
  --preset gpt \
  --T 64 \
  --C 192 \
  --nHeads 3 \
  --nBlocks 3 \
  --vocabSize 1000 \
  --expand block_0 \
  --out artifacts/svg/gpt-expanded.svg
```

Use the blueprint theme:

```bash
npx llm-architecture-svg \
  --preset gpt \
  --T 128 \
  --C 384 \
  --nHeads 6 \
  --nBlocks 4 \
  --vocabSize 4096 \
  --theme blueprint \
  --width 1280 \
  --out artifacts/svg/gpt-blueprint.svg
```

Batch export:

```bash
npx llm-architecture-svg --batch examples/llm-svg-batch.json --out artifacts/svg
```

Generate non-GPT architecture templates:

```bash
npx llm-architecture-svg --preset transformer --profile textbook-overview --srcT 64 --tgtT 64 --C 192 --nHeads 3 --nEncoderBlocks 3 --nDecoderBlocks 3 --vocabSize 1000 --out artifacts/svg/transformer.svg
npx llm-architecture-svg --preset bert --profile textbook-overview --T 128 --C 768 --nHeads 12 --nBlocks 12 --vocabSize 30522 --typeVocabSize 2 --numLabels 2 --out artifacts/svg/bert.svg
npx llm-architecture-svg --preset encoder-only --profile textbook-overview --T 128 --C 384 --nHeads 6 --nBlocks 6 --vocabSize 8192 --out artifacts/svg/encoder-only.svg
npx llm-architecture-svg --preset decoder-only --profile textbook-overview --T 64 --C 192 --nHeads 3 --nBlocks 3 --vocabSize 1000 --out artifacts/svg/decoder-only.svg
```

Apply teaching highlights from JSON:

```bash
npx llm-architecture-svg \
  --preset transformer \
  --profile textbook-overview \
  --presentation examples/presentation-cross-attention.json \
  --out artifacts/svg/transformer-highlight.svg
```

Render a model graph exported by the optional Python tracer:

```bash
npx llm-architecture-svg \
  --model-graph artifacts/model-graph.json \
  --level overview \
  --profile textbook-overview \
  --out artifacts/svg/model-overview.svg

npx llm-architecture-svg \
  --model-graph artifacts/model-graph.json \
  --level representative-block \
  --block layers.0 \
  --profile expanded-gpt-block \
  --out artifacts/svg/model-block.svg
```

## Node API

```ts
import {
  createModelGraphFromHfConfig,
  generateBertArchitecture,
  generateGptArchitecture,
  generateTransformerArchitecture,
  renderArchitectureSvg,
  renderGptArchitectureSvg,
  renderModelGraphSvg
} from "@mappedinfo/llm-architecture-svg";

const params = {
  T: 64,
  C: 192,
  nHeads: 3,
  nBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
};

const svgA = renderGptArchitectureSvg(params, {
  title: "GPT overview"
});

const spec = generateGptArchitecture(params);
const svgB = renderArchitectureSvg(spec, {
  title: "GPT expanded",
  expandedGroups: ["block_0"]
});

const transformer = generateTransformerArchitecture({
  srcT: 64,
  tgtT: 64,
  C: 192,
  nHeads: 3,
  nEncoderBlocks: 3,
  nDecoderBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
});
const svgC = renderArchitectureSvg(transformer, { profile: "textbook-overview" });

const bert = generateBertArchitecture({
  T: 128,
  C: 768,
  nHeads: 12,
  nBlocks: 12,
  vocabSize: 30522,
  typeVocabSize: 2,
  numLabels: 2,
  bias: true
});
const svgD = renderArchitectureSvg(bert, { profile: "textbook-overview" });

const modelGraph = createModelGraphFromHfConfig({
  model_type: "llama",
  hidden_size: 4096,
  num_attention_heads: 32,
  num_hidden_layers: 100,
  vocab_size: 32000,
  max_position_embeddings: 4096
}, { modelName: "LLaMA-like 100-layer model" });
const svgE = renderModelGraphSvg(modelGraph, { level: "overview", profile: "textbook-overview" });
```

## Playground workflow

The web playground avoids raw implementation terms like `Mode`, `Profile`, and `Preset`. It is organized into four steps:

- `Source`: model parameters, imported model graph JSON, mechanism figure template, or custom JSON.
- `Diagram level`: overview, representative block, layer strip, or debug graph. Levels that do not apply are shown but disabled.
- `Content`: the concrete model family, mechanism template, or spec type.
- `Visual style`: human-readable style presets, such as Textbook overview or Expanded block blueprint.

Spec choice:

- `ArchitectureSpec`: use for parameterized GPT, Transformer, BERT, encoder-only, and decoder-only diagrams.
- `ModelGraphSpec`: use for HuggingFace/PyTorch-imported model structure before rendering to SVG.
- `LlmFigureSpec`: use for freeform mechanism diagrams with manual coordinates.

## Teaching presentation overlays

`presentation` customizes rendering without changing the underlying architecture. Selectors can target node ids, component kinds, or `derived.role`.

```ts
renderArchitectureSvg(spec, {
  profile: "textbook-overview",
  presentation: {
    muteUnmatched: true,
    overrides: [{
      selector: { roles: ["multi_head_attention"] },
      fill: "#ffd166",
      stroke: "#ef476f",
      strokeWidth: 4,
      highlight: { badge: "1", glow: true },
      callout: "Teaching focus"
    }]
  }
});
```

## Batch JSON format

The batch file can be an array:

```json
[
  {
    "name": "small-gpt",
    "params": {
      "T": 64,
      "C": 192,
      "nHeads": 3,
      "nBlocks": 3,
      "vocabSize": 1000,
      "bias": false,
      "tieEmbeddings": true
    },
    "options": {
      "expandedGroups": ["block_0"],
      "theme": "paper"
    }
  }
]
```

Each item may provide:

- `name`: used as title and default output filename.
- `out`: optional output filename.
- `params`: GPT parameters.
- `spec`: full custom `ArchitectureSpec`.
- `options`: SVG render options.

## Output behavior

The generated SVG is standalone:

- inline styles
- no external CSS
- no browser runtime
- no model weights
- no network access

The diagram displays:

- architecture blocks
- data/residual/dependency edges
- inferred tensor shape labels
- parameter count summary

## Profiles

Use `profile` when you want a complete visual and structural preset. Profiles control default detail level, grid/header visibility, typography, stroke width, corner radius, icon style, and edge routing.

```ts
renderGptArchitectureSvg(params, { profile: "textbook-overview" });
renderGptArchitectureSvg(params, { profile: "gpt-overview" });
renderGptArchitectureSvg(params, { profile: "expanded-gpt-block" });
renderGptArchitectureSvg(params, { profile: "teaching-debug" });
renderGptArchitectureSvg(params, { profile: "slide-dark" });
```

`textbook-overview` is a presentation adapter over `ArchitectureSpec`. It does not change the saved spec; it renders a paper-style concept diagram for GPT/decoder-only, original encoder-decoder Transformer, BERT, and encoder-only templates with positional icons, plus circles, rounded attention fan-in arrows, cross-attention connectors, and residual loops.

The legacy options still override profile defaults when provided:

```ts
renderGptArchitectureSvg(params, {
  profile: "expanded-gpt-block",
  expandedGroups: ["block_0", "block_1"],
  showParamCounts: false
});
```

CLI:

```bash
llm-architecture-svg --preset gpt --profile textbook-overview --out textbook.svg
llm-architecture-svg --preset gpt --profile teaching-debug --out debug.svg
```
