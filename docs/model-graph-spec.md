# ModelGraphSpec Guide

`ModelGraphSpec` is the import-side IR for model-derived diagrams. It sits before `ArchitectureSpec`:

```text
HuggingFace config / PyTorch module / torch.fx graph
  -> ModelGraphSpec
  -> ArchitectureSpec
  -> SVG
```

The goal is semantic architecture visualization, not raw operator dumping. The default renderer compresses repeated layers and exposes multiple levels.

## Levels

- `overview`: paper/textbook concept diagram. Repeated blocks are compressed, for example `Transformer Block ×100`.
- `representative-block`: expands one representative block and marks how many times it repeats.
- `layer-strip`: draws many layers as compact small multiples for highlighting ranges.
- `debug-graph`: renders imported graph nodes directly. This is for debugging, not publication figures.

## Schema

```ts
interface ModelGraphSpec {
  schemaVersion: 1;
  kind: "model-graph";
  modelName: string;
  framework: "huggingface" | "pytorch" | "torch-fx" | "manual";
  source: "hf-config" | "hf-model" | "torch-fx" | "manual";
  modelType?: string;
  architecture?: {
    family: "gpt" | "decoder-only" | "bert" | "encoder-only" | "transformer" | "unknown";
    params: Record<string, number | boolean | string>;
  };
  config?: Record<string, unknown>;
  nodes: ModelGraphNode[];
  edges: ModelGraphEdge[];
  repeatedBlocks: ModelGraphRepeatedBlock[];
  presentation?: ArchitecturePresentationSpec;
  createdAt: string;
  updatedAt: string;
}
```

## Python tracer

The optional Python package lives under `python/` and does not affect npm runtime dependencies.

```bash
cd python
python -m pip install -e .
llm-arch-trace --config config.json --out ../artifacts/model-graph.json
```

Remote HuggingFace ids require the optional `hf` extra:

```bash
python -m pip install -e '.[hf]'
llm-arch-trace --model gpt2 --out ../artifacts/gpt2-model-graph.json
```

## Node rendering

```bash
npx llm-architecture-svg \
  --model-graph artifacts/model-graph.json \
  --level representative-block \
  --profile expanded-gpt-block \
  --out artifacts/model-block.svg
```

```ts
import { renderModelGraphSvg } from "@mappedinfo/llm-architecture-svg";

const svg = renderModelGraphSvg(modelGraph, {
  level: "overview",
  profile: "textbook-overview"
});
```

## Current semantic lifting scope

The first rule pack recognizes common HuggingFace config fields and module names for GPT/GPT-2, BERT, LLaMA/Mistral-style decoder models, and T5/BART-style encoder-decoder models. Unknown PyTorch modules can still be rendered through `debug-graph`, then manually refined through `ArchitectureSpec` or presentation overlays.
