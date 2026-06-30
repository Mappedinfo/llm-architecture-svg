# @mappedinfo/llm-architecture-svg

Generate standalone SVG diagrams for GPT/LLM architectures without model weights.

This package computes architecture layout, tensor shapes, and parameter counts. It does **not** load weights, run inference, or depend on React, DOM, Canvas, WebGL, or Next.js.

## Install from GitHub

This package is currently installed directly from GitHub, not npmjs.com:

```bash
npm install github:Mappedinfo/llm-architecture-svg
```

After npmjs publishing is added later, the install command can become:

```bash
npm install @mappedinfo/llm-architecture-svg
```

## CLI quick start

Generate a compact GPT architecture SVG:

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

Expand one transformer block to show Q/K/V, attention scores, and MLP internals:

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

Batch export:

```bash
npx llm-architecture-svg --batch examples/llm-svg-batch.json --out artifacts/svg
```

## Node API quick start

```ts
import { renderGptArchitectureSvg } from "@mappedinfo/llm-architecture-svg";
import { writeFileSync } from "node:fs";

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
  expandedGroups: ["block_0"],
  showShapes: true,
  showParamCounts: true
});

writeFileSync("gpt.svg", svg);
```

## Local demos

From this repository:

```bash
npm install
npm run demo:basic
npm run demo:expanded
npm run demo:custom
npm run demo:batch
```

The generated SVGs are written to `artifacts/demo/`.

## API

- `generateGptArchitecture(params)`
- `renderArchitectureSvg(spec, options)`
- `renderGptArchitectureSvg(params, options)`
- `countArchitectureParameters(spec)`
- `shapeToLabel(shape)`
- `validateGptTemplateParams(params)`

## Options

`renderArchitectureSvg(spec, options)` and `renderGptArchitectureSvg(params, options)` accept:

- `title`: SVG title text.
- `showShapes`: show inferred tensor shapes on nodes.
- `showParamCounts`: show parameter summary and per-node counts.
- `expandedGroups`: group ids to expand, for example `["block_0"]`.
- `theme`: `"paper"` or `"blueprint"`.
- `width`: SVG width in pixels.
- `padding`: outer padding in pixels.

## Parameter counting

The default GPT parameter counting follows nanoGPT-style defaults:

- `tieEmbeddings=true`
- `bias=false`

With tied embeddings, `lm_head` contributes `0` additional parameters because it shares token embedding weights. With untied embeddings, `lm_head` contributes `C * vocabSize`.

## More docs

- [Usage guide](docs/usage.md)
- [ArchitectureSpec guide](docs/architecture-spec.md)
- [Gallery and demo commands](docs/gallery.md)

## 中文说明

这个包只生成解释图：它不会保存模型权重、不会导入权重、不会执行推理。它根据 GPT 超参数推导 block、tensor shape 和参数量，然后输出可直接放进论文、PPT 或网页的 standalone SVG。
