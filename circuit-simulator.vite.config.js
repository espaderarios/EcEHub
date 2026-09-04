import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "circuit-simulator"),
    },
  },
  build: {
    outDir: ".",
    emptyOutDir: false,
    lib: {
      entry: "circuit-simulator/simulator-entry.jsx",
      name: "EcECircuitSimulator",
      fileName: () => "circuit-simulator.bundle.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "circuit-simulator.[ext]",
      },
    },
  },
});
