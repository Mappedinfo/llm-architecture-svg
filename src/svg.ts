import { ArchitectureEdge, ArchitectureNode, ArchitectureShape, ArchitectureSpec, GptTemplateParams } from "./types";
import { countArchitectureParameters, formatParamCount, generateGptArchitecture, shapeToLabel } from "./generator";
import { resolveSvgProfile } from "./profiles";
import type { ArchitectureSvgProfile, ArchitectureSvgProfileName } from "./profiles";

export { BUILTIN_SVG_PROFILES, resolveSvgProfile } from "./profiles";
export type {
  ArchitectureSvgIconPreset,
  ArchitectureSvgPalette,
  ArchitectureSvgProfile,
  ArchitectureSvgProfileName,
  ArchitectureSvgResidualRouting,
  ArchitectureSvgStructureAdapter,
  ArchitectureSvgTheme
} from "./profiles";

export interface RenderArchitectureSvgOptions {
  title?: string;
  showShapes?: boolean;
  showParamCounts?: boolean;
  expandedGroups?: string[];
  theme?: "paper" | "blueprint";
  profile?: ArchitectureSvgProfileName | ArchitectureSvgProfile;
  width?: number;
  padding?: number;
}

interface RenderNode {
  node: ArchitectureNode;
  depth: number;
}

interface ResolvedRenderOptions {
  title: string;
  showShapes: boolean;
  showParamCounts: boolean;
  expandedGroups: string[];
  width: number;
  padding: number;
  profile: ArchitectureSvgProfile;
}

interface NodeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLLAPSED_GROUP_HEIGHT = 72;
const OUTER_GROUP_MARGIN_Y = 42;

export function renderGptArchitectureSvg(params: GptTemplateParams, options: RenderArchitectureSvgOptions = {}): string {
  return renderArchitectureSvg(generateGptArchitecture(params), options);
}

export function renderArchitectureSvg(architecture: ArchitectureSpec, options: RenderArchitectureSvgOptions = {}): string {
  const opts = resolveOptions(architecture, options);
  const architectureForRender = adaptArchitectureForProfile(architecture, opts.profile);
  const expanded = new Set(opts.expandedGroups);
  const renderNodes = createRenderNodes(architectureForRender.nodes, expanded);
  const visibleNodeIds = new Set(renderNodes.map((item) => item.node.id));
  const bounds = calcBounds(renderNodes.map((item) => item.node));
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const scale = (opts.width - 2 * opts.padding) / contentWidth;
  const titleHeight = opts.profile.showHeader && (opts.title || opts.showParamCounts) ? 90 : 24;
  const height = Math.ceil((bounds.maxY - bounds.minY) * scale + opts.padding * 2 + titleHeight);

  const x = (v: number) => (v - bounds.minX) * scale + opts.padding;
  const y = (v: number) => (v - bounds.minY) * scale + opts.padding + titleHeight;
  const s = (v: number) => v * scale;

  const edges = architectureForRender.edges
    .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    .map((edge) => renderEdge(edge, renderNodes, x, y, s, opts.profile))
    .join("\n");
  const groups = renderNodes
    .filter((item) => item.node.type === "group")
    .map((item) => renderNode(item.node, item.depth, x, y, s, opts, true))
    .join("\n");
  const blocks = renderNodes
    .filter((item) => item.node.type !== "group")
    .map((item) => renderNode(item.node, item.depth, x, y, s, opts, false))
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${height}" viewBox="0 0 ${opts.width} ${height}" role="img" aria-label="${escAttr(opts.title || architectureForRender.name)}">`,
    `<defs>${renderDefs(opts.profile)}</defs>`,
    `<rect width="100%" height="100%" fill="${opts.profile.palette.background}"/>`,
    renderGrid(opts.width, height, opts.profile),
    renderHeader(architectureForRender, opts),
    `<g class="architecture profile-${escAttr(String(opts.profile.name))}">`,
    edges,
    groups,
    blocks,
    `</g>`,
    `</svg>`
  ].filter(Boolean).join("\n");
}

