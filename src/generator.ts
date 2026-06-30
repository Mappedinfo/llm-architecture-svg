import {
  ArchitectureEdge,
  ArchitectureEdgeKind,
  ArchitectureNode,
  ArchitectureNodeKind,
  ArchitectureParamCategory,
  ArchitectureShape,
  ArchitectureSpec,
  COMPONENT_TEMPLATES,
  GptTemplateParams
} from "./types";

export const DEFAULT_GPT_TEMPLATE_PARAMS: GptTemplateParams = {
  T: 64,
  C: 192,
  nHeads: 3,
  nBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
};

export interface ParameterCategorySummary {
  category: ArchitectureParamCategory;
  count: number;
}

export interface ParameterSummary {
  total: number;
  categories: ParameterCategorySummary[];
}

interface DerivedInit {
  role?: string;
  shapeLabel?: string;
  category?: ArchitectureParamCategory;
  count?: number;
  formula?: string;
  overview?: boolean;
}

export function validateGptTemplateParams(params: GptTemplateParams): string[] {
  const issues: string[] = [];
  checkInteger("T", params.T, 1, 2048, issues);
  checkInteger("C", params.C, 1, 12288, issues);
  checkInteger("nHeads", params.nHeads, 1, 96, issues);
  checkInteger("nBlocks", params.nBlocks, 1, 96, issues);
  checkInteger("vocabSize", params.vocabSize, 1, 100000, issues);
  if (Number.isInteger(params.C) && Number.isInteger(params.nHeads) && params.nHeads > 0 && params.C % params.nHeads !== 0) {
    issues.push("C must be divisible by nHeads.");
  }
  return issues;
}

export function generateGptArchitecture(params: GptTemplateParams, opts: Partial<Pick<ArchitectureSpec, "id" | "name" | "notes" | "createdAt">> = {}): ArchitectureSpec {
  const issues = validateGptTemplateParams(params);
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }

  const now = new Date().toISOString();
  const A = params.C / params.nHeads;
  const blockGap = 360;
  const topY = 96;
  const blockStartY = 210;
  const finalY = blockStartY + params.nBlocks * blockGap + 22;
  const canvasHeight = finalY + 190;
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];

  nodes.push(node("llm", "group", "LLM", 28, 54, 610, canvasHeight - 92, {}, { role: "llm_group", overview: false }));
  nodes.push(node("tok_embed", "token_embed", "token embed", 250, topY, 140, 34, { rows: params.vocabSize, cols: params.C }, {
    role: "token_embed",
    shapeLabel: `[${params.vocabSize}, ${params.C}]`,
    category: "embedding",
    count: params.vocabSize * params.C,
    formula: `vocabSize * C = ${params.vocabSize} * ${params.C}`,
    overview: true
  }));
  nodes.push(node("pos_embed", "pos_embed", "pos embed", 250, topY + 52, 140, 32, { T: params.T, C: params.C }, {
    role: "pos_embed",
    shapeLabel: `[${params.T}, ${params.C}]`,
    category: "embedding",
    count: params.T * params.C,
    formula: `T * C = ${params.T} * ${params.C}`,
    overview: true
  }));
  edges.push(edge("tok_embed", "pos_embed", "data"));

  let prev = "pos_embed";
  for (let i = 0; i < params.nBlocks; i++) {
    const groupId = `block_${i}`;
    const y = blockStartY + i * blockGap;
    nodes.push(node(groupId, "group", `transformer ${i}`, 78, y, 500, 310, { T: params.T, C: params.C, nHeads: params.nHeads, A }, {
      role: "transformer_block",
      shapeLabel: `[${params.T}, ${params.C}]`,
      overview: true
    }, transformerBlockNodes(i, y, params, A)));
    edges.push(edge(prev, groupId, "data"));
    edges.push(...transformerBlockEdges(i, prev, i === params.nBlocks - 1 ? "ln_f" : `block_${i + 1}`));
    prev = groupId;
  }

  nodes.push(node("ln_f", "layer_norm", "final layer norm", 242, finalY, 158, 34, { C: params.C }, layerNormDerived("ln_f", params, true)));
  nodes.push(node("lm_head", "linear", "lm head", 242, finalY + 52, 158, 34, { rows: params.C, cols: params.vocabSize }, {
    role: "lm_head",
    shapeLabel: `[${params.C}, ${params.vocabSize}]`,
    category: "linear",
    count: params.tieEmbeddings ? 0 : params.C * params.vocabSize,
    formula: params.tieEmbeddings ? "tied with token embedding = 0 additional params" : `C * vocabSize = ${params.C} * ${params.vocabSize}`,
    overview: true
  }));
  nodes.push(node("softmax", "softmax", "softmax", 242, finalY + 104, 158, 34, { vocabSize: params.vocabSize }, {
    role: "softmax",
    shapeLabel: `[${params.vocabSize}]`,
    category: "none",
    count: 0,
    formula: "no trainable parameters",
    overview: true
  }));
  edges.push(edge(prev, "ln_f", "data"));
  edges.push(edge("ln_f", "lm_head", "data"));
  edges.push(edge("lm_head", "softmax", "data"));

  return {
    schemaVersion: 1,
    mode: "template",
    template: { type: "gpt", params },
    id: opts.id ?? createId("gpt-arch"),
    name: opts.name ?? "GPT Template Architecture",
    notes: opts.notes ?? "Generated from GPT hyperparameters. No weights are stored.",
    nodes,
    edges,
    view: { canvas: { w: 680, h: canvasHeight }, scale3d: 0.7 },
    createdAt: opts.createdAt ?? now,
    updatedAt: now
  };
}

