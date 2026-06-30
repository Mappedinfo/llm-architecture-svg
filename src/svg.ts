import { ArchitectureEdge, ArchitectureNode, ArchitectureSpec, GptTemplateParams } from "./types";
import { countArchitectureParameters, formatParamCount, generateGptArchitecture, shapeToLabel } from "./generator";

export type ArchitectureSvgTheme = "paper" | "blueprint";

export interface RenderArchitectureSvgOptions {
  title?: string;
  showShapes?: boolean;
  showParamCounts?: boolean;
  expandedGroups?: string[];
  theme?: ArchitectureSvgTheme;
  width?: number;
  padding?: number;
}

interface RenderNode {
  node: ArchitectureNode;
  depth: number;
}

const DEFAULT_OPTIONS: Required<RenderArchitectureSvgOptions> = {
  title: "",
  showShapes: true,
  showParamCounts: true,
  expandedGroups: [],
  theme: "paper",
  width: 1100,
  padding: 36
};

const THEMES = {
  paper: {
    background: "#fbfaf7",
    grid: "#ece7dc",
    text: "#172033",
    muted: "#667085",
    edge: "#273142",
    data: "#273142",
    residual: "#2f9e44",
    dependency: "#4c6ef5",
    groupStroke: "#7a8170",
    blockStroke: "#5d6472",
    summaryFill: "#ffffff"
  },
  blueprint: {
    background: "#f3f8fb",
    grid: "#d7e8ef",
    text: "#0b2533",
    muted: "#537180",
    edge: "#16384a",
    data: "#16384a",
    residual: "#198754",
    dependency: "#2b59c3",
    groupStroke: "#6d8b99",
    blockStroke: "#24465a",
    summaryFill: "#ffffff"
  }
};

export function renderGptArchitectureSvg(params: GptTemplateParams, options: RenderArchitectureSvgOptions = {}): string {
  return renderArchitectureSvg(generateGptArchitecture(params), options);
}

export function renderArchitectureSvg(architecture: ArchitectureSpec, options: RenderArchitectureSvgOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const theme = THEMES[opts.theme];
  const expanded = new Set(opts.expandedGroups);
  const renderNodes = collectVisibleNodes(architecture.nodes, expanded);
  const visibleNodeIds = new Set(renderNodes.map((item) => item.node.id));
  const bounds = calcBounds(renderNodes.map((item) => item.node));
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const scale = (opts.width - 2 * opts.padding) / contentWidth;
  const titleHeight = opts.title || opts.showParamCounts ? 90 : 24;
  const height = Math.ceil((bounds.maxY - bounds.minY) * scale + opts.padding * 2 + titleHeight);

  const x = (v: number) => (v - bounds.minX) * scale + opts.padding;
  const y = (v: number) => (v - bounds.minY) * scale + opts.padding + titleHeight;
  const s = (v: number) => v * scale;

  const edges = architecture.edges
    .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    .map((edge) => renderEdge(edge, renderNodes, x, y, theme))
    .join("\n");
  const groups = renderNodes
    .filter((item) => item.node.type === "group")
    .map((item) => renderNode(item.node, item.depth, x, y, s, opts, theme))
    .join("\n");
  const blocks = renderNodes
    .filter((item) => item.node.type !== "group")
    .map((item) => renderNode(item.node, item.depth, x, y, s, opts, theme))
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${height}" viewBox="0 0 ${opts.width} ${height}" role="img" aria-label="${escAttr(opts.title || architecture.name)}">`,
    `<defs>${renderDefs(theme)}</defs>`,
    `<rect width="100%" height="100%" fill="${theme.background}"/>`,
    renderGrid(opts.width, height, theme),
    renderHeader(architecture, opts, theme),
    `<g class="architecture">`,
    edges,
    groups,
    blocks,
    `</g>`,
    `</svg>`
  ].filter(Boolean).join("\n");
}

function renderDefs(theme: typeof THEMES.paper): string {
  return [
    `<style>`,
    `text{font-family:Georgia,"Times New Roman",serif}`,
    `.node-label{font-weight:700;fill:${theme.text}}`,
    `.node-meta{fill:${theme.muted}}`,
    `.edge{fill:none;stroke-linecap:round;stroke-linejoin:round}`,
    `</style>`,
    `<marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">`,
    `<path d="M0,0 L8,4 L0,8 Z" fill="${theme.edge}"/>`,
    `</marker>`
  ].join("");
}

function renderGrid(width: number, height: number, theme: typeof THEMES.paper): string {
  const lines: string[] = [];
  for (let x = 0; x <= width; x += 24) lines.push(`<path d="M${x} 0 V${height}" stroke="${theme.grid}" stroke-width="1" opacity="0.42"/>`);
  for (let y = 0; y <= height; y += 24) lines.push(`<path d="M0 ${y} H${width}" stroke="${theme.grid}" stroke-width="1" opacity="0.42"/>`);
  return `<g opacity="0.7">${lines.join("")}</g>`;
}

