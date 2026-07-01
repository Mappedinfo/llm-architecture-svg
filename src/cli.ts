#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_BERT_TEMPLATE_PARAMS,
  DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS,
  DEFAULT_GPT_TEMPLATE_PARAMS,
  DEFAULT_TRANSFORMER_TEMPLATE_PARAMS,
  generateBertArchitecture,
  generateDecoderOnlyArchitecture,
  generateEncoderOnlyArchitecture,
  generateGptArchitecture,
  generateTransformerArchitecture,
  validateGptTemplateParams
} from "./generator";
import {
  LlmFigureProfileName,
  LlmFigureSpec,
  renderBertArchitectureFigure,
  renderDecoderOnlyFigure,
  renderEncoderOnlyFigure,
  renderGptDecoderFigure,
  renderLlmFigureSvg,
  renderLsaKvIndexingFigure,
  renderNgramEmbeddingFigure,
  renderTransformerPaperFigure
} from "./figures";
import { ArchitecturePresentationSpec, ArchitectureSpec, BertTemplateParams, DecoderOnlyTemplateParams, EncoderOnlyTemplateParams, GptTemplateParams, TransformerTemplateParams } from "./types";
import { RenderArchitectureSvgOptions, renderArchitectureSvg } from "./svg";
import { ModelGraphLevel, ModelGraphSpec, renderModelGraphSvg } from "./modelGraph";

interface BatchTask {
  name?: string;
  out?: string;
  params?: Partial<GptTemplateParams>;
  spec?: ArchitectureSpec;
  options?: RenderArchitectureSvgOptions;
}

main();

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }
  if (args.figurePreset || args["figure-preset"] || args.figureSpec || args["figure-spec"]) {
    runFigure(args);
    return;
  }
  if (args.batch) {
    runBatch(args);
    return;
  }

  const out = getString(args.out);
  if (!out) fail("Missing --out.");
  const modelGraphPath = getString(args.modelGraph) ?? getString(args["model-graph"]);
  if (modelGraphPath) {
    const modelGraph = readJson<ModelGraphSpec>(modelGraphPath);
    writeFile(out, renderModelGraphSvg(modelGraph, {
      ...optionsFromArgs(args, modelGraph.modelName),
      level: getModelGraphLevel(args),
      block: getString(args.block)
    }));
    console.log(`Wrote ${out}`);
    return;
  }
  const specPath = getString(args.spec) ?? getString(args.architectureSpec) ?? getString(args["architecture-spec"]);
  const architecture = specPath ? readJson<ArchitectureSpec>(specPath) : generateFromArgs(args);
  writeFile(out, renderArchitectureSvg(architecture, optionsFromArgs(args, architecture.name)));
  console.log(`Wrote ${out}`);
}

