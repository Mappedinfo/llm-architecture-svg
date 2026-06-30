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

## Node API

```ts
import {
  generateGptArchitecture,
  renderArchitectureSvg,
  renderGptArchitectureSvg
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

`textbook-overview` is a presentation adapter over the GPT architecture. It does not change the saved `ArchitectureSpec`; it renders a concept-level Transformer diagram with Input Embedding, Positional Encoding, Multi-Head Attention, Add & Norm, Feed Forward, Linear, Softmax, and Output Probabilities.

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
