import {
  ArchitectureDerivedSource,
  ArchitectureEdge,
  ArchitectureNode,
  ArchitectureNodeKind,
  ArchitectureParamCategory,
  ArchitecturePresentationSpec,
  ArchitectureShape,
  ArchitectureSpec,
  BertTemplateParams,
  DecoderOnlyTemplateParams,
  EncoderOnlyTemplateParams,
  TransformerTemplateParams
} from "./types";
import {
  DEFAULT_BERT_TEMPLATE_PARAMS,
  DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_TRANSFORMER_TEMPLATE_PARAMS,
  generateBertArchitecture,
  generateDecoderOnlyArchitecture,
  generateEncoderOnlyArchitecture,
  generateTransformerArchitecture,
  shapeToLabel
} from "./generator";
import { RenderArchitectureSvgOptions, renderArchitectureSvg } from "./svg";

export type ModelGraphFramework = "huggingface" | "pytorch" | "torch-fx" | "manual";
export type ModelGraphSourceKind = "hf-config" | "hf-model" | "torch-fx" | "manual";
export type ModelGraphFamily = "gpt" | "decoder-only" | "bert" | "encoder-only" | "transformer" | "unknown";
export type ModelGraphLevel = "overview" | "representative-block" | "layer-strip" | "debug-graph";

export interface ModelGraphModule {
  path: string;
  className?: string;
  semanticRole?: string;
  paramCount?: number;
  children?: ModelGraphModule[];
}

export interface ModelGraphNode {
  id: string;
  label: string;
  opType?: string;
  modulePath?: string;
  className?: string;
  semanticRole?: string;
  kind?: ArchitectureNodeKind;
  shape?: ArchitectureShape;
  paramCount?: number;
  paramFormula?: string;
  children?: ModelGraphNode[];
  metadata?: Record<string, unknown>;
}

export interface ModelGraphEdge {
  id: string;
  source: string;
  target: string;
  kind?: "data" | "residual" | "dependency";
  label?: string;
}

export interface ModelGraphRepeatedBlock {
  id: string;
  label: string;
  role: string;
  count: number;
  modulePattern?: string;
  representativeNodeId?: string;
  memberNodeIds?: string[];
}

export interface ModelGraphArchitectureHint {
  family: ModelGraphFamily;
  params: Record<string, number | boolean | string | undefined>;
}

export interface ModelGraphSpec {
  schemaVersion: 1;
  kind: "model-graph";
  modelName: string;
  framework: ModelGraphFramework;
  source: ModelGraphSourceKind;
  modelType?: string;
  architecture?: ModelGraphArchitectureHint;
  config?: Record<string, unknown>;
  modules?: ModelGraphModule[];
  nodes: ModelGraphNode[];
  edges: ModelGraphEdge[];
  repeatedBlocks: ModelGraphRepeatedBlock[];
  presentation?: ArchitecturePresentationSpec;
  createdAt: string;
  updatedAt: string;
}

export interface HfConfigGraphOptions {
  modelName?: string;
  source?: ModelGraphSourceKind;
  framework?: ModelGraphFramework;
}

export interface ModelGraphToArchitectureOptions {
  level?: ModelGraphLevel;
  block?: string;
  title?: string;
  presentation?: ArchitecturePresentationSpec;
}

export interface RenderModelGraphSvgOptions extends RenderArchitectureSvgOptions {
  level?: ModelGraphLevel;
  block?: string;
}

interface NormalizedModelInfo {
  family: ModelGraphFamily;
  modelType: string;
  T: number;
  srcT: number;
  tgtT: number;
  C: number;
  nHeads: number;
  nBlocks: number;
  nEncoderBlocks: number;
  nDecoderBlocks: number;
  vocabSize: number;
  intermediateSize: number;
  typeVocabSize: number;
  numLabels: number;
  bias: boolean;
  tieEmbeddings: boolean;
}

const MODEL_SOURCE: ArchitectureDerivedSource = "model-graph";
const DEFAULT_NOW = "1970-01-01T00:00:00.000Z";

