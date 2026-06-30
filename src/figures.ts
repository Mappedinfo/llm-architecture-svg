export type LlmFigurePrimitiveKind =
  | "token"
  | "token_row"
  | "token_stack"
  | "stacked_cards"
  | "process_block"
  | "selector"
  | "indexer"
  | "sum_node"
  | "embedding_vector"
  | "dashed_window"
  | "group_box"
  | "annotation"
  | "edge";

export type LlmFigureEdgeKind = "straight" | "polyline" | "curve";
export type LlmFigureProfileName =
  | "paper-algorithm"
  | "drawio-mechanism"
  | "architecture-paper"
  | "architecture-blueprint"
  | "architecture-dark";

export interface LlmFigurePoint {
  x: number;
  y: number;
}

export interface LlmFigureSize {
  w: number;
  h: number;
}

export interface LlmFigureStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  radius?: number;
  opacity?: number;
}

export interface LlmFigurePrimitive {
  id: string;
  kind: LlmFigurePrimitiveKind;
  label?: string;
  position: LlmFigurePoint;
  size: LlmFigureSize;
  style?: LlmFigureStyle;
  children?: LlmFigurePrimitive[];
  metadata?: Record<string, string | number | boolean | string[]>;
}

export interface LlmFigureEdge {
  id: string;
  source?: string;
  target?: string;
  sourcePoint?: LlmFigurePoint;
  targetPoint?: LlmFigurePoint;
  points?: LlmFigurePoint[];
  kind?: LlmFigureEdgeKind;
  label?: string;
  labelPosition?: LlmFigurePoint;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  dashed?: boolean;
  style?: LlmFigureStyle;
}

export interface LlmFigureSpec {
  schemaVersion: 1;
  id: string;
  name: string;
  notes?: string;
  profile?: LlmFigureProfileName;
  view: {
    width: number;
    height: number;
    padding?: number;
  };
  primitives: LlmFigurePrimitive[];
  edges: LlmFigureEdge[];
}

export interface RenderLlmFigureSvgOptions {
  title?: string;
  width?: number;
  padding?: number;
  profile?: LlmFigureProfileName | LlmFigureProfile;
}

export interface LlmFigureProfile {
  name: LlmFigureProfileName | string;
  background: string;
  fontFamily: string;
  textColor: string;
  mutedTextColor: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  arrowSize: number;
  dashedPattern: string;
  cardOffset: { x: number; y: number };
  tokenFill: string;
  accentFill: string;
  activeFill: string;
  inactiveFill: string;
  blueFill: string;
  blockFill: string;
  groupFill: string;
}

export const BUILTIN_LLM_FIGURE_PROFILES: Record<LlmFigureProfileName, LlmFigureProfile> = {
  "architecture-paper": {
    name: "architecture-paper",
    background: "#ffffff",
    fontFamily: "Helvetica,Arial,sans-serif",
    textColor: "#000000",
    mutedTextColor: "#202020",
    stroke: "#000000",
    strokeWidth: 2,
    radius: 10,
    arrowSize: 8,
    dashedPattern: "6 6",
    cardOffset: { x: 10, y: -8 },
    tokenFill: "#fbe7a3",
    accentFill: "#f7f7f7",
    activeFill: "#6dde67",
    inactiveFill: "#d9d9d9",
    blueFill: "#b8c7f0",
    blockFill: "#e6e6e6",
    groupFill: "none"
  },
  "architecture-blueprint": {
    name: "architecture-blueprint",
    background: "#f3f8fb",
    fontFamily: "Helvetica,Arial,sans-serif",
    textColor: "#0b2533",
    mutedTextColor: "#537180",
    stroke: "#16384a",
    strokeWidth: 2,
    radius: 10,
    arrowSize: 8,
    dashedPattern: "6 6",
    cardOffset: { x: 10, y: -8 },
    tokenFill: "#dbeafe",
    accentFill: "#e0f2fe",
    activeFill: "#a7f3d0",
    inactiveFill: "#d7e8ef",
    blueFill: "#bfdbfe",
    blockFill: "#ffffff",
    groupFill: "none"
  },
  "architecture-dark": {
    name: "architecture-dark",
    background: "#071018",
    fontFamily: "Avenir Next,Helvetica,Arial,sans-serif",
    textColor: "#f8fafc",
    mutedTextColor: "#94a3b8",
    stroke: "#e2e8f0",
    strokeWidth: 2,
    radius: 10,
    arrowSize: 8,
    dashedPattern: "6 6",
    cardOffset: { x: 10, y: -8 },
    tokenFill: "#fbbf24",
    accentFill: "#0f172a",
    activeFill: "#4ade80",
    inactiveFill: "#334155",
    blueFill: "#818cf8",
    blockFill: "#0f172a",
    groupFill: "none"
  },
  "paper-algorithm": {
    name: "paper-algorithm",
    background: "#ffffff",
    fontFamily: "Helvetica,Arial,sans-serif",
    textColor: "#000000",
    mutedTextColor: "#202020",
    stroke: "#000000",
    strokeWidth: 2,
    radius: 6,
    arrowSize: 7,
    dashedPattern: "5 5",
    cardOffset: { x: 6, y: -10 },
    tokenFill: "#fbe7a3",
    accentFill: "#fbe7a3",
    activeFill: "#6dde67",
    inactiveFill: "#fbe7a3",
    blueFill: "#8a9ccc",
    blockFill: "#e6e6e6",
    groupFill: "none"
  },
  "drawio-mechanism": {
    name: "drawio-mechanism",
    background: "#ffffff",
    fontFamily: "Helvetica,Arial,sans-serif",
    textColor: "#000000",
    mutedTextColor: "#202020",
    stroke: "#000000",
    strokeWidth: 2,
    radius: 10,
    arrowSize: 8,
    dashedPattern: "6 6",
    cardOffset: { x: 14, y: -10 },
    tokenFill: "#fbe7a3",
    accentFill: "#f7f7f7",
    activeFill: "#6dde67",
    inactiveFill: "#d9d9d9",
    blueFill: "#8a9ccc",
    blockFill: "#e6e6e6",
    groupFill: "none"
  }
};

