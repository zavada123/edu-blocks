/**
 * A Tiled map as a level: `npm run tiled -- tiled/farm.tmj --name farmMockup > src/demo/farm-mockup.ts`.
 *
 * Reads the `.tmj` file and the `.tsx` tileset next to it, finds the tileset's picture in the asset packs
 * (`assets/<pack>/manifest.json`) and prints the level as TypeScript. Errors and warnings go to stderr; with an error
 * nothing is printed and the exit code is 1. See «Карта з Tiled» in the README.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { levelSource } from "../src/core/kit.ts"
import { levelFromTiled } from "../src/core/tiled.ts"

const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), "../assets")

interface Manifest {
  readonly id: string
  readonly sprites: ReadonlyArray<{ readonly id: string; readonly file: string }>
}

/** The pack sprite of every picture file of the packs, by its full path. */
const packPictures = (): ReadonlyMap<string, string> => {
  const pictures = new Map<string, string>()
  for (const pack of readdirSync(ASSETS)) {
    const path = join(ASSETS, pack, "manifest.json")
    if (!existsSync(path)) continue
    const manifest = JSON.parse(readFileSync(path, "utf8")) as Manifest
    for (const sprite of manifest.sprites) pictures.set(resolve(ASSETS, pack, sprite.file), `${manifest.id}:${sprite.id}`)
  }
  return pictures
}

/** The picture of a tileset: the image of a `.tsx` file, or the image itself. */
const tilesetImage = (source: string, base: string): string => {
  const path = resolve(base, source)
  if (!path.endsWith(".tsx")) return path
  const image = /<image\b[^>]*\bsource="([^"]+)"/.exec(readFileSync(path, "utf8"))?.[1]
  return image === undefined ? path : resolve(dirname(path), image)
}

/** Lists of numbers on one line each: a tile layer is hundreds of numbers. */
const compactNumbers = (source: string): string =>
  source.replace(/\[\s*(-?\d+(?:,\s*-?\d+)*)\s*\]/g, (_, list: string) => `[${list.split(/,\s*/).join(", ")}]`)

const main = (args: ReadonlyArray<string>): number => {
  const file = args.find((a) => !a.startsWith("--"))
  const nameAt = args.indexOf("--name")
  const name = nameAt >= 0 ? (args[nameAt + 1] ?? "level") : "level"
  if (file === undefined) {
    process.stderr.write("Як: npm run tiled -- <карта.tmj> [--name назваЗмінної] > рівень.ts\n")
    return 2
  }
  const pictures = packPictures()
  const base = dirname(resolve(file))
  const { level, issues } = levelFromTiled(JSON.parse(readFileSync(file, "utf8")), {
    tileset: (source) => pictures.get(tilesetImage(source, base)) ?? null
  })
  for (const issue of issues) process.stderr.write(`${issue.level === "error" ? "Помилка" : "Порада"}: ${issue.text}\n`)
  if (level === null) return 1
  process.stdout.write(
    `import type { Level } from "../core/level.ts"\n\n// Made by scripts/tiled-to-level.ts from ${file}: change the map in Tiled and run it again.\nexport const ${name}: Level = ${compactNumbers(levelSource(level))}\n`
  )
  return 0
}

process.exitCode = main(process.argv.slice(2))
