export type ArchitectureNodeKind =
  | "token_embed"
  | "pos_embed"
  | "layer_norm"
  | "attention"
  | "mlp"
  | "linear"
  | "softmax"
  | "residual_add"
  | "generic_tensor"
  | "group";

export type ArchitectureNodeType = "block" | "group";
export type ArchitectureEdgeKind = "data" | "residual" | "dependency";
export type ArchitectureEdgeRoute = "rounded-orthogonal" | "attention-fan-in" | "right-loop";
export type ArchitectureMode = "template" | "teaching";
export type ArchitectureParamCategory = "embedding" | "attention" | "mlp" | "layer_norm" | "linear" | "none";

export interface GptTemplateParams {
  T: number;
  C: number;
  nHeads: number;
  nBlocks: number;
  vocabSize: number;
  bias: boolean;
  tieEmbeddings: boolean;
}

export interface ArchitectureShape {
  B?: number;
  T?: number;
  C?: number;
  A?: number;
  nHeads?: number;
  nBlocks?: number;
  vocabSize?: number;
  rows?: number;
  cols?: number;
  depth?: number;
}

export interface ArchitecturePoint {
  x: number;
  y: number;
}

export interface ArchitectureSize2d {
  w: number;
  h: number;
}

export interface ArchitectureDerivedMeta {
  source: "gpt-template";
  role: string;
  expectedShape?: ArchitectureShape;
  shapeLabel?: string;
  paramCategory?: ArchitectureParamCategory;
  paramCount?: number;
  paramFormula?: string;
  locked?: boolean;
  overview?: boolean;
}

export interface ArchitectureNode {
  id: string;
  type: ArchitectureNodeType;
  kind: ArchitectureNodeKind;
  label: string;
  shape: ArchitectureShape;
  position2d: ArchitecturePoint;
  size2d: ArchitectureSize2d;
  color?: string;
  children?: ArchitectureNode[];
  derived?: ArchitectureDerivedMeta;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  kind: ArchitectureEdgeKind;
  label?: string;
  route?: ArchitectureEdgeRoute;
}

export interface ArchitectureSpec {
  schemaVersion: 1;
  mode: ArchitectureMode;
  template?: {
    type: "gpt";
    params: GptTemplateParams;
  };
  id: string;
  name: string;
  notes?: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  view: {
    canvas: ArchitectureSize2d;
    scale3d?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ComponentTemplate {
  kind: ArchitectureNodeKind;
  label: string;
  color: string;
  size2d: ArchitectureSize2d;
}

export const COMPONENT_TEMPLATES: Record<ArchitectureNodeKind, ComponentTemplate> = {
  token_embed: { kind: "token_embed", label: "token embed", color: "#f0a8fc", size2d: { w: 140, h: 34 } },
  pos_embed: { kind: "pos_embed", label: "pos embed", color: "#d9d9d9", size2d: { w: 140, h: 32 } },
  layer_norm: { kind: "layer_norm", label: "layer norm", color: "#e9f29e", size2d: { w: 100, h: 30 } },
  attention: { kind: "attention", label: "attention", color: "#f2d59e", size2d: { w: 112, h: 34 } },
  mlp: { kind: "mlp", label: "mlp", color: "#9ef2f2", size2d: { w: 112, h: 34 } },
  linear: { kind: "linear", label: "linear", color: "#a8c3fc", size2d: { w: 100, h: 34 } },
  softmax: { kind: "softmax", label: "softmax", color: "#a8fcaf", size2d: { w: 100, h: 34 } },
  residual_add: { kind: "residual_add", label: "+", color: "#ffffff", size2d: { w: 34, h: 34 } },
  generic_tensor: { kind: "generic_tensor", label: "tensor", color: "#d8dee9", size2d: { w: 100, h: 34 } },
  group: { kind: "group", label: "group", color: "#eeeeee", size2d: { w: 500, h: 310 } }
};