interface ResolvedFigureOptions {
  title: string;
  width: number;
  height: number;
  padding: number;
  scale: number;
  profile: LlmFigureProfile;
}

interface RenderRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function renderLsaKvIndexingFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createLsaKvIndexingFigureSpec(), { profile: "paper-algorithm", ...options });
}

export function renderNgramEmbeddingFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createNgramEmbeddingFigureSpec(), { profile: "drawio-mechanism", ...options });
}

export function renderTransformerPaperFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createTransformerPaperFigureSpec(), { profile: "architecture-paper", ...options });
}

export function renderBertArchitectureFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createBertArchitectureFigureSpec(), { profile: "architecture-paper", ...options });
}

export function renderGptDecoderFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createGptDecoderFigureSpec(), { profile: "architecture-paper", ...options });
}

export function renderEncoderOnlyFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createEncoderOnlyFigureSpec(), { profile: "architecture-paper", ...options });
}

export function renderDecoderOnlyFigure(options: RenderLlmFigureSvgOptions = {}): string {
  return renderLlmFigureSvg(createDecoderOnlyFigureSpec(), { profile: "architecture-paper", ...options });
}

export function renderLlmFigureSvg(spec: LlmFigureSpec, options: RenderLlmFigureSvgOptions = {}): string {
  const opts = resolveFigureOptions(spec, options);
  const primitives = flattenPrimitives(spec.primitives);
  const primitiveMap = new Map(primitives.map((primitive) => [primitive.id, primitive]));
  const edgeMarkup = spec.edges.map((edge) => renderFigureEdge(edge, primitiveMap, opts)).join("\n");
  const primitiveMarkup = spec.primitives.map((primitive) => renderPrimitive(primitive, opts)).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(opts.width)}" height="${round(opts.height)}" viewBox="0 0 ${round(opts.width)} ${round(opts.height)}" role="img" aria-label="${escAttr(opts.title)}">`,
    `<defs>${renderFigureDefs(opts.profile)}</defs>`,
    `<rect width="100%" height="100%" fill="${opts.profile.background}"/>`,
    `<g class="llm-figure profile-${escAttr(String(opts.profile.name))}">`,
    edgeMarkup,
    primitiveMarkup,
    `</g>`,
    `</svg>`
  ].filter(Boolean).join("\n");
}

export function createTransformerPaperFigureSpec(): LlmFigureSpec {
  const primitives: LlmFigurePrimitive[] = [
    annotation("title", "Original Transformer", 380, 24, 260, 28, { fontSize: 26, fontWeight: 700 }),
    processBlock("src_tokens", "Source\nTokens", 70, 440, 120, 56, "process_block", { fill: "#fbe7a3" }),
    processBlock("input_embedding", "Input\nEmbedding", 70, 350, 120, 62, "process_block", { fill: "#f7f7f7" }),
    processBlock("src_pos", "Positional\nEncoding", 220, 350, 130, 62, "process_block", { fill: "#dbeafe" }),
    groupBox("encoder_box", "Encoder", 70, 120, 300, 195),
    processBlock("enc_mha", "Multi-Head\nAttention", 105, 150, 230, 48, "process_block", { fill: "#fbe7a3" }),
    processBlock("enc_ffn", "Feed Forward", 105, 235, 230, 48, "process_block", { fill: "#bfecf5" }),
    annotation("enc_stack", "Encoder Layer ×N", 150, 112, 170, 24, { fontSize: 16, fontWeight: 700 }),
    processBlock("tgt_tokens", "Target\nTokens", 680, 440, 120, 56, "process_block", { fill: "#fbe7a3" }),
    processBlock("output_embedding", "Output\nEmbedding", 680, 350, 120, 62, "process_block", { fill: "#f7f7f7" }),
    processBlock("tgt_pos", "Positional\nEncoding", 830, 350, 130, 62, "process_block", { fill: "#dbeafe" }),
    groupBox("decoder_box", "Decoder", 600, 98, 330, 235),
    processBlock("dec_masked_mha", "Masked\nMulti-Head Attention", 645, 125, 240, 52, "process_block", { fill: "#ffd8a8" }),
    processBlock("dec_cross_mha", "Encoder-Decoder\nAttention", 645, 195, 240, 52, "process_block", { fill: "#fbe7a3" }),
    processBlock("dec_ffn", "Feed Forward", 645, 270, 240, 48, "process_block", { fill: "#bfecf5" }),
    annotation("dec_stack", "Decoder Layer ×N", 690, 90, 170, 24, { fontSize: 16, fontWeight: 700 }),
    processBlock("linear", "Linear", 645, 28, 110, 44, "process_block", { fill: "#dbeafe" }),
    processBlock("softmax", "Softmax", 790, 28, 110, 44, "process_block", { fill: "#d8f0dc" })
  ];
  const edges: LlmFigureEdge[] = [
    edge("src_to_embed", point(130, 440), point(130, 412)),
    edge("src_pos_to_enc", point(285, 350), point(230, 315)),
    edge("embed_to_enc", point(130, 350), point(130, 315)),
    edge("enc_mha_to_ffn", point(220, 198), point(220, 235)),
    edge("encoder_to_cross", point(370, 220), point(645, 220), { kind: "polyline", points: [point(500, 220)] }),
    edge("tgt_to_embed", point(740, 440), point(740, 412)),
    edge("tgt_pos_to_dec", point(895, 350), point(805, 333)),
    edge("embed_to_dec", point(740, 350), point(740, 333)),
    edge("masked_to_cross", point(765, 177), point(765, 195)),
    edge("cross_to_ffn", point(765, 247), point(765, 270)),
    edge("ffn_to_linear", point(765, 98), point(700, 72), { kind: "polyline", points: [point(765, 82)] }),
    edge("linear_to_softmax", point(755, 50), point(790, 50))
  ];
  return figureSpec("transformer-paper", "Original Transformer encoder-decoder architecture", "architecture-paper", 1020, 540, primitives, edges);
}