function resolveOptions(architecture: ArchitectureSpec, options: RenderArchitectureSvgOptions): ResolvedRenderOptions {
  const profile = resolveSvgProfile(options.profile, options.theme);
  return {
    title: options.title ?? architecture.name,
    showShapes: options.showShapes ?? profile.showShapes,
    showParamCounts: options.showParamCounts ?? profile.showParamCounts,
    expandedGroups: options.expandedGroups ?? profile.expandedGroups,
    width: options.width ?? 1100,
    padding: options.padding ?? 36,
    profile
  };
}

function renderDefs(profile: ArchitectureSvgProfile): string {
  return [
    `<style>`,
    `text{font-family:${profile.fontFamily}}`,
    `.node-label{font-weight:${profile.labelFontWeight};fill:${profile.palette.text}}`,
    `.node-meta{fill:${profile.palette.muted}}`,
    `.shape-warning{fill:${profile.palette.warning};font-weight:700}`,
    `.edge{fill:none;stroke-linecap:round;stroke-linejoin:round}`,
    `.icon-stroke{fill:none;stroke:${profile.palette.edge};stroke-linecap:round;stroke-linejoin:round}`,
    `</style>`,
    renderMarker("data", profile.palette.data),
    renderMarker("residual", profile.palette.residual),
    renderMarker("dependency", profile.palette.dependency)
  ].join("");
}

function renderMarker(id: string, color: string): string {
  return [
    `<marker id="arrow-${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">`,
    `<path d="M0,0 L8,4 L0,8 Z" fill="${color}"/>`,
    `</marker>`
  ].join("");
}

function renderGrid(width: number, height: number, profile: ArchitectureSvgProfile): string {
  if (!profile.showGrid) return "";
  const lines: string[] = [];
  for (let x = 0; x <= width; x += 24) lines.push(`<path d="M${x} 0 V${height}" stroke="${profile.palette.grid}" stroke-width="1" opacity="0.42"/>`);
  for (let y = 0; y <= height; y += 24) lines.push(`<path d="M0 ${y} H${width}" stroke="${profile.palette.grid}" stroke-width="1" opacity="0.42"/>`);
  return `<g class="grid" opacity="0.7">${lines.join("")}</g>`;
}

function renderHeader(architecture: ArchitectureSpec, opts: ResolvedRenderOptions): string {
  if (!opts.profile.showHeader) return "";
  const title = opts.title || architecture.name;
  const lines: string[] = [];
  if (title) {
    lines.push(`<text x="${opts.padding}" y="36" font-size="24" class="node-label">${esc(title)}</text>`);
  }
  if (opts.showParamCounts) {
    const summary = countArchitectureParameters(architecture);
    const chips = [`total ${formatParamCount(summary.total)}`, ...summary.categories.map((item) => `${item.category} ${formatParamCount(item.count)}`)];
    let x = opts.padding;
    for (const chip of chips) {
      const chipWidth = Math.max(84, chip.length * 7 + 22);
      lines.push(`<rect x="${x}" y="52" width="${chipWidth}" height="24" rx="12" fill="${opts.profile.palette.summaryFill}" stroke="${opts.profile.palette.grid}"/>`);
      lines.push(`<text x="${x + 11}" y="68" font-size="11" class="node-meta">${esc(chip)}</text>`);
      x += chipWidth + 8;
    }
  }
  return `<g class="header">${lines.join("\n")}</g>`;
}

function renderNode(
  node: ArchitectureNode,
  depth: number,
  x: (v: number) => number,
  y: (v: number) => number,
  scale: (v: number) => number,
  opts: ResolvedRenderOptions,
  isGroup: boolean
): string {
  const profile = opts.profile;
  const rect = nodeRect(node, x, y, scale);

  if (isTextLabelNode(node)) return renderTextLabelNode(node, rect, profile);
  if (shouldRenderPositionalIcon(node, profile)) return renderPositionalIconNode(node, rect, profile);
  if (shouldRenderCircleAdd(node, profile)) return renderCircleAddNode(node, rect, profile);

  const fill = nodeFill(node, profile);
  const stroke = profile.showShapeWarnings && hasShapeMismatch(node) ? profile.palette.warning : isGroup ? profile.palette.groupStroke : profile.palette.blockStroke;
  const dash = isGroup ? ` stroke-dasharray="8 6"` : "";
  const strokeWidth = isGroup ? profile.groupStrokeWidth : profile.blockStrokeWidth;
  const opacity = isGroup ? profile.groupFillOpacity : profile.blockFillOpacity;
  const labelFontSize = isGroup ? profile.groupFontSize : profile.labelFontSize;
  const labelX = isGroup ? rect.x + 12 + depth * 4 : rect.x + rect.w / 2;
  const labelY = isGroup ? rect.y + 24 : rect.y + Math.min(24, rect.h / 2 + 5);
  const anchor = isGroup ? "start" : "middle";
  const label = node.label ? renderTextLines(node.label, labelX, labelY, labelFontSize, anchor, "node-label", isGroup ? "top" : "center") : "";

  return [
    `<g id="${escAttr(node.id)}" class="node node-${escAttr(node.kind)}">`,
    renderNodeTitle(node),
    `<rect x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.w)}" height="${round(rect.h)}" rx="${isGroup ? profile.groupRadius : profile.radius}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`,
    label,
    renderNodeMeta(node, rect, opts, isGroup),
    renderOverlayIcon(node, rect, profile),
    `</g>`
  ].join("\n");
}

