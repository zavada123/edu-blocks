import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { blocksMedia, vmCompat } from "./vite.shared.ts"

// The package build into lib/, in two passes (the demo build, vite.config.ts, goes to dist/):
// - `--mode core`: `core.js` for the server. The VM stays an import of `scratch-vm`, which Node loads as is.
// - default: `react.js` for the browser, with the VM and scratch-blocks bundled in, `style.css` and the block icons.
export default defineConfig(({ mode }) =>
  mode === "core"
    ? {
        build: {
          outDir: "lib",
          emptyOutDir: false,
          minify: false,
          lib: { entry: { core: "src/core.ts" }, formats: ["es"] },
          rollupOptions: { external: [/^scratch-vm(\/.*)?$/] }
        }
      }
    : {
        ...vmCompat,
        plugins: [react(), blocksMedia(), ...vmCompat.plugins],
        build: {
          outDir: "lib",
          emptyOutDir: true,
          // The page that uses the package minifies it with its own build.
          minify: false,
          lib: { entry: { react: "src/react.ts" }, formats: ["es"], cssFileName: "style" },
          rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] }
        }
      }
)
