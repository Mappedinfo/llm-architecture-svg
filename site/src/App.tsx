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
type PlaygroundSource = "architecture" | "model-graph" | "figure" | "custom-json";
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

const SOURCE_OPTIONS: Array<{ value: PlaygroundSource; label: string; description: string }> = [
  { value: "architecture", label: "Generate from model parameters", description: "Pick GPT, Transformer, BERT, encoder-only, or decoder-only and edit the key hyperparameters." },
  { value: "model-graph", label: "Import model structure JSON", description: "Paste ModelGraphSpec JSON exported from HuggingFace/PyTorch tracing." },
  { value: "figure", label: "Use a mechanism figure template", description: "Start from a hand-designed LLM explanation figure such as LSA KV indexing or n-gram embedding." },
  { value: "custom-json", label: "Edit custom JSON", description: "Directly edit ArchitectureSpec or LlmFigureSpec JSON when you need full control." }
];

const DIAGRAM_LEVEL_OPTIONS: Array<{ value: ModelGraphLevel; label: string; description: string }> = [
  { value: "overview", label: "Overview", description: "Compresses repeated layers into a concept-level paper diagram." },
  { value: "representative-block", label: "Representative block", description: "Expands one block to explain internals without drawing every repeated layer." },
  { value: "layer-strip", label: "Layer strip", description: "Shows many repeated layers as compact tiles for highlighting ranges." },
  { value: "debug-graph", label: "Debug graph", description: "Shows lower-level imported graph nodes for inspection, not publication figures." }
];

const ARCHITECTURE_PRESETS: Array<{ value: ArchitecturePresetName; label: string; description: string; preferredProfile: ArchitectureSvgProfileName }> = [
  { value: "gpt", label: "GPT decoder-only", description: "GPT-style decoder stack with token embedding, transformer blocks, final norm, LM head, and softmax.", preferredProfile: "expanded-gpt-block" },
  { value: "transformer", label: "Original Transformer", description: "Encoder-decoder Transformer with source/target embeddings, encoder stack, decoder stack, cross-attention, linear, and softmax.", preferredProfile: "textbook-overview" },
  { value: "bert", label: "BERT encoder", description: "Encoder-only BERT view with token, segment, position embeddings, encoder stack, MLM head, and classifier head.", preferredProfile: "textbook-overview" },
  { value: "encoder-only", label: "Encoder-only", description: "Compact teaching template for encoder-only Transformer families.", preferredProfile: "textbook-overview" },
  { value: "decoder-only", label: "Decoder-only", description: "Compact teaching template for decoder-only Transformer families.", preferredProfile: "textbook-overview" }
];

const ARCHITECTURE_PROFILE_OPTIONS: Array<{ value: ArchitectureSvgProfileName; label: string; description: string }> = [
  { value: "textbook-overview", label: "Textbook overview", description: "Paper-style concept diagram with thick strokes, large labels, residual loops, and no dense metadata." },
  { value: "gpt-overview", label: "GPT overview", description: "Clean architecture overview with tensor shapes and parameter summaries." },
  { value: "expanded-gpt-block", label: "Expanded block blueprint", description: "Technical blueprint style for Q/K/V, attention, and MLP internals." },
  { value: "teaching-debug", label: "Teaching debug", description: "Shows shape warnings and debugging-oriented colors." },
  { value: "slide-dark", label: "Slide dark", description: "High-contrast dark style for presentations and video." }
];

const ARCHITECTURE_PROFILES = ARCHITECTURE_PROFILE_OPTIONS.map((option) => option.value);

const FIGURE_PROFILE_OPTIONS: Array<{ value: LlmFigureProfileName; label: string; description: string }> = [
  { value: "architecture-paper", label: "Paper architecture", description: "White-background architecture diagram for papers and docs." },
  { value: "architecture-blueprint", label: "Blueprint", description: "Light technical blueprint style for architecture comparisons." },
  { value: "architecture-dark", label: "Dark architecture", description: "High-contrast dark style for slides." },
  { value: "paper-algorithm", label: "Paper algorithm", description: "Algorithm-flow style for paper mechanism figures." },
  { value: "drawio-mechanism", label: "Draw.io mechanism", description: "Rounded-card teaching style for blog/PPT mechanism diagrams." }
];

const FIGURE_PROFILES = FIGURE_PROFILE_OPTIONS.map((option) => option.value);