export function createModelGraphFromHfConfig(config: Record<string, unknown>, options: HfConfigGraphOptions = {}): ModelGraphSpec {
  const info = normalizeConfig(config);
  const now = new Date().toISOString();
  const modelName = options.modelName ?? stringValue(config.name_or_path) ?? stringValue(config.model_name) ?? `${info.modelType || info.family} model`;
  const repeatedRole = info.family === "bert" || info.family === "encoder-only" ? "encoder_block" : info.family === "transformer" ? "encoder_decoder_block" : "decoder_block";
  const repeatedLabel = info.family === "bert" || info.family === "encoder-only" ? "Encoder Layer" : info.family === "transformer" ? "Transformer Layer" : "Decoder Layer";
  return {
    schemaVersion: 1,
    kind: "model-graph",
    modelName,
    framework: options.framework ?? "huggingface",
    source: options.source ?? "hf-config",
    modelType: info.modelType,
    architecture: { family: info.family, params: architectureParams(info) },
    config: { ...config },
    nodes: createSemanticNodes(info),
    edges: createSemanticEdges(info),
    repeatedBlocks: [{
      id: "layers",
      label: repeatedLabel,
      role: repeatedRole,
      count: info.family === "transformer" ? Math.max(info.nEncoderBlocks, info.nDecoderBlocks) : info.nBlocks,
      modulePattern: info.family === "bert" ? "encoder.layer.{i}" : info.family === "transformer" ? "encoder.block.{i} / decoder.block.{i}" : "model.layers.{i}",
      representativeNodeId: "representative_block"
    }],
    createdAt: now,
    updatedAt: now
  };
}

export function modelGraphToArchitectureSpec(modelGraph: ModelGraphSpec, options: ModelGraphToArchitectureOptions = {}): ArchitectureSpec {
  const level = options.level ?? "overview";
  const info = normalizeModelGraph(modelGraph);
  if (level === "debug-graph") return createDebugArchitecture(modelGraph, options);
  if (level === "layer-strip") return createLayerStripArchitecture(modelGraph, info, options);
  if (level === "representative-block") return createRepresentativeBlockArchitecture(modelGraph, info, options);
  return createOverviewArchitecture(modelGraph, info, options);
}

export function renderModelGraphSvg(modelGraph: ModelGraphSpec, options: RenderModelGraphSvgOptions = {}): string {
  const level = options.level ?? "overview";
  const architecture = modelGraphToArchitectureSpec(modelGraph, { level, block: options.block, presentation: options.presentation, title: options.title });
  const profile = options.profile ?? (level === "overview" ? "textbook-overview" : level === "debug-graph" ? "teaching-debug" : "expanded-gpt-block");
  const expandedGroups = options.expandedGroups ?? (level === "representative-block" ? ["representative_block"] : undefined);
  const showShapes = options.showShapes ?? (level === "representative-block" ? false : undefined);
  const showParamCounts = options.showParamCounts ?? (level === "representative-block" ? false : undefined);
  return renderArchitectureSvg(architecture, { ...options, profile, expandedGroups, showShapes, showParamCounts });
}

