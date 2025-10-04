// vite.config.ts
import { defineConfig } from "vite";
// Use URL and import.meta.url for path resolution in Vite config

export default defineConfig({
  build: {
    lib: {
      // Main entry point for the library
      entry: new URL("src/main.ts", import.meta.url).pathname,
      name: "SuperAxios", // UMD/IIFE global variable name
      formats: ["es", "cjs", "umd"], // Support ESM, CJS, and UMD
    },
    rollupOptions: {
      // Externalize dependencies to avoid bundling axios
      external: ["axios"],
      output: {
        globals: {
          axios: "axios",
        },
        entryFileNames: `index.[format].js`,
        chunkFileNames: `index.[name].[format].js`,
        assetFileNames: `index.[name].[ext]`,
      },
    },
    minify: "esbuild", // Use esbuild for faster minification
  },
});
