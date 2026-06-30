import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ArchitectureSpec, renderArchitectureSvg } from "../src";

const outDir = "artifacts/demo";
mkdirSync(outDir, { recursive: true });

const now = new Date().toISOString();
const spec: ArchitectureSpec = {
  schemaVersion: 1,
  mode: "teaching",
  id: "custom-minimal-llm",
  name: "Minimal custom LLM block chain",
  notes: "A hand-written ArchitectureSpec demo.",
  createdAt: now,
  updatedAt: now,
  view: {
    canvas: { w: 520, h: 360 }
  },
  nodes: [
    {
      id: "input",
      type: "block",
      kind: "generic_tensor",
      label: "tokens",
      shape: { T: 32 },
      position2d: { x: 180, y: 40 },
      size2d: { w: 150, h: 42 },
      color: "#efe3c8",
      derived: {
        source: "gpt-template",
        role: "input_tokens",
        shapeLabel: "[T]",
        paramCategory: "none",
        paramCount: 0,
        paramFormula: "input only",
        overview: true
      }
    },
    {
      id: "embed",
      type: "block",
      kind: "token_embed",
      label: "embedding",
      shape: { rows: 2048, cols: 128 },
      position2d: { x: 180, y: 124 },
      size2d: { w: 150, h: 46 },
      color: "#f0a8fc",
      derived: {
        source: "gpt-template",
        role: "custom_embedding",
        shapeLabel: "[2048, 128]",
        paramCategory: "embedding",
        paramCount: 2048 * 128,
        paramFormula: "vocab * C",
        overview: true
      }
    },
    {
      id: "classifier",
      type: "block",
      kind: "linear",
      label: "classifier",
      shape: { rows: 128, cols: 10 },
      position2d: { x: 180, y: 220 },
      size2d: { w: 150, h: 46 },
      color: "#a8c3fc",
      derived: {
        source: "gpt-template",
        role: "custom_classifier",
        shapeLabel: "[128, 10]",
        paramCategory: "linear",
        paramCount: 128 * 10,
        paramFormula: "C * classes",
        overview: true
      }
    }
  ],
  edges: [
    { id: "edge-input-embed", source: "input", target: "embed", kind: "data" },
    { id: "edge-embed-classifier", source: "embed", target: "classifier", kind: "data" }
  ]
};

const svg = renderArchitectureSvg(spec, {
  title: "Custom ArchitectureSpec demo",
  showShapes: true,
  showParamCounts: true
});

const outPath = join(outDir, "api-custom-spec.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`Wrote ${outPath}`);