export function createBertArchitectureFigureSpec(): LlmFigureSpec {
  const tokenChildren = ["[CLS]", "the", "cat", "sat", "[SEP]"].map((label, index) => token(`bert_token_${index}`, label, 92 + index * 90, 456, 74, 38, label === "[CLS]" ? "#6dde67" : "#fbe7a3"));
  const primitives: LlmFigurePrimitive[] = [
    annotation("title", "BERT", 420, 24, 110, 32, { fontSize: 30, fontWeight: 700 }),
    { id: "bert_tokens", kind: "token_row", position: { x: 92, y: 456 }, size: { w: 440, h: 38 }, children: tokenChildren },
    processBlock("token_embedding", "Token Embedding", 90, 360, 150, 48, "process_block", { fill: "#f7f7f7" }),
    processBlock("segment_embedding", "Segment Embedding", 275, 360, 170, 48, "process_block", { fill: "#f7f7f7" }),
    processBlock("position_embedding", "Position Embedding", 480, 360, 170, 48, "process_block", { fill: "#dbeafe" }),
    sumNode("embedding_sum", 700, 367),
    groupBox("bert_box", "BERT Encoder", 145, 140, 580, 150),
    processBlock("encoder_layer", "Encoder Layer ×12", 230, 178, 410, 70, "process_block", { fill: "#fbe7a3", fontSize: 24, fontWeight: 700 }),
    processBlock("contextual_outputs", "Contextual Token Outputs", 250, 70, 370, 48, "process_block", { fill: "#bfecf5" }),
    processBlock("mlm_head", "MLM Head", 90, 70, 120, 48, "process_block", { fill: "#d8f0dc" }),
    processBlock("cls_classifier", "[CLS]\nClassifier", 660, 70, 120, 58, "process_block", { fill: "#d8f0dc" })
  ];
  const edges: LlmFigureEdge[] = [
    edge("tokens_to_token_embed", point(280, 456), point(165, 408)),
    edge("tokens_to_segment_embed", point(280, 456), point(360, 408)),
    edge("tokens_to_position_embed", point(280, 456), point(565, 408)),
    edge("token_embed_to_sum", point(240, 384), point(700, 384), { kind: "polyline", points: [point(510, 384)] }),
    edge("segment_embed_to_sum", point(445, 384), point(700, 384)),
    edge("position_embed_to_sum", point(650, 384), point(700, 384)),
    edge("sum_to_encoder", point(717, 367), point(435, 290), { kind: "polyline", points: [point(717, 315)] }),
    edge("encoder_to_outputs", point(435, 178), point(435, 118)),
    edge("outputs_to_mlm", point(250, 94), point(210, 94), { arrowEnd: true }),
    edge("outputs_to_cls", point(620, 94), point(660, 99), { arrowEnd: true })
  ];
  return figureSpec("bert-encoder", "BERT encoder architecture", "architecture-paper", 860, 540, primitives, edges);
}

export function createGptDecoderFigureSpec(): LlmFigureSpec {
  const tokenChildren = ["The", "model", "predicts"].map((label, index) => token(`gpt_token_${index}`, label, 112 + index * 100, 468, 86, 40, "#fbe7a3"));
  const primitives: LlmFigurePrimitive[] = [
    annotation("title", "GPT", 402, 24, 100, 32, { fontSize: 30, fontWeight: 700 }),
    { id: "gpt_tokens", kind: "token_row", position: { x: 112, y: 468 }, size: { w: 300, h: 40 }, children: tokenChildren },
    processBlock("token_embedding", "Token Embedding", 122, 372, 160, 52, "process_block", { fill: "#f7f7f7" }),
    processBlock("position_embedding", "Position Embedding", 340, 372, 170, 52, "process_block", { fill: "#dbeafe" }),
    sumNode("embedding_sum", 575, 381),
    groupBox("decoder_box", "Decoder-only Transformer", 170, 135, 560, 170),
    processBlock("decoder_block", "Decoder Block ×N", 260, 170, 380, 98, "process_block", { fill: "#fbe7a3", fontSize: 24, fontWeight: 700 }),
    annotation("masked_attn", "Masked Self-Attention", 296, 185, 250, 26, { fontSize: 18, fontWeight: 700 }),
    annotation("ffn", "Feed Forward", 382, 240, 140, 24, { fontSize: 17 }),
    processBlock("lm_head", "LM Head", 285, 70, 140, 48, "process_block", { fill: "#dbeafe" }),
    processBlock("next_probs", "Next-token\nprobabilities", 485, 64, 170, 60, "process_block", { fill: "#d8f0dc" })
  ];
  const edges: LlmFigureEdge[] = [
    edge("tokens_to_embed", point(250, 468), point(202, 424)),
    edge("token_embed_to_sum", point(282, 398), point(575, 398)),
    edge("pos_embed_to_sum", point(510, 398), point(575, 398)),
    edge("sum_to_decoder", point(592, 381), point(450, 305), { kind: "polyline", points: [point(592, 330)] }),
    edge("decoder_to_lm", point(450, 170), point(355, 118), { kind: "polyline", points: [point(450, 132)] }),
    edge("lm_to_probs", point(425, 94), point(485, 94))
  ];
  return figureSpec("gpt-decoder", "GPT decoder-only architecture", "architecture-paper", 820, 540, primitives, edges);
}

