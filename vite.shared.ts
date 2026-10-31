// Vite settings shared by the demo (vite.config.ts) and the package build (vite.lib.config.ts).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, normalize, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

const require = createRequire(import.meta.url)
const MEDIA_DIR = join(dirname(require.resolve("scratch-blocks/package.json")), "media")
const MEDIA_URL = "/blocks-media/"

const TYPES: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".cur": "image/x-icon",
  ".json": "application/json",
  ".ogg": "audio/ogg"
}

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

// ── Asset packs ─────────────────────────────────────────────────────────────────────────────────────────────────

const PACKS_URL = "/packs/"
const PUBLIC_PACKS = fileURLToPath(new URL("assets", import.meta.url))
/** Folders the game never draws from: they stay out of the build. */
const SKIPPED = new Set(["audio"])

interface PackFolder {
  readonly id: string
  readonly dir: string
  readonly private: boolean
}

/** Pack folders: each subfolder of `root` with a manifest.json. */
const packFolders = (root: string, isPrivate: boolean): ReadonlyArray<PackFolder> =>
  existsSync(root)
    ? readdirSync(root)
        .filter((id) => existsSync(join(root, id, "manifest.json")))
        .map((id) => ({ id, dir: join(root, id), private: isPrivate }))
    : []

/**
 * The packs to serve: the public ones of `assets/`, and the private ones from the folder in
 * `EDU_BLOCKS_PRIVATE_ASSETS` when it is set. Private packs may not be published (see assets/README.md), so the
 * public demo is built without that variable; a private site sets it at build time.
 */
const allPacks = (): ReadonlyArray<PackFolder> => {
  const privateRoot = process.env.EDU_BLOCKS_PRIVATE_ASSETS
  const own = packFolders(PUBLIC_PACKS, false)
  const extra = privateRoot === undefined || privateRoot === "" ? [] : packFolders(resolve(privateRoot), true)
  return [...own, ...extra.filter((p) => !own.some((o) => o.id === p.id))]
}

/** The list of packs for the editor: what each is, who made it and its licence. */
const packIndex = (packs: ReadonlyArray<PackFolder>): string =>
  JSON.stringify(
    packs.map((p) => {
      const m = JSON.parse(readFileSync(join(p.dir, "manifest.json"), "utf8")) as Record<string, unknown>
      return { id: p.id, title: m.title, author: m.author, source: m.source, license: m.license, ...(p.private ? { private: true } : {}) }
    })
  )

const copyPack = (from: string, to: string) => {
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    if (SKIPPED.has(name)) continue
    const src = join(from, name)
    if (statSync(src).isDirectory()) copyPack(src, join(to, name))
    else cpSync(src, join(to, name))
  }
}

/** Serves the asset packs at ./packs/ in dev and copies them into the build, with `packs/index.json`. */
export const assetPacks = (): Plugin => ({
  name: "edu-blocks-asset-packs",
  configureServer(server) {
    server.middlewares.use(PACKS_URL, (req, res, next) => {
      const url = decodeURIComponent((req.url ?? "").split("?")[0] ?? "").replace(/^\/+/, "")
      const packs = allPacks()
      if (url === "index.json") {
        res.setHeader("Content-Type", TYPES[".json"] ?? "application/json")
        res.end(packIndex(packs))
        return
      }
      const [id = "", ...rest] = url.split("/")
      const pack = packs.find((p) => p.id === id)
      if (pack === undefined) return next()
      const path = normalize(join(pack.dir, ...rest))
      if (!path.startsWith(pack.dir + sep)) return next()
      try {
        const body = readFileSync(path)
        res.setHeader("Content-Type", TYPES[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream")
        res.end(body)
      } catch {
        next()
      }
    })
  },
  writeBundle(options) {
    if (options.dir === undefined) return
    const packs = allPacks()
    const out = join(options.dir, "packs")
    for (const p of packs) copyPack(p.dir, join(out, p.id))
    mkdirSync(out, { recursive: true })
    writeFileSync(join(out, "index.json"), packIndex(packs))
  }
})