function createOverviewArchitecture(modelGraph: ModelGraphSpec, info: NormalizedModelInfo, options: ModelGraphToArchitectureOptions): ArchitectureSpec {
  if (info.family === "bert") {
    const spec = generateBertArchitecture(toBertParams(info), { name: options.title ?? modelGraph.modelName, createdAt: modelGraph.createdAt });
    return attachModelGraphMeta(spec, modelGraph, options);
  }
  if (info.family === "encoder-only") {
    const spec = generateEncoderOnlyArchitecture(toEncoderOnlyParams(info), { name: options.title ?? modelGraph.modelName, createdAt: modelGraph.createdAt });
    return attachModelGraphMeta(spec, modelGraph, options);
  }
  if (info.family === "transformer") {
    const spec = generateTransformerArchitecture(toTransformerParams(info), { name: options.title ?? modelGraph.modelName, createdAt: modelGraph.createdAt });
    return attachModelGraphMeta(spec, modelGraph, options);
  }
  const params = toDecoderParams(info);
  const A = safeDiv(params.C, params.nHeads);
  const C4 = info.intermediateSize || params.C * 4;
  const nodes: ArchitectureNode[] = [
    archNode("input_tokens", "generic_tensor", "Input Tokens", 230, 54, 170, 38, { T: params.T }, "input_tokens", "none", 0, true),
    archNode("token_embedding", "token_embed", "Token Embedding", 205, 118, 220, 42, { rows: params.vocabSize, cols: params.C }, "token_embedding", "embedding", params.vocabSize * params.C, true),
    archNode("position_embedding", "pos_embed", "Position Embedding", 205, 178, 220, 38, { T: params.T, C: params.C }, "positional_encoding", "embedding", params.T * params.C, true),
    archNode("decoder_stack", "group", `Transformer Block ×${params.nBlocks}`, 130, 282, 370, 128, { T: params.T, C: params.C, nHeads: params.nHeads, A, nBlocks: params.nBlocks }, "decoder_stack", "attention", decoderStackParamCount(params.C, info.intermediateSize, params.nBlocks, params.bias), true, [
      archNode("decoder_stack_attention", "attention", "Self-Attention", 165, 322, 140, 34, { rows: params.C, cols: params.C }, "multi_head_attention", "attention", 4 * params.C * params.C * params.nBlocks, true),
      archNode("decoder_stack_mlp", "mlp", "MLP", 325, 322, 125, 34, { rows: params.C, cols: C4 }, "feed_forward", "mlp", mlpParamCount(params.C, C4, params.bias) * params.nBlocks, true)
    ]),
    archNode("final_norm", "layer_norm", "Final Norm", 220, 472, 190, 38, { C: params.C }, "final_norm", "layer_norm", params.C, true),
    archNode("lm_head", "linear", "LM Head", 220, 534, 190, 38, { rows: params.C, cols: params.vocabSize }, "lm_head", "linear", params.tieEmbeddings ? 0 : params.C * params.vocabSize, true),
    archNode("softmax", "softmax", "Softmax", 220, 596, 190, 38, { vocabSize: params.vocabSize }, "softmax", "none", 0, true)
  ];
  const edges = archEdges(["input_tokens", "token_embedding", "position_embedding", "decoder_stack", "final_norm", "lm_head", "softmax"]);
  return attachModelGraphMeta(specFromParts(modelGraph, options.title ?? modelGraph.modelName, { type: info.family === "gpt" ? "gpt" : "decoder-only", params }, nodes, edges, { w: 640, h: 700 }), modelGraph, options);
}

function createRepresentativeBlockArchitecture(modelGraph: ModelGraphSpec, info: NormalizedModelInfo, options: ModelGraphToArchitectureOptions): ArchitectureSpec {
  const isEncoder = info.family === "bert" || info.family === "encoder-only" || (options.block ?? "").includes("encoder");
  const isTransformerDecoder = info.family === "transformer" && !isEncoder;
  const T = isTransformerDecoder ? info.tgtT : info.T || info.srcT;
  const C = info.C;
  const A = safeDiv(C, info.nHeads);
  const C4 = info.intermediateSize || C * 4;
  const repeatCount = isTransformerDecoder ? info.nDecoderBlocks : isEncoder ? info.nEncoderBlocks || info.nBlocks : info.nBlocks;
  const title = options.title ?? `${modelGraph.modelName} representative block`;
  const nodes: ArchitectureNode[] = [
    archNode("block_input", "generic_tensor", "Block Input", 60, 315, 190, 62, { T, C }, "block_input", "none", 0, true),
    archNode("representative_block", "group", `${isEncoder ? "Encoder" : "Decoder"} Block ×${repeatCount}`, 300, 70, 820, isTransformerDecoder ? 620 : 540, { T, C, nHeads: info.nHeads, A, nBlocks: repeatCount }, isEncoder ? "encoder_block" : "decoder_block", "none", 0, true, representativeChildren(isEncoder, isTransformerDecoder, C, C4, T, A, info.nHeads, info.bias)),
    archNode("block_output", "generic_tensor", "Block Output", 1180, 315, 190, 62, { T, C }, "block_output", "none", 0, true)
  ];
  const edges = representativeEdges(isTransformerDecoder);
  return attachModelGraphMeta(specFromParts(modelGraph, title, undefined, nodes, edges, { w: 1440, h: isTransformerDecoder ? 780 : 700 }), modelGraph, options);
}

