import { useMemo, useState } from "react";
import {
  DEFAULT_GPT_TEMPLATE_PARAMS,
  createBertArchitectureFigureSpec,
  createDecoderOnlyFigureSpec,
  createEncoderOnlyFigureSpec,
  createGptDecoderFigureSpec,
  createLsaKvIndexingFigureSpec,
  createNgramEmbeddingFigureSpec,
  createTransformerPaperFigureSpec,
  generateGptArchitecture,
  renderArchitectureSvg,
  renderLlmFigureSvg,
  validateGptTemplateParams,
  type ArchitectureSvgProfileName,
  type GptTemplateParams,
  type LlmFigureProfileName,
  type LlmFigureSpec
} from "@mappedinfo/llm-architecture-svg";

type PlaygroundMode = "gpt" | "figure" | "custom";
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
  const [mode, setMode] = useState<PlaygroundMode>("gpt");
  const [gptParams, setGptParams] = useState<GptTemplateParams>(DEFAULT_GPT_TEMPLATE_PARAMS);
  const [architectureProfile, setArchitectureProfile] = useState<ArchitectureSvgProfileName>("gpt-overview");
  const [figurePreset, setFigurePreset] = useState<FigurePresetName>("ngram-embedding");
  const [figureProfile, setFigureProfile] = useState<LlmFigureProfileName>("drawio-mechanism");
  const [customJson, setCustomJson] = useState(() => JSON.stringify(DEFAULT_CUSTOM_SPEC, null, 2));
  const [status, setStatus] = useState("");

  const renderState = useMemo(() => {
    try {
      if (mode === "gpt") {
        const issues = validateGptTemplateParams(gptParams);
        if (issues.length > 0) {
          return { svg: "", json: JSON.stringify({ params: gptParams }, null, 2), error: issues.join(" ") };
        }
        const spec = generateGptArchitecture(gptParams);
        return {
          svg: renderArchitectureSvg(spec, { profile: architectureProfile, title: spec.name, width: 1120, padding: 36 }),
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
  }, [architectureProfile, customJson, figurePreset, figureProfile, gptParams, mode]);

  const activeJson = mode === "custom" ? customJson : renderState.json;
  const activeProfile = mode === "gpt" ? architectureProfile : figureProfile;

  function applyAutoStyle(): void {
    if (mode === "gpt") {
      setArchitectureProfile(gptParams.nBlocks > 4 ? "expanded-gpt-block" : "gpt-overview");
      return;
    }
    setFigureProfile(FIGURE_PRESETS.find((preset) => preset.value === figurePreset)?.preferredProfile ?? "architecture-paper");
  }

  function shuffleStyle(): void {
    if (mode === "gpt") {
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
    downloadText(`${outputSlug(mode, figurePreset)}.svg`, renderState.svg, "image/svg+xml");
  }

  function downloadJson(): void {
    downloadText(`${outputSlug(mode, figurePreset)}.json`, activeJson, "application/json");
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
              <option value="gpt">GPT Architecture</option>
              <option value="figure">Figure Preset</option>
              <option value="custom">Custom Spec</option>
            </select>
          </label>
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
            {mode === "gpt" ? (
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
          {mode === "gpt" ? (
            <GptParamPanel params={gptParams} onChange={setGptParams} />
          ) : (
            <div className="panel-card">
              <h2>{mode === "figure" ? "Preset config" : "Custom LlmFigureSpec"}</h2>
              <p>{mode === "figure" ? "Preset JSON is generated from package helpers." : "Edit JSON directly. The preview renders after valid JSON parses."}</p>
            </div>
          )}
          <div className="editor-card">
            <div className="editor-title">
              <span>{mode === "gpt" ? "Generated ArchitectureSpec" : "LlmFigureSpec JSON"}</span>
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

function GptParamPanel({ params, onChange }: { params: GptTemplateParams; onChange: (params: GptTemplateParams) => void }): JSX.Element {
  function setNumber(key: keyof Pick<GptTemplateParams, "T" | "C" | "nHeads" | "nBlocks" | "vocabSize">, value: string): void {
    onChange({ ...params, [key]: Number(value) });
  }

  return (
    <div className="panel-card param-grid">
      <h2>GPT template params</h2>
      <NumberField label="T" value={params.T} min={1} max={2048} onChange={(value) => setNumber("T", value)} />
      <NumberField label="C" value={params.C} min={1} max={12288} onChange={(value) => setNumber("C", value)} />
      <NumberField label="nHeads" value={params.nHeads} min={1} max={96} onChange={(value) => setNumber("nHeads", value)} />
      <NumberField label="nBlocks" value={params.nBlocks} min={1} max={96} onChange={(value) => setNumber("nBlocks", value)} />
      <NumberField label="vocabSize" value={params.vocabSize} min={1} max={100000} onChange={(value) => setNumber("vocabSize", value)} />
      <label className="check-row">
        <input type="checkbox" checked={params.bias} onChange={(event) => onChange({ ...params, bias: event.target.checked })} />
        bias
      </label>
      <label className="check-row">
        <input type="checkbox" checked={params.tieEmbeddings} onChange={(event) => onChange({ ...params, tieEmbeddings: event.target.checked })} />
        tie embeddings
      </label>
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: string) => void }): JSX.Element {
  return (
    <label>
      {label}
      <input type="number" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
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

function outputSlug(mode: PlaygroundMode, figurePreset: FigurePresetName): string {
  return mode === "gpt" ? "gpt-architecture" : mode === "figure" ? figurePreset : "custom-llm-figure";
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

