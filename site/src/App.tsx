import { useMemo, useState } from "react";
import {
  DEFAULT_BERT_TEMPLATE_PARAMS,
  DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_GPT_TEMPLATE_PARAMS,
  DEFAULT_TRANSFORMER_TEMPLATE_PARAMS,
  createBertArchitectureFigureSpec,
  createDecoderOnlyFigureSpec,
  createEncoderOnlyFigureSpec,
  createGptDecoderFigureSpec,
  createLsaKvIndexingFigureSpec,
  createModelGraphFromHfConfig,
  createNgramEmbeddingFigureSpec,
  createTransformerPaperFigureSpec,
  generateBertArchitecture,
  generateDecoderOnlyArchitecture,
  generateEncoderOnlyArchitecture,
  generateGptArchitecture,
  generateTransformerArchitecture,
  renderArchitectureSvg,
  renderLlmFigureSvg,
  renderModelGraphSvg,
  type ArchitecturePresentationSpec,
  type ArchitectureSpec,
  type ArchitectureSvgProfileName,
  type ArchitectureTemplateType,
  type BertTemplateParams,
  type DecoderOnlyTemplateParams,
  type EncoderOnlyTemplateParams,
  type GptTemplateParams,
  type LlmFigureProfileName,
  type LlmFigureSpec,
  type ModelGraphLevel,
  type ModelGraphSpec,
  type TransformerTemplateParams
} from "@mappedinfo/llm-architecture-svg";

type PlaygroundMode = "architecture" | "architecture-json" | "model-graph" | "figure" | "custom";
type ArchitecturePresetName = ArchitectureTemplateType;
type PresentationSelectorKey = "roles" | "kinds" | "ids";
type FigurePresetName =
  | "transformer-paper"
  | "bert-encoder"
  | "gpt-decoder"
  | "encoder-only"
  | "decoder-only"
  | "lsa-kv-indexing"
  | "ngram-embedding";

const ARCHITECTURE_PROFILES: ArchitectureSvgProfileName[] = [
  "gpt-overview",
  "textbook-overview",
  "expanded-gpt-block",
  "teaching-debug",
  "slide-dark"
];

const MODEL_GRAPH_LEVELS: ModelGraphLevel[] = [
  "overview",
  "representative-block",
  "layer-strip",
  "debug-graph"
];

const ARCHITECTURE_PRESETS: Array<{ value: ArchitecturePresetName; label: string; preferredProfile: ArchitectureSvgProfileName }> = [
  { value: "gpt", label: "GPT decoder-only", preferredProfile: "expanded-gpt-block" },
  { value: "transformer", label: "Original Transformer", preferredProfile: "textbook-overview" },
  { value: "bert", label: "BERT encoder", preferredProfile: "textbook-overview" },
  { value: "encoder-only", label: "Encoder-only", preferredProfile: "textbook-overview" },
  { value: "decoder-only", label: "Decoder-only", preferredProfile: "textbook-overview" }
];

const FIGURE_PROFILES: LlmFigureProfileName[] = [
  "architecture-paper",
  "architecture-blueprint",
  "architecture-dark",
  "paper-algorithm",
  "drawio-mechanism"
];

const FIGURE_PRESETS: Array<{ value: FigurePresetName; label: string; preferredProfile: LlmFigureProfileName }> = [
  { value: "transformer-paper", label: "Transformer paper", preferredProfile: "architecture-paper" },
  { value: "bert-encoder", label: "BERT encoder", preferredProfile: "architecture-paper" },
  { value: "gpt-decoder", label: "GPT decoder", preferredProfile: "architecture-dark" },
  { value: "encoder-only", label: "Encoder-only", preferredProfile: "architecture-blueprint" },
  { value: "decoder-only", label: "Decoder-only", preferredProfile: "architecture-blueprint" },
  { value: "lsa-kv-indexing", label: "LSA KV indexing", preferredProfile: "paper-algorithm" },
  { value: "ngram-embedding", label: "N-gram embedding", preferredProfile: "drawio-mechanism" }
];