function renderTextLabelNode(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  return [
    `<g id="${escAttr(node.id)}" class="node node-text-label">`,
    renderNodeTitle(node),
    renderTextLines(node.label, rect.x + rect.w / 2, rect.y + rect.h / 2, profile.textLabelFontSize, "middle", "node-label", "center"),
    `</g>`
  ].join("\n");
}

function renderPositionalIconNode(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  const r = Math.min(24, rect.h / 2 - 4);
  const cx = rect.x + r + 8;
  const cy = rect.y + rect.h / 2;
  const waveStart = cx - r * 0.62;
  const waveEnd = cx + r * 0.62;
  const labelX = cx + r + 28;
  return [
    `<g id="${escAttr(node.id)}" class="node node-positional-icon">`,
    renderNodeTitle(node),
    `<circle class="icon-sine-circle" cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${nodeFill(node, profile)}" fill-opacity="0.08" stroke="${profile.palette.edge}" stroke-width="${profile.blockStrokeWidth}"/>`,
    `<path class="icon-stroke icon-sine" d="M${round(waveStart)} ${round(cy)} C${round(cx - r * 0.36)} ${round(cy - r * 0.8)} ${round(cx - r * 0.12)} ${round(cy - r * 0.8)} ${round(cx)} ${round(cy)} C${round(cx + r * 0.2)} ${round(cy + r * 0.8)} ${round(cx + r * 0.44)} ${round(cy + r * 0.8)} ${round(waveEnd)} ${round(cy)}" stroke-width="${profile.edgeStrokeWidth}"/>`,
    renderTextLines(node.label, labelX, cy, profile.labelFontSize, "start", "node-label", "center"),
    `</g>`
  ].join("\n");
}

function renderCircleAddNode(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.min(rect.w, rect.h) / 2 - 2;
  return [
    `<g id="${escAttr(node.id)}" class="node node-residual-add node-plus-circle">`,
    renderNodeTitle(node),
    `<circle class="icon-plus-circle" cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${nodeFill(node, profile)}" stroke="${profile.palette.edge}" stroke-width="${profile.blockStrokeWidth}"/>`,
    `<path class="icon-stroke icon-plus" d="M${round(cx - r * 0.58)} ${round(cy)} H${round(cx + r * 0.58)} M${round(cx)} ${round(cy - r * 0.58)} V${round(cy + r * 0.58)}" stroke-width="${profile.edgeStrokeWidth}"/>`,
    `</g>`
  ].join("\n");
}

function renderOverlayIcon(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  if (profile.iconPreset === "tensor" && ["linear", "attention", "generic_tensor"].includes(node.kind)) {
    const x = rect.x + 8;
    const y = rect.y + 8;
    return [
      `<g class="icon-tensor-grid" opacity="0.55">`,
      `<rect x="${round(x)}" y="${round(y)}" width="18" height="14" rx="2" fill="none" stroke="${profile.palette.edge}" stroke-width="0.8"/>`,
      `<path d="M${round(x + 6)} ${round(y)} V${round(y + 14)} M${round(x + 12)} ${round(y)} V${round(y + 14)} M${round(x)} ${round(y + 7)} H${round(x + 18)}" stroke="${profile.palette.edge}" stroke-width="0.65"/>`,
      `</g>`
    ].join("\n");
  }
  if (profile.iconPreset === "math" && node.kind === "softmax") {
    return `<text x="${round(rect.x + rect.w - 14)}" y="${round(rect.y + 18)}" font-size="14" text-anchor="middle" class="node-meta">σ</text>`;
  }
  return "";
}

