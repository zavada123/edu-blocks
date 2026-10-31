import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"
import { type AssetPack, clipDuration, frameAt, frameIndexAt, packProblems, type SpriteAsset } from "./assets.ts"

const ASSETS = fileURLToPath(new URL("../../assets", import.meta.url))

const packs: ReadonlyArray<{ readonly dir: string; readonly pack: AssetPack }> = readdirSync(ASSETS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(ASSETS, entry.name, "manifest.json")))
  .map((entry) => ({
    dir: join(ASSETS, entry.name),
    pack: JSON.parse(readFileSync(join(ASSETS, entry.name, "manifest.json"), "utf8")) as AssetPack
  }))

/** Width and height from a PNG header (the IHDR chunk right after the signature). */
const pngSize = (path: string): readonly [number, number] => {
  const head = readFileSync(path).subarray(0, 24)
  return [head.readUInt32BE(16), head.readUInt32BE(20)]
}

const ninja: SpriteAsset = {
  id: "character/ninja",
  file: "ninja.png",
  category: "character",
  name: "Ninja",
  size: [64, 112],
  frame: [16, 16],
  layout: "directions",
  clips: {
    walk: { frames: { down: [0, 4, 8, 12], up: [1, 5, 9, 13], left: [2, 6, 10, 14] }, fps: 8, loop: true, mirror: { right: "left" } },
    attack: { frames: [16, 17], fps: 10, loop: false },
    swing: { frames: [1], fps: 10, loop: false, file: "swing.png", frame: [32, 32], size: [64, 32] }
  }
}

describe("asset clips", () => {
  test("a looping clip starts over, a clip that plays once holds its last frame", () => {
    expect([0, 124, 125, 499, 500].map((ms) => frameIndexAt(4, 8, true, ms))).toEqual([0, 0, 1, 3, 0])
    expect(frameIndexAt(4, 8, false, 5000)).toBe(3)
  })

  test("walking down takes the first column of the sheet, row by row", () => {
    expect(frameAt(ninja, "walk", "down", 0)).toEqual({ file: "ninja.png", sx: 0, sy: 0, w: 16, h: 16, flip: false })
    expect(frameAt(ninja, "walk", "down", 250)).toEqual({ file: "ninja.png", sx: 0, sy: 32, w: 16, h: 16, flip: false })
  })

  test("a direction the sheet lacks is the mirrored one, flipped", () => {
    expect(frameAt(ninja, "walk", "right", 130)).toEqual({ file: "ninja.png", sx: 32, sy: 16, w: 16, h: 16, flip: true })
  })

  test("a clip with its own picture is cut from that picture", () => {
    expect(frameAt(ninja, "swing", "up", 0)).toEqual({ file: "swing.png", sx: 32, sy: 0, w: 32, h: 32, flip: false })
  })

  test("an unknown clip draws nothing", () => {
    expect(frameAt(ninja, "fly", "down", 0)).toBeNull()
  })

  test("a clip lasts its frames over its speed", () => {
    expect(ninja.clips?.["attack"] && clipDuration(ninja.clips["attack"])).toBe(200)
  })

  test("frames outside the picture and missing portraits are reported", () => {
    const broken: AssetPack = {
      id: "test",
      title: "Test",
      author: "",
      source: "",
      license: { name: "CC0", url: "", redistribute: "yes" },
      cell: 16,
      sprites: [{ ...ninja, portrait: "portrait/none", clips: { walk: { frames: [28], fps: 8, loop: true } } }]
    }
    expect(packProblems(broken)).toEqual(["character/ninja: no portrait portrait/none", "character/ninja walk: frame 28 is outside the 28 cells"])
  })
})

describe("asset manifests in the repository", () => {
  test("the free packs are there", () => {
    expect(packs.map((p) => p.pack.id).sort()).toEqual(["farming-crops", "ninja-adventure", "sunnyside"])
  })

  test.each(packs.map((p) => [p.pack.id, p] as const))("%s: only packs whose files may be shared", (_id, { pack }) => {
    expect(pack.license.redistribute).not.toBe("no")
  })

  test.each(packs.map((p) => [p.pack.id, p] as const))("%s: ids, frames and portraits add up", (_id, { pack }) => {
    expect(packProblems(pack)).toEqual([])
  })

  test.each(packs.map((p) => [p.pack.id, p] as const))("%s: every picture is there and has the size the manifest says", (_id, { dir, pack }) => {
    const wrong: string[] = []
    for (const sprite of pack.sprites) {
      const pictures = [
        [sprite.file, sprite.size] as const,
        ...Object.values(sprite.clips ?? {}).flatMap((c) => (c.file === undefined ? [] : [[c.file, c.size ?? sprite.size] as const]))
      ]
      for (const [file, size] of pictures) {
        const path = join(dir, file)
        if (!existsSync(path)) wrong.push(`${sprite.id}: no ${file}`)
        else if (pngSize(path).join("×") !== size.join("×")) wrong.push(`${sprite.id}: ${file} is ${pngSize(path).join("×")}, not ${size.join("×")}`)
      }
    }
    for (const sound of pack.sounds ?? []) if (!existsSync(join(dir, sound.file))) wrong.push(`${sound.id}: no ${sound.file}`)
    expect(wrong).toEqual([])
  })
})