export function countArchitectureParameters(architecture: ArchitectureSpec): ParameterSummary {
  const categories: ArchitectureParamCategory[] = ["embedding", "attention", "mlp", "layer_norm", "linear"];
  const totals = new Map<ArchitectureParamCategory, number>(categories.map((category) => [category, 0]));
  for (const node of flattenNodes(architecture.nodes)) {
    const category = node.derived?.paramCategory ?? "none";
    if (category === "none") continue;
    totals.set(category, (totals.get(category) ?? 0) + (node.derived?.paramCount ?? 0));
  }
  const categorySummaries = categories.map((category) => ({ category, count: totals.get(category) ?? 0 }));
  return { categories: categorySummaries, total: categorySummaries.reduce((sum, item) => sum + item.count, 0) };
}

export function formatParamCount(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return `${value}`;
}

export function shapeToLabel(shape: ArchitectureShape | undefined): string {
  if (!shape) return "n/a";
  if (shape.rows && shape.cols && shape.nHeads) return `[${shape.rows}, ${shape.cols}] x ${shape.nHeads}`;
  if (shape.T && shape.A && shape.nHeads) return `[${shape.T}, ${shape.A}] x ${shape.nHeads}`;
  if (shape.T && shape.C) return `[${shape.T}, ${shape.C}]`;
  if (shape.rows && shape.cols) return `[${shape.rows}, ${shape.cols}]`;
  if (shape.C) return `[${shape.C}]`;
  if (shape.vocabSize) return `[${shape.vocabSize}]`;
  return Object.entries(shape).map(([key, value]) => `${key}=${value}`).join(", ") || "n/a";
}

function transformerBlockNodes(i: number, y: number, params: GptTemplateParams, A: number): ArchitectureNode[] {
  const C4 = params.C * 4;
  const p = `block_${i}`;
  return [
    node(`${p}_ln1`, "layer_norm", "ln1", 112, y + 36, 86, 30, { C: params.C }, layerNormDerived("ln1", params)),
    node(`${p}_q`, "linear", "q proj", 226, y + 24, 82, 28, { T: params.T, A, nHeads: params.nHeads }, attentionProjDerived("q_proj", `[${params.T}, ${A}] x ${params.nHeads}`, params)),
    node(`${p}_k`, "linear", "k proj", 226, y + 62, 82, 28, { T: params.T, A, nHeads: params.nHeads }, attentionProjDerived("k_proj", `[${params.T}, ${A}] x ${params.nHeads}`, params)),
    node(`${p}_v`, "linear", "v proj", 226, y + 100, 82, 28, { T: params.T, A, nHeads: params.nHeads }, attentionProjDerived("v_proj", `[${params.T}, ${A}] x ${params.nHeads}`, params)),
    node(`${p}_att_scores`, "attention", "att scores", 336, y + 42, 100, 34, { rows: params.T, cols: params.T, nHeads: params.nHeads }, activationDerived("attention_scores", `[${params.T}, ${params.T}] x ${params.nHeads}`)),
    node(`${p}_att_probs`, "attention", "att probs", 336, y + 88, 100, 34, { rows: params.T, cols: params.T, nHeads: params.nHeads }, activationDerived("attention_probs", `[${params.T}, ${params.T}] x ${params.nHeads}`)),
    node(`${p}_att_proj`, "linear", "attn out proj", 462, y + 66, 90, 34, { T: params.T, C: params.C }, attentionProjDerived("attn_out_proj", `[${params.T}, ${params.C}]`, params)),
    node(`${p}_add1`, "residual_add", "+", 304, y + 142, 34, 34, { T: params.T, C: params.C }, activationDerived("attn_residual_add", `[${params.T}, ${params.C}]`)),
    node(`${p}_ln2`, "layer_norm", "ln2", 112, y + 202, 86, 30, { C: params.C }, layerNormDerived("ln2", params)),
    node(`${p}_mlp_fc`, "linear", "mlp fc", 226, y + 190, 88, 34, { rows: params.C, cols: C4 }, mlpDerived("mlp_fc", `[${params.C}, ${C4}]`, params.C * C4 + (params.bias ? C4 : 0), params.bias ? `C * 4C + 4C bias = ${params.C} * ${C4} + ${C4}` : `C * 4C = ${params.C} * ${C4}`)),
    node(`${p}_gelu`, "generic_tensor", "gelu", 340, y + 190, 76, 34, { T: params.T, C: C4 }, activationDerived("gelu", `[${params.T}, ${C4}]`)),
    node(`${p}_mlp_proj`, "linear", "mlp proj", 442, y + 190, 92, 34, { rows: C4, cols: params.C }, mlpDerived("mlp_proj", `[${C4}, ${params.C}]`, C4 * params.C + (params.bias ? params.C : 0), params.bias ? `4C * C + C bias = ${C4} * ${params.C} + ${params.C}` : `4C * C = ${C4} * ${params.C}`)),
    node(`${p}_add2`, "residual_add", "+", 304, y + 252, 34, 34, { T: params.T, C: params.C }, activationDerived("mlp_residual_add", `[${params.T}, ${params.C}]`))
  ];
}

