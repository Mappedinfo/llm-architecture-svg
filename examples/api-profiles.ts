import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ArchitectureSpec, BUILTIN_SVG_PROFILES, generateGptArchitecture, renderArchitectureSvg } from "../src";

const outDir = "artifacts/demo/profiles";
mkdirSync(outDir, { recursive: true });

const base = generateGptArchitecture({
  T: 64,
  C: 192,
  nHeads: 3,
  nBlocks: 3,
  vocabSize: 1000,
  bias: false,
  tieEmbeddings: true
});

const profileNames = Object.keys(BUILTIN_SVG_PROFILES) as Array<keyof typeof BUILTIN_SVG_PROFILES>;
for (const profile of profileNames) {
  const spec = profile === "teaching-debug" ? makeTeachingMismatch(base) : base;
  const svg = renderArchitectureSvg(spec, {
    profile,
    title: profile === "textbook-overview" ? undefined : `Profile: ${profile}`,
    width: profile === "textbook-overview" ? 720 : 1100
  });
  const outPath = join(outDir, `${profile}.svg`);
  writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath}`);
}

function makeTeachingMismatch(spec: ArchitectureSpec): ArchitectureSpec {
  return {
    ...spec,
    nodes: spec.nodes.map((node) => {
      if (node.id !== "block_0") return node;
      return {
        ...node,
        children: node.children?.map((child) => child.id === "block_0_q" ? { ...child, shape: { ...child.shape, A: 999 } } : child)
      };
    })
  };
}
