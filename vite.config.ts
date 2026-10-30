import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { blocksMedia, vmCompat } from "./vite.shared.ts"

// Relative base so the demo works from GitHub Pages (/edu-blocks/) and from any subfolder.
export default defineConfig({
  ...vmCompat,
  base: "./",
  plugins: [react(), blocksMedia(), ...vmCompat.plugins],
  build: {
    // The game and the level editor.
    rollupOptions: { input: { main: "index.html", editor: "editor.html" } }
  },
  test: {
    include: ["src/**/*.test.ts"]
  }
})
