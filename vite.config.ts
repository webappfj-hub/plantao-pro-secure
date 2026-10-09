import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const VENDOR_CHUNKS: Record<string, string[]> = {
  "vendor-react": ["react", "react-dom", "react-router-dom", "react-router", "scheduler", "clsx", "tailwind-merge"],
  "vendor-radix": [
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-popover",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-scroll-area",
  ],
  "vendor-supabase": ["@supabase/supabase-js"],
  "vendor-query": ["@tanstack/react-query", "@tanstack/query-core"],
  "vendor-forms": ["react-hook-form", "zod", "@hookform/resolvers"],
  "vendor-icons": ["lucide-react"],
  "vendor-date": ["date-fns"],
  "vendor-pdf": ["jspdf", "jspdf-autotable", "html2canvas"],
  "vendor-recharts": ["recharts"],
};

export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [".csb.app", "ym5d62-4173.csb.app"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2018",
    chunkSizeWarningLimit: 500,
    modulePreload: { polyfill: false },
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Função (e não objeto): no formato objeto o Rollup também joga nesses
        // chunks as dependências COMPARTILHADAS dos pacotes (ex.: clsx do
        // recharts, helpers do babel do jspdf) — e aí a home, que usa clsx,
        // passava a importar e pré-carregar vendor-recharts (384 kB) e
        // vendor-pdf (650 kB) inteiros. Casando só o diretório do próprio
        // pacote, cada chunk fica só com o que é dele.
        manualChunks(id: string) {
          // O helper de preload do Vite e o clsx são usados pela home; se ficarem
          // soltos, o Rollup os "puxa" para dentro de vendor-pdf/vendor-recharts.
          if (id.includes("vite/preload-helper")) return "vendor-react";
          const norm = id.split("\\").join("/");
          if (!norm.includes("node_modules/")) return;
          const pkg = norm.split("node_modules/").pop()!.split("/");
          const name = pkg[0].startsWith("@") ? `${pkg[0]}/${pkg[1]}` : pkg[0];
          for (const [chunk, pkgs] of Object.entries(VENDOR_CHUNKS)) {
            if (pkgs.includes(name)) return chunk;
          }
        },
      },
    },
  },
  optimizeDeps: {
    // recharts used to be excluded here for a smaller dev boot, but that
    // stops Vite's dependency scanner from crawling into it — so it never
    // discovers (and never CJS→ESM-converts) recharts' own CJS-only
    // dependencies (lodash subpaths, react-is, etc.). The browser's native
    // ESM loader then fails on those raw node_modules files the moment any
    // recharts-based screen renders ("does not provide an export named
    // 'default'"). Pre-bundling recharts fixes that; the dev-boot cost is a
    // one-time hit, not worth the breakage.
    exclude: ["three", "@react-three/fiber", "@react-three/drei", "jspdf", "html2canvas"],
  },

}));