export function createEncoderOnlyFigureSpec(): LlmFigureSpec {
  const primitives: LlmFigurePrimitive[] = [
    annotation("title", "Encoder-only Transformer", 260, 24, 270, 32, { fontSize: 28, fontWeight: 700 }),
    processBlock("inputs", "Input Tokens", 80, 350, 150, 50, "process_block", { fill: "#fbe7a3" }),
    processBlock("embeddings", "Token + Position\nEmbeddings", 300, 338, 190, 74, "process_block", { fill: "#f7f7f7" }),
    groupBox("encoder_box", "Encoder stack", 220, 130, 360, 150),
    processBlock("self_attention", "Bidirectional\nSelf-Attention", 270, 160, 260, 48, "process_block", { fill: "#fbe7a3" }),
    processBlock("ffn", "Feed Forward", 270, 225, 260, 42, "process_block", { fill: "#bfecf5" }),
    processBlock("outputs", "Contextual\nRepresentations", 300, 55, 190, 58, "process_block", { fill: "#d8f0dc" })
  ];
  const edges = [
    edge("inputs_to_embeddings", point(230, 375), point(300, 375)),
    edge("embeddings_to_encoder", point(395, 338), point(395, 280)),
    edge("attn_to_ffn", point(400, 208), point(400, 225)),
    edge("encoder_to_outputs", point(400, 130), point(400, 113))
  ];
  return figureSpec("encoder-only", "Encoder-only Transformer comparison figure", "architecture-paper", 660, 450, primitives, edges);
}

export function createDecoderOnlyFigureSpec(): LlmFigureSpec {
  const primitives: LlmFigurePrimitive[] = [
    annotation("title", "Decoder-only Transformer", 260, 24, 270, 32, { fontSize: 28, fontWeight: 700 }),
    processBlock("prefix", "Prefix Tokens", 80, 350, 150, 50, "process_block", { fill: "#fbe7a3" }),
    processBlock("embeddings", "Token + Position\nEmbeddings", 300, 338, 190, 74, "process_block", { fill: "#f7f7f7" }),
    groupBox("decoder_box", "Decoder stack", 220, 130, 360, 150),
    processBlock("masked_attention", "Causal Masked\nSelf-Attention", 270, 160, 260, 48, "process_block", { fill: "#ffd8a8" }),
    processBlock("ffn", "Feed Forward", 270, 225, 260, 42, "process_block", { fill: "#bfecf5" }),
    processBlock("next_token", "Next-token\nDistribution", 300, 55, 190, 58, "process_block", { fill: "#d8f0dc" })
  ];
  const edges = [
    edge("prefix_to_embeddings", point(230, 375), point(300, 375)),
    edge("embeddings_to_decoder", point(395, 338), point(395, 280)),
    edge("attn_to_ffn", point(400, 208), point(400, 225)),
    edge("decoder_to_next", point(400, 130), point(400, 113))
  ];
  return figureSpec("decoder-only", "Decoder-only Transformer comparison figure", "architecture-paper", 660, 450, primitives, edges);
}

export function createLsaKvIndexingFigureSpec(): LlmFigureSpec {
  const primitives: LlmFigurePrimitive[] = [
    tokenStack("full_kv_tokens", "Full KV Tokens", 58, 42, 26, 250, 16, { activeFrom: 12 }),
    token("query_token", "Query Token", 58, 324, 26, 26, "#8a9ccc", { labelBelow: true }),
    annotation("non_streaming_label", "Non-Streaming\nTokens", 88, 142, 145, 48),
    tokenStack("non_streaming_subset", "", 210, 42, 26, 250, 12, { dashedGroup: true }),
    selector("block_topk_selector", "Top-k\nSelector", 360, 162, 128, 58),
    processBlock("block_indexer", "Block\nIndexer", 405, 90, 112, 48, "indexer"),
    annotation("topk_indices_1", "Top-k\nIndices", 285, 98, 90, 50),
    tokenStack("selected_blocks", "", 525, 130, 26, 130, 7, { dashedGroup: true }),
    selector("token_topk_selector", "Top-k\nSelector", 630, 162, 128, 58),
    processBlock("token_indexer", "Token\nIndexer", 680, 90, 112, 48, "indexer"),
    annotation("topk_indices_2", "Top-k\nIndices", 592, 98, 90, 50),
    tokenStack("indexed_kv_tokens", "Indexed KV tokens", 825, 72, 26, 250, 8, { activeFrom: 4, sparse: true }),
    annotation("non_contiguous_label", "Non-Contiguous KV\n(~50% budget)", 872, 100, 170, 48),
    annotation("contiguous_label", "Contiguous KV\n(~50% budget)", 872, 232, 170, 48),
    groupBox("sharing_parameters", "Sharing Parameters", 440, 70, 285, 58),
    annotation("reuse_annotation", "Directly Reusing the Index\nfrom the Owner Layer", 745, 6, 230, 52, { fontWeight: 700, italic: true }),
    annotation("streaming_label", "Streaming Tokens", 390, 267, 160, 28),
    annotation("owner_layer_label", "LSA from the Owner Layer", 390, 376, 220, 28, { fontWeight: 700 })
  ];
  const edges: LlmFigureEdge[] = [
    edge("full_to_subset", point(84, 166), point(210, 166), { label: "", kind: "straight" }),
    edge("subset_to_selector", point(236, 166), point(360, 191), { kind: "polyline", points: [point(300, 166), point(300, 191)] }),
    edge("topk_1_down", point(322, 150), point(378, 162), { kind: "polyline", points: [point(322, 220), point(360, 220)] }),
    edge("block_indexer_to_topk", point(405, 114), point(360, 114), { kind: "straight" }),
    edge("selector_to_selected", point(488, 191), point(525, 191), { kind: "straight" }),
    edge("selected_to_selector", point(551, 191), point(630, 191), { kind: "straight" }),
    edge("topk_2_down", point(620, 150), point(648, 162), { kind: "polyline", points: [point(620, 220), point(630, 220)] }),
    edge("token_indexer_to_topk", point(680, 114), point(630, 114), { kind: "straight" }),
    edge("selector_to_indexed", point(758, 191), point(825, 191), { kind: "straight" }),
    edge("streaming_tokens", point(90, 272), point(825, 272), { kind: "straight" }),
    edge("query_line", point(84, 337), point(913, 337), { kind: "straight", arrowEnd: false }),
    edge("sharing_to_block", point(515, 99), point(680, 99), { kind: "polyline", points: [point(600, 70), point(725, 70)], dashed: true, arrowEnd: false }),
    edge("reuse_annotation_arrow", point(770, 26), point(704, 114), { kind: "curve" })
  ];

  return {
    schemaVersion: 1,
    id: "lsa-kv-indexing",
    name: "LSA KV indexing mechanism",
    notes: "Mechanism explanation figure inspired by LSA KV indexing diagrams.",
    profile: "paper-algorithm",
    view: { width: 980, height: 420, padding: 0 },
    primitives,
    edges
  };
}

