import type { ArchitectureNodeKind } from "./types";

export type ArchitectureSvgTheme = "paper" | "blueprint" | "textbook" | "teaching-debug" | "slide-dark";
export type ArchitectureSvgProfileName = "textbook-overview" | "gpt-overview" | "expanded-gpt-block" | "teaching-debug" | "slide-dark";
export type ArchitectureSvgIconPreset = "minimal" | "classic" | "tensor" | "math";
export type ArchitectureSvgStructureAdapter = "architecture" | "textbook-overview";
export type ArchitectureSvgResidualRouting = "curved" | "right-loop";

export interface ArchitectureSvgPalette {
  background: string;
  grid: string;
  text: string;
  muted: string;
  edge: string;
  data: string;
  residual: string;
  dependency: string;
  groupStroke: string;
  blockStroke: string;
  summaryFill: string;
  warning: string;
}

export interface ArchitectureSvgProfile {
  name: ArchitectureSvgProfileName | string;
  description?: string;
  theme: ArchitectureSvgTheme;
  structureAdapter: ArchitectureSvgStructureAdapter;
  palette: ArchitectureSvgPalette;
  kindColors?: Partial<Record<ArchitectureNodeKind, string>>;
  fontFamily: string;
  labelFontWeight: number;
  labelFontSize: number;
  groupFontSize: number;
  metaFontSize: number;
  textLabelFontSize: number;
  radius: number;
  groupRadius: number;
  blockStrokeWidth: number;
  groupStrokeWidth: number;
  edgeStrokeWidth: number;
  residualStrokeWidth: number;
  blockFillOpacity: number;
  groupFillOpacity: number;
  showGrid: boolean;
  showHeader: boolean;
  showShapes: boolean;
  showParamCounts: boolean;
  showGroupChildCount: boolean;
  showShapeWarnings: boolean;
  maxMetaLines: number;
  expandedGroups: string[];
  iconPreset: ArchitectureSvgIconPreset;
  residualRouting: ArchitectureSvgResidualRouting;
  qkvFanIn: boolean;
  residualLoopOffset: number;
}

const PAPER_PALETTE: ArchitectureSvgPalette = {
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
  summaryFill: "#ffffff",
  warning: "#d9480f"
};

const BLUEPRINT_PALETTE: ArchitectureSvgPalette = {
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
  summaryFill: "#ffffff",
  warning: "#e67700"
};

const TEXTBOOK_PALETTE: ArchitectureSvgPalette = {
  background: "#ffffff",
  grid: "#ffffff",
  text: "#000000",
  muted: "#273238",
  edge: "#0b0b0b",
  data: "#0b0b0b",
  residual: "#0b2b38",
  dependency: "#0b2b38",
  groupStroke: "#0b2b38",
  blockStroke: "#0b0b0b",
  summaryFill: "#ffffff",
  warning: "#c92a2a"
};

const TEACHING_PALETTE: ArchitectureSvgPalette = {
  background: "#fff8f0",
  grid: "#f1dac2",
  text: "#1f1f1f",
  muted: "#6f4e37",
  edge: "#343a40",
  data: "#343a40",
  residual: "#2f9e44",
  dependency: "#364fc7",
  groupStroke: "#9c6644",
  blockStroke: "#5c4033",
  summaryFill: "#fffaf2",
  warning: "#e03131"
};

const SLIDE_DARK_PALETTE: ArchitectureSvgPalette = {
  background: "#071018",
  grid: "#102233",
  text: "#f8fafc",
  muted: "#94a3b8",
  edge: "#e2e8f0",
  data: "#e2e8f0",
  residual: "#4ade80",
  dependency: "#38bdf8",
  groupStroke: "#7dd3fc",
  blockStroke: "#e2e8f0",
  summaryFill: "#0f172a",
  warning: "#fb923c"
};

const BASE_PROFILE: Omit<ArchitectureSvgProfile, "name" | "description" | "theme" | "structureAdapter" | "palette"> = {
  fontFamily: "Georgia,\"Times New Roman\",serif",
  labelFontWeight: 700,
  labelFontSize: 14,
  groupFontSize: 18,
  metaFontSize: 10,
  textLabelFontSize: 22,
  radius: 6,
  groupRadius: 10,
  blockStrokeWidth: 1,
  groupStrokeWidth: 1.4,
  edgeStrokeWidth: 1.35,
  residualStrokeWidth: 2.2,
  blockFillOpacity: 0.92,
  groupFillOpacity: 0.32,
  showGrid: true,
  showHeader: true,
  showShapes: true,
  showParamCounts: true,
  showGroupChildCount: true,
  showShapeWarnings: false,
  maxMetaLines: 2,
  expandedGroups: [],
  iconPreset: "minimal",
  residualRouting: "curved",
  qkvFanIn: false,
  residualLoopOffset: 42
};

