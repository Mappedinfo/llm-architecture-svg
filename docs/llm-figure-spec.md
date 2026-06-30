# LlmFigureSpec guide

`LlmFigureSpec` is a standalone schema for LLM mechanism explanation figures. It is separate from `ArchitectureSpec`: architecture diagrams still describe model blocks and tensor shapes, while figure diagrams describe teaching and paper-style mechanisms such as token selection, n-gram windows, indexers, and embedding fusion.

The renderer is pure TypeScript and returns a standalone SVG string. It does not use React, DOM, Canvas, WebGL, model weights, or inference.

## Quick API

```ts
import {
  renderLlmFigureSvg,
  renderLsaKvIndexingFigure,
  renderNgramEmbeddingFigure
} from "@mappedinfo/llm-architecture-svg";

const lsaSvg = renderLsaKvIndexingFigure();
const ngramSvg = renderNgramEmbeddingFigure();
const customSvg = renderLlmFigureSvg(customFigureSpec);
```

CLI:

```bash
llm-architecture-svg --figure-preset lsa-kv-indexing --out lsa.svg
llm-architecture-svg --figure-preset ngram-embedding --out ngram.svg
llm-architecture-svg --figure-spec figure.json --out custom.svg
```

## Schema shape

```ts
type LlmFigureSpec = {
  schemaVersion: 1;
  id: string;
  name: string;
  notes?: string;
  profile?: "paper-algorithm" | "drawio-mechanism";
  view: { width: number; height: number; padding?: number };
  primitives: LlmFigurePrimitive[];
  edges: LlmFigureEdge[];
};
```

Every primitive has manual coordinates:

```ts
type LlmFigurePrimitive = {
  id: string;
  kind: string;
  label?: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  style?: LlmFigureStyle;
  children?: LlmFigurePrimitive[];
  metadata?: Record<string, string | number | boolean | string[]>;
};
```

Manual coordinates are intentional for v1. They make output stable and suitable for paper, slide, and blog figures.

## Primitives

- `token`: single rounded token box.
- `token_row`: group of token children.
- `token_stack`: vertical token list, useful for KV cache and selected token sets.
- `stacked_cards`: overlapping process cards, useful for n-gram branches.
- `process_block`: rounded algorithm/module block.
- `selector`: trapezoid selector block.
- `indexer`: rounded indexer block.
- `sum_node`: plus-circle aggregator.
- `embedding_vector`: output vector block.
- `dashed_window`: dashed sliding-window box.
- `group_box`: dashed or framed grouping box.
- `annotation`: free text label.
- `edge`: reserved primitive kind; normal connectors should use top-level `edges`.

## Edges

Edges can connect explicit points or primitive ids:

```ts
{
  id: "tokens-to-selector",
  sourcePoint: { x: 120, y: 200 },
  targetPoint: { x: 280, y: 200 },
  points: [{ x: 200, y: 240 }],
  kind: "polyline",
  arrowEnd: true,
  dashed: false,
  label: "Top-k Indices"
}
```

Use explicit points for paper-style figures where exact routing matters. Use `source` and `target` ids for simple center-to-center connections.

## Profiles

- `paper-algorithm`: paper-style algorithm flow with white background, black strokes, token stacks, selector trapezoids, dashed sharing groups, and sparse green/yellow token highlights.
- `drawio-mechanism`: Draw.io-style teaching figure with rounded cards, stacked blocks, yellow/green token row, plus-circle aggregator, and dashed sliding windows.

Profiles control typography, stroke width, radius, arrowheads, token colors, dashed patterns, and card offsets.

## Architecture figure presets

`LlmFigureSpec` also powers compact architecture figures for common Transformer-family models:

```ts
import {
  renderTransformerPaperFigure,
  renderBertArchitectureFigure,
  renderGptDecoderFigure,
  renderEncoderOnlyFigure,
  renderDecoderOnlyFigure
} from "@mappedinfo/llm-architecture-svg";
```

CLI presets:

```bash
llm-architecture-svg --figure-preset transformer-paper --out transformer.svg
llm-architecture-svg --figure-preset bert-encoder --out bert.svg
llm-architecture-svg --figure-preset gpt-decoder --out gpt-decoder.svg
llm-architecture-svg --figure-preset encoder-only --out encoder-only.svg
llm-architecture-svg --figure-preset decoder-only --out decoder-only.svg
```

Architecture-oriented profiles:

- `architecture-paper`: white background, black strokes, paper/PPT style.
- `architecture-blueprint`: light blue technical diagram style.
- `architecture-dark`: high-contrast slide style.

These presets are explanatory diagrams, not exact model checkpoints. They do not store weights or run inference.