export function createNgramEmbeddingFigureSpec(): LlmFigureSpec {
  const tokens = ["Long", "Cat", "Sparse", "Attention", "introduces", "three", "orthogonal", "efficiency", "improvements"];
  let tokenX = 14;
  const tokenRowChildren = tokens.map((label, index) => {
    const width = tokenWidth(label);
    const primitive = token(`token_${index}`, label, tokenX, 292, width, 40, label === "improvements" ? "#6dde67" : "#fbe7a3");
    tokenX += width + 4;
    return primitive;
  });
  const primitives: LlmFigurePrimitive[] = [
    { id: "input_tokens", kind: "token_row", label: "", position: { x: 14, y: 292 }, size: { w: 632, h: 40 }, children: tokenRowChildren },
    stackedCards("five_gram", "5-Gram\n\nHash\n+\nEmbedding\n+\nProjection", 55, 96, 132, 250, 4),
    stackedCards("four_gram", "4-Gram\n\nHash\n+\nEmbedding\n+\nProjection", 245, 96, 132, 250, 4),
    stackedCards("three_gram", "3-Gram\n\nHash\n+\nEmbedding\n+\nProjection", 435, 96, 132, 250, 4),
    stackedCards("two_gram", "2-Gram\n\nHash\n+\nEmbedding\n+\nProjection", 625, 96, 132, 250, 4),
    processBlock("base_embedding", "Base\nEmbedding", 835, 130, 122, 210, "process_block", { fill: "#e6e6e6", radius: 18, fontSize: 24, fontWeight: 700 }),
    processBlock("embedding_vector", "Embedding\nVector", 812, 16, 158, 56, "embedding_vector", { fill: "#6dde67", radius: 8, fontSize: 22, fontWeight: 700 }),
    sumNode("sum_5", 126, 58),
    sumNode("sum_4", 316, 58),
    sumNode("sum_3", 506, 58),
    sumNode("sum_2", 696, 58),
    sumNode("sum_out", 876, 58),
    dashedWindow("window_5", 332, 280, 650, 118),
    dashedWindow("window_4", 436, 290, 535, 96),
    dashedWindow("window_3", 508, 298, 452, 78),
    dashedWindow("window_2", 650, 306, 300, 60)
  ];
  const edges: LlmFigureEdge[] = [
    edge("sum_line", point(150, 76), point(876, 76), { kind: "straight" }),
    edge("sum_to_vector", point(876, 58), point(876, 72), { kind: "straight" }),
    edge("vector_up", point(896, 130), point(896, 72), { kind: "straight" }),
    edge("base_to_sum", point(896, 130), point(896, 76), { kind: "straight" }),
    edge("token_to_base", point(896, 292), point(896, 340), { kind: "straight" }),
    edge("tokens_to_5", point(116, 292), point(116, 346), { kind: "polyline", points: [point(116, 232)] }),
    edge("tokens_to_4", point(306, 292), point(306, 346), { kind: "polyline", points: [point(306, 232)] }),
    edge("tokens_to_3", point(496, 292), point(496, 346), { kind: "polyline", points: [point(496, 232)] }),
    edge("tokens_to_2", point(686, 292), point(686, 346), { kind: "polyline", points: [point(686, 232)] }),
    edge("five_to_sum", point(116, 96), point(116, 76), { kind: "straight" }),
    edge("four_to_sum", point(306, 96), point(306, 76), { kind: "straight" }),
    edge("three_to_sum", point(496, 96), point(496, 76), { kind: "straight" }),
    edge("two_to_sum", point(686, 96), point(686, 76), { kind: "straight" })
  ];

  return {
    schemaVersion: 1,
    id: "ngram-embedding",
    name: "N-gram embedding fusion mechanism",
    notes: "Mechanism explanation figure with token row, dashed n-gram windows, stacked projection blocks, plus nodes, and base embedding.",
    profile: "drawio-mechanism",
    view: { width: 1000, height: 430, padding: 0 },
    primitives,
    edges
  };
}

function renderFigureDefs(profile: LlmFigureProfile): string {
  return [
    `<style>`,
    `text{font-family:${profile.fontFamily};fill:${profile.textColor}}`,
    `.figure-label{font-weight:400}`,
    `.figure-label-strong{font-weight:700}`,
    `.figure-edge{fill:none;stroke-linecap:round;stroke-linejoin:round}`,
    `</style>`,
    `<marker id="figure-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">`,
    `<path d="M0,0 L10,5 L0,10 Z" fill="${profile.stroke}"/>`,
    `</marker>`,
    `<marker id="figure-arrow-start" markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto" markerUnits="strokeWidth">`,
    `<path d="M10,0 L0,5 L10,10 Z" fill="${profile.stroke}"/>`,
    `</marker>`
  ].join("");
}

