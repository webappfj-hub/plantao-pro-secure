import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
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
          "vendor-query": ["@tanstack/react-query"],
          "vendor-forms": ["react-hook-form", "zod", "@hookform/resolvers"],
          "vendor-icons": ["lucide-react"],
          "vendor-date": ["date-fns"],
          "vendor-pdf": ["jspdf", "jspdf-autotable", "html2canvas"],
          "vendor-recharts": ["recharts"],
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