function representativeChildren(isEncoder: boolean, hasCrossAttention: boolean, C: number, C4: number, T: number, A: number, nHeads: number, bias: boolean): ArchitectureNode[] {
  const nodes: ArchitectureNode[] = [];
  const baseY = 145;
  let y = baseY;
  nodes.push(archNode("block_ln1", "layer_norm", isEncoder ? "Norm" : "RMSNorm", 340, y, 150, 58, { C }, "norm", "layer_norm", C, false));
  nodes.push(archNode("block_q", "linear", "Q Proj", 540, y - 58, 135, 54, { T, A, nHeads }, "q_proj", "attention", C * C + (bias ? C : 0), false));
  nodes.push(archNode("block_k", "linear", "K Proj", 540, y + 12, 135, 54, { T, A, nHeads }, "k_proj", "attention", C * C + (bias ? C : 0), false));
  nodes.push(archNode("block_v", "linear", "V Proj", 540, y + 82, 135, 54, { T, A, nHeads }, "v_proj", "attention", C * C + (bias ? C : 0), false));
  nodes.push(archNode("block_scores", "attention", "Attention\nScores", 735, y - 20, 185, 68, { rows: T, cols: T, nHeads }, "attention_scores", "none", 0, false));
  nodes.push(archNode("block_probs", "attention", "Softmax\nWeights", 735, y + 70, 185, 68, { rows: T, cols: T, nHeads }, "attention_probs", "none", 0, false));
  nodes.push(archNode("block_attn_out", "linear", "Output\nProjection", 970, y + 25, 150, 68, { T, C }, "attn_out_proj", "attention", C * C + (bias ? C : 0), false));
  nodes.push(archNode("block_add1", "residual_add", "+", 830, y + 175, 42, 42, { T, C }, "residual_add", "none", 0, false));
  y += 270;
  if (hasCrossAttention) {
    nodes.push(archNode("block_cross_attn", "attention", "Encoder-Decoder\nAttention", 540, y - 40, 220, 72, { T, C, nHeads, A }, "cross_attention", "attention", 4 * C * C + (bias ? 4 * C : 0), false));
    nodes.push(archNode("block_add_cross", "residual_add", "+", 830, y - 20, 42, 42, { T, C }, "cross_residual_add", "none", 0, false));
    y += 120;
  }
  nodes.push(archNode("block_ln2", "layer_norm", isEncoder ? "Norm" : "RMSNorm", 340, y, 150, 58, { C }, "norm", "layer_norm", C, false));
  nodes.push(archNode("block_mlp_fc", "linear", "Gate/Up\nProjection", 540, y - 20, 180, 82, { rows: C, cols: C4 }, "mlp_fc", "mlp", C * C4 + (bias ? C4 : 0), false));
  nodes.push(archNode("block_activation", "generic_tensor", "GELU / SiLU", 760, y - 4, 150, 54, { T, C: C4 }, "activation", "none", 0, false));
  nodes.push(archNode("block_mlp_proj", "linear", "Down\nProjection", 950, y - 12, 150, 70, { rows: C4, cols: C }, "mlp_proj", "mlp", C4 * C + (bias ? C : 0), false));
  nodes.push(archNode("block_add2", "residual_add", "+", 830, y + 125, 42, 42, { T, C }, "residual_add", "none", 0, false));
  return nodes;
}