function renderPrimitive(primitive: LlmFigurePrimitive, opts: ResolvedFigureOptions): string {
  const rect = primitiveRect(primitive, opts);
  const profile = opts.profile;
  const className = primitiveClassName(primitive.kind);
  const children = primitive.children?.map((child) => renderPrimitive(child, opts)).join("\n") ?? "";
  let body = "";

  switch (primitive.kind) {
    case "token_row":
      body = children;
      break;
    case "token_stack":
      body = renderTokenStack(primitive, rect, profile);
      break;
    case "stacked_cards":
      body = renderStackedCards(primitive, rect, profile);
      break;
    case "selector":
      body = renderSelector(primitive, rect, profile);
      break;
    case "sum_node":
      body = renderSumNode(primitive, rect, profile);
      break;
    case "dashed_window":
    case "group_box":
      body = renderGroupBox(primitive, rect, profile);
      break;
    case "annotation":
      body = renderAnnotation(primitive, rect, profile);
      break;
    case "edge":
      body = "";
      break;
    default:
      body = renderBox(primitive, rect, profile);
  }

  return [`<g id="${escAttr(primitive.id)}" class="figure-primitive ${className}">`, renderPrimitiveTitle(primitive), body, `</g>`].filter(Boolean).join("\n");
}

function renderTokenStack(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  const count = numberMeta(primitive, "count", 8);
  const activeFrom = numberMeta(primitive, "activeFrom", count + 1);
  const sparse = boolMeta(primitive, "sparse", false);
  const dashedGroup = boolMeta(primitive, "dashedGroup", false);
  const gap = numberMeta(primitive, "gap", 3);
  const tokenH = (rect.h - gap * (count - 1)) / count;
  const lines: string[] = [];
  if (dashedGroup) {
    lines.push(`<rect x="${round(rect.x - 10)}" y="${round(rect.y - 2)}" width="${round(rect.w + 20)}" height="${round(rect.h + 4)}" rx="10" fill="none" stroke="${profile.stroke}" stroke-width="1.2" stroke-dasharray="${profile.dashedPattern}"/>`);
  }
  for (let i = 0; i < count; i++) {
    const isActive = i >= activeFrom;
    const isSparseActive = sparse && i >= activeFrom;
    const fill = isSparseActive ? profile.activeFill : isActive ? profile.activeFill : profile.tokenFill;
    lines.push(`<rect x="${round(rect.x)}" y="${round(rect.y + i * (tokenH + gap))}" width="${round(rect.w)}" height="${round(tokenH)}" rx="4" fill="${fill}" stroke="${profile.stroke}" stroke-width="${profile.strokeWidth}"/>`);
  }
  if (primitive.label) {
    lines.push(renderTextLines(primitive.label, rect.x + rect.w / 2, rect.y + rect.h + 26, 16, "middle", profile, 700));
  }
  return lines.join("\n");
}

function renderStackedCards(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  const count = numberMeta(primitive, "count", 4);
  const offsetX = numberMeta(primitive, "offsetX", profile.cardOffset.x);
  const offsetY = numberMeta(primitive, "offsetY", profile.cardOffset.y);
  const lines: string[] = [];
  for (let i = count - 1; i >= 1; i--) {
    lines.push(`<rect x="${round(rect.x + i * offsetX)}" y="${round(rect.y + i * offsetY)}" width="${round(rect.w)}" height="${round(rect.h)}" rx="${styleRadius(primitive, profile)}" fill="${i === count - 1 ? profile.inactiveFill : profile.accentFill}" stroke="${profile.stroke}" stroke-width="${profile.strokeWidth}"/>`);
  }
  lines.push(`<rect x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.w)}" height="${round(rect.h)}" rx="${styleRadius(primitive, profile)}" fill="${styleFill(primitive, profile.accentFill)}" stroke="${styleStroke(primitive, profile)}" stroke-width="${styleStrokeWidth(primitive, profile)}"/>`);
  if (primitive.label) lines.push(renderTextLines(primitive.label, rect.x + rect.w / 2, rect.y + rect.h / 2, styleFontSize(primitive, 20), "middle", profile, primitive.style?.fontWeight ?? 400));
  return lines.join("\n");
}

function renderSelector(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  const inset = rect.w * 0.16;
  const points = [
    `${round(rect.x + inset)},${round(rect.y)}`,
    `${round(rect.x + rect.w - inset)},${round(rect.y)}`,
    `${round(rect.x + rect.w)},${round(rect.y + rect.h)}`,
    `${round(rect.x)},${round(rect.y + rect.h)}`
  ].join(" ");
  return [
    `<polygon class="selector-trapezoid" points="${points}" fill="${styleFill(primitive, profile.blockFill)}" stroke="${styleStroke(primitive, profile)}" stroke-width="${styleStrokeWidth(primitive, profile)}"/>`,
    primitive.label ? renderTextLines(primitive.label, rect.x + rect.w / 2, rect.y + rect.h / 2, styleFontSize(primitive, 20), "middle", profile, primitive.style?.fontWeight ?? 400) : ""
  ].filter(Boolean).join("\n");
}

function renderSumNode(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.min(rect.w, rect.h) / 2;
  return [
    `<circle class="sum-node-circle" cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${styleFill(primitive, profile.blockFill)}" stroke="${styleStroke(primitive, profile)}" stroke-width="${styleStrokeWidth(primitive, profile)}"/>`,
    `<path d="M${round(cx - r * 0.7)} ${round(cy)} H${round(cx + r * 0.7)} M${round(cx)} ${round(cy - r * 0.7)} V${round(cy + r * 0.7)}" stroke="${styleStroke(primitive, profile)}" stroke-width="${styleStrokeWidth(primitive, profile)}"/>`
  ].join("\n");
}

function renderGroupBox(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  const labelY = rect.y - 8;
  return [
    `<rect class="dashed-window-box" x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.w)}" height="${round(rect.h)}" rx="${styleRadius(primitive, profile)}" fill="${styleFill(primitive, profile.groupFill)}" stroke="${styleStroke(primitive, profile)}" stroke-width="${styleStrokeWidth(primitive, profile)}" stroke-dasharray="${primitive.style?.strokeDasharray ?? profile.dashedPattern}"/>`,
    primitive.label ? renderTextLines(primitive.label, rect.x + rect.w / 2, labelY, styleFontSize(primitive, 18), "middle", profile, primitive.style?.fontWeight ?? 400) : ""
  ].filter(Boolean).join("\n");
}