export const BUILTIN_SVG_PROFILES: Record<ArchitectureSvgProfileName, ArchitectureSvgProfile> = {
  "gpt-overview": {
    ...BASE_PROFILE,
    name: "gpt-overview",
    description: "Clean high-level GPT architecture with shape and parameter summaries.",
    theme: "paper",
    structureAdapter: "architecture",
    palette: PAPER_PALETTE
  },
  "expanded-gpt-block": {
    ...BASE_PROFILE,
    name: "expanded-gpt-block",
    description: "Expanded first transformer block with Q/K/V, attention matrices, and MLP internals.",
    theme: "blueprint",
    structureAdapter: "architecture",
    palette: BLUEPRINT_PALETTE,
    expandedGroups: ["block_0"],
    iconPreset: "tensor",
    qkvFanIn: true,
    residualRouting: "right-loop"
  },
  "textbook-overview": {
    ...BASE_PROFILE,
    name: "textbook-overview",
    description: "Concept-level Transformer diagram in a textbook style.",
    theme: "textbook",
    structureAdapter: "textbook-overview",
    palette: TEXTBOOK_PALETTE,
    fontFamily: "Georgia,\"Times New Roman\",serif",
    labelFontSize: 24,
    groupFontSize: 18,
    metaFontSize: 10,
    textLabelFontSize: 30,
    radius: 8,
    groupRadius: 42,
    blockStrokeWidth: 2.4,
    groupStrokeWidth: 2.8,
    edgeStrokeWidth: 1.8,
    residualStrokeWidth: 2.6,
    blockFillOpacity: 1,
    groupFillOpacity: 0.18,
    showGrid: false,
    showHeader: false,
    showShapes: false,
    showParamCounts: false,
    showGroupChildCount: false,
    expandedGroups: [],
    iconPreset: "classic",
    residualRouting: "right-loop",
    qkvFanIn: false,
    residualLoopOffset: 34
  },
  "teaching-debug": {
    ...BASE_PROFILE,
    name: "teaching-debug",
    description: "Teaching/debug view with expected-vs-actual shape warnings.",
    theme: "teaching-debug",
    structureAdapter: "architecture",
    palette: TEACHING_PALETTE,
    expandedGroups: ["block_0"],
    iconPreset: "math",
    qkvFanIn: true,
    residualRouting: "right-loop",
    showShapeWarnings: true,
    maxMetaLines: 3
  },
  "slide-dark": {
    ...BASE_PROFILE,
    name: "slide-dark",
    description: "High-contrast dark presentation profile.",
    theme: "slide-dark",
    structureAdapter: "architecture",
    palette: SLIDE_DARK_PALETTE,
    fontFamily: "Avenir Next,Helvetica,Arial,sans-serif",
    labelFontSize: 16,
    groupFontSize: 20,
    metaFontSize: 11,
    showGrid: false,
    iconPreset: "minimal",
    blockStrokeWidth: 1.4,
    groupStrokeWidth: 1.8,
    edgeStrokeWidth: 1.6,
    residualStrokeWidth: 2.4,
    blockFillOpacity: 0.96,
    groupFillOpacity: 0.22,
    kindColors: {
      token_embed: "#fb7185",
      pos_embed: "#f59e0b",
      layer_norm: "#bef264",
      attention: "#fbbf24",
      mlp: "#22d3ee",
      linear: "#818cf8",
      softmax: "#4ade80",
      residual_add: "#0f172a",
      generic_tensor: "#475569",
      group: "#0f172a"
    }
  }
};

export function resolveSvgProfile(profile?: ArchitectureSvgProfileName | ArchitectureSvgProfile, legacyTheme?: ArchitectureSvgTheme): ArchitectureSvgProfile {
  if (typeof profile === "string") {
    const builtin = BUILTIN_SVG_PROFILES[profile];
    if (!builtin) throw new Error(`Unknown SVG profile: ${profile}`);
    return cloneProfile(builtin);
  }
  if (profile) return cloneProfile(profile);

  if (legacyTheme === "blueprint") {
    return cloneProfile({ ...BUILTIN_SVG_PROFILES["gpt-overview"], theme: "blueprint", palette: BLUEPRINT_PALETTE });
  }
  return cloneProfile(BUILTIN_SVG_PROFILES["gpt-overview"]);
}

function cloneProfile(profile: ArchitectureSvgProfile): ArchitectureSvgProfile {
  return {
    ...profile,
    palette: { ...profile.palette },
    kindColors: profile.kindColors ? { ...profile.kindColors } : undefined,
    expandedGroups: [...profile.expandedGroups]
  };
}