function representativeEdges(hasCrossAttention: boolean): ArchitectureEdge[] {
  const afterAttention = hasCrossAttention ? "block_add_cross" : "block_add1";
  const edges: ArchitectureEdge[] = [
    archEdge("block_input", "block_ln1", "data"),
    archEdge("block_ln1", "block_q", "data"),
    archEdge("block_ln1", "block_k", "data"),
    archEdge("block_ln1", "block_v", "data"),
    archEdge("block_q", "block_scores", "dependency"),
    archEdge("block_k", "block_scores", "dependency"),
    archEdge("block_scores", "block_probs", "data"),
    archEdge("block_probs", "block_attn_out", "dependency"),
    archEdge("block_v", "block_attn_out", "dependency"),
    archEdge("block_attn_out", "block_add1", "data"),
    archEdge("block_input", "block_add1", "residual", "residual"),
    archEdge(afterAttention, "block_ln2", "data"),
    archEdge("block_ln2", "block_mlp_fc", "data"),
    archEdge("block_mlp_fc", "block_activation", "data"),
    archEdge("block_activation", "block_mlp_proj", "data"),
    archEdge("block_mlp_proj", "block_add2", "data"),
    archEdge(afterAttention, "block_add2", "residual", "residual"),
    archEdge("block_add2", "block_output", "data")
  ];
  if (hasCrossAttention) {
    edges.splice(12, 0,
      archEdge("block_add1", "block_cross_attn", "data"),
      archEdge("block_cross_attn", "block_add_cross", "data"),
      archEdge("block_add1", "block_add_cross", "residual", "residual")
    );
  }
  return edges;
}

function createLayerStripArchitecture(modelGraph: ModelGraphSpec, info: NormalizedModelInfo, options: ModelGraphToArchitectureOptions): ArchitectureSpec {
  const count = Math.max(1, info.family === "transformer" ? Math.max(info.nEncoderBlocks, info.nDecoderBlocks) : info.nBlocks);
  const cols = Math.min(25, count);
  const rows = Math.ceil(count / cols);
  const cellW = 34;
  const cellH = 24;
  const gap = 8;
  const startX = 80;
  const startY = 150;
  const nodes: ArchitectureNode[] = [
    archNode("layer_strip_title", "generic_tensor", `${modelGraph.modelName}\nLayer strip`, startX, 50, cols * (cellW + gap), 52, {}, "text_label", "none", 0, true)
  ];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push(archNode(`layer_${i}`, "generic_tensor", `${i}`, startX + col * (cellW + gap), startY + row * (cellH + gap), cellW, cellH, { C: info.C }, "layer", "none", 0, true));
  }
  nodes.push(archNode("strip_note", "generic_tensor", `${count} repeated blocks; use presentation.ids to highlight ranges`, startX, startY + rows * (cellH + gap) + 36, cols * (cellW + gap), 42, {}, "text_label", "none", 0, true));
  return attachModelGraphMeta(specFromParts(modelGraph, options.title ?? `${modelGraph.modelName} layer strip`, undefined, nodes, [], { w: Math.max(420, startX * 2 + cols * (cellW + gap)), h: startY + rows * (cellH + gap) + 130 }), modelGraph, options);
}

function createDebugArchitecture(modelGraph: ModelGraphSpec, options: ModelGraphToArchitectureOptions): ArchitectureSpec {
  const flat = flattenModelNodes(modelGraph.nodes).slice(0, 160);
  const cols = 4;
  const w = 190;
  const h = 48;
  const gapX = 42;
  const gapY = 44;
  const nodes = flat.map((node, index) => archNode(
    node.id,
    kindFromRole(node.semanticRole, node.kind),
    node.label || node.opType || node.id,
    50 + (index % cols) * (w + gapX),
    80 + Math.floor(index / cols) * (h + gapY),
    w,
    h,
    node.shape ?? {},
    node.semanticRole ?? node.opType ?? "debug_node",
    categoryFromKind(kindFromRole(node.semanticRole, node.kind)),
    node.paramCount ?? 0,
    false,
    undefined,
    node.modulePath
  ));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = modelGraph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge) => archEdge(edge.source, edge.target, edge.kind ?? "data", edge.label));
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  return attachModelGraphMeta(specFromParts(modelGraph, options.title ?? `${modelGraph.modelName} debug graph`, undefined, nodes, edges, { w: cols * (w + gapX) + 90, h: rows * (h + gapY) + 120 }), modelGraph, options);
}