function renderAnnotation(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  return primitive.label ? renderTextLines(primitive.label, rect.x, rect.y + 18, styleFontSize(primitive, 18), "start", profile, primitive.style?.fontWeight ?? 400, boolMeta(primitive, "italic", false)) : "";
}

function renderBox(primitive: LlmFigurePrimitive, rect: RenderRect, profile: LlmFigureProfile): string {
  const labelBelow = boolMeta(primitive, "labelBelow", false);
  const label = primitive.label ? renderTextLines(primitive.label, rect.x + rect.w / 2, labelBelow ? rect.y + rect.h + 24 : rect.y + rect.h / 2, styleFontSize(primitive, 18), "middle", profile, primitive.style?.fontWeight ?? 400) : "";
  return [
    `<rect x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.w)}" height="${round(rect.h)}" rx="${styleRadius(primitive, profile)}" fill="${styleFill(primitive, primitive.kind === "token" ? profile.tokenFill : profile.blockFill)}" stroke="${styleStroke(primitive, profile)}" stroke-width="${styleStrokeWidth(primitive, profile)}"/>`,
    label
  ].filter(Boolean).join("\n");
}

function renderFigureEdge(edge: LlmFigureEdge, primitiveMap: Map<string, LlmFigurePrimitive>, opts: ResolvedFigureOptions): string {
  const points = resolveEdgePoints(edge, primitiveMap).map((p) => scalePoint(p, opts));
  if (points.length < 2) return "";
  const profile = opts.profile;
  const d = edge.kind === "curve" && points.length === 2
    ? curvePath(points[0], points[1])
    : polylinePath(points);
  const markerEnd = edge.arrowEnd === false ? "" : ` marker-end="url(#figure-arrow)"`;
  const markerStart = edge.arrowStart ? ` marker-start="url(#figure-arrow-start)"` : "";
  const dash = edge.dashed ? ` stroke-dasharray="${edge.style?.strokeDasharray ?? profile.dashedPattern}"` : "";
  const label = edge.label ? renderEdgeLabel(edge, points, opts) : "";
  return [
    `<path id="${escAttr(edge.id)}" class="figure-edge" d="${d}" stroke="${edge.style?.stroke ?? profile.stroke}" stroke-width="${edge.style?.strokeWidth ?? profile.strokeWidth}"${dash}${markerStart}${markerEnd}/>`,
    label
  ].filter(Boolean).join("\n");
}

function resolveEdgePoints(edge: LlmFigureEdge, primitiveMap: Map<string, LlmFigurePrimitive>): LlmFigurePoint[] {
  if (edge.sourcePoint && edge.targetPoint) return [edge.sourcePoint, ...(edge.points ?? []), edge.targetPoint];
  const source = edge.source ? primitiveMap.get(edge.source) : undefined;
  const target = edge.target ? primitiveMap.get(edge.target) : undefined;
  if (!source || !target) return [];
  return [center(source), ...(edge.points ?? []), center(target)];
}

function renderEdgeLabel(edge: LlmFigureEdge, points: LlmFigurePoint[], opts: ResolvedFigureOptions): string {
  const pos = edge.labelPosition ? scalePoint(edge.labelPosition, opts) : points[Math.floor(points.length / 2)];
  return renderTextLines(edge.label ?? "", pos.x, pos.y - 6, edge.style?.fontSize ?? 16, "middle", opts.profile, edge.style?.fontWeight ?? 400);
}

function resolveFigureOptions(spec: LlmFigureSpec, options: RenderLlmFigureSvgOptions): ResolvedFigureOptions {
  const profile = resolveLlmFigureProfile(options.profile ?? spec.profile);
  const width = options.width ?? spec.view.width;
  const scale = width / spec.view.width;
  const padding = options.padding ?? spec.view.padding ?? 0;
  return {
    title: options.title ?? spec.name,
    width: width + padding * 2,
    height: spec.view.height * scale + padding * 2,
    padding,
    scale,
    profile
  };
}

export function resolveLlmFigureProfile(profile?: LlmFigureProfileName | LlmFigureProfile): LlmFigureProfile {
  if (!profile) return cloneFigureProfile(BUILTIN_LLM_FIGURE_PROFILES["paper-algorithm"]);
  if (typeof profile === "string") {
    const builtin = BUILTIN_LLM_FIGURE_PROFILES[profile];
    if (!builtin) throw new Error(`Unknown LLM figure profile: ${profile}`);
    return cloneFigureProfile(builtin);
  }
  return cloneFigureProfile(profile);
}

function cloneFigureProfile(profile: LlmFigureProfile): LlmFigureProfile {
  return { ...profile, cardOffset: { ...profile.cardOffset } };
}

function flattenPrimitives(primitives: LlmFigurePrimitive[]): LlmFigurePrimitive[] {
  return primitives.flatMap((primitive) => [primitive, ...flattenPrimitives(primitive.children ?? [])]);
}

function primitiveRect(primitive: LlmFigurePrimitive, opts: ResolvedFigureOptions): RenderRect {
  return {
    x: primitive.position.x * opts.scale + opts.padding,
    y: primitive.position.y * opts.scale + opts.padding,
    w: primitive.size.w * opts.scale,
    h: primitive.size.h * opts.scale
  };
}

function scalePoint(point: LlmFigurePoint, opts: ResolvedFigureOptions): LlmFigurePoint {
  return { x: point.x * opts.scale + opts.padding, y: point.y * opts.scale + opts.padding };
}

function center(primitive: LlmFigurePrimitive): LlmFigurePoint {
  return { x: primitive.position.x + primitive.size.w / 2, y: primitive.position.y + primitive.size.h / 2 };
}