function transformerBlockEdges(i: number, prev: string, next: string): ArchitectureEdge[] {
  const p = `block_${i}`;
  return [
    edge(prev, `${p}_ln1`, "data"),
    edge(`${p}_ln1`, `${p}_q`, "data"),
    edge(`${p}_ln1`, `${p}_k`, "data"),
    edge(`${p}_ln1`, `${p}_v`, "data"),
    edge(`${p}_q`, `${p}_att_scores`, "dependency"),
    edge(`${p}_k`, `${p}_att_scores`, "dependency"),
    edge(`${p}_att_scores`, `${p}_att_probs`, "data"),
    edge(`${p}_att_probs`, `${p}_att_proj`, "dependency"),
    edge(`${p}_v`, `${p}_att_proj`, "dependency"),
    edge(`${p}_att_proj`, `${p}_add1`, "data"),
    edge(prev, `${p}_add1`, "residual", "residual"),
    edge(`${p}_add1`, `${p}_ln2`, "data"),
    edge(`${p}_ln2`, `${p}_mlp_fc`, "data"),
    edge(`${p}_mlp_fc`, `${p}_gelu`, "data"),
    edge(`${p}_gelu`, `${p}_mlp_proj`, "data"),
    edge(`${p}_mlp_proj`, `${p}_add2`, "data"),
    edge(`${p}_add1`, `${p}_add2`, "residual", "residual"),
    edge(`${p}_add2`, next, "data")
  ];
}

function node(id: string, kind: ArchitectureNodeKind, label: string, x: number, y: number, w: number, h: number, shape: ArchitectureShape, derivedInit: DerivedInit, children?: ArchitectureNode[]): ArchitectureNode {
  const template = COMPONENT_TEMPLATES[kind];
  return {
    id,
    type: kind === "group" ? "group" : "block",
    kind,
    label,
    shape: { ...shape },
    position2d: { x, y },
    size2d: { w, h },
    color: template.color,
    children,
    derived: {
      source: "gpt-template",
      role: derivedInit.role ?? id,
      expectedShape: { ...shape },
      shapeLabel: derivedInit.shapeLabel ?? shapeToLabel(shape),
      paramCategory: derivedInit.category ?? "none",
      paramCount: derivedInit.count ?? 0,
      paramFormula: derivedInit.formula ?? "no trainable parameters",
      locked: true,
      overview: derivedInit.overview ?? false
    }
  };
}

function layerNormDerived(role: string, params: GptTemplateParams, overview = false): DerivedInit {
  return {
    role,
    shapeLabel: `[${params.C}]`,
    category: "layer_norm",
    count: params.C + (params.bias ? params.C : 0),
    formula: params.bias ? `C weight + C bias = ${params.C} + ${params.C}` : `C weight = ${params.C}`,
    overview
  };
}

function attentionProjDerived(role: string, shapeLabel: string, params: GptTemplateParams): DerivedInit {
  return {
    role,
    shapeLabel,
    category: "attention",
    count: params.C * params.C + (params.bias ? params.C : 0),
    formula: params.bias ? `C * C + C bias = ${params.C} * ${params.C} + ${params.C}` : `C * C = ${params.C} * ${params.C}`
  };
}

function mlpDerived(role: string, shapeLabel: string, count: number, formula: string): DerivedInit {
  return { role, shapeLabel, category: "mlp", count, formula };
}

function activationDerived(role: string, shapeLabel: string): DerivedInit {
  return { role, shapeLabel, category: "none", count: 0, formula: "activation/intermediate; no trainable parameters" };
}

function edge(source: string, target: string, kind: ArchitectureEdgeKind, label?: string): ArchitectureEdge {
  return { id: `edge-${source}-${target}-${kind}`, source, target, kind, label };
}

function flattenNodes(nodes: ArchitectureNode[]): ArchitectureNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function checkInteger(name: string, value: number, min: number, max: number, issues: string[]): void {
  if (!Number.isInteger(value)) {
    issues.push(`${name} must be an integer.`);
    return;
  }
  if (value < min || value > max) {
    issues.push(`${name} must be between ${min} and ${max}.`);
  }
}
