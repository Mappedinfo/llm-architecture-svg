#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_GPT_TEMPLATE_PARAMS, generateGptArchitecture, validateGptTemplateParams } from "./generator";
import { ArchitectureSpec, GptTemplateParams } from "./types";
import { RenderArchitectureSvgOptions, renderArchitectureSvg } from "./svg";

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
  if (args.batch) {
    runBatch(args);
    return;
  }

  const out = getString(args.out);
  if (!out) fail("Missing --out.");
  const architecture = args.spec ? readJson<ArchitectureSpec>(getString(args.spec)!) : generateFromArgs(args);
  writeFile(out, renderArchitectureSvg(architecture, optionsFromArgs(args, architecture.name)));
  console.log(`Wrote ${out}`);
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
  if (preset !== "gpt") fail(`Unsupported --preset ${preset}. Only "gpt" is available.`);
  return generateFromParams({
    ...DEFAULT_GPT_TEMPLATE_PARAMS,
    T: getNumber(args.T, DEFAULT_GPT_TEMPLATE_PARAMS.T),
    C: getNumber(args.C, DEFAULT_GPT_TEMPLATE_PARAMS.C),
    nHeads: getNumber(args.nHeads, DEFAULT_GPT_TEMPLATE_PARAMS.nHeads),
    nBlocks: getNumber(args.nBlocks, DEFAULT_GPT_TEMPLATE_PARAMS.nBlocks),
    vocabSize: getNumber(args.vocabSize, DEFAULT_GPT_TEMPLATE_PARAMS.vocabSize),
    bias: getBool(args.bias, DEFAULT_GPT_TEMPLATE_PARAMS.bias),
    tieEmbeddings: getBool(args.tieEmbeddings, DEFAULT_GPT_TEMPLATE_PARAMS.tieEmbeddings)
  }, getString(args.title));
}

function generateFromParams(params: GptTemplateParams, title?: string): ArchitectureSpec {
  const issues = validateGptTemplateParams(params);
  if (issues.length > 0) fail(issues.join(" "));
  return generateGptArchitecture(params, title ? { name: title } : {});
}

function optionsFromArgs(args: Record<string, string | boolean | string[]>, fallbackTitle: string): RenderArchitectureSvgOptions {
  return {
    title: getString(args.title) ?? fallbackTitle,
    width: getNumber(args.width, 1100),
    padding: getNumber(args.padding, 36),
    showShapes: getBool(args.showShapes, true),
    showParamCounts: getBool(args.showParamCounts, true),
    expandedGroups: getList(args.expand),
    theme: getString(args.theme) === "blueprint" ? "blueprint" : "paper"
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "llm-architecture";
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