function renderNodeMeta(node: ArchitectureNode, rect: NodeRect, opts: ResolvedRenderOptions, isGroup: boolean): string {
  const profile = opts.profile;
  if (isGroup) {
    const childCount = node.children?.length ?? 0;
    return profile.showGroupChildCount && childCount ? `<text x="${round(rect.x + rect.w - 12)}" y="${round(rect.y + 24)}" font-size="11" text-anchor="end" class="node-meta">${childCount} derived blocks</text>` : "";
  }

  const lines: Array<{ text: string; warning?: boolean }> = [];
  const mismatch = hasShapeMismatch(node);
  if (profile.showShapeWarnings && mismatch) {
    lines.push({ text: `actual ${shapeToLabel(node.shape)}` });
    lines.push({ text: `expected ${shapeToLabel(node.derived?.expectedShape)}` });
    lines.push({ text: "shape mismatch", warning: true });
  } else {
    if (opts.showShapes) lines.push({ text: node.derived?.shapeLabel ?? shapeToLabel(node.shape) });
    if (opts.showParamCounts && (node.derived?.paramCount ?? 0) > 0) lines.push({ text: formatParamCount(node.derived!.paramCount!) });
  }

  return lines.slice(0, profile.maxMetaLines).map((line, i) => {
    const className = line.warning ? "node-meta shape-warning" : "node-meta";
    return `<text x="${round(rect.x + rect.w / 2)}" y="${round(rect.y + rect.h - 18 + i * 13)}" font-size="${profile.metaFontSize}" text-anchor="middle" class="${className}">${esc(line.text)}</text>`;
  }).join("\n");
}

function renderEdge(
  edge: ArchitectureEdge,
  nodes: RenderNode[],
  x: (v: number) => number,
  y: (v: number) => number,
  scale: (v: number) => number,
  profile: ArchitectureSvgProfile
): string {
  const source = nodes.find((item) => item.node.id === edge.source)?.node;
  const target = nodes.find((item) => item.node.id === edge.target)?.node;
  if (!source || !target) return "";

  if (edge.kind === "residual" && profile.residualRouting === "right-loop") return renderRightLoopEdge(edge, source, target, x, y, scale, profile);
  if (profile.qkvFanIn && isQkvFanEdge(source, target)) return renderFanEdge(edge, source, target, x, y, scale, profile);
  return renderDefaultEdge(edge, source, target, x, y, scale, profile);
}

function renderDefaultEdge(
  edge: ArchitectureEdge,
  source: ArchitectureNode,
  target: ArchitectureNode,
  x: (v: number) => number,
  y: (v: number) => number,
  scale: (v: number) => number,
  profile: ArchitectureSvgProfile
): string {
  const sourceRect = nodeRect(source, x, y, scale);
  const targetRect = nodeRect(target, x, y, scale);
  const vertical = targetRect.y >= sourceRect.y + sourceRect.h / 2;
  const start = vertical ? bottomCenter(sourceRect) : sideCenter(sourceRect, targetRect.x >= sourceRect.x ? "right" : "left");
  const end = vertical ? topCenter(targetRect) : sideCenter(targetRect, targetRect.x >= sourceRect.x ? "left" : "right");
  const midY = (start.y + end.y) / 2;
  const path = vertical
    ? `M${round(start.x)} ${round(start.y)} C${round(start.x)} ${round(midY)} ${round(end.x)} ${round(midY)} ${round(end.x)} ${round(end.y)}`
    : `M${round(start.x)} ${round(start.y)} C${round((start.x + end.x) / 2)} ${round(start.y)} ${round((start.x + end.x) / 2)} ${round(end.y)} ${round(end.x)} ${round(end.y)}`;
  return renderEdgePath(edge, path, profile, edge.kind === "dependency" ? ` stroke-dasharray="4 4"` : "");
}