function attachModelGraphMeta(spec: ArchitectureSpec, modelGraph: ModelGraphSpec, options: ModelGraphToArchitectureOptions): ArchitectureSpec {
  return {
    ...spec,
    id: spec.id || safeId(modelGraph.modelName),
    notes: spec.notes ?? `Generated from ${modelGraph.framework} ${modelGraph.source}. No weights are stored.`,
    presentation: options.presentation ?? modelGraph.presentation ?? spec.presentation,
    updatedAt: modelGraph.updatedAt || spec.updatedAt
  };
}

function specFromParts(modelGraph: ModelGraphSpec, name: string, template: ArchitectureSpec["template"], nodes: ArchitectureNode[], edges: ArchitectureEdge[], canvas: { w: number; h: number }): ArchitectureSpec {
  return {
    schemaVersion: 1,
    mode: "template",
    template,
    id: safeId(`${modelGraph.modelName}-${Date.now().toString(36)}`),
    name,
    notes: `Generated from ${modelGraph.framework} ${modelGraph.source}. No weights are stored.`,
    nodes,
    edges,
    view: { canvas, scale3d: 0.7 },
    presentation: modelGraph.presentation,
    createdAt: modelGraph.createdAt || DEFAULT_NOW,
    updatedAt: modelGraph.updatedAt || modelGraph.createdAt || DEFAULT_NOW
  };
}

function archNode(id: string, kind: ArchitectureNodeKind, label: string, x: number, y: number, w: number, h: number, shape: ArchitectureShape, role: string, category: ArchitectureParamCategory, paramCount: number, overview: boolean, children?: ArchitectureNode[], modulePath?: string): ArchitectureNode {
  return {
    id,
    type: kind === "group" ? "group" : "block",
    kind,
    label,
    shape,
    position2d: { x, y },
    size2d: { w, h },
    color: colorForKind(kind),
    children,
    derived: {
      source: MODEL_SOURCE,
      role,
      expectedShape: shape,
      shapeLabel: shapeToLabel(shape),
      paramCategory: category || "none",
      paramCount,
      paramFormula: modulePath ? `module: ${modulePath}` : paramCount > 0 ? "estimated from config/module metadata" : "no trainable parameters or not estimated",
      locked: false,
      overview
    }
  };
}

function archEdge(source: string, target: string, kind: ArchitectureEdge["kind"], label?: string): ArchitectureEdge {
  return { id: `edge-${source}-${target}-${kind}`, source, target, kind, label };
}

function archEdges(ids: string[]): ArchitectureEdge[] {
  return ids.slice(0, -1).map((id, index) => archEdge(id, ids[index + 1], "data"));
}

function normalizeModelGraph(modelGraph: ModelGraphSpec): NormalizedModelInfo {
  return normalizeConfig({ ...(modelGraph.config ?? {}), ...(modelGraph.architecture?.params ?? {}), model_type: modelGraph.modelType ?? modelGraph.config?.model_type, architecture_family: modelGraph.architecture?.family });
}

function normalizeConfig(config: Record<string, unknown>): NormalizedModelInfo {
  const modelType = String(stringValue(config.model_type) ?? stringValue(config.modelType) ?? "unknown").toLowerCase();
  const family = familyFromConfig(config, modelType);
  const C = numberValue(config.hidden_size, config.n_embd, config.d_model, config.C) ?? 768;
  const nHeads = numberValue(config.num_attention_heads, config.n_head, config.num_heads, config.nHeads) ?? 12;
  const nBlocks = numberValue(config.num_hidden_layers, config.n_layer, config.num_layers, config.nBlocks) ?? 12;
  const nEncoderBlocks = numberValue(config.num_encoder_layers, config.encoder_layers, config.nEncoderBlocks, config.num_layers) ?? nBlocks;
  const nDecoderBlocks = numberValue(config.num_decoder_layers, config.decoder_layers, config.nDecoderBlocks, config.num_layers) ?? nBlocks;
  const vocabSize = numberValue(config.vocab_size, config.vocabSize) ?? 30522;
  const T = numberValue(config.max_position_embeddings, config.n_positions, config.n_ctx, config.seq_length, config.T) ?? 128;
  return {
    family,
    modelType,
    T,
    srcT: numberValue(config.srcT, config.max_source_positions, config.max_position_embeddings) ?? T,
    tgtT: numberValue(config.tgtT, config.max_target_positions, config.max_position_embeddings) ?? T,
    C,
    nHeads,
    nBlocks,
    nEncoderBlocks,
    nDecoderBlocks,
    vocabSize,
    intermediateSize: numberValue(config.intermediate_size, config.n_inner, config.ffn_dim, config.d_ff, config.intermediateSize) ?? C * 4,
    typeVocabSize: numberValue(config.type_vocab_size, config.typeVocabSize) ?? 2,
    numLabels: numberValue(config.num_labels, config.numLabels) ?? 2,
    bias: boolValue(config.bias, config.use_bias, config.add_bias_linear) ?? true,
    tieEmbeddings: boolValue(config.tie_word_embeddings, config.tieEmbeddings) ?? true
  };
}