function polylinePath(points: LlmFigurePoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${round(point.x)} ${round(point.y)}`).join(" ");
}

function curvePath(start: LlmFigurePoint, end: LlmFigurePoint): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return `M${round(start.x)} ${round(start.y)} C${round(start.x + dx * 0.25)} ${round(start.y + dy * 0.1)} ${round(end.x - dx * 0.25)} ${round(end.y - dy * 0.35)} ${round(end.x)} ${round(end.y)}`;
}

function renderTextLines(label: string, x: number, y: number, fontSize: number, anchor: string, profile: LlmFigureProfile, weight: string | number, italic = false): string {
  const lines = label.split("\n");
  const lineHeight = fontSize * 1.22;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines.map((line, index) => `<text x="${round(x)}" y="${round(startY + index * lineHeight)}" font-size="${fontSize}" text-anchor="${anchor}" font-weight="${weight}" font-style="${italic ? "italic" : "normal"}" fill="${profile.textColor}">${esc(line)}</text>`).join("\n");
}

function renderPrimitiveTitle(primitive: LlmFigurePrimitive): string {
  const title = primitive.label?.split("\n").join(" ").replace(/\s+/g, " ").trim();
  return title ? `<title>${esc(title)}</title>` : "";
}

function token(id: string, label: string, x: number, y: number, w: number, h: number, fill: string, metadata?: LlmFigurePrimitive["metadata"]): LlmFigurePrimitive {
  return { id, kind: "token", label, position: { x, y }, size: { w, h }, style: { fill, radius: 6, fontSize: 18 }, metadata };
}

function tokenStack(id: string, label: string, x: number, y: number, w: number, h: number, count: number, metadata?: LlmFigurePrimitive["metadata"]): LlmFigurePrimitive {
  return { id, kind: "token_stack", label, position: { x, y }, size: { w, h }, metadata: { count, ...(metadata ?? {}) } };
}

function stackedCards(id: string, label: string, x: number, y: number, w: number, h: number, count: number): LlmFigurePrimitive {
  return { id, kind: "stacked_cards", label, position: { x, y }, size: { w, h }, metadata: { count }, style: { fill: "#f7f7f7", radius: 12, fontSize: 20 } };
}

function selector(id: string, label: string, x: number, y: number, w: number, h: number): LlmFigurePrimitive {
  return { id, kind: "selector", label, position: { x, y }, size: { w, h }, style: { fill: "#e6e6e6", fontSize: 20 } };
}

function processBlock(id: string, label: string, x: number, y: number, w: number, h: number, kind: LlmFigurePrimitiveKind = "process_block", style?: LlmFigureStyle): LlmFigurePrimitive {
  return { id, kind, label, position: { x, y }, size: { w, h }, style: { radius: 8, fontSize: 18, ...(style ?? {}) } };
}

function sumNode(id: string, x: number, y: number): LlmFigurePrimitive {
  return { id, kind: "sum_node", label: "+", position: { x, y }, size: { w: 34, h: 34 }, style: { fill: "#e6e6e6" } };
}

function dashedWindow(id: string, x: number, y: number, w: number, h: number): LlmFigurePrimitive {
  return { id, kind: "dashed_window", position: { x, y }, size: { w, h }, style: { fill: "none", radius: 14 } };
}

function groupBox(id: string, label: string, x: number, y: number, w: number, h: number): LlmFigurePrimitive {
  return { id, kind: "group_box", label, position: { x, y }, size: { w, h }, style: { fill: "none", radius: 0 } };
}

function annotation(id: string, label: string, x: number, y: number, w: number, h: number, style?: LlmFigureStyle & { italic?: boolean }): LlmFigurePrimitive {
  return { id, kind: "annotation", label, position: { x, y }, size: { w, h }, style, metadata: { italic: Boolean(style?.italic) } };
}

function edge(id: string, sourcePoint: LlmFigurePoint, targetPoint: LlmFigurePoint, init: Partial<LlmFigureEdge> = {}): LlmFigureEdge {
  return { id, sourcePoint, targetPoint, arrowEnd: true, ...init };
}

function point(x: number, y: number): LlmFigurePoint {
  return { x, y };
}

function figureSpec(id: string, name: string, profile: LlmFigureProfileName, width: number, height: number, primitives: LlmFigurePrimitive[], edges: LlmFigureEdge[]): LlmFigureSpec {
  return {
    schemaVersion: 1,
    id,
    name,
    profile,
    view: { width, height, padding: 0 },
    primitives,
    edges
  };
}

function tokenWidth(label: string): number {
  return Math.max(50, label.length * 10 + 18);
}

function styleFill(primitive: LlmFigurePrimitive, fallback: string): string {
  return primitive.style?.fill ?? fallback;
}

function styleStroke(primitive: LlmFigurePrimitive, profile: LlmFigureProfile): string {
  return primitive.style?.stroke ?? profile.stroke;
}

function styleStrokeWidth(primitive: LlmFigurePrimitive, profile: LlmFigureProfile): number {
  return primitive.style?.strokeWidth ?? profile.strokeWidth;
}

function styleRadius(primitive: LlmFigurePrimitive, profile: LlmFigureProfile): number {
  return primitive.style?.radius ?? profile.radius;
}

function styleFontSize(primitive: LlmFigurePrimitive, fallback: number): number {
  return primitive.style?.fontSize ?? fallback;
}

function numberMeta(primitive: LlmFigurePrimitive, key: string, fallback: number): number {
  const value = primitive.metadata?.[key];
  return typeof value === "number" ? value : fallback;
}

function boolMeta(primitive: LlmFigurePrimitive, key: string, fallback: boolean): boolean {
  const value = primitive.metadata?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function primitiveClassName(kind: LlmFigurePrimitiveKind): string {
  return kind.replace(/_/g, "-");
}

function esc(value: string): string {
  return value.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
}

function escAttr(value: string): string {
  return esc(value).split('"').join("&quot;");
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