function renderRightLoopEdge(
  edge: ArchitectureEdge,
  source: ArchitectureNode,
  target: ArchitectureNode,
  x: (v: number) => number,
  y: (v: number) => number,
  scale: (v: number) => number,
  profile: ArchitectureSvgProfile
): string {
  const sourceRect = nodeRect(source, x, y, scale);
  const targetRect = nodeRect(target, x, y, scale);
  const start = sideCenter(sourceRect, "right");
  const end = sideCenter(targetRect, "right");
  const loopX = Math.max(sourceRect.x + sourceRect.w, targetRect.x + targetRect.w) + profile.residualLoopOffset;
  const path = `M${round(start.x)} ${round(start.y)} H${round(loopX)} C${round(loopX + 10)} ${round(start.y)} ${round(loopX + 10)} ${round(end.y)} ${round(loopX)} ${round(end.y)} H${round(end.x)}`;
  return renderEdgePath(edge, path, profile, "", "edge-residual-loop");
}

function renderFanEdge(
  edge: ArchitectureEdge,
  source: ArchitectureNode,
  target: ArchitectureNode,
  x: (v: number) => number,
  y: (v: number) => number,
  scale: (v: number) => number,
  profile: ArchitectureSvgProfile
): string {
  const sourceRect = nodeRect(source, x, y, scale);
  const targetRect = nodeRect(target, x, y, scale);
  const start = sideCenter(sourceRect, "right");
  const end = sideCenter(targetRect, "left");
  const ctrlX = (start.x + end.x) / 2;
  const path = `M${round(start.x)} ${round(start.y)} C${round(ctrlX)} ${round(start.y)} ${round(ctrlX)} ${round(end.y)} ${round(end.x)} ${round(end.y)}`;
  return renderEdgePath(edge, path, profile, edge.kind === "dependency" ? ` stroke-dasharray="4 4"` : "", "edge-fan-in");
}

function renderEdgePath(edge: ArchitectureEdge, path: string, profile: ArchitectureSvgProfile, extraAttrs = "", extraClass = ""): string {
  const color = edge.kind === "residual" ? profile.palette.residual : edge.kind === "dependency" ? profile.palette.dependency : profile.palette.data;
  const strokeWidth = edge.kind === "residual" ? profile.residualStrokeWidth : profile.edgeStrokeWidth;
  const className = ["edge", `edge-${edge.kind}`, extraClass].filter(Boolean).join(" ");
  return `<path class="${className}" d="${path}" stroke="${color}" stroke-width="${strokeWidth}" opacity="0.82" marker-end="url(#arrow-${edge.kind})"${extraAttrs}/>`;
}

function adaptArchitectureForProfile(architecture: ArchitectureSpec, profile: ArchitectureSvgProfile): ArchitectureSpec {
  if (profile.structureAdapter === "textbook-overview") return createTextbookOverviewSpec(architecture);
  return architecture;
}