const FIGURE_PRESETS: Array<{ value: FigurePresetName; label: string; description: string; preferredProfile: LlmFigureProfileName }> = [
  { value: "transformer-paper", label: "Transformer paper", description: "Hand-designed original Transformer architecture figure.", preferredProfile: "architecture-paper" },
  { value: "bert-encoder", label: "BERT encoder", description: "Hand-designed BERT encoder explanation figure.", preferredProfile: "architecture-paper" },
  { value: "gpt-decoder", label: "GPT decoder", description: "Hand-designed GPT decoder-only architecture figure.", preferredProfile: "architecture-dark" },
  { value: "encoder-only", label: "Encoder-only", description: "Compact architecture comparison figure for encoder-only models.", preferredProfile: "architecture-blueprint" },
  { value: "decoder-only", label: "Decoder-only", description: "Compact architecture comparison figure for decoder-only models.", preferredProfile: "architecture-blueprint" },
  { value: "lsa-kv-indexing", label: "LSA KV indexing", description: "Mechanism figure for token/KV indexing and selector flow.", preferredProfile: "paper-algorithm" },
  { value: "ngram-embedding", label: "N-gram embedding", description: "Mechanism figure for n-gram windows, embedding branches, and aggregation.", preferredProfile: "drawio-mechanism" }
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
  const [diagramLevel, setDiagramLevel] = useState<ModelGraphLevel>("overview");
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
        const activeLevel = effectiveDiagramLevel(mode, architecturePreset, diagramLevel);
        const activeExpandedBlockId = activeLevel === "representative-block" ? normalizeExpandedBlockId(expandedBlockId, expandableBlockCount) : "none";
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
            level: effectiveDiagramLevel(mode, architecturePreset, diagramLevel),
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
  }, [architectureJson, architecturePreset, architectureProfile, bertParams, customJson, decoderOnlyParams, encoderOnlyParams, diagramLevel, expandedBlockId, figurePreset, figureProfile, gptParams, mode, modelGraphBlock, modelGraphJson, presentationCallout, presentationFill, presentationHighlight, presentationJson, presentationMute, presentationSelector, presentationStroke, presentationTarget, transformerParams]);

  const activeJson = mode === "custom" ? customJson : mode === "architecture-json" ? architectureJson : mode === "model-graph" ? modelGraphJson : renderState.json;
  const activeProfile = mode === "architecture" || mode === "architecture-json" || mode === "model-graph" ? architectureProfile : figureProfile;
  const source = modeToSource(mode);
  const activeLevel = effectiveDiagramLevel(mode, architecturePreset, diagramLevel);
  const activeSource = optionByValue(SOURCE_OPTIONS, source);
  const activeLevelOption = optionByValue(DIAGRAM_LEVEL_OPTIONS, activeLevel);
  const activeContentLabel = contentLabel(mode, architecturePreset, figurePreset);
  const activeContentDescription = contentDescription(mode, architecturePreset, figurePreset);
  const activeStyleLabel = styleLabel(mode, architectureProfile, figureProfile);
  const activeStyleDescription = styleDescription(mode, architectureProfile, figureProfile);
  const diagramLevelDisabledReason = levelDisabledReason(mode, architecturePreset, diagramLevel);

  function applyAutoStyle(): void {
    if (mode === "architecture" || mode === "architecture-json" || mode === "model-graph") {
      const preferredProfile = ARCHITECTURE_PRESETS.find((preset) => preset.value === architecturePreset)?.preferredProfile ?? "textbook-overview";
      setArchitectureProfile(mode === "model-graph" ? activeLevel === "overview" ? "textbook-overview" : "expanded-gpt-block" : preferredProfile);
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

  function handleSourceChange(value: PlaygroundSource): void {
    if (value === "custom-json") {
      setMode("architecture-json");
      setDiagramLevel("overview");
      return;
    }
    setMode(value);
    setDiagramLevel(value === "model-graph" ? diagramLevel : "overview");
  }

  function handleDiagramLevelChange(value: ModelGraphLevel): void {
    if (levelDisabledReason(mode, architecturePreset, value)) return;
    setDiagramLevel(value);
    if (value === "representative-block" && (architecturePreset === "gpt" || architecturePreset === "decoder-only")) {
      setExpandedBlockId(expandedBlockId === "none" ? "block_0" : expandedBlockId);
    }
  }

  function handleArchitecturePresetChange(value: ArchitecturePresetName): void {
    setArchitecturePreset(value);
    if (levelDisabledReason("architecture", value, diagramLevel)) setDiagramLevel("overview");
    if (value === "gpt" || value === "decoder-only") setExpandedBlockId("block_0");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">@mappedinfo/llm-architecture-svg</p>
          <h1>LLM Architecture Playground</h1>
        </div>
        <div className="topbar-controls workflow-controls">
          <label className="step-control">
            <span>1. Source</span>
            <select value={source} onChange={(event) => handleSourceChange(event.target.value as PlaygroundSource)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <small>{activeSource.description}</small>
          </label>

          <label className="step-control">
            <span>2. Diagram level</span>
            <select value={activeLevel} disabled={isDiagramLevelSelectDisabled(mode)} onChange={(event) => handleDiagramLevelChange(event.target.value as ModelGraphLevel)}>
              {DIAGRAM_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={Boolean(levelDisabledReason(mode, architecturePreset, option.value))}>
                  {option.label}
                </option>
              ))}
            </select>
            <small>{diagramLevelDisabledReason ?? activeLevelOption.description}</small>
          </label>

          <label className="step-control">
            <span>3. Content</span>
            {mode === "architecture" ? (
              <select value={architecturePreset} onChange={(event) => handleArchitecturePresetChange(event.target.value as ArchitecturePresetName)}>
                {ARCHITECTURE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
              </select>
            ) : mode === "figure" ? (
              <select value={figurePreset} onChange={(event) => setFigurePreset(event.target.value as FigurePresetName)}>
                {FIGURE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
              </select>
            ) : source === "custom-json" ? (
              <select value={mode === "architecture-json" ? "architecture-json" : "custom"} onChange={(event) => setMode(event.target.value as PlaygroundMode)}>
                <option value="architecture-json">ArchitectureSpec JSON</option>
                <option value="custom">LlmFigureSpec JSON</option>
              </select>
            ) : (
              <select value="model-graph" disabled>
                <option value="model-graph">ModelGraphSpec JSON</option>
              </select>
            )}
            <small>{activeContentDescription}</small>
          </label>

          <label className="step-control">
            <span>4. Visual style</span>
            {usesArchitectureStyle(mode) ? (
              <select value={architectureProfile} onChange={(event) => setArchitectureProfile(event.target.value as ArchitectureSvgProfileName)}>
                {ARCHITECTURE_PROFILE_OPTIONS.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
              </select>
            ) : (
              <select value={figureProfile} onChange={(event) => setFigureProfile(event.target.value as LlmFigureProfileName)}>
                {FIGURE_PROFILE_OPTIONS.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
              </select>
            )}
            <small>{activeStyleDescription}</small>
          </label>

          <div className="style-actions">
            <button type="button" onClick={applyAutoStyle}>Auto style</button>
            <button type="button" onClick={shuffleStyle}>Shuffle style</button>
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-pane">
          <WorkflowSummary
            source={activeSource.label}
            level={activeLevelOption.label}
            content={activeContentLabel}
            style={activeStyleLabel}
          />
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
                <h2>Imported JSON</h2>
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
                <h2>Imported JSON</h2>
                <p>Edit the full architecture spec below. Presentation JSON is applied as a render-time teaching overlay.</p>
              </div>
              <div className="panel-card">
                <h2>Presentation JSON</h2>
                <textarea className="mini-editor" spellCheck={false} value={presentationJson} onChange={(event) => setPresentationJson(event.target.value)} />
              </div>
            </div>
          ) : (
            <div className="panel-card">
              <h2>{mode === "figure" ? "Mechanism template" : "Imported JSON"}</h2>
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

function WorkflowSummary({ source, level, content, style }: { source: string; level: string; content: string; style: string }): JSX.Element {
  return (
    <div className="panel-card workflow-summary">
      <h2>Current workflow</h2>
      <p>{source} → {level} → {content} → {style} → SVG</p>
    </div>
  );
}

function modeToSource(mode: PlaygroundMode): PlaygroundSource {
  if (mode === "architecture-json" || mode === "custom") return "custom-json";
  return mode;
}

function usesArchitectureStyle(mode: PlaygroundMode): boolean {
  return mode === "architecture" || mode === "architecture-json" || mode === "model-graph";
}

function isDiagramLevelSelectDisabled(mode: PlaygroundMode): boolean {
  return mode === "figure" || mode === "custom" || mode === "architecture-json";
}

function effectiveDiagramLevel(mode: PlaygroundMode, preset: ArchitecturePresetName, level: ModelGraphLevel): ModelGraphLevel {
  return levelDisabledReason(mode, preset, level) ? "overview" : level;
}

function levelDisabledReason(mode: PlaygroundMode, preset: ArchitecturePresetName, level: ModelGraphLevel): string | undefined {
  if (mode === "model-graph") return undefined;
  if (mode === "figure") return "Mechanism figures use their own fixed layout; diagram levels are not applied.";
  if (mode === "custom") return "Custom LlmFigureSpec JSON controls its own layout; diagram levels are not applied.";
  if (mode === "architecture-json") return "ArchitectureSpec JSON is rendered directly; use the JSON structure or expandedGroups for detail control.";
  if (level === "overview") return undefined;
  if (level === "representative-block") {
    return preset === "gpt" || preset === "decoder-only" ? undefined : "Representative block is available for GPT/decoder-only templates and imported ModelGraphSpec JSON.";
  }
  if (level === "layer-strip") return "Layer strip is available for imported ModelGraphSpec JSON, where repeated layer counts are known.";
  if (level === "debug-graph") return "Debug graph is available for imported ModelGraphSpec JSON from PyTorch/HuggingFace tracing.";
  return undefined;
}

function contentLabel(mode: PlaygroundMode, architecturePreset: ArchitecturePresetName, figurePreset: FigurePresetName): string {
  if (mode === "architecture") return optionByValue(ARCHITECTURE_PRESETS, architecturePreset).label;
  if (mode === "model-graph") return "ModelGraphSpec JSON";
  if (mode === "architecture-json") return "ArchitectureSpec JSON";
  if (mode === "custom") return "LlmFigureSpec JSON";
  return optionByValue(FIGURE_PRESETS, figurePreset).label;
}

function contentDescription(mode: PlaygroundMode, architecturePreset: ArchitecturePresetName, figurePreset: FigurePresetName): string {
  if (mode === "architecture") return optionByValue(ARCHITECTURE_PRESETS, architecturePreset).description;
  if (mode === "model-graph") return "Paste JSON produced by the optional Python tracer, then choose a diagram level.";
  if (mode === "architecture-json") return "Edit a model architecture JSON object rendered by the architecture SVG renderer.";
  if (mode === "custom") return "Edit a freeform mechanism figure JSON object with manual coordinates.";
  return optionByValue(FIGURE_PRESETS, figurePreset).description;
}

function styleLabel(mode: PlaygroundMode, architectureProfile: ArchitectureSvgProfileName, figureProfile: LlmFigureProfileName): string {
  return usesArchitectureStyle(mode)
    ? optionByValue(ARCHITECTURE_PROFILE_OPTIONS, architectureProfile).label
    : optionByValue(FIGURE_PROFILE_OPTIONS, figureProfile).label;
}

function styleDescription(mode: PlaygroundMode, architectureProfile: ArchitectureSvgProfileName, figureProfile: LlmFigureProfileName): string {
  return usesArchitectureStyle(mode)
    ? optionByValue(ARCHITECTURE_PROFILE_OPTIONS, architectureProfile).description
    : optionByValue(FIGURE_PROFILE_OPTIONS, figureProfile).description;
}

function optionByValue<T extends { value: string }>(items: T[], value: string): T {
  return items.find((item) => item.value === value) ?? items[0];
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
        <h2>Model parameters: Original Transformer</h2>
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
        <h2>Model parameters: BERT encoder</h2>
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
        <h2>Model parameters: Encoder-only</h2>
        <SharedFields params={encoderOnlyParams} onChange={onEncoderOnlyChange} />
        <NumberField label="nBlocks" value={encoderOnlyParams.nBlocks} min={1} max={96} onChange={(value) => onEncoderOnlyChange({ ...encoderOnlyParams, nBlocks: Number(value) })} />
        <BoolField label="bias" checked={encoderOnlyParams.bias} onChange={(checked) => onEncoderOnlyChange({ ...encoderOnlyParams, bias: checked })} />
      </div>
    );
  }

  if (preset === "decoder-only") {
    return (
      <div className="panel-card param-grid">
        <h2>Model parameters: Decoder-only</h2>
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
      <h2>Model parameters: GPT</h2>
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
      <h2>Teaching highlights</h2>
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
