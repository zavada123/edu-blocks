import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"
import { type AssetPack, assetRefsOf, type TileInfo } from "./assets.ts"
import { checkLevel } from "./kit.ts"
import type { Level, TerrainPaint } from "./level.ts"
import { baseTiles, paintCell, paintSprites, paintTiles, parseTerrainRef, pickTile, shapeAt, terrainIssues } from "./terrain.ts"

const ninja = JSON.parse(readFileSync(fileURLToPath(new URL("../../assets/ninja-adventure/manifest.json", import.meta.url)), "utf8")) as AssetPack
const tilesOf = (sprite: string): ReadonlyArray<TileInfo> | null => {
  const id = sprite.replace("ninja-adventure:", "")
  return ninja.sprites.find((s) => s.id === id)?.tiles ?? null
}
const floor = tilesOf("ninja-adventure:tileset/floor") ?? []
/** The tile at a column and row of `tileset-floor.png` (22 columns), numbered from 1. */
const at = (col: number, row: number) => row * 22 + col + 1

const PATH = "ninja-adventure:tileset/floor#path"
const GRASS = "ninja-adventure:tileset/floor#grass"

const cells = (rows: ReadonlyArray<string>) => (x: number, y: number) => rows[y]?.[x] === "p"

describe("shapeAt", () => {
  test("opens the sides where the ground ends", () => {
    const same = cells(["...", ".p.", "..."])
    expect(shapeAt(same, 1, 1)).toEqual({ mask: 15, corners: 0 })
  })

  test("opens an inner corner only where both sides go on", () => {
    // The north-east cell is missing: the middle cell gets an open NE corner.
    const same = cells(["pp.", "ppp", "ppp"])
    expect(shapeAt(same, 1, 1)).toEqual({ mask: 0, corners: 1 })
    // Above the painting is another ground, and so is the cell to the east of the top one.
    expect(shapeAt(same, 1, 0).mask).toBe(1 | 2)
  })
})

describe("the Ninja Adventure autotiles", () => {
  test("every tile of the 16 sides of a path is there", () => {
    for (let mask = 0; mask < 16; mask++) expect(pickTile(floor, "path", { mask, corners: 0 }), `mask ${mask}`).not.toBeNull()
  })

  test("the layout is read as the picture shows it", () => {
    expect(pickTile(floor, "path", { mask: 0, corners: 0 })).toBe(at(1, 8))
    expect(pickTile(floor, "path", { mask: 1 | 8, corners: 0 })).toBe(at(0, 7))
    expect(pickTile(floor, "path", { mask: 15, corners: 0 })).toBe(at(3, 10))
    expect(pickTile(floor, "path", { mask: 0, corners: 2 })).toBe(at(5, 8))
    expect(pickTile(floor, "path", { mask: 0, corners: 1 | 4 })).toBe(at(9, 7))
  })

  test("without a tile for every open corner, the closest one stands in", () => {
    // No tile has all four inner corners open; three of them is the best there is.
    const tile = pickTile(floor, "path", { mask: 0, corners: 15 })
    const info = floor.find((t) => t.index === tile)
    expect(info?.cornerMask?.toString(2).split("1").length).toBe(4)
  })

  test("water lies on grass of the same colour as the grass of the floor", () => {
    const water = tilesOf("ninja-adventure:tileset/water") ?? []
    expect(water.filter((t) => t.terrain === "water").every((t) => t.over === "grass")).toBe(true)
    expect(floor.some((t) => t.terrain === "grass" && t.role === "fill")).toBe(true)
  })
})

describe("paintTiles", () => {
  const paint: TerrainPaint = { x: 1, y: 2, kinds: { p: PATH }, rows: ["ppp", "..p"] }

  test("gives a tile to every painted cell, in level coordinates", () => {
    const tiles = paintTiles(paint, "p", tilesOf)
    expect(tiles.map((t) => [t.x, t.y])).toEqual([[1, 2], [2, 2], [3, 2], [3, 3]])
    // The left end of the path is open on three sides; where it turns down, the inner corner is open too.
    expect(tiles[0]?.tile).toBe(at(0, 10))
    expect(tiles[2]?.tile).toBe(at(7, 7))
  })

  test("draws nothing while the tileset is not there", () => {
    expect(paintTiles(paint, "p", () => null)).toEqual([])
  })

  test("the base covers the view with grass, a tuft here and there, the same every time", () => {
    const view = { x: -2, y: -2, width: 10, height: 10 }
    const tiles = baseTiles(GRASS, view, tilesOf)
    expect(tiles).toHaveLength(100)
    expect(tiles.filter((t) => t.tile === at(0, 12)).length).toBeGreaterThan(50)
    expect(new Set(tiles.map((t) => t.tile)).size).toBeGreaterThan(1)
    expect(baseTiles(GRASS, view, tilesOf)).toEqual(tiles)
  })
})

describe("paintCell", () => {
  const paint: TerrainPaint = { kinds: { p: PATH }, rows: [] }

  test("grows the rows to reach a cell and trims them back", () => {
    const one = paintCell(paint, 2, 1, "p")
    expect(one.rows).toEqual(["", "..p"])
    expect(paintCell(one, 2, 1, ".").rows).toEqual([])
  })

  test("leaves cells before the first row alone", () => {
    expect(paintCell({ ...paint, x: 1 }, 0, 0, "p")).toEqual({ ...paint, x: 1 })
  })
})

describe("checks", () => {
  const level: Level = {
    id: "t",
    title: "Тест",
    task: ["Дійди до прапорця."],
    map: ["S.F"],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    scene: { terrain: { base: GRASS, kinds: { p: PATH }, rows: ["pqp"] } }
  }

  test("a letter that paints nothing is a warning", () => {
    expect(terrainIssues(level)).toEqual([{ level: "warning", text: "Земля: літери «q» нічого не малюють." }])
    expect(checkLevel(level).some((i) => i.text.startsWith("Земля:"))).toBe(true)
  })

  test("a ground that is not sprite#terrain is an error", () => {
    const bad = { ...level, scene: { terrain: { kinds: { p: "ninja-adventure:tileset/floor" }, rows: ["p"] } } }
    expect(terrainIssues(bad).map((i) => i.level)).toEqual(["error"])
  })

  test("the packs of a painting are loaded with the level", () => {
    expect(assetRefsOf(level)).toEqual(["ninja-adventure:tileset/floor"])
    expect(paintSprites(level.scene?.terrain ?? { kinds: {}, rows: [] })).toEqual(["ninja-adventure:tileset/floor"])
    expect(parseTerrainRef(PATH)).toEqual({ sprite: "ninja-adventure:tileset/floor", terrain: "path" })
  })
})
