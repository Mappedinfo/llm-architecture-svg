# Gallery and Demo Commands

Run demos from the repository root.

## Basic GPT overview

```bash
npm run demo:basic
```

Output:

```text
artifacts/demo/api-basic.svg
```

Expected labels:

- `token embed`
- `transformer 0`
- `lm head`
- `softmax`

## Expanded transformer internals

```bash
npm run demo:expanded
```

Output:

```text
artifacts/demo/api-expanded.svg
```

Expected labels:

- `q proj`
- `k proj`
- `v proj`
- `att scores`
- `att probs`
- `mlp fc`
- `mlp proj`

## Custom ArchitectureSpec

```bash
npm run demo:custom
```

Output:

```text
artifacts/demo/api-custom-spec.svg
```

This demonstrates rendering a hand-written `ArchitectureSpec` rather than using the GPT generator.

## Batch export

```bash
npm run demo:batch
```

Output:

```text
artifacts/demo/batch/gpt-template-small.svg
artifacts/demo/batch/gpt-template-expanded-block-0.svg
artifacts/demo/batch/gpt-template-wide.svg
```

The batch file is:

```text
examples/llm-svg-batch.json
```

## Direct CLI examples

```bash
npx llm-architecture-svg --preset gpt --T 64 --C 192 --nHeads 3 --nBlocks 3 --vocabSize 1000 --out artifacts/demo/direct.svg
```

```bash
npx llm-architecture-svg --preset gpt --expand block_0 --theme blueprint --out artifacts/demo/direct-expanded.svg
```
