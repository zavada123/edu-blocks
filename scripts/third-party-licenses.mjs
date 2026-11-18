// Writes lib/THIRD-PARTY-LICENSES.txt: the license texts of the packages that `npm run build:lib` bundles into lib/
// (they are devDependencies, so a site that installs edu-blocks does not get their license files).
// MIT, BSD, Apache-2.0, and MPL-2.0 require these notices to go with the copies. Run: `node scripts/third-party-licenses.mjs`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

/** The packages that the library build bundles (see vite.lib.config.ts); their dependencies are found from here. */
const BUNDLED = [
  "scratch-vm",
  "scratch-blocks",
  "@codemirror/autocomplete",
  "@codemirror/commands",
  "@codemirror/lang-python",
  "@codemirror/language",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/highlight",
  "buffer",
  "events"
]

const NOTICE_FILE = /^(licen[cs]e|copying|notice|copyright)(\..*)?$/i

/** Node resolution: the nearest node_modules/<name> from the folder up to the root. */
const resolve = (name, from) => {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name)
    if (existsSync(join(candidate, "package.json"))) return candidate
    if (dir === root || dirname(dir) === dir) return null
  }
}

const licenseOf = (pkg) => {
  const value = pkg.license ?? pkg.licenses
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map((l) => (typeof l === "string" ? l : l.type)).join(" OR ")
  if (value !== null && typeof value === "object") return String(value.type)
  return "see the package"
}

const homepageOf = (pkg) => {
  if (typeof pkg.homepage === "string") return pkg.homepage
  if (typeof pkg.repository === "string") return pkg.repository
  if (pkg.repository !== null && typeof pkg.repository === "object") return String(pkg.repository.url)
  return ""
}

const found = new Map()
const queue = BUNDLED.map((name) => [name, root])
while (queue.length > 0) {
  const [name, from] = queue.pop()
  const dir = resolve(name, from)
  if (dir === null) throw new Error(`${name} is not installed: run npm ci first`)
  if (found.has(dir)) continue
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
  found.set(dir, pkg)
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
    if (resolve(dep, dir) !== null) queue.push([dep, dir])
  }
}

const entries = [...found.entries()].sort(([, a], [, b]) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`))
const rule = "=".repeat(80)
const parts = entries.map(([dir, pkg]) => {
  const files = readdirSync(dir).filter((file) => NOTICE_FILE.test(file)).sort()
  const texts = files.map((file) => readFileSync(join(dir, file), "utf8").trim())
  const body = texts.length > 0 ? texts.join("\n\n") : `No license file in the package. License: ${licenseOf(pkg)}.`
  return [rule, `${pkg.name}@${pkg.version}`, `License: ${licenseOf(pkg)}`, `Home: ${homepageOf(pkg)}`, rule, "", body, ""].join("\n")
})

const header = [
  "edu-blocks: third-party software bundled in lib/",
  "",
  "The edu-blocks code is under the MIT license (LICENSE). The bundled packages below keep their own licenses.",
  "Where a package offers a choice of licenses, edu-blocks uses it under the permissive one (MIT, BSD, or Apache-2.0).",
  "MPL-2.0 packages are not modified. scratch-vm is TurboWarp's fork, commit f26ff67e951258a84d25cad3acaf8804eb202318:",
  "https://github.com/TurboWarp/scratch-vm/tree/f26ff67e951258a84d25cad3acaf8804eb202318 (source code of that version).",
  "The source code of the other MPL-2.0 packages is at the address in \"Home\".",
  "Fonts: src/ui/fonts/OFL-*.txt. Graphics and sounds: assets/*/ (each pack has its license).",
  ""
].join("\n")

writeFileSync(join(root, "lib", "THIRD-PARTY-LICENSES.txt"), `${header}\n${parts.join("\n")}`)
console.log(`lib/THIRD-PARTY-LICENSES.txt: ${entries.length} packages`)
