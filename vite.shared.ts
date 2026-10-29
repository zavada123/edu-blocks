// Vite settings shared by the demo (vite.config.ts) and the package build (vite.lib.config.ts).
import { cpSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

const require = createRequire(import.meta.url)
const MEDIA_DIR = join(dirname(require.resolve("scratch-blocks/package.json")), "media")
const MEDIA_URL = "/blocks-media/"

const TYPES: Readonly<Record<string, string>> = { ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".cur": "image/x-icon" }

/** Serves the block icons of scratch-blocks (green flag, loop arrow, cursors) in dev and copies them into the build. */
export const blocksMedia = (): Plugin => ({
  name: "edu-blocks-media",
  configureServer(server) {
    server.middlewares.use(MEDIA_URL, (req, res, next) => {
      const path = normalize(join(MEDIA_DIR, decodeURIComponent((req.url ?? "").split("?")[0] ?? "")))
      if (!path.startsWith(MEDIA_DIR)) return next()
      try {
        const body = readFileSync(path)
        const ext = path.slice(path.lastIndexOf("."))
        res.setHeader("Content-Type", TYPES[ext] ?? "application/octet-stream")
        res.end(body)
      } catch {
        next()
      }
    })
  },
  writeBundle(options) {
    if (options.dir !== undefined) cpSync(MEDIA_DIR, join(options.dir, "blocks-media"), { recursive: true })
  }
})

const LOADER_STUB = fileURLToPath(new URL("src/core/webpack-loader-stub.js", import.meta.url))

const WEBPACK_LOADER = /^(?:[\w@/.-]*-loader(?:\?[^!]*)?!|\.\/tw-load-script-as-plain-text!)/
/** Built-in Scratch extensions (music with its samples, video, robots). Only pen stays: grade 6 draws with it. */
const UNUSED_EXTENSION = /^\.\.\/extensions\/(?!scratch3_pen$)/

/**
 * The VM imports a few files with webpack loader syntax (`worker-loader?…!`, `base64-loader!`): workers and iframes
 * for third-party extensions and fonts for SVG costumes. This package uses neither, so they resolve to a stub,
 * and so do the built-in extensions it does not use.
 */
const webpackLoaderStub: Plugin = {
  name: "edu-blocks-webpack-loader-stub",
  enforce: "pre",
  resolveId: (id: string, importer?: string) =>
    WEBPACK_LOADER.test(id) || (UNUSED_EXTENSION.test(id) && importer?.endsWith("extension-manager.js") === true) ? LOADER_STUB : null
}

/** What the TurboWarp VM needs from a bundler: it is written for webpack and uses Node's `global`, `events` and `buffer`. */
export const vmCompat = {
  plugins: [webpackLoaderStub],
  define: { global: "globalThis" },
  resolve: {
    alias: [
      { find: /^events$/, replacement: "events/" },
      { find: /^buffer$/, replacement: "buffer/" }
    ]
  },
  optimizeDeps: { rolldownOptions: { plugins: [webpackLoaderStub] } }
}
