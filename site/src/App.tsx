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
  createNgramEmbeddingFigureSpec,
  createTransformerPaperFigureSpec,
  generateBertArchitecture,
  generateDecoderOnlyArchitecture,
  generateEncoderOnlyArchitecture,
  generateGptArchitecture,
  generateTransformerArchitecture,
  renderArchitectureSvg,
  renderLlmFigureSvg,
  type ArchitectureSpec,
  type ArchitectureSvgProfileName,
  type ArchitectureTemplateType,
  type BertTemplateParams,
  type DecoderOnlyTemplateParams,
  type EncoderOnlyTemplateParams,
  type GptTemplateParams,
  type LlmFigureProfileName,
  type LlmFigureSpec,
  type TransformerTemplateParams
} from "@mappedinfo/llm-architecture-svg";

type PlaygroundMode = "architecture" | "figure" | "custom";
type ArchitecturePresetName = ArchitectureTemplateType;
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

const DEFAULT_CUSTOM_SPEC = createNgramEmbeddingFigureSpec();

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
  const [figurePreset, setFigurePreset] = useState<FigurePresetName>("ngram-embedding");
  const [figureProfile, setFigureProfile] = useState<LlmFigureProfileName>("drawio-mechanism");
  const [customJson, setCustomJson] = useState(() => JSON.stringify(DEFAULT_CUSTOM_SPEC, null, 2));
  const [status, setStatus] = useState("");

  const renderState = useMemo(() => {
    try {
      if (mode === "architecture") {
        const spec = createArchitectureSpec(architecturePreset, gptParams, transformerParams, bertParams, encoderOnlyParams, decoderOnlyParams);
        const expandableBlockCount = architecturePreset === "gpt" ? gptParams.nBlocks : architecturePreset === "decoder-only" ? decoderOnlyParams.nBlocks : 0;
        const activeExpandedBlockId = normalizeExpandedBlockId(expandedBlockId, expandableBlockCount);
        return {
          svg: renderArchitectureSvg(spec, {
            profile: architectureProfile,
            title: spec.name,
            width: architectureProfile === "textbook-overview" ? undefined : 1120,
            padding: architectureProfile === "textbook-overview" ? undefined : 36,
            expandedGroups: activeExpandedBlockId === "none" ? [] : [activeExpandedBlockId]
          }),
          json: JSON.stringify(spec, null, 2),
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
        json: mode === "custom" ? customJson : "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, [architecturePreset, architectureProfile, bertParams, customJson, decoderOnlyParams, encoderOnlyParams, expandedBlockId, figurePreset, figureProfile, gptParams, mode, transformerParams]);

  const activeJson = mode === "custom" ? customJson : renderState.json;
  const activeProfile = mode === "architecture" ? architectureProfile : figureProfile;

  function applyAutoStyle(): void {
    if (mode === "architecture") {
      const preferredProfile = ARCHITECTURE_PRESETS.find((preset) => preset.value === architecturePreset)?.preferredProfile ?? "textbook-overview";
      setArchitectureProfile(preferredProfile);
      setExpandedBlockId(architecturePreset === "gpt" ? "block_0" : "none");
      return;
    }
    setFigureProfile(FIGURE_PRESETS.find((preset) => preset.value === figurePreset)?.preferredProfile ?? "architecture-paper");
  }

  function shuffleStyle(): void {
    if (mode === "architecture") {
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
              <option value="figure">Figure Preset</option>
              <option value="custom">Custom Spec</option>
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
          <label>
            Profile
            {mode === "architecture" ? (
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
          ) : (
            <div className="panel-card">
              <h2>{mode === "figure" ? "Preset config" : "Custom LlmFigureSpec"}</h2>
              <p>{mode === "figure" ? "Preset JSON is generated from package helpers." : "Edit JSON directly. The preview renders after valid JSON parses."}</p>
            </div>
          )}
          <div className="editor-card">
            <div className="editor-title">
              <span>{mode === "architecture" ? "Generated ArchitectureSpec" : "LlmFigureSpec JSON"}</span>
              <span>{activeProfile}</span>
            </div>
            <textarea
              spellCheck={false}
              readOnly={mode !== "custom"}
              value={activeJson}
              onChange={(event) => setCustomJson(event.target.value)}
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

function SharedFields<T extends { T?: number; C: number; nHeads: number; vocabSize: number } | { srcT?: number; C: number; nHeads: number; vocabSize: number }>({ params, onChange }: { params: T; onChange: (params: T) => void }): JSX.Element {
  return (
    <>
      {"T" in params && typeof params.T === "number" && <NumberField label="T" value={params.T} min={1} max={2048} onChange={(value) => onChange({ ...params, T: Number(value) })} />}
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
  return mode === "architecture" ? `${architecturePreset}-architecture` : mode === "figure" ? figurePreset : "custom-llm-figure";
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
