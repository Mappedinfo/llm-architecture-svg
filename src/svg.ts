import {
  ArchitectureDerivedSource,
  ArchitectureEdge,
  ArchitectureNode,
  ArchitecturePresentationOverride,
  ArchitecturePresentationSpec,
  ArchitectureShape,
  ArchitectureSpec,
  COMPONENT_TEMPLATES,
  GptTemplateParams
} from "./types";
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
  presentation?: ArchitecturePresentationSpec;
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
  presentation?: ArchitecturePresentationSpec;
}

interface NodeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type TextAnnotationKind = "floating" | "inside" | "edge";

interface NodePresentationStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  labelColor?: string;
  highlight?: boolean;
  highlightBadge?: string;
  highlightGlow?: boolean;
  muted?: boolean;
  callout?: string;
}

type PresentedNode = ArchitectureNode & { presentation?: NodePresentationStyle };

interface TextAnnotationOptions {
  kind: TextAnnotationKind;
  fontSize: number;
  anchor?: "start" | "middle" | "end";
  verticalAlign?: "top" | "center";
  className?: string;
  italic?: boolean;
  pill?: boolean;
  color?: string;
}

const COLLAPSED_GROUP_HEIGHT = 72;
const OUTER_GROUP_MARGIN_Y = 42;

export function renderGptArchitectureSvg(params: GptTemplateParams, options: RenderArchitectureSvgOptions = {}): string {
  return renderArchitectureSvg(generateGptArchitecture(params), options);
}

export function renderArchitectureSvg(architecture: ArchitectureSpec, options: RenderArchitectureSvgOptions = {}): string {
  const opts = resolveOptions(architecture, options);
  const architectureForRender = applyArchitecturePresentation(
    adaptArchitectureForProfile(architecture, opts.profile),
    mergePresentation(architecture.presentation, opts.presentation)
  );
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
    width: options.width ?? defaultWidthForArchitecture(architecture, profile),
    padding: options.padding ?? profile.defaultPadding ?? 36,
    profile,
    presentation: options.presentation
  };
}

export function applyArchitecturePresentation(architecture: ArchitectureSpec, presentation?: ArchitecturePresentationSpec): ArchitectureSpec {
  if (!presentation || presentation.overrides.length === 0 && !presentation.muteUnmatched) return architecture;
  return {
    ...architecture,
    nodes: architecture.nodes.map((node) => applyPresentationToNode(node, presentation))
  };
}

function defaultWidthForArchitecture(architecture: ArchitectureSpec, profile: ArchitectureSvgProfile): number {
  if (profile.structureAdapter !== "textbook-overview") return profile.defaultWidth ?? 1100;
  switch (architecture.template?.type) {
    case "transformer":
      return 940;
    case "bert":
    case "encoder-only":
      return 620;
    default:
      return profile.defaultWidth ?? 520;
  }
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

  const presentation = nodePresentation(node);
  const fill = presentation.fill ?? nodeFill(node, profile);
  const stroke = presentation.stroke ?? (profile.showShapeWarnings && hasShapeMismatch(node) ? profile.palette.warning : isGroup ? profile.palette.groupStroke : profile.palette.blockStroke);
  const dash = isGroup ? ` stroke-dasharray="8 6"` : "";
  const strokeWidth = presentation.strokeWidth ?? (isGroup ? profile.groupStrokeWidth : profile.blockStrokeWidth);
  const opacity = presentation.opacity ?? (presentation.muted ? 0.22 : isGroup ? profile.groupFillOpacity : profile.blockFillOpacity);
  const labelFontSize = isGroup ? profile.groupFontSize : profile.labelFontSize;
  const label = renderNodeLabel(node, rect, depth, profile, isGroup, labelFontSize, presentation);

  return [
    `<g id="${escAttr(node.id)}" class="node node-${escAttr(node.kind)}">`,
    renderNodeTitle(node),
    renderNodeHighlight(rect, profile, presentation, isGroup),
    `<rect x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.w)}" height="${round(rect.h)}" rx="${isGroup ? profile.groupRadius : profile.radius}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`,
    label,
    renderNodeMeta(node, rect, opts, isGroup),
    renderOverlayIcon(node, rect, profile),
    renderNodeBadge(rect, profile, presentation),
    renderNodeCallout(rect, profile, presentation),
    `</g>`
  ].join("\n");
}

function renderTextLabelNode(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  const presentation = nodePresentation(node);
  return [
    `<g id="${escAttr(node.id)}" class="node node-text-label">`,
    renderNodeTitle(node),
    renderTextAnnotation(node.label, rect, profile, { kind: "floating", fontSize: profile.textLabelFontSize, anchor: "middle", verticalAlign: "center", className: "node-label", color: presentation.labelColor }),
    renderNodeCallout(rect, profile, presentation),
    `</g>`
  ].join("\n");
}

function renderPositionalIconNode(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  const presentation = nodePresentation(node);
  const r = Math.min(24, rect.h / 2 - 4);
  const cx = rect.x + r + 8;
  const cy = rect.y + rect.h / 2;
  const waveStart = cx - r * 0.62;
  const waveEnd = cx + r * 0.62;
  const labelX = cx + r + 28;
  const labelBox = { x: labelX, y: rect.y, w: Math.max(80, rect.x + rect.w - labelX), h: rect.h };
  return [
    `<g id="${escAttr(node.id)}" class="node node-positional-icon">`,
    renderNodeTitle(node),
    renderNodeHighlight(rect, profile, presentation, false),
    `<circle class="icon-sine-circle" cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${presentation.fill ?? nodeFill(node, profile)}" fill-opacity="0.08" stroke="${presentation.stroke ?? profile.palette.edge}" stroke-width="${presentation.strokeWidth ?? profile.blockStrokeWidth}"/>`,
    `<path class="icon-stroke icon-sine" d="M${round(waveStart)} ${round(cy)} C${round(cx - r * 0.36)} ${round(cy - r * 0.8)} ${round(cx - r * 0.12)} ${round(cy - r * 0.8)} ${round(cx)} ${round(cy)} C${round(cx + r * 0.2)} ${round(cy + r * 0.8)} ${round(cx + r * 0.44)} ${round(cy + r * 0.8)} ${round(waveEnd)} ${round(cy)}" stroke-width="${profile.edgeStrokeWidth}"/>`,
    renderTextAnnotation(node.label, labelBox, profile, { kind: "floating", fontSize: profile.labelFontSize, anchor: "start", verticalAlign: "center", className: "node-label", color: presentation.labelColor }),
    renderNodeBadge(rect, profile, presentation),
    renderNodeCallout(rect, profile, presentation),
    `</g>`
  ].join("\n");
}

