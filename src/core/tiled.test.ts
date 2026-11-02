import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { farmMockup } from "../demo/farm-mockup.ts"
import { solveLevel } from "./solve.ts"
import { levelFromTiled, type TiledOptions } from "./tiled.ts"
import { tilemapFor, tilesOfKind } from "./tilemap.ts"

const packs: TiledOptions = { tileset: (source) => (source.endsWith("sunnyside-16px.tsx") ? "sunnyside:tileset/16px" : null) }

/** A 4×3 map: a walk layer over the middle row, ground, a coop layer bought later, and start, goal and a sprite. */
const sample = (more: Record<string, unknown> = {}) => ({
  orientation: "orthogonal",
  width: 4,
  height: 3,
  tilewidth: 16,
  tileheight: 16,
  infinite: false,
  properties: [{ name: "title", type: "string", value: "Зразок" }],
  tilesets: [{ firstgid: 1, source: "sunnyside-16px.tsx" }],
  layers: [
    { type: "tilelayer", name: "ground", width: 4, height: 3, data: Array.from({ length: 12 }, () => 66) },
    { type: "tilelayer", name: "walk", width: 4, height: 3, data: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0] },
    {
      type: "tilelayer",
      name: "coop",
      width: 4,
      height: 3,
      data: [0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      properties: [
        { name: "kind", type: "string", value: "objects" },
        { name: "upgrade", type: "string", value: "coop" }
      ]
    },
    { type: "tilelayer", name: "above", width: 4, height: 3, data: [0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0] },
    {
      type: "objectgroup",
      name: "things",
      objects: [
        { name: "start", type: "start", x: 8, y: 24, point: true, properties: [{ name: "dir", type: "string", value: "right" }] },
        { name: "finish", type: "finish", x: 56, y: 24, point: true },
        { name: "cow", x: 40, y: 40, point: true, properties: [{ name: "sprite", type: "string", value: "sunnyside:animal/cow" }, { name: "frame", type: "int", value: 2 }] }
      ]
    }
  ],
  ...more
})

const errorsOf = (json: unknown) => levelFromTiled(json, packs).issues.filter((i) => i.level === "error").map((i) => i.text)

describe("levelFromTiled", () => {
  test("turns the layers, the walk layer and the point objects into a level", () => {
    const { level, issues } = levelFromTiled(sample(), packs)
    expect(issues.filter((i) => i.level === "error")).toEqual([])
    expect(level?.title).toBe("Зразок")
    expect(level?.map).toEqual(["####", "S..F", "####"])
    expect(level?.dir).toBe("right")
    expect(level?.goals).toEqual([{ type: "finish" }])
    expect(level?.scene?.sprites).toEqual([{ asset: "sunnyside:animal/cow", x: 2, y: 2, frame: 2 }])
    const map = level?.scene?.tilemap
    expect(map?.tileset).toBe("sunnyside:tileset/16px")
    expect(map?.layers.map((l) => [l.name, l.kind, l.when])).toEqual([
      ["ground", "ground", undefined],
      ["coop", "objects", "coop"],
      ["above", "above", undefined]
    ])
  })

  test("numbers the tiles from the tileset's first gid and drops flips with a warning", () => {
    const json = sample({ tilesets: [{ firstgid: 11, source: "sunnyside-16px.tsx" }] })
    for (const layer of json.layers as Array<{ data?: Array<number> }>) if (layer.data !== undefined) layer.data = layer.data.map((t) => (t === 0 ? 0 : t + 10))
    const ground = json.layers[0] as { data: Array<number> }
    ground.data = [11, 12, 0x80000000 + 13, ...Array.from({ length: 9 }, () => 11)]
    const { level, issues } = levelFromTiled(json, packs)
    expect(level?.scene?.tilemap?.layers[0]?.data.slice(0, 3)).toEqual([1, 2, 3])
    expect(issues.some((i) => i.level === "warning" && i.text.includes("Перевернутих плиток: 1"))).toBe(true)
  })

  test("a tileset that is not from the packs is an error", () => {
    expect(errorsOf(sample({ tilesets: [{ firstgid: 1, source: "my-tiles.tsx" }] }))).toEqual([
      "Тайлсет «my-tiles.tsx» не з паків: візьми тайлсет пака, наприклад sunnyside-16px.tsx"
    ])
    expect(errorsOf(sample({ tilesets: [{ firstgid: 1, source: "sunnyside-16px.tsx" }, { firstgid: 5000, source: "sunnyside-16px.tsx" }] }))).toEqual([
      "Карта має брати плитки з одного тайлсету"
    ])
  })

  test("the map must have 16-pixel tiles, a fixed size and layers of that size", () => {
    expect(errorsOf(sample({ tilewidth: 32, tileheight: 32 }))).toEqual(["Плитки карти мають бути 16×16 пікселів"])
    expect(errorsOf(sample({ infinite: true }))).toEqual(["Нескінченна карта не підходить: вимкни Infinite у властивостях карти"])
    const json = sample()
    ;(json.layers[0] as { data: Array<number> }).data = [1, 2]
    expect(errorsOf(json)).toEqual(["Шар «ground» має 2 плиток, а карта 4×3"])
  })

  test("the walk layer must be there and the start and the goal must stand on it", () => {
    const noWalk = sample()
    noWalk.layers = noWalk.layers.filter((l) => l.name !== "walk")
    expect(errorsOf(noWalk)[0]).toContain("Немає шару «walk»")
    const off = sample()
    const things = off.layers[4] as { objects: Array<{ y: number }> }
    if (things.objects[1]) things.objects[1].y = 8
    expect(errorsOf(off)).toEqual(["Мета на 3, 0 стоїть не на клітинці шару walk"])
    const noStart = sample()
    ;(noStart.layers[4] as { objects: Array<unknown> }).objects.splice(0, 1)
    expect(errorsOf(noStart)).toEqual(["На карті має бути один об'єкт start, а є 0"])
  })

  test("warns about objects that stand where the hero walks", () => {
    const json = sample()
    ;(json.layers[2] as { data: Array<number> }).data = [0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0]
    const { issues } = levelFromTiled(json, packs)
    expect(issues.some((i) => i.level === "warning" && i.text.includes("об'єкти карти"))).toBe(true)
  })
})

describe("the farm map in tiled/", () => {
  const { level, issues } = levelFromTiled(JSON.parse(readFileSync("tiled/farm.tmj", "utf8")), packs)

  test("imports without errors, and the solver passes the level", () => {
    expect(issues.filter((i) => i.level === "error")).toEqual([])
    expect(level).not.toBeNull()
    expect(solveLevel(level ?? farmMockup).kind).toBe("solved")
  })

  test("the demo level is the import of the map as it is now: run `npm run tiled` after a change", () => {
    expect(level).toEqual(farmMockup)
  })

  test("the coop and its yard show only once the coop is bought", () => {
    const map = farmMockup.scene?.tilemap
    if (map === undefined) throw new Error("the mockup has no tile map")
    const coopTiles = tilesOfKind(map, "objects", true).length - tilesOfKind(map, "objects").length
    expect(coopTiles).toBeGreaterThan(20)
    expect(tilesOfKind(tilemapFor(map, new Set(["coop"])), "objects")).toHaveLength(tilesOfKind(map, "objects", true).length)
    expect(tilesOfKind(tilemapFor(map, new Set()), "objects", true)).toHaveLength(tilesOfKind(map, "objects").length)
  })
})