function familyFromConfig(config: Record<string, unknown>, modelType: string): ModelGraphFamily {
  const hinted = stringValue(config.architecture_family);
  if (hinted === "gpt" || hinted === "decoder-only" || hinted === "bert" || hinted === "encoder-only" || hinted === "transformer") return hinted;
  if (boolValue(config.is_encoder_decoder) || ["t5", "bart", "mbart", "marian"].includes(modelType)) return "transformer";
  if (["bert", "roberta", "deberta", "deberta-v2", "albert", "electra"].includes(modelType)) return "bert";
  if (["gpt2", "gpt_neo", "gpt_neox", "gptj", "llama", "mistral", "mixtral", "qwen2", "gemma", "phi", "falcon"].includes(modelType)) return modelType === "gpt2" ? "gpt" : "decoder-only";
  return "unknown";
}

function architectureParams(info: NormalizedModelInfo): Record<string, number | boolean | string> {
  if (info.family === "transformer") return toTransformerParams(info) as unknown as Record<string, number | boolean | string>;
  if (info.family === "bert") return toBertParams(info) as unknown as Record<string, number | boolean | string>;
  if (info.family === "encoder-only") return toEncoderOnlyParams(info) as unknown as Record<string, number | boolean | string>;
  return toDecoderParams(info) as unknown as Record<string, number | boolean | string>;
}

function toDecoderParams(info: NormalizedModelInfo): DecoderOnlyTemplateParams {
  return { ...DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS, T: info.T, C: info.C, nHeads: info.nHeads, nBlocks: info.nBlocks, vocabSize: info.vocabSize, bias: info.bias, tieEmbeddings: info.tieEmbeddings };
}

function toTransformerParams(info: NormalizedModelInfo): TransformerTemplateParams {
  return { ...DEFAULT_TRANSFORMER_TEMPLATE_PARAMS, srcT: info.srcT, tgtT: info.tgtT, C: info.C, nHeads: info.nHeads, nEncoderBlocks: info.nEncoderBlocks, nDecoderBlocks: info.nDecoderBlocks, vocabSize: info.vocabSize, bias: info.bias, tieEmbeddings: info.tieEmbeddings };
}

function toBertParams(info: NormalizedModelInfo): BertTemplateParams {
  return { ...DEFAULT_BERT_TEMPLATE_PARAMS, T: info.T, C: info.C, nHeads: info.nHeads, nBlocks: info.nBlocks, vocabSize: info.vocabSize, typeVocabSize: info.typeVocabSize, numLabels: info.numLabels, bias: info.bias };
}

function toEncoderOnlyParams(info: NormalizedModelInfo): EncoderOnlyTemplateParams {
  return { ...DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS, T: info.T, C: info.C, nHeads: info.nHeads, nBlocks: info.nBlocks, vocabSize: info.vocabSize, bias: info.bias };
}