function createTextbookOverviewSpec(architecture: ArchitectureSpec): ArchitectureSpec {
  const params = architecture.template?.params;
  const nBlocks = params?.nBlocks ?? (architecture.nodes.filter((node) => node.derived?.role === "transformer_block").length || 1);
  const now = architecture.updatedAt;
  const nodes: ArchitectureNode[] = [
    diagramNode("text_inputs", "generic_tensor", "Inputs", 180, 20, 170, 40, "#ffffff", "text_label"),
    diagramNode("input_embedding", "token_embed", "Input\nEmbedding", 95, 92, 300, 96, "#f6dada", "input_embedding"),
    diagramNode("embed_add", "residual_add", "+", 228, 246, 36, 36, "#ffffff", "embedding_add"),
    diagramNode("positional_encoding", "pos_embed", "Positional\nEncoding", 295, 224, 250, 82, "#e8f7ff", "positional_encoding"),
    diagramNode("transformer_group", "group", "", 78, 330, 340, 370, "#f8f8f8", `transformer_block_x_${nBlocks}`, undefined, [
      diagramNode("mha", "attention", "Multi-Head\nAttention", 140, 420, 216, 74, "#ffe3b5", "multi_head_attention"),
      diagramNode("add_norm_1", "layer_norm", "Add & Norm", 142, 510, 212, 40, "#f5f5c0", "add_norm_1"),
      diagramNode("feed_forward", "mlp", "Feed\nForward", 142, 600, 212, 66, "#bfecf5", "feed_forward"),
      diagramNode("add_norm_2", "layer_norm", "Add & Norm", 142, 680, 212, 40, "#f5f5c0", "add_norm_2")
    ]),
    diagramNode("linear", "linear", "Linear", 145, 770, 206, 38, "#e0e3f2", "linear"),
    diagramNode("softmax", "softmax", "Softmax", 145, 844, 206, 38, "#d8f0dc", "softmax"),
    diagramNode("text_output", "generic_tensor", "Output\nProbabilities", 135, 930, 230, 72, "#ffffff", "text_label")
  ];
  const edges: ArchitectureEdge[] = [
    diagramEdge("text_inputs", "input_embedding", "data"),
    diagramEdge("input_embedding", "embed_add", "data"),
    diagramEdge("positional_encoding", "embed_add", "data"),
    diagramEdge("embed_add", "mha", "data"),
    diagramEdge("embed_add", "add_norm_1", "residual", "residual"),
    diagramEdge("mha", "add_norm_1", "data"),
    diagramEdge("add_norm_1", "feed_forward", "data"),
    diagramEdge("add_norm_1", "add_norm_2", "residual", "residual"),
    diagramEdge("feed_forward", "add_norm_2", "data"),
    diagramEdge("add_norm_2", "linear", "data"),
    diagramEdge("linear", "softmax", "data"),
    diagramEdge("softmax", "text_output", "data")
  ];

  return {
    schemaVersion: 1,
    mode: architecture.mode,
    template: architecture.template,
    id: `${architecture.id}-textbook-overview`,
    name: architecture.name,
    notes: architecture.notes,
    nodes,
    edges,
    view: { canvas: { w: 540, h: 1040 }, scale3d: architecture.view.scale3d },
    createdAt: architecture.createdAt,
    updatedAt: now
  };
}

function diagramNode(
  id: string,
  kind: ArchitectureNode["kind"],
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  role: string,
  shape: ArchitectureShape = {},
  children?: ArchitectureNode[]
): ArchitectureNode {
  return {
    id,
    type: kind === "group" ? "group" : "block",
    kind,
    label,
    shape,
    position2d: { x, y },
    size2d: { w, h },
    color,
    children,
    derived: {
      source: "gpt-template",
      role,
      expectedShape: shape,
      shapeLabel: shapeToLabel(shape),
      paramCategory: "none",
      paramCount: 0,
      paramFormula: "conceptual textbook node",
      locked: true,
      overview: true
    }
  };
}

function diagramEdge(source: string, target: string, kind: ArchitectureEdge["kind"], label?: string): ArchitectureEdge {
  return { id: `edge-${source}-${target}-${kind}`, source, target, kind, label };
}

interface PreparedNodeResult {
  nodes: RenderNode[];
  savedHeight: number;
}

function createRenderNodes(nodes: ArchitectureNode[], expanded: Set<string>): RenderNode[] {
  const renderNodes: RenderNode[] = [];
  let yOffset = 0;
  for (const node of nodes) {
    const prepared = prepareNodeForRender(node, expanded, 0, yOffset);
    renderNodes.push(...prepared.nodes);
    yOffset += prepared.savedHeight;
  }
  return fitOuterGroups(renderNodes);
}

function prepareNodeForRender(node: ArchitectureNode, expanded: Set<string>, depth: number, yOffset: number): PreparedNodeResult {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = hasChildren && (expanded.has(node.id) || node.id === "transformer_group");
  const shifted = shiftNodeY(node, -yOffset);
  if (node.type === "group" && hasChildren && !isExpanded) {
    const compactHeight = Math.min(node.size2d.h, COLLAPSED_GROUP_HEIGHT);
    return {
      nodes: [{ node: { ...shifted, size2d: { ...shifted.size2d, h: compactHeight } }, depth }],
      savedHeight: node.size2d.h - compactHeight
    };
  }

  const result: RenderNode[] = [{ node: shifted, depth }];
  if (isExpanded) {
    for (const child of node.children ?? []) {
      result.push(...prepareNodeForRender(child, expanded, depth + 1, yOffset).nodes);
    }
  }
  return { nodes: result, savedHeight: 0 };
}