const TEACHING_TARGETS = [
  "multi_head_attention",
  "cross_attention",
  "masked_attention",
  "feed_forward",
  "input_embedding",
  "output_embedding",
  "token_embedding",
  "segment_embedding",
  "positional_encoding",
  "mlm_head",
  "classifier_head",
  "attention",
  "mlp",
  "linear"
];

const DEFAULT_CUSTOM_SPEC = createNgramEmbeddingFigureSpec();
const DEFAULT_ARCHITECTURE_SPEC = generateGptArchitecture(DEFAULT_GPT_TEMPLATE_PARAMS);
const DEFAULT_PRESENTATION: ArchitecturePresentationSpec = { muteUnmatched: false, overrides: [] };
const DEFAULT_MODEL_GRAPH = createModelGraphFromHfConfig({
  model_type: "llama",
  hidden_size: 4096,
  num_attention_heads: 32,
  num_hidden_layers: 100,
  vocab_size: 32000,
  max_position_embeddings: 4096,
  intermediate_size: 11008,
  tie_word_embeddings: false
}, { modelName: "LLaMA-like 100-layer model" });

export function App(): JSX.Element {
  const [mode, setMode] = useState<PlaygroundMode>("architecture");
  const [architecturePreset, setArchitecturePreset] = useState<ArchitecturePresetName>("gpt");
  const [gptParams, setGptParams] = useState<GptTemplateParams>(DEFAULT_GPT_TEMPLATE_PARAMS);
  const [transformerParams, setTransformerParams] = useState<TransformerTemplateParams>(DEFAULT_TRANSFORMER_TEMPLATE_PARAMS);
  const [bertParams, setBertParams] = useState<BertTemplateParams>(DEFAULT_BERT_TEMPLATE_PARAMS);
  const [encoderOnlyParams, setEncoderOnlyParams] = useState<EncoderOnlyTemplateParams>(DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS);
  const [decoderOnlyParams, setDecoderOnlyParams] = useState<DecoderOnlyTemplateParams>(DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS);
  const [architectureProfile, setArchitectureProfile] = useState<ArchitectureSvgProfileName>("expanded-gpt-block");
  const [expandedBlockId, setExpandedBlockId] = useState("block_0");
  const [presentationSelector, setPresentationSelector] = useState<PresentationSelectorKey>("roles");
  const [presentationTarget, setPresentationTarget] = useState("multi_head_attention");
  const [presentationFill, setPresentationFill] = useState("#ffd166");
  const [presentationStroke, setPresentationStroke] = useState("#ef476f");
  const [presentationHighlight, setPresentationHighlight] = useState(true);
  const [presentationMute, setPresentationMute] = useState(false);
  const [presentationCallout, setPresentationCallout] = useState("Teaching focus");
  const [architectureJson, setArchitectureJson] = useState(() => JSON.stringify(DEFAULT_ARCHITECTURE_SPEC, null, 2));
  const [presentationJson, setPresentationJson] = useState(() => JSON.stringify(DEFAULT_PRESENTATION, null, 2));
  const [modelGraphJson, setModelGraphJson] = useState(() => JSON.stringify(DEFAULT_MODEL_GRAPH, null, 2));
  const [modelGraphLevel, setModelGraphLevel] = useState<ModelGraphLevel>("overview");
  const [modelGraphBlock, setModelGraphBlock] = useState("layers.0");
  const [figurePreset, setFigurePreset] = useState<FigurePresetName>("ngram-embedding");
  const [figureProfile, setFigureProfile] = useState<LlmFigureProfileName>("drawio-mechanism");
  const [customJson, setCustomJson] = useState(() => JSON.stringify(DEFAULT_CUSTOM_SPEC, null, 2));
  const [status, setStatus] = useState("");

  const renderState = useMemo(() => {
    try {
      if (mode === "architecture" || mode === "architecture-json") {
        const spec = mode === "architecture-json"
          ? JSON.parse(architectureJson) as ArchitectureSpec
          : createArchitectureSpec(architecturePreset, gptParams, transformerParams, bertParams, encoderOnlyParams, decoderOnlyParams);
        const presentation = mode === "architecture-json"
          ? JSON.parse(presentationJson) as ArchitecturePresentationSpec
          : createTeachingPresentation({
            selector: presentationSelector,
            target: presentationTarget,
            fill: presentationFill,
            stroke: presentationStroke,
            highlight: presentationHighlight,
            muteUnmatched: presentationMute,
            callout: presentationCallout
          });
        const expandableBlockCount = architecturePreset === "gpt" ? gptParams.nBlocks : architecturePreset === "decoder-only" ? decoderOnlyParams.nBlocks : 0;
        const activeExpandedBlockId = normalizeExpandedBlockId(expandedBlockId, expandableBlockCount);
        return {
          svg: renderArchitectureSvg(spec, {
            profile: architectureProfile,
            title: spec.name,
            width: architectureProfile === "textbook-overview" ? undefined : 1120,
            padding: architectureProfile === "textbook-overview" ? undefined : 36,
            expandedGroups: activeExpandedBlockId === "none" ? [] : [activeExpandedBlockId],
            presentation
          }),
          json: JSON.stringify(spec, null, 2),
          error: ""
        };
      }

      if (mode === "model-graph") {
        const modelGraph = JSON.parse(modelGraphJson) as ModelGraphSpec;
        const presentation = createTeachingPresentation({
          selector: presentationSelector,
          target: presentationTarget,
          fill: presentationFill,
          stroke: presentationStroke,
          highlight: presentationHighlight,
          muteUnmatched: presentationMute,
          callout: presentationCallout
        });
        return {
          svg: renderModelGraphSvg(modelGraph, {
            level: modelGraphLevel,
            block: modelGraphBlock,
            profile: architectureProfile,
            title: modelGraph.modelName,
            width: architectureProfile === "textbook-overview" ? undefined : 1120,
            presentation
          }),
          json: JSON.stringify(modelGraph, null, 2),
          error: ""
        };
      }

      const spec = mode === "custom" ? JSON.parse(customJson) as LlmFigureSpec : createFigureSpec(figurePreset);
      return {
        svg: renderLlmFigureSvg(spec, { profile: figureProfile, title: spec.name, width: 1120 }),
        json: JSON.stringify(spec, null, 2),
        error: ""
      };
    } catch (error) {
      return {
        svg: "",
        json: mode === "custom" ? customJson : mode === "architecture-json" ? architectureJson : mode === "model-graph" ? modelGraphJson : "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, [architectureJson, architecturePreset, architectureProfile, bertParams, customJson, decoderOnlyParams, encoderOnlyParams, expandedBlockId, figurePreset, figureProfile, gptParams, mode, modelGraphBlock, modelGraphJson, modelGraphLevel, presentationCallout, presentationFill, presentationHighlight, presentationJson, presentationMute, presentationSelector, presentationStroke, presentationTarget, transformerParams]);

  const activeJson = mode === "custom" ? customJson : mode === "architecture-json" ? architectureJson : mode === "model-graph" ? modelGraphJson : renderState.json;
  const activeProfile = mode === "architecture" || mode === "architecture-json" || mode === "model-graph" ? architectureProfile : figureProfile;

  function applyAutoStyle(): void {
    if (mode === "architecture" || mode === "architecture-json" || mode === "model-graph") {
      const preferredProfile = ARCHITECTURE_PRESETS.find((preset) => preset.value === architecturePreset)?.preferredProfile ?? "textbook-overview";
      setArchitectureProfile(mode === "model-graph" ? modelGraphLevel === "overview" ? "textbook-overview" : "expanded-gpt-block" : preferredProfile);
      setExpandedBlockId(architecturePreset === "gpt" ? "block_0" : "none");
      return;
    }
    setFigureProfile(FIGURE_PRESETS.find((preset) => preset.value === figurePreset)?.preferredProfile ?? "architecture-paper");
  }

  function shuffleStyle(): void {
    if (mode === "architecture" || mode === "architecture-json" || mode === "model-graph") {
      setArchitectureProfile(nextRandom(ARCHITECTURE_PROFILES, architectureProfile));
      return;
    }
    setFigureProfile(nextRandom(FIGURE_PROFILES, figureProfile));
  }

  async function copySvg(): Promise<void> {
    if (!renderState.svg) return;
    await navigator.clipboard.writeText(renderState.svg);
    flashStatus("SVG copied");
  }

  function exportSvg(): void {
    if (!renderState.svg) return;
    downloadText(`${outputSlug(mode, architecturePreset, figurePreset)}.svg`, renderState.svg, "image/svg+xml");
  }

  function downloadJson(): void {
    downloadText(`${outputSlug(mode, architecturePreset, figurePreset)}.json`, activeJson, "application/json");
  }

  function flashStatus(message: string): void {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 1600);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">@mappedinfo/llm-architecture-svg</p>
          <h1>LLM Architecture Playground</h1>
        </div>
        <div className="topbar-controls">
          <label>
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as PlaygroundMode)}>
              <option value="architecture">Architecture Template</option>
              <option value="architecture-json">Architecture JSON</option>
              <option value="model-graph">ModelGraph JSON</option>
              <option value="figure">Figure Preset</option>
              <option value="custom">Custom Figure Spec</option>
            </select>
          </label>
          {mode === "architecture" && (
            <label>
              Model family
              <select value={architecturePreset} onChange={(event) => setArchitecturePreset(event.target.value as ArchitecturePresetName)}>
                {ARCHITECTURE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
              </select>
            </label>
          )}
          {mode === "figure" && (
            <label>
              Figure preset
              <select value={figurePreset} onChange={(event) => setFigurePreset(event.target.value as FigurePresetName)}>
                {FIGURE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
              </select>
            </label>
          )}
          {mode === "model-graph" && (
            <label>
              Level
              <select value={modelGraphLevel} onChange={(event) => setModelGraphLevel(event.target.value as ModelGraphLevel)}>
                {MODEL_GRAPH_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          )}
          <label>
            Profile
            {mode === "architecture" || mode === "architecture-json" || mode === "model-graph" ? (
              <select value={architectureProfile} onChange={(event) => setArchitectureProfile(event.target.value as ArchitectureSvgProfileName)}>
                {ARCHITECTURE_PROFILES.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
              </select>
            ) : (
              <select value={figureProfile} onChange={(event) => setFigureProfile(event.target.value as LlmFigureProfileName)}>
                {FIGURE_PROFILES.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
              </select>
            )}
          </label>
          <button type="button" onClick={applyAutoStyle}>Auto style</button>
          <button type="button" onClick={shuffleStyle}>Shuffle style</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-pane">
          {mode === "architecture" ? (
            <div className="panel-stack">
              <ArchitectureParamPanel
                preset={architecturePreset}
                gptParams={gptParams}
                transformerParams={transformerParams}
                bertParams={bertParams}
                encoderOnlyParams={encoderOnlyParams}
                decoderOnlyParams={decoderOnlyParams}
                expandedBlockId={expandedBlockId}
                onExpandedBlockChange={setExpandedBlockId}
                onGptChange={setGptParams}
                onTransformerChange={setTransformerParams}
                onBertChange={setBertParams}
                onEncoderOnlyChange={setEncoderOnlyParams}
                onDecoderOnlyChange={setDecoderOnlyParams}
              />
              <PresentationPanel
                selector={presentationSelector}
                target={presentationTarget}
                fill={presentationFill}
                stroke={presentationStroke}
                highlight={presentationHighlight}
                muteUnmatched={presentationMute}
                callout={presentationCallout}
                onSelectorChange={setPresentationSelector}
                onTargetChange={setPresentationTarget}
                onFillChange={setPresentationFill}
                onStrokeChange={setPresentationStroke}
                onHighlightChange={setPresentationHighlight}
                onMuteUnmatchedChange={setPresentationMute}
                onCalloutChange={setPresentationCallout}
              />
            </div>
          ) : mode === "model-graph" ? (
            <div className="panel-stack">
              <div className="panel-card">
                <h2>ModelGraphSpec JSON</h2>
                <p>Paste JSON exported by the optional Python tracer, then switch levels for overview, representative block, layer strip, or debug graph.</p>
                <label>
                  Representative block
                  <input value={modelGraphBlock} onChange={(event) => setModelGraphBlock(event.target.value)} />
                </label>
              </div>
              <PresentationPanel
                selector={presentationSelector}
                target={presentationTarget}
                fill={presentationFill}
                stroke={presentationStroke}
                highlight={presentationHighlight}
                muteUnmatched={presentationMute}
                callout={presentationCallout}
                onSelectorChange={setPresentationSelector}
                onTargetChange={setPresentationTarget}
                onFillChange={setPresentationFill}
                onStrokeChange={setPresentationStroke}
                onHighlightChange={setPresentationHighlight}
                onMuteUnmatchedChange={setPresentationMute}
                onCalloutChange={setPresentationCallout}
              />
            </div>
          ) : mode === "architecture-json" ? (
            <div className="panel-stack">
              <div className="panel-card">
                <h2>ArchitectureSpec JSON</h2>
                <p>Edit the full architecture spec below. Presentation JSON is applied as a render-time teaching overlay.</p>
              </div>
              <div className="panel-card">
                <h2>Presentation JSON</h2>
                <textarea className="mini-editor" spellCheck={false} value={presentationJson} onChange={(event) => setPresentationJson(event.target.value)} />
              </div>
            </div>
          ) : (
            <div className="panel-card">
              <h2>{mode === "figure" ? "Preset config" : "Custom LlmFigureSpec"}</h2>
              <p>{mode === "figure" ? "Preset JSON is generated from package helpers." : "Edit JSON directly. The preview renders after valid JSON parses."}</p>
            </div>
          )}
          <div className="editor-card">
            <div className="editor-title">
              <span>{mode === "model-graph" ? "ModelGraphSpec JSON" : mode === "architecture" || mode === "architecture-json" ? "ArchitectureSpec JSON" : "LlmFigureSpec JSON"}</span>
              <span>{activeProfile}</span>
            </div>
            <textarea
              spellCheck={false}
              readOnly={mode !== "custom" && mode !== "architecture-json" && mode !== "model-graph"}
              value={activeJson}
              onChange={(event) => mode === "architecture-json" ? setArchitectureJson(event.target.value) : mode === "model-graph" ? setModelGraphJson(event.target.value) : setCustomJson(event.target.value)}
            />
          </div>
        </aside>

        <section className="preview-pane">
          <div className="preview-toolbar">
            <div>
              <strong>Live SVG preview</strong>
              <span>{renderState.error ? "Render blocked by config error" : "Rendered from package API"}</span>
            </div>
            {renderState.error && <code>{renderState.error}</code>}
          </div>
          <div className="preview-stage">
            {renderState.svg ? <iframe title="SVG preview" srcDoc={renderState.svg} /> : <div className="empty-preview">Fix the configuration to render SVG.</div>}
          </div>
        </section>
      </section>

      <footer className="actionbar">
        <div>{status || "No weights. No inference. Pure SVG generation from config."}</div>
        <div>
          <button type="button" onClick={exportSvg} disabled={!renderState.svg}>Export SVG</button>
          <button type="button" onClick={copySvg} disabled={!renderState.svg}>Copy SVG</button>
          <button type="button" onClick={downloadJson}>Download JSON</button>
        </div>
      </footer>
    </main>
  );
}

function ArchitectureParamPanel({
  preset,
  gptParams,
  transformerParams,
  bertParams,
  encoderOnlyParams,
  decoderOnlyParams,
  expandedBlockId,
  onExpandedBlockChange,
  onGptChange,
  onTransformerChange,
  onBertChange,
  onEncoderOnlyChange,
  onDecoderOnlyChange
}: {
  preset: ArchitecturePresetName;
  gptParams: GptTemplateParams;
  transformerParams: TransformerTemplateParams;
  bertParams: BertTemplateParams;
  encoderOnlyParams: EncoderOnlyTemplateParams;
  decoderOnlyParams: DecoderOnlyTemplateParams;
  expandedBlockId: string;
  onExpandedBlockChange: (id: string) => void;
  onGptChange: (params: GptTemplateParams) => void;
  onTransformerChange: (params: TransformerTemplateParams) => void;
  onBertChange: (params: BertTemplateParams) => void;
  onEncoderOnlyChange: (params: EncoderOnlyTemplateParams) => void;
  onDecoderOnlyChange: (params: DecoderOnlyTemplateParams) => void;
}): JSX.Element {
  if (preset === "transformer") {
    return (
      <div className="panel-card param-grid">
        <h2>Original Transformer params</h2>
        <NumberField label="srcT" value={transformerParams.srcT} min={1} max={2048} onChange={(value) => onTransformerChange({ ...transformerParams, srcT: Number(value) })} />
        <NumberField label="tgtT" value={transformerParams.tgtT} min={1} max={2048} onChange={(value) => onTransformerChange({ ...transformerParams, tgtT: Number(value) })} />
        <SharedFields params={transformerParams} onChange={onTransformerChange} />
        <NumberField label="nEncoderBlocks" value={transformerParams.nEncoderBlocks} min={1} max={96} onChange={(value) => onTransformerChange({ ...transformerParams, nEncoderBlocks: Number(value) })} />
        <NumberField label="nDecoderBlocks" value={transformerParams.nDecoderBlocks} min={1} max={96} onChange={(value) => onTransformerChange({ ...transformerParams, nDecoderBlocks: Number(value) })} />
        <BoolField label="bias" checked={transformerParams.bias} onChange={(checked) => onTransformerChange({ ...transformerParams, bias: checked })} />
        <BoolField label="tie embeddings" checked={transformerParams.tieEmbeddings} onChange={(checked) => onTransformerChange({ ...transformerParams, tieEmbeddings: checked })} />
      </div>
    );
  }

  if (preset === "bert") {
    return (
      <div className="panel-card param-grid">
        <h2>BERT encoder params</h2>
        <SharedFields params={bertParams} onChange={onBertChange} />
        <NumberField label="nBlocks" value={bertParams.nBlocks} min={1} max={96} onChange={(value) => onBertChange({ ...bertParams, nBlocks: Number(value) })} />
        <NumberField label="typeVocabSize" value={bertParams.typeVocabSize} min={1} max={1024} onChange={(value) => onBertChange({ ...bertParams, typeVocabSize: Number(value) })} />
        <NumberField label="numLabels" value={bertParams.numLabels} min={1} max={10000} onChange={(value) => onBertChange({ ...bertParams, numLabels: Number(value) })} />
        <BoolField label="bias" checked={bertParams.bias} onChange={(checked) => onBertChange({ ...bertParams, bias: checked })} />
      </div>
    );
  }

  if (preset === "encoder-only") {
    return (
      <div className="panel-card param-grid">
        <h2>Encoder-only params</h2>
        <SharedFields params={encoderOnlyParams} onChange={onEncoderOnlyChange} />
        <NumberField label="nBlocks" value={encoderOnlyParams.nBlocks} min={1} max={96} onChange={(value) => onEncoderOnlyChange({ ...encoderOnlyParams, nBlocks: Number(value) })} />
        <BoolField label="bias" checked={encoderOnlyParams.bias} onChange={(checked) => onEncoderOnlyChange({ ...encoderOnlyParams, bias: checked })} />
      </div>
    );
  }

  if (preset === "decoder-only") {
    return (
      <div className="panel-card param-grid">
        <h2>Decoder-only params</h2>
        <SharedFields params={decoderOnlyParams} onChange={onDecoderOnlyChange} />
        <NumberField label="nBlocks" value={decoderOnlyParams.nBlocks} min={1} max={96} onChange={(value) => onDecoderOnlyChange({ ...decoderOnlyParams, nBlocks: Number(value) })} />
        <ExpandableBlockField nBlocks={decoderOnlyParams.nBlocks} expandedBlockId={expandedBlockId} onExpandedBlockChange={onExpandedBlockChange} />
        <BoolField label="bias" checked={decoderOnlyParams.bias} onChange={(checked) => onDecoderOnlyChange({ ...decoderOnlyParams, bias: checked })} />
        <BoolField label="tie embeddings" checked={decoderOnlyParams.tieEmbeddings} onChange={(checked) => onDecoderOnlyChange({ ...decoderOnlyParams, tieEmbeddings: checked })} />
      </div>
    );
  }

  return (
    <div className="panel-card param-grid">
      <h2>GPT template params</h2>
      <SharedFields params={gptParams} onChange={onGptChange} />
      <NumberField label="nBlocks" value={gptParams.nBlocks} min={1} max={96} onChange={(value) => onGptChange({ ...gptParams, nBlocks: Number(value) })} />
      <ExpandableBlockField nBlocks={gptParams.nBlocks} expandedBlockId={expandedBlockId} onExpandedBlockChange={onExpandedBlockChange} />
      <BoolField label="bias" checked={gptParams.bias} onChange={(checked) => onGptChange({ ...gptParams, bias: checked })} />
      <BoolField label="tie embeddings" checked={gptParams.tieEmbeddings} onChange={(checked) => onGptChange({ ...gptParams, tieEmbeddings: checked })} />
    </div>
  );
}

function PresentationPanel({
  selector,
  target,
  fill,
  stroke,
  highlight,
  muteUnmatched,
  callout,
  onSelectorChange,
  onTargetChange,
  onFillChange,
  onStrokeChange,
  onHighlightChange,
  onMuteUnmatchedChange,
  onCalloutChange
}: {
  selector: PresentationSelectorKey;
  target: string;
  fill: string;
  stroke: string;
  highlight: boolean;
  muteUnmatched: boolean;
  callout: string;
  onSelectorChange: (value: PresentationSelectorKey) => void;
  onTargetChange: (value: string) => void;
  onFillChange: (value: string) => void;
  onStrokeChange: (value: string) => void;
  onHighlightChange: (value: boolean) => void;
  onMuteUnmatchedChange: (value: boolean) => void;
  onCalloutChange: (value: string) => void;
}): JSX.Element {
  return (
    <div className="panel-card param-grid">
      <h2>Teaching highlight</h2>
      <label>
        Selector
        <select value={selector} onChange={(event) => onSelectorChange(event.target.value as PresentationSelectorKey)}>
          <option value="roles">derived.role</option>
          <option value="kinds">kind</option>
          <option value="ids">node id</option>
        </select>
      </label>
      <label>
        Target
        <input list="teaching-targets" value={target} onChange={(event) => onTargetChange(event.target.value)} />
        <datalist id="teaching-targets">
          {TEACHING_TARGETS.map((item) => <option key={item} value={item} />)}
        </datalist>
      </label>
      <label>
        Fill
        <input type="color" value={fill} onChange={(event) => onFillChange(event.target.value)} />
      </label>
      <label>
        Stroke
        <input type="color" value={stroke} onChange={(event) => onStrokeChange(event.target.value)} />
      </label>
      <label>
        Callout
        <input value={callout} onChange={(event) => onCalloutChange(event.target.value)} />
      </label>
      <BoolField label="highlight" checked={highlight} onChange={onHighlightChange} />
      <BoolField label="mute unmatched" checked={muteUnmatched} onChange={onMuteUnmatchedChange} />
    </div>
  );
}

function SharedFields<T extends { T?: number; C: number; nHeads: number; vocabSize: number }>({ params, onChange }: { params: T; onChange: (params: T) => void }): JSX.Element {
  return (
    <>
      {"T" in params && typeof params.T === "number" && <NumberField label="T" value={params.T} min={1} max={2048} onChange={(value) => onChange({ ...params, T: Number(value) } as T)} />}
      <NumberField label="C" value={params.C} min={1} max={12288} onChange={(value) => onChange({ ...params, C: Number(value) })} />
      <NumberField label="nHeads" value={params.nHeads} min={1} max={96} onChange={(value) => onChange({ ...params, nHeads: Number(value) })} />
      <NumberField label="vocabSize" value={params.vocabSize} min={1} max={100000} onChange={(value) => onChange({ ...params, vocabSize: Number(value) })} />
    </>
  );
}

function ExpandableBlockField({ nBlocks, expandedBlockId, onExpandedBlockChange }: { nBlocks: number; expandedBlockId: string; onExpandedBlockChange: (id: string) => void }): JSX.Element {
  const activeExpandedBlockId = normalizeExpandedBlockId(expandedBlockId, nBlocks);
  return (
    <label>
      Expanded block
      <select value={activeExpandedBlockId} onChange={(event) => onExpandedBlockChange(event.target.value)}>
        <option value="none">Overview only</option>
        {Array.from({ length: nBlocks }, (_, index) => `block_${index}`).map((id) => <option key={id} value={id}>{id}</option>)}
      </select>
    </label>
  );
}

function BoolField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }): JSX.Element {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function createTeachingPresentation({ selector, target, fill, stroke, highlight, muteUnmatched, callout }: { selector: PresentationSelectorKey; target: string; fill: string; stroke: string; highlight: boolean; muteUnmatched: boolean; callout: string }): ArchitecturePresentationSpec {
  const cleanTarget = target.trim();
  if (!cleanTarget) return { muteUnmatched: false, overrides: [] };
  return {
    muteUnmatched,
    overrides: [{
      selector: { [selector]: [cleanTarget] },
      fill,
      stroke,
      strokeWidth: highlight ? 4 : undefined,
      highlight: highlight ? { badge: "1", glow: true } : false,
      callout: callout.trim() || undefined
    }]
  };
}

function normalizeExpandedBlockId(value: string, nBlocks: number): string {
  if (value === "none") return value;
  const match = /^block_(\d+)$/.exec(value);
  if (!match) return "none";
  const index = Number(match[1]);
  return index >= 0 && index < nBlocks ? value : "none";
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: string) => void }): JSX.Element {
  return (
    <label>
      {label}
      <input type="number" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function createArchitectureSpec(preset: ArchitecturePresetName, gpt: GptTemplateParams, transformer: TransformerTemplateParams, bert: BertTemplateParams, encoderOnly: EncoderOnlyTemplateParams, decoderOnly: DecoderOnlyTemplateParams): ArchitectureSpec {
  switch (preset) {
    case "transformer":
      return generateTransformerArchitecture(transformer);
    case "bert":
      return generateBertArchitecture(bert);
    case "encoder-only":
      return generateEncoderOnlyArchitecture(encoderOnly);
    case "decoder-only":
      return generateDecoderOnlyArchitecture(decoderOnly);
    case "gpt":
      return generateGptArchitecture(gpt);
  }
}

function createFigureSpec(preset: FigurePresetName): LlmFigureSpec {
  switch (preset) {
    case "lsa-kv-indexing":
      return createLsaKvIndexingFigureSpec();
    case "ngram-embedding":
      return createNgramEmbeddingFigureSpec();
    case "transformer-paper":
      return createTransformerPaperFigureSpec();
    case "bert-encoder":
      return createBertArchitectureFigureSpec();
    case "gpt-decoder":
      return createGptDecoderFigureSpec();
    case "encoder-only":
      return createEncoderOnlyFigureSpec();
    case "decoder-only":
      return createDecoderOnlyFigureSpec();
  }
}

function nextRandom<T>(items: T[], current: T): T {
  const candidates = items.filter((item) => item !== current);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? current;
}

function outputSlug(mode: PlaygroundMode, architecturePreset: ArchitecturePresetName, figurePreset: FigurePresetName): string {
  return mode === "model-graph" ? "model-graph" : mode === "architecture" || mode === "architecture-json" ? `${architecturePreset}-architecture` : mode === "figure" ? figurePreset : "custom-llm-figure";
}

function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