function renderHeader(architecture: ArchitectureSpec, opts: Required<RenderArchitectureSvgOptions>, theme: typeof THEMES.paper): string {
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
      lines.push(`<rect x="${x}" y="52" width="${chipWidth}" height="24" rx="12" fill="${theme.summaryFill}" stroke="${theme.grid}"/>`);
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
  opts: Required<RenderArchitectureSvgOptions>,
  theme: typeof THEMES.paper
): string {
  const isGroup = node.type === "group";
  const nx = x(node.position2d.x);
  const ny = y(node.position2d.y);
  const nw = scale(node.size2d.w);
  const nh = scale(node.size2d.h);
  const fill = node.color ?? "#d8dee9";
  const stroke = isGroup ? theme.groupStroke : theme.blockStroke;
  const dash = isGroup ? ` stroke-dasharray="8 6"` : "";
  const labelX = isGroup ? nx + 12 + depth * 4 : nx + nw / 2;
  const labelY = ny + (isGroup ? 24 : Math.min(24, nh / 2 + 5));
  const anchor = isGroup ? "start" : "middle";

  return [
    `<g id="${escAttr(node.id)}" class="node node-${escAttr(node.kind)}">`,
    `<rect x="${round(nx)}" y="${round(ny)}" width="${round(nw)}" height="${round(nh)}" rx="${isGroup ? 10 : 6}" fill="${fill}" fill-opacity="${isGroup ? 0.32 : 0.92}" stroke="${stroke}" stroke-width="${isGroup ? 1.4 : 1}"${dash}/>`,
    `<text x="${round(labelX)}" y="${round(labelY)}" font-size="${isGroup ? 18 : 14}" text-anchor="${anchor}" class="node-label">${esc(node.label)}</text>`,
    renderNodeMeta(node, nx, ny, nw, nh, opts, isGroup),
    `</g>`
  ].join("\n");
}

function renderNodeMeta(node: ArchitectureNode, nx: number, ny: number, nw: number, nh: number, opts: Required<RenderArchitectureSvgOptions>, isGroup: boolean): string {
  if (isGroup) {
    const childCount = node.children?.length ?? 0;
    return childCount ? `<text x="${round(nx + nw - 12)}" y="${round(ny + 24)}" font-size="11" text-anchor="end" class="node-meta">${childCount} derived blocks</text>` : "";
  }

  const lines: string[] = [];
  if (opts.showShapes) lines.push(node.derived?.shapeLabel ?? shapeToLabel(node.shape));
  if (opts.showParamCounts && (node.derived?.paramCount ?? 0) > 0) lines.push(formatParamCount(node.derived!.paramCount!));

  return lines.slice(0, 2).map((line, i) => {
    return `<text x="${round(nx + nw / 2)}" y="${round(ny + nh - 18 + i * 13)}" font-size="10" text-anchor="middle" class="node-meta">${esc(line)}</text>`;
  }).join("\n");
}

function renderEdge(edge: ArchitectureEdge, nodes: RenderNode[], x: (v: number) => number, y: (v: number) => number, theme: typeof THEMES.paper): string {
  const source = nodes.find((item) => item.node.id === edge.source)?.node;
  const target = nodes.find((item) => item.node.id === edge.target)?.node;
  if (!source || !target) return "";

  const color = edge.kind === "residual" ? theme.residual : edge.kind === "dependency" ? theme.dependency : theme.data;
  const start = center(source, x, y);
  const end = center(target, x, y);
  const midY = (start.y + end.y) / 2;
  const path = `M${round(start.x)} ${round(start.y)} C${round(start.x)} ${round(midY)} ${round(end.x)} ${round(midY)} ${round(end.x)} ${round(end.y)}`;
  const dash = edge.kind === "dependency" ? ` stroke-dasharray="4 4"` : "";
  return `<path class="edge edge-${edge.kind}" d="${path}" stroke="${color}" stroke-width="${edge.kind === "residual" ? 2.2 : 1.35}" opacity="0.74" marker-end="url(#arrow)"${dash}/>`;
}

function collectVisibleNodes(nodes: ArchitectureNode[], expanded: Set<string>, depth = 0): RenderNode[] {
  const result: RenderNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children && expanded.has(node.id)) result.push(...collectVisibleNodes(node.children, expanded, depth + 1));
  }
  return result;
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

function center(node: ArchitectureNode, x: (v: number) => number, y: (v: number) => number): { x: number; y: number } {
  return { x: x(node.position2d.x + node.size2d.w / 2), y: y(node.position2d.y + node.size2d.h / 2) };
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