function runFigure(args: Record<string, string | boolean | string[]>): void {
  const out = getString(args.out);
  if (!out) fail("Missing --out.");
  const profile = getString(args.profile) as LlmFigureProfileName | undefined;
  const title = getString(args.title);
  const width = getNumber(args.width, 0) || undefined;
  const specPath = getString(args.figureSpec) ?? getString(args["figure-spec"]);
  if (specPath) {
    const spec = readJson<LlmFigureSpec>(specPath);
    writeFile(out, renderLlmFigureSvg(spec, { profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }

  const preset = getString(args.figurePreset) ?? getString(args["figure-preset"]);
  if (preset === "lsa-kv-indexing") {
    writeFile(out, renderLsaKvIndexingFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  if (preset === "ngram-embedding") {
    writeFile(out, renderNgramEmbeddingFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  if (preset === "transformer-paper") {
    writeFile(out, renderTransformerPaperFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  if (preset === "bert-encoder") {
    writeFile(out, renderBertArchitectureFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  if (preset === "gpt-decoder") {
    writeFile(out, renderGptDecoderFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  if (preset === "encoder-only") {
    writeFile(out, renderEncoderOnlyFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  if (preset === "decoder-only") {
    writeFile(out, renderDecoderOnlyFigure({ profile, title, width }));
    console.log(`Wrote ${out}`);
    return;
  }
  fail(`Unsupported --figure-preset ${preset}. Use "transformer-paper", "bert-encoder", "gpt-decoder", "encoder-only", "decoder-only", "lsa-kv-indexing", or "ngram-embedding".`);
}

function runBatch(args: Record<string, string | boolean | string[]>): void {
  const batchPath = getString(args.batch);
  const outDir = getString(args.out) ?? "artifacts/svg";
  if (!batchPath) fail("Missing --batch path.");
  const raw = readJson<BatchTask[] | { items: BatchTask[] }>(batchPath);
  const tasks = Array.isArray(raw) ? raw : raw.items;
  if (!Array.isArray(tasks)) fail("Batch JSON must be an array or { items: [...] }.");

  fs.mkdirSync(outDir, { recursive: true });
  tasks.forEach((task, index) => {
    const architecture = task.spec ?? generateFromParams({ ...DEFAULT_GPT_TEMPLATE_PARAMS, ...(task.params ?? {}) }, task.name);
    const outName = task.out ?? `${slug(task.name ?? `llm-architecture-${index + 1}`)}.svg`;
    const outPath = path.isAbsolute(outName) ? outName : path.join(outDir, outName);
    writeFile(outPath, renderArchitectureSvg(architecture, { ...task.options, title: task.options?.title ?? task.name ?? architecture.name }));
    console.log(`Wrote ${outPath}`);
  });
}

function generateFromArgs(args: Record<string, string | boolean | string[]>): ArchitectureSpec {
  const preset = getString(args.preset) ?? "gpt";
  const title = getString(args.title);
  if (preset === "gpt") return generateFromParams(gptParamsFromArgs(args), title);
  if (preset === "transformer") return generateTransformerArchitecture(transformerParamsFromArgs(args), title ? { name: title } : {});
  if (preset === "bert") return generateBertArchitecture(bertParamsFromArgs(args), title ? { name: title } : {});
  if (preset === "encoder-only") return generateEncoderOnlyArchitecture(encoderOnlyParamsFromArgs(args), title ? { name: title } : {});
  if (preset === "decoder-only") return generateDecoderOnlyArchitecture(decoderOnlyParamsFromArgs(args), title ? { name: title } : {});
  fail(`Unsupported --preset ${preset}. Use "gpt", "transformer", "bert", "encoder-only", or "decoder-only".`);
}

function generateFromParams(params: GptTemplateParams, title?: string): ArchitectureSpec {
  const issues = validateGptTemplateParams(params);
  if (issues.length > 0) fail(issues.join(" "));
  return generateGptArchitecture(params, title ? { name: title } : {});
}

function optionsFromArgs(args: Record<string, string | boolean | string[]>, fallbackTitle: string): RenderArchitectureSvgOptions {
  const theme = getString(args.theme);
  const profile = getString(args.profile);
  const options: RenderArchitectureSvgOptions = {
    title: getString(args.title) ?? fallbackTitle,
    width: getOptionalNumber(args.width),
    padding: getOptionalNumber(args.padding),
    showShapes: getBool(args.showShapes, true),
    showParamCounts: getBool(args.showParamCounts, true),
    expandedGroups: getList(args.expand),
    theme: theme === "blueprint" ? "blueprint" : theme === "paper" ? "paper" : undefined,
    profile: profile as RenderArchitectureSvgOptions["profile"]
  };
  const presentationPath = getString(args.presentation);
  if (presentationPath) options.presentation = readJson<ArchitecturePresentationSpec>(presentationPath);
  return options;
}

function gptParamsFromArgs(args: Record<string, string | boolean | string[]>): GptTemplateParams {
  return {
    ...DEFAULT_GPT_TEMPLATE_PARAMS,
    T: getNumber(args.T, DEFAULT_GPT_TEMPLATE_PARAMS.T),
    C: getNumber(args.C, DEFAULT_GPT_TEMPLATE_PARAMS.C),
    nHeads: getNumber(args.nHeads, DEFAULT_GPT_TEMPLATE_PARAMS.nHeads),
    nBlocks: getNumber(args.nBlocks, DEFAULT_GPT_TEMPLATE_PARAMS.nBlocks),
    vocabSize: getNumber(args.vocabSize, DEFAULT_GPT_TEMPLATE_PARAMS.vocabSize),
    bias: getBool(args.bias, DEFAULT_GPT_TEMPLATE_PARAMS.bias),
    tieEmbeddings: getBool(args.tieEmbeddings, DEFAULT_GPT_TEMPLATE_PARAMS.tieEmbeddings)
  };
}

function transformerParamsFromArgs(args: Record<string, string | boolean | string[]>): TransformerTemplateParams {
  return {
    ...DEFAULT_TRANSFORMER_TEMPLATE_PARAMS,
    srcT: getNumber(args.srcT, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.srcT),
    tgtT: getNumber(args.tgtT, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.tgtT),
    C: getNumber(args.C, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.C),
    nHeads: getNumber(args.nHeads, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.nHeads),
    nEncoderBlocks: getNumber(args.nEncoderBlocks, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.nEncoderBlocks),
    nDecoderBlocks: getNumber(args.nDecoderBlocks, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.nDecoderBlocks),
    vocabSize: getNumber(args.vocabSize, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.vocabSize),
    bias: getBool(args.bias, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.bias),
    tieEmbeddings: getBool(args.tieEmbeddings, DEFAULT_TRANSFORMER_TEMPLATE_PARAMS.tieEmbeddings)
  };
}

function bertParamsFromArgs(args: Record<string, string | boolean | string[]>): BertTemplateParams {
  return {
    ...DEFAULT_BERT_TEMPLATE_PARAMS,
    T: getNumber(args.T, DEFAULT_BERT_TEMPLATE_PARAMS.T),
    C: getNumber(args.C, DEFAULT_BERT_TEMPLATE_PARAMS.C),
    nHeads: getNumber(args.nHeads, DEFAULT_BERT_TEMPLATE_PARAMS.nHeads),
    nBlocks: getNumber(args.nBlocks, DEFAULT_BERT_TEMPLATE_PARAMS.nBlocks),
    vocabSize: getNumber(args.vocabSize, DEFAULT_BERT_TEMPLATE_PARAMS.vocabSize),
    typeVocabSize: getNumber(args.typeVocabSize, DEFAULT_BERT_TEMPLATE_PARAMS.typeVocabSize),
    numLabels: getNumber(args.numLabels, DEFAULT_BERT_TEMPLATE_PARAMS.numLabels),
    bias: getBool(args.bias, DEFAULT_BERT_TEMPLATE_PARAMS.bias)
  };
}

function encoderOnlyParamsFromArgs(args: Record<string, string | boolean | string[]>): EncoderOnlyTemplateParams {
  return {
    ...DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS,
    T: getNumber(args.T, DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS.T),
    C: getNumber(args.C, DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS.C),
    nHeads: getNumber(args.nHeads, DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS.nHeads),
    nBlocks: getNumber(args.nBlocks, DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS.nBlocks),
    vocabSize: getNumber(args.vocabSize, DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS.vocabSize),
    bias: getBool(args.bias, DEFAULT_ENCODER_ONLY_TEMPLATE_PARAMS.bias)
  };
}

function decoderOnlyParamsFromArgs(args: Record<string, string | boolean | string[]>): DecoderOnlyTemplateParams {
  return {
    ...DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS,
    T: getNumber(args.T, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.T),
    C: getNumber(args.C, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.C),
    nHeads: getNumber(args.nHeads, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.nHeads),
    nBlocks: getNumber(args.nBlocks, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.nBlocks),
    vocabSize: getNumber(args.vocabSize, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.vocabSize),
    bias: getBool(args.bias, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.bias),
    tieEmbeddings: getBool(args.tieEmbeddings, DEFAULT_DECODER_ONLY_TEMPLATE_PARAMS.tieEmbeddings)
  };
}

function parseArgs(argv: string[]): Record<string, string | boolean | string[]> {
  const args: Record<string, string | boolean | string[]> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "help") {
      args.help = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }
    i++;
    args[key] = key === "expand" ? [...getList(args[key]), ...splitList(value)] : value;
  }
  return args;
}

function printUsage(): void {
  console.log([
    "Usage:",
    "  llm-architecture-svg --preset gpt --T 64 --C 192 --nHeads 3 --nBlocks 3 --vocabSize 1000 --out artifacts/svg/gpt.svg",
    "  llm-architecture-svg --preset gpt --expand block_0 --out artifacts/svg/gpt-expanded.svg",
    "  llm-architecture-svg --preset gpt --profile textbook-overview --out artifacts/svg/textbook.svg",
    "  llm-architecture-svg --architecture-spec architecture.json --presentation presentation.json --profile textbook-overview --out artifacts/svg/custom.svg",
    "  llm-architecture-svg --model-graph model-graph.json --level representative-block --block layers.0 --out artifacts/svg/model-block.svg",
    "  llm-architecture-svg --preset transformer --profile textbook-overview --out artifacts/svg/transformer-textbook.svg",
    "  llm-architecture-svg --preset bert --profile textbook-overview --out artifacts/svg/bert-textbook.svg",
    "  llm-architecture-svg --preset encoder-only --profile textbook-overview --out artifacts/svg/encoder-textbook.svg",
    "  llm-architecture-svg --preset decoder-only --profile textbook-overview --out artifacts/svg/decoder-textbook.svg",
    "  llm-architecture-svg --preset gpt --profile slide-dark --out artifacts/svg/slide-dark.svg",
    "  llm-architecture-svg --figure-preset lsa-kv-indexing --out artifacts/svg/lsa.svg",
    "  llm-architecture-svg --figure-preset ngram-embedding --out artifacts/svg/ngram.svg",
    "  llm-architecture-svg --figure-preset transformer-paper --out artifacts/svg/transformer.svg",
    "  llm-architecture-svg --figure-preset bert-encoder --out artifacts/svg/bert.svg",
    "  llm-architecture-svg --figure-preset gpt-decoder --out artifacts/svg/gpt-decoder.svg",
    "  llm-architecture-svg --figure-spec examples/custom-figure.json --out artifacts/svg/custom.svg",
    "  llm-architecture-svg --batch examples/llm-svg-batch.json --out artifacts/svg"
  ].join("\n"));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function getString(value: string | boolean | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: string | boolean | string[] | undefined, fallback: number): number {
  const str = getString(value);
  if (!str) return fallback;
  const num = Number(str);
  return Number.isFinite(num) ? num : fallback;
}

function getOptionalNumber(value: string | boolean | string[] | undefined): number | undefined {
  const str = getString(value);
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

function getBool(value: string | boolean | string[] | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function getList(value: string | boolean | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return splitList(value);
  return [];
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function getModelGraphLevel(args: Record<string, string | boolean | string[]>): ModelGraphLevel | undefined {
  const level = getString(args.level);
  if (level === "overview" || level === "representative-block" || level === "layer-strip" || level === "debug-graph") return level;
  return undefined;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "llm-architecture";
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
