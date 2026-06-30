import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoBase = process.env.GITHUB_REPOSITORY?.endsWith("/llm-architecture-svg") ? "/llm-architecture-svg/" : "/";

export default defineConfig({
  root: __dirname,
  base: repoBase,
  plugins: [react()],
  resolve: {
    alias: {
      "@mappedinfo/llm-architecture-svg": path.resolve(__dirname, "../src/index.ts")
    }
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")]
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});

