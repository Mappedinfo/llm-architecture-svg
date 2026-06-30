# @mappedinfo/llm-architecture-svg

Generate standalone SVG diagrams for GPT/LLM architectures without model weights.

This package only computes architecture layout, tensor shapes, and parameter counts. It does not load weights, run inference, or depend on React, DOM, Canvas, WebGL, or Next.js.

## Install from GitHub

```bash
npm install github:mappedinfo/llm-architecture-svg
```

After installation, import the renderer:

```ts
import { renderGptArchitectureSvg } from "@mappedinfo/llm-architecture-svg";

const svg = renderGptArchitectureSvg({
  T: 64,
  C: 192,
  nHeads: 3,
  nBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
}, {
  title: "Small GPT architecture",
  expandedGroups: ["block_0"]
});
```

## CLI

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

Expand a transformer block:

```bash
npx llm-architecture-svg --preset gpt --expand block_0 --out artifacts/svg/gpt-expanded.svg
```

Batch export:

```bash
npx llm-architecture-svg --batch examples/llm-svg-batch.json --out artifacts/svg
```

## API

- `generateGptArchitecture(params)`
- `renderArchitectureSvg(spec, options)`
- `renderGptArchitectureSvg(params, options)`
- `countArchitectureParameters(spec)`
- `shapeToLabel(shape)`

## Notes

- Default parameter counting follows nanoGPT-style defaults: `tieEmbeddings=true`, `bias=false`.
- `expandedGroups` controls whether derived internals such as Q/K/V, attention scores, and MLP projections are visible.
- The SVG output is standalone and uses inline styles.
