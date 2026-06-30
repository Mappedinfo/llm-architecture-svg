import {
  ArchitectureDerivedSource,
  ArchitectureEdge,
  ArchitectureEdgeKind,
  ArchitectureNode,
  ArchitectureNodeKind,
  ArchitectureParamCategory,
  ArchitectureShape,
  ArchitectureSpec,
  BertTemplateParams,
  COMPONENT_TEMPLATES,
  DecoderOnlyTemplateParams,
  EncoderOnlyTemplateParams,
  GptTemplateParams,
  TransformerTemplateParams
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

export const DEFAULT_TRANSFORMER_TEMPLATE_PARAMS: TransformerTemplateParams = {
  srcT: 64,
  tgtT: 64,
  C: 192,
  nHeads: 3,
  nEncoderBlocks: 3,
  nDecoderBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
};

export const DEFAULT_BERT_TEMPLATE_PARAMS: BertTemplateParams = {
  T: 128,
  C: 768,
  nHeads: 12,
  nBlocks: 12,
  vocabSize: 30522,
  typeVocabSize: 2,
  numLabels: 2,
  bias: true
};

export const DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS: EncoderOnlyTemplateParams = {
  T: 128,
  C: 384,
  nHeads: 6,
  nBlocks: 6,
  vocabSize: 8192,
  bias: false
};

export const DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS: DecoderOnlyTemplateParams = {
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
  source?: ArchitectureDerivedSource;
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
  checkDivisible(params.C, params.nHeads, issues);
  return issues;
}

export function validateTransformerTemplateParams(params: TransformerTemplateParams): string[] {
  const issues: string[] = [];
  checkInteger("srcT", params.srcT, 1, 2048, issues);
  checkInteger("tgtT", params.tgtT, 1, 2048, issues);
  checkInteger("C", params.C, 1, 12288, issues);
  checkInteger("nHeads", params.nHeads, 1, 96, issues);
  checkInteger("nEncoderBlocks", params.nEncoderBlocks, 1, 96, issues);
  checkInteger("nDecoderBlocks", params.nDecoderBlocks, 1, 96, issues);
  checkInteger("vocabSize", params.vocabSize, 1, 100000, issues);
  checkDivisible(params.C, params.nHeads, issues);
  return issues;
}

export function validateBertTemplateParams(params: BertTemplateParams): string[] {
  const issues: string[] = [];
  checkInteger("T", params.T, 1, 2048, issues);
  checkInteger("C", params.C, 1, 12288, issues);
  checkInteger("nHeads", params.nHeads, 1, 96, issues);
  checkInteger("nBlocks", params.nBlocks, 1, 96, issues);
  checkInteger("vocabSize", params.vocabSize, 1, 100000, issues);
  checkInteger("typeVocabSize", params.typeVocabSize, 1, 1024, issues);
  checkInteger("numLabels", params.numLabels, 1, 10000, issues);
  checkDivisible(params.C, params.nHeads, issues);
  return issues;
}

export function validateEncoderOnlyTemplateParams(params: EncoderOnlyTemplateParams): string[] {
  const issues: string[] = [];
  checkInteger("T", params.T, 1, 2048, issues);
  checkInteger("C", params.C, 1, 12288, issues);
  checkInteger("nHeads", params.nHeads, 1, 96, issues);
  checkInteger("nBlocks", params.nBlocks, 1, 96, issues);
  checkInteger("vocabSize", params.vocabSize, 1, 100000, issues);
  checkDivisible(params.C, params.nHeads, issues);
  return issues;
}

export function validateDecoderOnlyTemplateParams(params: DecoderOnlyTemplateParams): string[] {
  return validateGptTemplateParams(params);
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

export function generateTransformerArchitecture(params: TransformerTemplateParams, opts: Partial<Pick<ArchitectureSpec, "id" | "name" | "notes" | "createdAt">> = {}): ArchitectureSpec {
  const issues = validateTransformerTemplateParams(params);
  if (issues.length > 0) throw new Error(issues.join(" "));
  const now = new Date().toISOString();
  const A = params.C / params.nHeads;
  const C4 = params.C * 4;
  const source: ArchitectureDerivedSource = "transformer-template";
  const nodes: ArchitectureNode[] = [
    node("src_tok_embed", "token_embed", "source token embed", 80, 86, 180, 38, { rows: params.vocabSize, cols: params.C }, embedDerived(source, "source_token_embed", params.vocabSize * params.C, `[${params.vocabSize}, ${params.C}]`)),
    node("src_pos_embed", "pos_embed", "source pos embed", 80, 142, 180, 36, { T: params.srcT, C: params.C }, embedDerived(source, "source_pos_embed", params.srcT * params.C, `[${params.srcT}, ${params.C}]`)),
    node("encoder_stack", "group", `Encoder Layer ×${params.nEncoderBlocks}`, 50, 238, 360, 250, { T: params.srcT, C: params.C, nHeads: params.nHeads, A, nBlocks: params.nEncoderBlocks }, { source, role: "encoder_stack", shapeLabel: `[${params.srcT}, ${params.C}]`, overview: true }, encoderLayerNodes("encoder", 96, 278, params.C, params.nHeads, A, params.nEncoderBlocks, params.bias, source)),
    node("tgt_tok_embed", "token_embed", "target token embed", 550, 86, 180, 38, { rows: params.vocabSize, cols: params.C }, embedDerived(source, "target_token_embed", params.tieEmbeddings ? 0 : params.vocabSize * params.C, `[${params.vocabSize}, ${params.C}]`, params.tieEmbeddings ? "tied target embedding = 0 additional params" : undefined)),
    node("tgt_pos_embed", "pos_embed", "target pos embed", 550, 142, 180, 36, { T: params.tgtT, C: params.C }, embedDerived(source, "target_pos_embed", params.tgtT * params.C, `[${params.tgtT}, ${params.C}]`)),
    node("decoder_stack", "group", `Decoder Layer ×${params.nDecoderBlocks}`, 520, 238, 390, 330, { T: params.tgtT, C: params.C, nHeads: params.nHeads, A, nBlocks: params.nDecoderBlocks }, { source, role: "decoder_stack", shapeLabel: `[${params.tgtT}, ${params.C}]`, overview: true }, decoderLayerNodes("decoder", 562, 278, params.C, params.nHeads, A, params.nDecoderBlocks, params.bias, source)),
    node("transformer_linear", "linear", "linear", 625, 628, 180, 38, { rows: params.C, cols: params.vocabSize }, { source, role: "linear", shapeLabel: `[${params.C}, ${params.vocabSize}]`, category: "linear", count: params.tieEmbeddings ? 0 : params.C * params.vocabSize, formula: params.tieEmbeddings ? "tied with target embedding = 0 additional params" : `C * vocabSize = ${params.C} * ${params.vocabSize}`, overview: true }),
    node("transformer_softmax", "softmax", "softmax", 625, 684, 180, 38, { vocabSize: params.vocabSize }, { source, role: "softmax", shapeLabel: `[${params.vocabSize}]`, overview: true })
  ];
  const edges: ArchitectureEdge[] = [
    edge("src_tok_embed", "src_pos_embed", "data"),
    edge("src_pos_embed", "encoder_stack", "data"),
    edge("tgt_tok_embed", "tgt_pos_embed", "data"),
    edge("tgt_pos_embed", "decoder_stack", "data"),
    edge("encoder_stack", "decoder_cross_attn", "dependency", "memory"),
    edge("decoder_stack", "transformer_linear", "data"),
    edge("transformer_linear", "transformer_softmax", "data")
  ];
  return spec("transformer-arch", "Original Transformer Architecture", "Generated encoder-decoder Transformer architecture. No weights are stored.", { type: "transformer", params }, nodes, edges, { w: 960, h: 780 }, opts, now);
}

export function generateBertArchitecture(params: BertTemplateParams, opts: Partial<Pick<ArchitectureSpec, "id" | "name" | "notes" | "createdAt">> = {}): ArchitectureSpec {
  const issues = validateBertTemplateParams(params);
  if (issues.length > 0) throw new Error(issues.join(" "));
  const now = new Date().toISOString();
  const A = params.C / params.nHeads;
  const source: ArchitectureDerivedSource = "bert-template";
  const nodes: ArchitectureNode[] = [
    node("bert_tok_embed", "token_embed", "Token Embedding", 250, 78, 190, 38, { rows: params.vocabSize, cols: params.C }, embedDerived(source, "token_embedding", params.vocabSize * params.C, `[${params.vocabSize}, ${params.C}]`)),
    node("bert_segment_embed", "generic_tensor", "Segment Embedding", 250, 132, 190, 38, { rows: params.typeVocabSize, cols: params.C }, embedDerived(source, "segment_embedding", params.typeVocabSize * params.C, `[${params.typeVocabSize}, ${params.C}]`)),
    node("bert_pos_embed", "pos_embed", "Position Embedding", 250, 186, 190, 38, { T: params.T, C: params.C }, embedDerived(source, "position_embedding", params.T * params.C, `[${params.T}, ${params.C}]`)),
    node("bert_encoder_stack", "group", `Encoder Layer ×${params.nBlocks}`, 150, 282, 390, 250, { T: params.T, C: params.C, nHeads: params.nHeads, A, nBlocks: params.nBlocks }, { source, role: "encoder_stack", shapeLabel: `[${params.T}, ${params.C}]`, overview: true }, encoderLayerNodes("bert_encoder", 196, 322, params.C, params.nHeads, A, params.nBlocks, params.bias, source)),
    node("bert_contextual", "generic_tensor", "contextual token outputs", 220, 590, 250, 40, { T: params.T, C: params.C }, { source, role: "contextual_outputs", shapeLabel: `[${params.T}, ${params.C}]`, overview: true }),
    node("bert_cls", "generic_tensor", "[CLS] pooled output", 90, 690, 220, 40, { C: params.C }, { source, role: "cls_pool", shapeLabel: `[${params.C}]`, overview: true }),
    node("bert_mlm_head", "linear", "MLM Head", 380, 690, 170, 40, { rows: params.C, cols: params.vocabSize }, { source, role: "mlm_head", shapeLabel: `[${params.C}, ${params.vocabSize}]`, category: "linear", count: params.C * params.vocabSize + (params.bias ? params.vocabSize : 0), formula: params.bias ? `C * vocabSize + vocabSize bias = ${params.C} * ${params.vocabSize} + ${params.vocabSize}` : `C * vocabSize = ${params.C} * ${params.vocabSize}`, overview: true }),
    node("bert_classifier", "linear", "Classifier Head", 90, 750, 220, 40, { rows: params.C, cols: params.numLabels }, { source, role: "classifier_head", shapeLabel: `[${params.C}, ${params.numLabels}]`, category: "linear", count: params.C * params.numLabels + (params.bias ? params.numLabels : 0), formula: params.bias ? `C * numLabels + numLabels bias = ${params.C} * ${params.numLabels} + ${params.numLabels}` : `C * numLabels = ${params.C} * ${params.numLabels}`, overview: true })
  ];
  const edges: ArchitectureEdge[] = [
    edge("bert_tok_embed", "bert_encoder_stack", "data"),
    edge("bert_segment_embed", "bert_encoder_stack", "data"),
    edge("bert_pos_embed", "bert_encoder_stack", "data"),
    edge("bert_encoder_stack", "bert_contextual", "data"),
    edge("bert_contextual", "bert_cls", "data"),
    edge("bert_contextual", "bert_mlm_head", "data"),
    edge("bert_cls", "bert_classifier", "data")
  ];
  return spec("bert-arch", "BERT Encoder Architecture", "Generated BERT-style encoder architecture. No weights are stored.", { type: "bert", params }, nodes, edges, { w: 700, h: 840 }, opts, now);
}

export function generateEncoderOnlyArchitecture(params: EncoderOnlyTemplateParams, opts: Partial<Pick<ArchitectureSpec, "id" | "name" | "notes" | "createdAt">> = {}): ArchitectureSpec {
  const issues = validateEncoderOnlyTemplateParams(params);
  if (issues.length > 0) throw new Error(issues.join(" "));
  const now = new Date().toISOString();
  const A = params.C / params.nHeads;
  const source: ArchitectureDerivedSource = "encoder-only-template";
  const nodes: ArchitectureNode[] = [
    node("enc_input_embed", "token_embed", "Input Embedding", 230, 84, 200, 42, { rows: params.vocabSize, cols: params.C }, embedDerived(source, "input_embedding", params.vocabSize * params.C, `[${params.vocabSize}, ${params.C}]`)),
    node("enc_pos_embed", "pos_embed", "Position Embedding", 230, 146, 200, 38, { T: params.T, C: params.C }, embedDerived(source, "position_embedding", params.T * params.C, `[${params.T}, ${params.C}]`)),
    node("enc_stack", "group", `Encoder Layer ×${params.nBlocks}`, 145, 250, 370, 250, { T: params.T, C: params.C, nHeads: params.nHeads, A, nBlocks: params.nBlocks }, { source, role: "encoder_stack", shapeLabel: `[${params.T}, ${params.C}]`, overview: true }, encoderLayerNodes("enc_stack", 190, 290, params.C, params.nHeads, A, params.nBlocks, params.bias, source)),
    node("enc_outputs", "generic_tensor", "Contextual Outputs", 210, 570, 240, 44, { T: params.T, C: params.C }, { source, role: "contextual_outputs", shapeLabel: `[${params.T}, ${params.C}]`, overview: true })
  ];
  const edges: ArchitectureEdge[] = [
    edge("enc_input_embed", "enc_pos_embed", "data"),
    edge("enc_pos_embed", "enc_stack", "data"),
    edge("enc_stack", "enc_outputs", "data")
  ];
  return spec("encoder-only-arch", "Encoder-only Transformer Architecture", "Generated encoder-only Transformer architecture. No weights are stored.", { type: "encoder-only", params }, nodes, edges, { w: 660, h: 680 }, opts, now);
}

export function generateDecoderOnlyArchitecture(params: DecoderOnlyTemplateParams, opts: Partial<Pick<ArchitectureSpec, "id" | "name" | "notes" | "createdAt">> = {}): ArchitectureSpec {
  const issues = validateDecoderOnlyTemplateParams(params);
  if (issues.length > 0) throw new Error(issues.join(" "));
  const gpt = generateGptArchitecture(params, {
    ...opts,
    name: opts.name ?? "Decoder-only Transformer Architecture",
    notes: opts.notes ?? "Generated decoder-only Transformer architecture. No weights are stored."
  });
  return {
    ...gpt,
    template: { type: "decoder-only", params },
    id: opts.id ?? createId("decoder-only-arch")
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

function encoderLayerNodes(prefix: string, x: number, y: number, C: number, nHeads: number, A: number, nBlocks: number, bias: boolean, source: ArchitectureDerivedSource): ArchitectureNode[] {
  const C4 = C * 4;
  return [
    node(`${prefix}_self_attn`, "attention", "Multi-Head\nAttention", x + 60, y, 170, 58, { T: 0, C, nHeads, A }, stackedAttentionDerived(source, "self_attention", nBlocks, C, bias)),
    node(`${prefix}_add_norm_1`, "layer_norm", "Add & Norm", x + 60, y + 76, 170, 34, { C }, stackedLayerNormDerived(source, "add_norm_1", nBlocks, C, bias)),
    node(`${prefix}_ffn`, "mlp", "Feed\nForward", x + 60, y + 128, 170, 58, { rows: C, cols: C4 }, stackedMlpDerived(source, "feed_forward", nBlocks, C, bias)),
    node(`${prefix}_add_norm_2`, "layer_norm", "Add & Norm", x + 60, y + 204, 170, 34, { C }, stackedLayerNormDerived(source, "add_norm_2", nBlocks, C, bias))
  ];
}

function decoderLayerNodes(prefix: string, x: number, y: number, C: number, nHeads: number, A: number, nBlocks: number, bias: boolean, source: ArchitectureDerivedSource): ArchitectureNode[] {
  const C4 = C * 4;
  return [
    node(`${prefix}_masked_attn`, "attention", "Masked\nMulti-Head\nAttention", x + 70, y, 190, 70, { T: 0, C, nHeads, A }, stackedAttentionDerived(source, "masked_self_attention", nBlocks, C, bias)),
    node(`${prefix}_add_norm_1`, "layer_norm", "Add & Norm", x + 70, y + 88, 190, 34, { C }, stackedLayerNormDerived(source, "add_norm_1", nBlocks, C, bias)),
    node(`${prefix}_cross_attn`, "attention", "Encoder-Decoder\nAttention", x + 70, y + 140, 190, 64, { T: 0, C, nHeads, A }, stackedAttentionDerived(source, "cross_attention", nBlocks, C, bias)),
    node(`${prefix}_add_norm_2`, "layer_norm", "Add & Norm", x + 70, y + 222, 190, 34, { C }, stackedLayerNormDerived(source, "add_norm_2", nBlocks, C, bias)),
    node(`${prefix}_ffn`, "mlp", "Feed\nForward", x + 70, y + 274, 190, 58, { rows: C, cols: C4 }, stackedMlpDerived(source, "feed_forward", nBlocks, C, bias)),
    node(`${prefix}_add_norm_3`, "layer_norm", "Add & Norm", x + 70, y + 350, 190, 34, { C }, stackedLayerNormDerived(source, "add_norm_3", nBlocks, C, bias))
  ];
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

function spec(prefix: string, fallbackName: string, fallbackNotes: string, template: ArchitectureSpec["template"], nodes: ArchitectureNode[], edges: ArchitectureEdge[], canvas: { w: number; h: number }, opts: Partial<Pick<ArchitectureSpec, "id" | "name" | "notes" | "createdAt">>, now: string): ArchitectureSpec {
  return {
    schemaVersion: 1,
    mode: "template",
    template,
    id: opts.id ?? createId(prefix),
    name: opts.name ?? fallbackName,
    notes: opts.notes ?? fallbackNotes,
    nodes,
    edges,
    view: { canvas, scale3d: 0.7 },
    createdAt: opts.createdAt ?? now,
    updatedAt: now
  };
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
      source: derivedInit.source ?? "gpt-template",
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

function embedDerived(source: ArchitectureDerivedSource, role: string, count: number, shapeLabel: string, formula?: string): DerivedInit {
  return { source, role, shapeLabel, category: "embedding", count, formula: formula ?? `${shapeLabel} embedding table`, overview: true };
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

function stackedAttentionDerived(source: ArchitectureDerivedSource, role: string, nBlocks: number, C: number, bias: boolean): DerivedInit {
  const perBlock = 4 * C * C + (bias ? 4 * C : 0);
  return {
    source,
    role,
    shapeLabel: `[C, C] projections ×4 × ${nBlocks}`,
    category: "attention",
    count: perBlock * nBlocks,
    formula: bias ? `(4 * C * C + 4C bias) * N = (${4 * C * C} + ${4 * C}) * ${nBlocks}` : `4 * C * C * N = ${4 * C * C} * ${nBlocks}`,
    overview: true
  };
}

function stackedMlpDerived(source: ArchitectureDerivedSource, role: string, nBlocks: number, C: number, bias: boolean): DerivedInit {
  const C4 = C * 4;
  const perBlock = C * C4 + C4 * C + (bias ? C4 + C : 0);
  return {
    source,
    role,
    shapeLabel: `[${C}, ${C4}] + [${C4}, ${C}] × ${nBlocks}`,
    category: "mlp",
    count: perBlock * nBlocks,
    formula: bias ? `(C * 4C + 4C * C + 5C bias) * N = ${perBlock} * ${nBlocks}` : `(C * 4C + 4C * C) * N = ${perBlock} * ${nBlocks}`,
    overview: true
  };
}

function stackedLayerNormDerived(source: ArchitectureDerivedSource, role: string, nBlocks: number, C: number, bias: boolean): DerivedInit {
  const perNorm = C + (bias ? C : 0);
  return {
    source,
    role,
    shapeLabel: `[${C}] × ${nBlocks}`,
    category: "layer_norm",
    count: perNorm * nBlocks,
    formula: bias ? `(C weight + C bias) * N = ${2 * C} * ${nBlocks}` : `C weight * N = ${C} * ${nBlocks}`,
    overview: true
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

function checkDivisible(C: number, nHeads: number, issues: string[]): void {
  if (Number.isInteger(C) && Number.isInteger(nHeads) && nHeads > 0 && C % nHeads !== 0) {
    issues.push("C must be divisible by nHeads.");
  }
}
