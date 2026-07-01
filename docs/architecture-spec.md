# ArchitectureSpec Guide

`ArchitectureSpec` is the data model rendered to SVG.

For imported PyTorch/HuggingFace structures, use `ModelGraphSpec` first, then convert it with `modelGraphToArchitectureSpec()`. See [ModelGraphSpec guide](model-graph-spec.md).

## Top-level fields

```ts
interface ArchitectureSpec {
  schemaVersion: 1;
  mode: "template" | "teaching";
  template?: ArchitectureTemplate;
  id: string;
  name: string;
  notes?: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  view: {
    canvas: { w: number; h: number };
    scale3d?: number;
  };
  presentation?: ArchitecturePresentationSpec;
  createdAt: string;
  updatedAt: string;
}
```

## Template params

```ts
type ArchitectureTemplate =
  | { type: "gpt"; params: GptTemplateParams }
  | { type: "transformer"; params: TransformerTemplateParams }
  | { type: "bert"; params: BertTemplateParams }
  | { type: "encoder-only"; params: EncoderOnlyTemplateParams }
  | { type: "decoder-only"; params: DecoderOnlyTemplateParams };

interface GptTemplateParams {
  T: number;
  C: number;
  nHeads: number;
  nBlocks: number;
  vocabSize: number;
  bias: boolean;
  tieEmbeddings: boolean;
}
```

Transformer encoder-decoder templates use `srcT`, `tgtT`, `nEncoderBlocks`, and `nDecoderBlocks`. BERT templates use `typeVocabSize` and `numLabels` in addition to encoder parameters.

Derived value:

```ts
A = C / nHeads
```

`C` must be divisible by `nHeads` for template generation.

## Nodes

Nodes are blocks or groups:

```ts
interface ArchitectureNode {
  id: string;
  type: "block" | "group";
  kind: ArchitectureNodeKind;
  label: string;
  shape: ArchitectureShape;
  position2d: { x: number; y: number };
  size2d: { w: number; h: number };
  color?: string;
  children?: ArchitectureNode[];
  derived?: ArchitectureDerivedMeta;
}
```

Supported `kind` values:

- `token_embed`
- `pos_embed`
- `layer_norm`
- `attention`
- `mlp`
- `linear`
- `softmax`
- `residual_add`
- `generic_tensor`
- `group`

## Edges

```ts
interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  kind: "data" | "residual" | "dependency";
  label?: string;
}
```

Edge rendering:

- `data`: main flow
- `residual`: residual connection
- `dependency`: derived tensor dependency, such as Q/K to attention scores

## Derived metadata

Generated template nodes include `derived` metadata:

```ts
interface ArchitectureDerivedMeta {
  source:
    | "gpt-template"
    | "transformer-template"
    | "bert-template"
    | "encoder-only-template"
    | "decoder-only-template";
  role: string;
  expectedShape?: ArchitectureShape;
  shapeLabel?: string;
  paramCategory?: "embedding" | "attention" | "mlp" | "layer_norm" | "linear" | "none";
  paramCount?: number;
  paramFormula?: string;
  locked?: boolean;
  overview?: boolean;
}
```

`overview=true` means the node is part of the compact architecture view. Derived children such as Q/K/V and MLP projections are shown when their parent group is expanded.

## Presentation overlays

`ArchitectureSpec.presentation` and `renderArchitectureSvg(..., { presentation })` can customize teaching output without changing model structure.

```ts
interface ArchitecturePresentationSpec {
  muteUnmatched?: boolean;
  overrides: ArchitecturePresentationOverride[];
}

interface ArchitecturePresentationOverride {
  selector: {
    ids?: string[];
    roles?: string[];
    kinds?: ArchitectureNodeKind[];
  };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  label?: string;
  labelColor?: string;
  highlight?: boolean | { badge?: string; glow?: boolean };
  muted?: boolean;
  callout?: string;
}
```

For `textbook-overview`, useful roles include `multi_head_attention`, `cross_attention`, `masked_attention`, `feed_forward`, `token_embedding`, `segment_embedding`, and `positional_encoding`.

## Common inferred shapes

- token embedding weights: `[vocabSize, C]`
- positional embedding: `[T, C]`
- Q/K/V: `[T, A] x nHeads`
- attention scores/probs: `[T, T] x nHeads`
- attention output projection activation: `[T, C]`
- MLP fc weights: `[C, 4C]`
- MLP projection weights: `[4C, C]`
- final layer norm: `[C]`
- lm head: `[C, vocabSize]`