function createSemanticNodes(info: NormalizedModelInfo): ModelGraphNode[] {
  const blockCount = info.family === "transformer" ? Math.max(info.nEncoderBlocks, info.nDecoderBlocks) : info.nBlocks;
  return [
    { id: "token_embedding", label: "Token Embedding", semanticRole: "token_embedding", kind: "token_embed", shape: { rows: info.vocabSize, cols: info.C }, paramCount: info.vocabSize * info.C },
    { id: "position_embedding", label: "Position Embedding", semanticRole: "positional_encoding", kind: "pos_embed", shape: { T: info.T, C: info.C }, paramCount: info.T * info.C },
    { id: "representative_block", label: `Transformer Block ×${blockCount}`, semanticRole: info.family === "bert" || info.family === "encoder-only" ? "encoder_block" : "decoder_block", kind: "group", shape: { T: info.T, C: info.C, nHeads: info.nHeads, nBlocks: blockCount }, children: [
      { id: "rep_attention", label: "Attention", semanticRole: "attention", kind: "attention", shape: { rows: info.C, cols: info.C }, paramCount: 4 * info.C * info.C },
      { id: "rep_mlp", label: "MLP", semanticRole: "mlp", kind: "mlp", shape: { rows: info.C, cols: info.intermediateSize }, paramCount: mlpParamCount(info.C, info.intermediateSize, info.bias) },
      { id: "rep_norm", label: "Norm", semanticRole: "norm", kind: "layer_norm", shape: { C: info.C }, paramCount: info.C }
    ] },
    { id: "head", label: info.family === "bert" ? "Task Heads" : "LM Head", semanticRole: info.family === "bert" ? "task_head" : "lm_head", kind: "linear", shape: { rows: info.C, cols: info.vocabSize }, paramCount: info.C * info.vocabSize }
  ];
}

function createSemanticEdges(info: NormalizedModelInfo): ModelGraphEdge[] {
  const ids = ["token_embedding", "position_embedding", "representative_block", "head"];
  return ids.slice(0, -1).map((id, index) => ({ id: `edge-${id}-${ids[index + 1]}`, source: id, target: ids[index + 1], kind: "data" }));
}

function flattenModelNodes(nodes: ModelGraphNode[]): ModelGraphNode[] {
  return nodes.flatMap((node) => [node, ...flattenModelNodes(node.children ?? [])]);
}

function kindFromRole(role: string | undefined, fallback?: ArchitectureNodeKind): ArchitectureNodeKind {
  if (fallback) return fallback;
  const value = role ?? "";
  if (value.includes("embed")) return value.includes("position") || value.includes("positional") ? "pos_embed" : "token_embed";
  if (value.includes("attention") || value.includes("attn")) return "attention";
  if (value.includes("mlp") || value.includes("ffn") || value.includes("feed_forward")) return "mlp";
  if (value.includes("norm")) return "layer_norm";
  if (value.includes("head") || value.includes("proj") || value.includes("linear")) return "linear";
  if (value.includes("add") || value.includes("residual")) return "residual_add";
  return "generic_tensor";
}

function categoryFromKind(kind: ArchitectureNodeKind): ArchitectureParamCategory {
  if (kind === "attention") return "attention";
  if (kind === "mlp") return "mlp";
  if (kind === "layer_norm") return "layer_norm";
  if (kind === "linear") return "linear";
  if (kind === "token_embed" || kind === "pos_embed") return "embedding";
  return "none";
}

function colorForKind(kind: ArchitectureNodeKind): string {
  switch (kind) {
    case "token_embed": return "#f0a8fc";
    case "pos_embed": return "#d9d9d9";
    case "layer_norm": return "#e9f29e";
    case "attention": return "#f2d59e";
    case "mlp": return "#9ef2f2";
    case "linear": return "#a8c3fc";
    case "softmax": return "#a8fcaf";
    case "residual_add": return "#ffffff";
    case "group": return "#eeeeee";
    default: return "#d8dee9";
  }
}

function decoderStackParamCount(C: number, intermediateSize: number, nBlocks: number, bias: boolean): number {
  return (4 * C * C + mlpParamCount(C, intermediateSize || C * 4, bias) + 2 * C) * nBlocks;
}

function mlpParamCount(C: number, intermediateSize: number, bias: boolean): number {
  return C * intermediateSize + intermediateSize * C + (bias ? intermediateSize + C : 0);
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function boolValue(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (["true", "1", "yes", "on"].includes(lower)) return true;
      if (["false", "0", "no", "off"].includes(lower)) return false;
    }
  }
  return undefined;
}

function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : a;
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model-graph";
}