function renderCircleAddNode(node: ArchitectureNode, rect: NodeRect, profile: ArchitectureSvgProfile): string {
  const presentation = nodePresentation(node);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.min(rect.w, rect.h) / 2 - 2;
  return [
    `<g id="${escAttr(node.id)}" class="node node-residual-add node-plus-circle">`,
    renderNodeTitle(node),
    renderNodeHighlight(rect, profile, presentation, false),
    `<circle class="icon-plus-circle" cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${presentation.fill ?? nodeFill(node, profile)}" stroke="${presentation.stroke ?? profile.palette.edge}" stroke-width="${presentation.strokeWidth ?? profile.blockStrokeWidth}"/>`,
    `<path class="icon-stroke icon-plus" d="M${round(cx - r * 0.58)} ${round(cy)} H${round(cx + r * 0.58)} M${round(cx)} ${round(cy - r * 0.58)} V${round(cy + r * 0.58)}" stroke-width="${profile.edgeStrokeWidth}"/>`,
    renderNodeBadge(rect, profile, presentation),
    renderNodeCallout(rect, profile, presentation),
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

  if (edge.route === "right-loop") return renderRightLoopEdge(edge, source, target, x, y, scale, profile);
  if (edge.route === "attention-fan-in") return renderAttentionFanInEdge(edge, source, target, x, y, scale, profile);
  if (edge.route === "rounded-orthogonal") return renderRoundedOrthogonalEdge(edge, source, target, x, y, scale, profile);
  if (edge.kind === "residual" && profile.residualRouting === "right-loop") return renderRightLoopEdge(edge, source, target, x, y, scale, profile);
  if (profile.qkvFanIn && isQkvFanEdge(source, target)) return renderFanEdge(edge, source, target, x, y, scale, profile);
  return renderDefaultEdge(edge, source, target, x, y, scale, profile);
}

function renderRoundedOrthogonalEdge(
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
  const sourceCenter = centerOfRect(sourceRect);
  const targetCenter = centerOfRect(targetRect);
  const vertical = Math.abs(targetCenter.y - sourceCenter.y) >= Math.abs(targetCenter.x - sourceCenter.x);
  const start = vertical
    ? targetCenter.y >= sourceCenter.y ? bottomCenter(sourceRect) : topCenter(sourceRect)
    : targetCenter.x >= sourceCenter.x ? sideCenter(sourceRect, "right") : sideCenter(sourceRect, "left");
  const end = vertical
    ? targetCenter.y >= sourceCenter.y ? topCenter(targetRect) : bottomCenter(targetRect)
    : targetCenter.x >= sourceCenter.x ? sideCenter(targetRect, "left") : sideCenter(targetRect, "right");
  const points = vertical
    ? [{ x: start.x, y: start.y }, { x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }, { x: end.x, y: end.y }]
    : [{ x: start.x, y: start.y }, { x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }, { x: end.x, y: end.y }];
  return renderEdgePath(edge, roundedPolylinePath(points, profile.edgeCornerRadius), profile, edge.kind === "dependency" ? ` stroke-dasharray="4 4"` : "", "edge-rounded-orthogonal", midpoint(points[1], points[2]));
}

function renderAttentionFanInEdge(
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
  const start = bottomCenter(sourceRect);
  const top = topCenter(targetRect);
  const join = { x: top.x, y: top.y - Math.min(28, Math.max(18, targetRect.h * 0.38)) };
  const left = { x: targetRect.x + targetRect.w * 0.22, y: top.y };
  const right = { x: targetRect.x + targetRect.w * 0.78, y: top.y };
  const color = profile.palette.data;
  const strokeWidth = profile.edgeStrokeWidth;
  const attrs = `stroke="${color}" stroke-width="${strokeWidth}" opacity="0.86" marker-end="url(#arrow-${edge.kind})"`;
  const stem = roundedPolylinePath([start, { x: start.x, y: join.y }, join, top], profile.edgeCornerRadius);
  const leftPath = `M${round(join.x)} ${round(join.y)} C${round(join.x - 18)} ${round(join.y)} ${round(left.x)} ${round(left.y - 18)} ${round(left.x)} ${round(left.y)}`;
  const rightPath = `M${round(join.x)} ${round(join.y)} C${round(join.x + 18)} ${round(join.y)} ${round(right.x)} ${round(right.y - 18)} ${round(right.x)} ${round(right.y)}`;
  return [
    `<g class="edge edge-${edge.kind} edge-attention-fan-in">`,
    `<path d="${stem}" fill="none" ${attrs}/>`,
    `<path d="${leftPath}" fill="none" ${attrs}/>`,
    `<path d="${rightPath}" fill="none" ${attrs}/>`,
    `</g>`
  ].join("");
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
  return renderEdgePath(edge, path, profile, edge.kind === "dependency" ? ` stroke-dasharray="4 4"` : "", "", midpoint(start, end));
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
  const path = edge.route === "right-loop"
    ? roundedPolylinePath([start, { x: loopX, y: start.y }, { x: loopX, y: end.y }, end], profile.edgeCornerRadius)
    : `M${round(start.x)} ${round(start.y)} H${round(loopX)} C${round(loopX + 10)} ${round(start.y)} ${round(loopX + 10)} ${round(end.y)} ${round(loopX)} ${round(end.y)} H${round(end.x)}`;
  return renderEdgePath(edge, path, profile, "", "edge-residual-loop", { x: loopX, y: (start.y + end.y) / 2 });
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
  return renderEdgePath(edge, path, profile, edge.kind === "dependency" ? ` stroke-dasharray="4 4"` : "", "edge-fan-in", { x: ctrlX, y: (start.y + end.y) / 2 });
}

function renderEdgePath(edge: ArchitectureEdge, path: string, profile: ArchitectureSvgProfile, extraAttrs = "", extraClass = "", labelPoint?: { x: number; y: number }): string {
  const color = edge.kind === "residual" ? profile.palette.residual : edge.kind === "dependency" ? profile.palette.dependency : profile.palette.data;
  const strokeWidth = edge.kind === "residual" ? profile.residualStrokeWidth : profile.edgeStrokeWidth;
  const className = ["edge", `edge-${edge.kind}`, extraClass].filter(Boolean).join(" ");
  const pathMarkup = `<path class="${className}" d="${path}" stroke="${color}" stroke-width="${strokeWidth}" opacity="0.82" marker-end="url(#arrow-${edge.kind})"${extraAttrs}/>`;
  const label = renderEdgeLabel(edge, labelPoint, profile);
  return label ? `<g class="edge-with-label">${pathMarkup}${label}</g>` : pathMarkup;
}

function adaptArchitectureForProfile(architecture: ArchitectureSpec, profile: ArchitectureSvgProfile): ArchitectureSpec {
  if (profile.structureAdapter === "textbook-overview") return inheritNodeColorsFromArchitecture(createTextbookOverviewSpec(architecture), architecture);
  return architecture;
}

function mergePresentation(base?: ArchitecturePresentationSpec, override?: ArchitecturePresentationSpec): ArchitecturePresentationSpec | undefined {
  if (!base && !override) return undefined;
  return {
    muteUnmatched: override?.muteUnmatched ?? base?.muteUnmatched,
    overrides: [...(base?.overrides ?? []), ...(override?.overrides ?? [])]
  };
}

function applyPresentationToNode(node: ArchitectureNode, presentation: ArchitecturePresentationSpec): ArchitectureNode {
  const selfStyle = resolvePresentationForNode(node, presentation);
  const nextNode: PresentedNode = {
    ...node,
    label: selfStyle.label ?? node.label,
    color: selfStyle.fill ?? node.color,
    presentation: {
      fill: selfStyle.fill,
      stroke: selfStyle.stroke,
      strokeWidth: selfStyle.strokeWidth,
      opacity: selfStyle.opacity,
      labelColor: selfStyle.labelColor,
      highlight: selfStyle.highlight,
      highlightBadge: selfStyle.highlightBadge,
      highlightGlow: selfStyle.highlightGlow,
      muted: selfStyle.muted,
      callout: selfStyle.callout
    },
    children: node.children?.map((child) => applyPresentationToNode(child, presentation))
  };
  return nextNode;
}

function resolvePresentationForNode(node: ArchitectureNode, presentation: ArchitecturePresentationSpec): NodePresentationStyle & { label?: string } {
  const matched = presentation.overrides.filter((override) => presentationOverrideMatches(node, override));
  const style: NodePresentationStyle & { label?: string } = {};
  for (const override of matched) {
    if (override.fill !== undefined) style.fill = override.fill;
    if (override.stroke !== undefined) style.stroke = override.stroke;
    if (override.strokeWidth !== undefined) style.strokeWidth = override.strokeWidth;
    if (override.opacity !== undefined) style.opacity = override.opacity;
    if (override.label !== undefined) style.label = override.label;
    if (override.labelColor !== undefined) style.labelColor = override.labelColor;
    if (override.callout !== undefined) style.callout = override.callout;
    if (override.muted !== undefined) style.muted = override.muted;
    if (override.highlight !== undefined) {
      style.highlight = Boolean(override.highlight);
      if (typeof override.highlight === "object") {
        style.highlightBadge = override.highlight.badge;
        style.highlightGlow = override.highlight.glow;
      }
    }
  }
  if (presentation.muteUnmatched && matched.length === 0 && !isTextLabelNode(node) && node.kind !== "residual_add") {
    style.muted = true;
  }
  return style;
}

function presentationOverrideMatches(node: ArchitectureNode, override: ArchitecturePresentationOverride): boolean {
  const selector = override.selector;
  return Boolean(
    selector.ids?.includes(node.id) ||
    selector.roles?.includes(node.derived?.role ?? "") ||
    selector.kinds?.includes(node.kind)
  );
}

function inheritNodeColorsFromArchitecture(textbook: ArchitectureSpec, original: ArchitectureSpec): ArchitectureSpec {
  const roleColors = new Map<string, string>();
  const kindColors = new Map<string, string>();
  for (const node of flattenArchitectureNodes(original.nodes)) {
    const defaultColor = COMPONENT_TEMPLATES[node.kind]?.color;
    if (!node.color || node.color === defaultColor) continue;
    if (node.derived?.role) roleColors.set(node.derived.role, node.color);
    kindColors.set(node.kind, node.color);
  }
  if (roleColors.size === 0 && kindColors.size === 0) return textbook;
  return {
    ...textbook,
    nodes: textbook.nodes.map((node) => inheritNodeColor(node, roleColors, kindColors))
  };
}

function inheritNodeColor(node: ArchitectureNode, roleColors: Map<string, string>, kindColors: Map<string, string>): ArchitectureNode {
  const color = roleColors.get(node.derived?.role ?? "") ?? kindColors.get(node.kind) ?? node.color;
  return {
    ...node,
    color,
    children: node.children?.map((child) => inheritNodeColor(child, roleColors, kindColors))
  };
}

function flattenArchitectureNodes(nodes: ArchitectureNode[]): ArchitectureNode[] {
  return nodes.flatMap((node) => [node, ...flattenArchitectureNodes(node.children ?? [])]);
}

function createTextbookOverviewSpec(architecture: ArchitectureSpec): ArchitectureSpec {
  switch (architecture.template?.type) {
    case "transformer":
      return createTransformerTextbookOverviewSpec(architecture);
    case "bert":
      return createBertTextbookOverviewSpec(architecture);
    case "encoder-only":
      return createEncoderOnlyTextbookOverviewSpec(architecture);
    default:
      return createDecoderTextbookOverviewSpec(architecture);
  }
}

function createDecoderTextbookOverviewSpec(architecture: ArchitectureSpec): ArchitectureSpec {
  const params = architecture.template?.params;
  const nBlocks = "nBlocks" in (params ?? {}) ? (params as { nBlocks: number }).nBlocks : architecture.nodes.filter((node) => node.derived?.role === "transformer_block").length || 1;
  const source = architecture.template?.type === "decoder-only" ? "decoder-only-template" : "gpt-template";
  const now = architecture.updatedAt;
  const nodes: ArchitectureNode[] = [
    diagramNode("text_inputs", "generic_tensor", "Inputs", 180, 48, 150, 42, "#ffffff", "text_label", source),
    diagramNode("input_embedding", "token_embed", "Input\nEmbedding", 105, 128, 300, 96, "#f6dada", "input_embedding", source),
    diagramNode("embed_add", "residual_add", "+", 238, 280, 34, 34, "#ffffff", "embedding_add", source),
    diagramNode("positional_encoding", "pos_embed", "Positional\nEncoding", 300, 262, 205, 70, "#ffffff", "positional_encoding", source),
    diagramNode("transformer_group", "group", nBlocks > 1 ? `Transformer ×${nBlocks}` : "Transformer", 80, 355, 350, 390, "#f8f8f8", "textbook_expanded_group", source, undefined, [
      diagramNode("mha", "attention", "Multi-Head\nAttention", 145, 440, 220, 74, "#ffe3b5", "multi_head_attention", source),
      diagramNode("add_norm_1", "layer_norm", "Add & Norm", 146, 525, 218, 40, "#f5f5c0", "add_norm_1", source),
      diagramNode("feed_forward", "mlp", "Feed\nForward", 146, 615, 218, 66, "#bfecf5", "feed_forward", source),
      diagramNode("add_norm_2", "layer_norm", "Add & Norm", 146, 695, 218, 40, "#f5f5c0", "add_norm_2", source)
    ]),
    diagramNode("linear", "linear", "Linear", 155, 790, 200, 38, "#e0e3f2", "linear", source),
    diagramNode("softmax", "softmax", "Softmax", 155, 860, 200, 38, "#d8f0dc", "softmax", source),
    diagramNode("text_output", "generic_tensor", "Output\nProbabilities", 145, 935, 220, 76, "#ffffff", "text_label", source)
  ];
  const edges: ArchitectureEdge[] = [
    diagramEdge("text_inputs", "input_embedding", "data", undefined, "rounded-orthogonal"),
    diagramEdge("input_embedding", "embed_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("positional_encoding", "embed_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("embed_add", "mha", "data", undefined, "attention-fan-in"),
    diagramEdge("embed_add", "add_norm_1", "residual", "residual", "right-loop"),
    diagramEdge("mha", "add_norm_1", "data", undefined, "rounded-orthogonal"),
    diagramEdge("add_norm_1", "feed_forward", "data", undefined, "rounded-orthogonal"),
    diagramEdge("add_norm_1", "add_norm_2", "residual", "residual", "right-loop"),
    diagramEdge("feed_forward", "add_norm_2", "data", undefined, "rounded-orthogonal"),
    diagramEdge("add_norm_2", "linear", "data", undefined, "rounded-orthogonal"),
    diagramEdge("linear", "softmax", "data", undefined, "rounded-orthogonal"),
    diagramEdge("softmax", "text_output", "data", undefined, "rounded-orthogonal")
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
    view: { canvas: { w: 520, h: 1035 }, scale3d: architecture.view.scale3d },
    createdAt: architecture.createdAt,
    updatedAt: now
  };
}

function createTransformerTextbookOverviewSpec(architecture: ArchitectureSpec): ArchitectureSpec {
  const params = architecture.template?.type === "transformer" ? architecture.template.params : undefined;
  const encBlocks = params?.nEncoderBlocks ?? 1;
  const decBlocks = params?.nDecoderBlocks ?? 1;
  const source: ArchitectureDerivedSource = "transformer-template";
  const nodes: ArchitectureNode[] = [
    diagramNode("enc_inputs", "generic_tensor", "Inputs", 118, 764, 150, 44, "#ffffff", "text_label", source),
    diagramNode("enc_embedding", "token_embed", "Input\nEmbedding", 98, 686, 190, 58, "#f6dada", "input_embedding", source),
    diagramNode("enc_add", "residual_add", "+", 176, 638, 34, 34, "#ffffff", "embedding_add", source),
    diagramNode("enc_positional", "pos_embed", "Positional\nEncoding", 18, 620, 180, 70, "#ffffff", "positional_encoding", source),
    diagramNode("enc_nx", "generic_tensor", "N×", 30, 470, 50, 42, "#ffffff", "text_label", source),
    diagramNode("encoder_group", "group", "Encoder", 78, 340, 270, 285, "#f8f8f8", "textbook_expanded_group", source, undefined, [
      diagramNode("enc_add_norm_2", "layer_norm", "Add & Norm", 120, 372, 188, 34, "#f5f5c0", "add_norm_2", source),
      diagramNode("enc_feed_forward", "mlp", "Feed\nForward", 120, 422, 188, 62, "#bfecf5", "feed_forward", source),
      diagramNode("enc_add_norm_1", "layer_norm", "Add & Norm", 120, 502, 188, 34, "#f5f5c0", "add_norm_1", source),
      diagramNode("enc_mha", "attention", "Multi-Head\nAttention", 120, 548, 188, 66, "#ffe3b5", "multi_head_attention", source)
    ]),
    diagramNode("dec_outputs", "generic_tensor", "Outputs\n(shifted right)", 540, 748, 210, 70, "#ffffff", "text_label", source),
    diagramNode("dec_embedding", "token_embed", "Output\nEmbedding", 532, 686, 190, 58, "#f6dada", "output_embedding", source),
    diagramNode("dec_add", "residual_add", "+", 610, 638, 34, 34, "#ffffff", "embedding_add", source),
    diagramNode("dec_positional", "pos_embed", "Positional\nEncoding", 664, 620, 190, 70, "#ffffff", "positional_encoding", source),
    diagramNode("dec_nx", "generic_tensor", "N×", 778, 430, 50, 42, "#ffffff", "text_label", source),
    diagramNode("decoder_group", "group", "Decoder", 500, 220, 285, 405, "#f8f8f8", "textbook_expanded_group", source, undefined, [
      diagramNode("dec_add_norm_3", "layer_norm", "Add & Norm", 545, 252, 198, 34, "#f5f5c0", "add_norm_3", source),
      diagramNode("dec_feed_forward", "mlp", "Feed\nForward", 545, 302, 198, 62, "#bfecf5", "feed_forward", source),
      diagramNode("dec_add_norm_2", "layer_norm", "Add & Norm", 545, 382, 198, 34, "#f5f5c0", "add_norm_2", source),
      diagramNode("dec_cross_attn", "attention", "Encoder-Decoder\nAttention", 545, 428, 198, 62, "#ffe3b5", "cross_attention", source),
      diagramNode("dec_add_norm_1", "layer_norm", "Add & Norm", 545, 508, 198, 34, "#f5f5c0", "add_norm_1", source),
      diagramNode("dec_masked_mha", "attention", "Masked\nMulti-Head\nAttention", 545, 552, 198, 66, "#ffe3b5", "masked_attention", source)
    ]),
    diagramNode("transformer_linear", "linear", "Linear", 548, 150, 195, 38, "#e0e3f2", "linear", source),
    diagramNode("transformer_softmax", "softmax", "Softmax", 548, 98, 195, 38, "#d8f0dc", "softmax", source),
    diagramNode("transformer_output", "generic_tensor", "Output\nProbabilities", 538, 26, 215, 62, "#ffffff", "text_label", source)
  ];
  const edges: ArchitectureEdge[] = [
    diagramEdge("enc_inputs", "enc_embedding", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_embedding", "enc_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_positional", "enc_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_add", "enc_mha", "data", undefined, "attention-fan-in"),
    diagramEdge("enc_add", "enc_add_norm_1", "residual", "residual", "right-loop"),
    diagramEdge("enc_mha", "enc_add_norm_1", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_add_norm_1", "enc_feed_forward", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_add_norm_1", "enc_add_norm_2", "residual", "residual", "right-loop"),
    diagramEdge("enc_feed_forward", "enc_add_norm_2", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_outputs", "dec_embedding", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_embedding", "dec_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_positional", "dec_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_add", "dec_masked_mha", "data", undefined, "attention-fan-in"),
    diagramEdge("dec_add", "dec_add_norm_1", "residual", "residual", "right-loop"),
    diagramEdge("dec_masked_mha", "dec_add_norm_1", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_add_norm_1", "dec_cross_attn", "data", undefined, "attention-fan-in"),
    diagramEdge("enc_add_norm_2", "dec_cross_attn", "dependency", "encoder memory", "rounded-orthogonal"),
    diagramEdge("dec_add_norm_1", "dec_add_norm_2", "residual", "residual", "right-loop"),
    diagramEdge("dec_cross_attn", "dec_add_norm_2", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_add_norm_2", "dec_feed_forward", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_add_norm_2", "dec_add_norm_3", "residual", "residual", "right-loop"),
    diagramEdge("dec_feed_forward", "dec_add_norm_3", "data", undefined, "rounded-orthogonal"),
    diagramEdge("dec_add_norm_3", "transformer_linear", "data", undefined, "rounded-orthogonal"),
    diagramEdge("transformer_linear", "transformer_softmax", "data", undefined, "rounded-orthogonal"),
    diagramEdge("transformer_softmax", "transformer_output", "data", undefined, "rounded-orthogonal")
  ];
  return textbookSpec(architecture, nodes, edges, { w: 870, h: 830 }, `Original Transformer: encoder ×${encBlocks}, decoder ×${decBlocks}`);
}

function createBertTextbookOverviewSpec(architecture: ArchitectureSpec): ArchitectureSpec {
  const params = architecture.template?.type === "bert" ? architecture.template.params : undefined;
  const nBlocks = params?.nBlocks ?? 1;
  const source: ArchitectureDerivedSource = "bert-template";
  const nodes: ArchitectureNode[] = [
    diagramNode("bert_inputs", "generic_tensor", "Inputs", 195, 782, 150, 44, "#ffffff", "text_label", source),
    diagramNode("bert_token_embedding", "token_embed", "Token\nEmbedding", 140, 704, 250, 58, "#f6dada", "token_embedding", source),
    diagramNode("bert_add", "residual_add", "+", 248, 650, 34, 34, "#ffffff", "embedding_add", source),
    diagramNode("bert_segment_embedding", "generic_tensor", "Segment\nEmbedding", 34, 615, 160, 54, "#e0e3f2", "segment_embedding", source),
    diagramNode("bert_position_embedding", "pos_embed", "Position\nEmbedding", 310, 610, 205, 70, "#ffffff", "positional_encoding", source),
    diagramNode("bert_nx", "generic_tensor", "N×", 58, 455, 50, 42, "#ffffff", "text_label", source),
    diagramNode("bert_encoder_group", "group", `BERT Encoder`, 110, 330, 320, 285, "#f8f8f8", "textbook_expanded_group", source, undefined, [
      diagramNode("bert_add_norm_2", "layer_norm", "Add & Norm", 160, 362, 220, 34, "#f5f5c0", "add_norm_2", source),
      diagramNode("bert_feed_forward", "mlp", "Feed\nForward", 160, 412, 220, 62, "#bfecf5", "feed_forward", source),
      diagramNode("bert_add_norm_1", "layer_norm", "Add & Norm", 160, 492, 220, 34, "#f5f5c0", "add_norm_1", source),
      diagramNode("bert_mha", "attention", "Multi-Head\nAttention", 160, 538, 220, 66, "#ffe3b5", "multi_head_attention", source)
    ]),
    diagramNode("bert_layer_count", "generic_tensor", `Encoder Layer ×${nBlocks}`, 145, 282, 250, 40, "#ffffff", "text_label", source),
    diagramNode("bert_contextual", "generic_tensor", "Contextual\nToken Outputs", 140, 218, 250, 54, "#e8eefc", "contextual_outputs", source),
    diagramNode("bert_cls", "generic_tensor", "[CLS]", 80, 134, 130, 42, "#d8f0dc", "cls_token", source),
    diagramNode("bert_classifier", "linear", "Classifier\nHead", 50, 60, 190, 54, "#e0e3f2", "classifier_head", source),
    diagramNode("bert_mlm_head", "linear", "MLM\nHead", 310, 60, 170, 54, "#e0e3f2", "mlm_head", source)
  ];
  const edges: ArchitectureEdge[] = [
    diagramEdge("bert_inputs", "bert_token_embedding", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_token_embedding", "bert_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_segment_embedding", "bert_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_position_embedding", "bert_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_add", "bert_mha", "data", undefined, "attention-fan-in"),
    diagramEdge("bert_add", "bert_add_norm_1", "residual", "residual", "right-loop"),
    diagramEdge("bert_mha", "bert_add_norm_1", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_add_norm_1", "bert_feed_forward", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_add_norm_1", "bert_add_norm_2", "residual", "residual", "right-loop"),
    diagramEdge("bert_feed_forward", "bert_add_norm_2", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_add_norm_2", "bert_contextual", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_contextual", "bert_cls", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_cls", "bert_classifier", "data", undefined, "rounded-orthogonal"),
    diagramEdge("bert_contextual", "bert_mlm_head", "data", undefined, "rounded-orthogonal")
  ];
  return textbookSpec(architecture, nodes, edges, { w: 540, h: 840 }, `BERT encoder ×${nBlocks}`);
}

function createEncoderOnlyTextbookOverviewSpec(architecture: ArchitectureSpec): ArchitectureSpec {
  const params = architecture.template?.type === "encoder-only" ? architecture.template.params : undefined;
  const nBlocks = params?.nBlocks ?? 1;
  const source: ArchitectureDerivedSource = "encoder-only-template";
  const nodes: ArchitectureNode[] = [
    diagramNode("enc_only_inputs", "generic_tensor", "Inputs", 185, 760, 150, 44, "#ffffff", "text_label", source),
    diagramNode("enc_only_embedding", "token_embed", "Input\nEmbedding", 112, 682, 280, 62, "#f6dada", "input_embedding", source),
    diagramNode("enc_only_add", "residual_add", "+", 235, 632, 34, 34, "#ffffff", "embedding_add", source),
    diagramNode("enc_only_positional", "pos_embed", "Positional\nEncoding", 300, 614, 205, 70, "#ffffff", "positional_encoding", source),
    diagramNode("enc_only_group", "group", `Encoder ×${nBlocks}`, 90, 330, 330, 280, "#f8f8f8", "textbook_expanded_group", source, undefined, [
      diagramNode("enc_only_add_norm_2", "layer_norm", "Add & Norm", 145, 362, 220, 34, "#f5f5c0", "add_norm_2", source),
      diagramNode("enc_only_ffn", "mlp", "Feed\nForward", 145, 412, 220, 62, "#bfecf5", "feed_forward", source),
      diagramNode("enc_only_add_norm_1", "layer_norm", "Add & Norm", 145, 492, 220, 34, "#f5f5c0", "add_norm_1", source),
      diagramNode("enc_only_mha", "attention", "Multi-Head\nAttention", 145, 538, 220, 66, "#ffe3b5", "multi_head_attention", source)
    ]),
    diagramNode("enc_only_output", "generic_tensor", "Contextual\nOutputs", 142, 220, 230, 58, "#ffffff", "text_label", source)
  ];
  const edges: ArchitectureEdge[] = [
    diagramEdge("enc_only_inputs", "enc_only_embedding", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_only_embedding", "enc_only_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_only_positional", "enc_only_add", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_only_add", "enc_only_mha", "data", undefined, "attention-fan-in"),
    diagramEdge("enc_only_add", "enc_only_add_norm_1", "residual", "residual", "right-loop"),
    diagramEdge("enc_only_mha", "enc_only_add_norm_1", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_only_add_norm_1", "enc_only_ffn", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_only_add_norm_1", "enc_only_add_norm_2", "residual", "residual", "right-loop"),
    diagramEdge("enc_only_ffn", "enc_only_add_norm_2", "data", undefined, "rounded-orthogonal"),
    diagramEdge("enc_only_add_norm_2", "enc_only_output", "data", undefined, "rounded-orthogonal")
  ];
  return textbookSpec(architecture, nodes, edges, { w: 520, h: 820 }, `Encoder-only Transformer ×${nBlocks}`);
}

function textbookSpec(architecture: ArchitectureSpec, nodes: ArchitectureNode[], edges: ArchitectureEdge[], canvas: ArchitectureSpec["view"]["canvas"], notes: string): ArchitectureSpec {
  return {
    schemaVersion: 1,
    mode: architecture.mode,
    template: architecture.template,
    id: `${architecture.id}-textbook-overview`,
    name: architecture.name,
    notes: notes || architecture.notes,
    nodes,
    edges,
    view: { canvas, scale3d: architecture.view.scale3d },
    createdAt: architecture.createdAt,
    updatedAt: architecture.updatedAt
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
  source: ArchitectureDerivedSource = "gpt-template",
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
      source,
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

function diagramEdge(source: string, target: string, kind: ArchitectureEdge["kind"], label?: string, route?: ArchitectureEdge["route"]): ArchitectureEdge {
  return { id: `edge-${source}-${target}-${kind}`, source, target, kind, label, route };
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
  const isExpanded = hasChildren && (expanded.has(node.id) || node.id === "transformer_group" || node.derived?.role === "textbook_expanded_group");
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

function centerOfRect(rect: NodeRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function bottomCenter(rect: NodeRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
}

function sideCenter(rect: NodeRect, side: "left" | "right"): { x: number; y: number } {
  return { x: side === "left" ? rect.x : rect.x + rect.w, y: rect.y + rect.h / 2 };
}

function roundedPolylinePath(points: Array<{ x: number; y: number }>, radius: number): string {
  const clean = points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
  if (clean.length === 0) return "";
  if (clean.length === 1) return `M${round(clean[0].x)} ${round(clean[0].y)}`;
  const parts = [`M${round(clean[0].x)} ${round(clean[0].y)}`];
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1];
    const point = clean[i];
    const next = clean[i + 1];
    const inVec = normalize({ x: point.x - prev.x, y: point.y - prev.y });
    const outVec = normalize({ x: next.x - point.x, y: next.y - point.y });
    const inLen = distance(prev, point);
    const outLen = distance(point, next);
    const corner = Math.min(radius, inLen / 2, outLen / 2);
    const before = { x: point.x - inVec.x * corner, y: point.y - inVec.y * corner };
    const after = { x: point.x + outVec.x * corner, y: point.y + outVec.y * corner };
    if (corner <= 0 || (inVec.x === outVec.x && inVec.y === outVec.y)) {
      parts.push(`L${round(point.x)} ${round(point.y)}`);
    } else {
      parts.push(`L${round(before.x)} ${round(before.y)}`, `Q${round(point.x)} ${round(point.y)} ${round(after.x)} ${round(after.y)}`);
    }
  }
  const last = clean[clean.length - 1];
  parts.push(`L${round(last.x)} ${round(last.y)}`);
  return parts.join(" ");
}

function normalize(vector: { x: number; y: number }): { x: number; y: number } {
  const len = Math.hypot(vector.x, vector.y);
  return len === 0 ? { x: 0, y: 0 } : { x: vector.x / len, y: vector.y / len };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

function renderNodeLabel(node: ArchitectureNode, rect: NodeRect, depth: number, profile: ArchitectureSvgProfile, isGroup: boolean, fontSize: number, presentation: NodePresentationStyle): string {
  if (!node.label) return "";
  if (isGroup) {
    if (node.derived?.role === "textbook_expanded_group") return "";
    return renderTextAnnotation(node.label, { x: rect.x + 12 + depth * 4, y: rect.y + 8, w: Math.max(1, rect.w - 24), h: fontSize * textLineHeight(profile) + 4 }, profile, {
      kind: "inside",
      fontSize,
      anchor: "start",
      verticalAlign: "top",
      className: "node-label",
      color: presentation.labelColor
    });
  }
  const padding = textInsidePadding(profile);
  return renderTextAnnotation(node.label, insetRect(rect, padding, padding), profile, {
    kind: "inside",
    fontSize,
    anchor: "middle",
    verticalAlign: "center",
    className: "node-label",
    color: presentation.labelColor
  });
}

function nodePresentation(node: ArchitectureNode): NodePresentationStyle {
  return (node as PresentedNode).presentation ?? {};
}

function renderNodeHighlight(rect: NodeRect, profile: ArchitectureSvgProfile, presentation: NodePresentationStyle, isGroup: boolean): string {
  if (!presentation.highlight) return "";
  const pad = isGroup ? 5 : 6;
  const rx = isGroup ? profile.groupRadius + 2 : profile.radius + 4;
  const stroke = presentation.stroke ?? "#ff6b00";
  const strokeWidth = Math.max(3, presentation.strokeWidth ?? (isGroup ? profile.groupStrokeWidth : profile.blockStrokeWidth) + 1.5);
  const glow = presentation.highlightGlow === false ? "" : `<rect class="node-highlight-glow" x="${round(rect.x - pad)}" y="${round(rect.y - pad)}" width="${round(rect.w + pad * 2)}" height="${round(rect.h + pad * 2)}" rx="${rx}" fill="${stroke}" fill-opacity="0.12" stroke="none"/>`;
  const outline = `<rect class="node-highlight-outline" x="${round(rect.x - pad)}" y="${round(rect.y - pad)}" width="${round(rect.w + pad * 2)}" height="${round(rect.h + pad * 2)}" rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-opacity="0.95"/>`;
  return `${glow}${outline}`;
}

function renderNodeBadge(rect: NodeRect, profile: ArchitectureSvgProfile, presentation: NodePresentationStyle): string {
  if (!presentation.highlightBadge) return "";
  const r = 12;
  const cx = rect.x + rect.w - r + 4;
  const cy = rect.y + r - 4;
  return [
    `<g class="node-highlight-badge">`,
    `<circle cx="${round(cx)}" cy="${round(cy)}" r="${r}" fill="${presentation.stroke ?? "#ff6b00"}" stroke="${profile.palette.background}" stroke-width="2"/>`,
    `<text x="${round(cx)}" y="${round(cy)}" font-size="11" text-anchor="middle" dominant-baseline="middle" fill="${profile.palette.background}" font-weight="700">${esc(presentation.highlightBadge)}</text>`,
    `</g>`
  ].join("");
}

function renderNodeCallout(rect: NodeRect, profile: ArchitectureSvgProfile, presentation: NodePresentationStyle): string {
  if (!presentation.callout) return "";
  const fontSize = Math.max(10, Math.min(14, profile.edgeLabelFontSize ?? 12));
  const width = Math.min(210, Math.max(92, estimateTextWidth(presentation.callout, fontSize) + 22));
  const height = Math.max(26, fontSize * textLineHeight(profile) + 10);
  const box = { x: rect.x + rect.w + 14, y: rect.y + rect.h / 2 - height / 2, w: width, h: height };
  const connector = `<path class="node-callout-line" d="M${round(rect.x + rect.w)} ${round(rect.y + rect.h / 2)} H${round(box.x)}" stroke="${presentation.stroke ?? profile.palette.edge}" stroke-width="1.2" fill="none" stroke-dasharray="4 4"/>`;
  const label = renderTextAnnotation(presentation.callout, box, profile, {
    kind: "floating",
    fontSize,
    anchor: "middle",
    verticalAlign: "center",
    className: "node-meta",
    pill: true
  });
  return `<g class="node-callout">${connector}${label}</g>`;
}

function renderEdgeLabel(edge: ArchitectureEdge, point: { x: number; y: number } | undefined, profile: ArchitectureSvgProfile): string {
  if (!edge.label || edge.label === "residual" || !point) return "";
  const fontSize = edgeLabelFontSize(profile);
  const width = estimateTextWidth(edge.label, fontSize) + edgeLabelPaddingX(profile) * 2;
  const height = fontSize * textLineHeight(profile) + edgeLabelPaddingY(profile) * 2;
  return renderTextAnnotation(edge.label, { x: point.x - width / 2, y: point.y - height / 2, w: width, h: height }, profile, {
    kind: "edge",
    fontSize,
    anchor: "middle",
    verticalAlign: "center",
    className: "edge-label",
    italic: profile.edgeLabelItalic,
    pill: true
  });
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

function renderTextAnnotation(label: string, box: NodeRect, profile: ArchitectureSvgProfile, options: TextAnnotationOptions): string {
  const className = options.className ?? "node-label";
  const anchor = options.anchor ?? "middle";
  const verticalAlign = options.verticalAlign ?? "center";
  const layout = layoutText(label, box, profile, options.fontSize);
  const lineHeight = layout.fontSize * textLineHeight(profile);
  const textX = anchor === "start" ? box.x : anchor === "end" ? box.x + box.w : box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const firstY = verticalAlign === "top"
    ? box.y + lineHeight / 2
    : centerY - ((layout.lines.length - 1) * lineHeight) / 2;
  const background = options.pill && profile.edgeLabelBackground
    ? `<rect class="edge-label-bg" x="${round(box.x)}" y="${round(box.y)}" width="${round(box.w)}" height="${round(box.h)}" rx="${edgeLabelRadius(profile)}" fill="${profile.edgeLabelBackground}" fill-opacity="0.9" stroke="none"/>`
    : "";
  const text = layout.lines.map((line, index) => {
    const y = firstY + index * lineHeight;
    const attrs = [
      `x="${round(textX)}"`,
      `y="${round(y)}"`,
      `font-size="${layout.fontSize}"`,
      `text-anchor="${anchor}"`,
      `dominant-baseline="middle"`,
      `class="${className}"`,
      options.color ? `fill="${options.color}"` : "",
      options.italic ? `font-style="italic"` : ""
    ].filter(Boolean).join(" ");
    return `<text ${attrs}>${esc(line)}</text>`;
  }).join("\n");
  return `<g class="text-annotation text-${options.kind}">${background}${text}</g>`;
}

function layoutText(label: string, box: NodeRect, profile: ArchitectureSvgProfile, requestedFontSize: number): { lines: string[]; fontSize: number } {
  const lines = label.split("\n").map((line) => line.trim());
  let fontSize = requestedFontSize;
  while (fontSize > textMinFontSize(profile) && !textFits(lines, box, profile, fontSize)) {
    fontSize -= 1;
  }
  return { lines, fontSize };
}

function textFits(lines: string[], box: NodeRect, profile: ArchitectureSvgProfile, fontSize: number): boolean {
  const maxLineWidth = lines.reduce((max, line) => Math.max(max, estimateTextWidth(line, fontSize)), 0);
  const totalHeight = lines.length * fontSize * textLineHeight(profile);
  return maxLineWidth <= box.w && totalHeight <= box.h;
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

function insetRect(rect: NodeRect, padX: number, padY: number): NodeRect {
  return {
    x: rect.x + padX,
    y: rect.y + padY,
    w: Math.max(1, rect.w - padX * 2),
    h: Math.max(1, rect.h - padY * 2)
  };
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function textInsidePadding(profile: ArchitectureSvgProfile): number {
  return profile.textInsidePadding ?? 10;
}

function textLineHeight(profile: ArchitectureSvgProfile): number {
  return profile.textLineHeight ?? 1.18;
}

function textMinFontSize(profile: ArchitectureSvgProfile): number {
  return profile.textMinFontSize ?? 9;
}

function edgeLabelFontSize(profile: ArchitectureSvgProfile): number {
  return profile.edgeLabelFontSize ?? 11;
}

function edgeLabelPaddingX(profile: ArchitectureSvgProfile): number {
  return profile.edgeLabelPaddingX ?? 7;
}

function edgeLabelPaddingY(profile: ArchitectureSvgProfile): number {
  return profile.edgeLabelPaddingY ?? 3;
}

function edgeLabelRadius(profile: ArchitectureSvgProfile): number {
  return profile.edgeLabelRadius ?? 8;
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