function shiftNodeY(node: ArchitectureNode, deltaY: number): ArchitectureNode {
  return { ...node, position2d: { ...node.position2d, y: node.position2d.y + deltaY } };
}

function fitOuterGroups(renderNodes: RenderNode[]): RenderNode[] {
  const contentNodes = renderNodes.filter((item) => item.node.derived?.role !== "llm_group");
  if (contentNodes.length === 0) return renderNodes;
  const bounds = calcBounds(contentNodes.map((item) => item.node));
  return renderNodes.map((item) => {
    if (item.node.derived?.role !== "llm_group") return item;
    return {
      ...item,
      node: {
        ...item.node,
        position2d: { ...item.node.position2d, y: bounds.minY - OUTER_GROUP_MARGIN_Y },
        size2d: { ...item.node.size2d, h: bounds.maxY - bounds.minY + OUTER_GROUP_MARGIN_Y * 2 }
      }
    };
  });
}

function calcBounds(nodes: ArchitectureNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return nodes.reduce((bounds, node) => ({
    minX: Math.min(bounds.minX, node.position2d.x),
    minY: Math.min(bounds.minY, node.position2d.y),
    maxX: Math.max(bounds.maxX, node.position2d.x + node.size2d.w),
    maxY: Math.max(bounds.maxY, node.position2d.y + node.size2d.h)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function nodeRect(node: ArchitectureNode, x: (v: number) => number, y: (v: number) => number, scale: (v: number) => number): NodeRect {
  return { x: x(node.position2d.x), y: y(node.position2d.y), w: scale(node.size2d.w), h: scale(node.size2d.h) };
}

function topCenter(rect: NodeRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y };
}

function bottomCenter(rect: NodeRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
}

function sideCenter(rect: NodeRect, side: "left" | "right"): { x: number; y: number } {
  return { x: side === "left" ? rect.x : rect.x + rect.w, y: rect.y + rect.h / 2 };
}

function nodeFill(node: ArchitectureNode, profile: ArchitectureSvgProfile): string {
  return profile.kindColors?.[node.kind] ?? node.color ?? "#d8dee9";
}

function isTextLabelNode(node: ArchitectureNode): boolean {
  return node.derived?.role === "text_label";
}

function shouldRenderPositionalIcon(node: ArchitectureNode, profile: ArchitectureSvgProfile): boolean {
  return profile.iconPreset === "classic" && node.kind === "pos_embed" && node.derived?.role === "positional_encoding";
}

function shouldRenderCircleAdd(node: ArchitectureNode, profile: ArchitectureSvgProfile): boolean {
  return ["classic", "tensor", "math"].includes(profile.iconPreset) && node.kind === "residual_add";
}

function isQkvFanEdge(source: ArchitectureNode, target: ArchitectureNode): boolean {
  const sourceIsLn1 = /_ln1$/.test(source.id);
  const targetIsQkv = /_(q|k|v)$/.test(target.id);
  const sourceIsQkv = /_(q|k|v)$/.test(source.id);
  const targetIsAttentionJoin = /_att_scores$|_att_proj$/.test(target.id);
  return (sourceIsLn1 && targetIsQkv) || (sourceIsQkv && targetIsAttentionJoin);
}

function hasShapeMismatch(node: ArchitectureNode): boolean {
  const expected = node.derived?.expectedShape;
  if (!expected) return false;
  const actual = node.shape ?? {};
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of keys) {
    if (expected[key as keyof ArchitectureShape] !== actual[key as keyof ArchitectureShape]) return true;
  }
  return false;
}

function renderTextLines(label: string, x: number, y: number, fontSize: number, anchor: string, className: string, align: "top" | "center"): string {
  const lines = label.split("\n");
  const lineHeight = fontSize * 1.18;
  const startY = align === "center" ? y - ((lines.length - 1) * lineHeight) / 2 : y;
  return lines.map((line, i) => `<text x="${round(x)}" y="${round(startY + i * lineHeight)}" font-size="${fontSize}" text-anchor="${anchor}" class="${className}">${esc(line)}</text>`).join("\n");
}

function renderNodeTitle(node: ArchitectureNode): string {
  const title = node.label.split("\n").join(" ").trim();
  return title ? `<title>${esc(title)}</title>` : "";
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
