import { describe, expect, test } from "vitest"
import { farmMockup } from "../demo/farm-mockup.ts"
import { checkLevel } from "./kit.ts"
import type { Level, TileMap } from "./level.ts"
import { layerTiles, tilemapIssues, tilemapView, tilesOfKind } from "./tilemap.ts"

const level: Level = {
  id: "t",
  title: "Тест",
  task: ["Дійди до прапорця."],
  map: ["####", "#SF#", "####"],
  blocks: ["move"],
  goals: [{ type: "finish" }]
}

const map = (layers: TileMap["layers"], more: Partial<TileMap> = {}): TileMap => ({ tileset: "sunnyside:tileset/16px", width: 4, height: 3, layers, ...more })

const empty = Array.from({ length: 12 }, () => 0)
/** A layer with the given tiles at the given cells of a 4×3 map. */
const withTiles = (cells: Record<number, number>) => empty.map((t, i) => cells[i] ?? t)

describe("layerTiles", () => {
  test("gives the cells of the tiles that are not empty, moved by the map's place", () => {
    const layer = { name: "objects", kind: "objects" as const, data: withTiles({ 0: 5, 6: 9 }) }
    expect(layerTiles(map([layer]), layer)).toEqual([
      { x: 0, y: 0, tile: 5 },
      { x: 2, y: 1, tile: 9 }
    ])
    expect(layerTiles(map([layer], { x: -1, y: 2 }), layer)).toEqual([
      { x: -1, y: 2, tile: 5 },
      { x: 1, y: 3, tile: 9 }
    ])
  })

  test("takes tiles of one kind from every layer of that kind, in order", () => {
    const m = map([
      { name: "ground", kind: "ground", data: withTiles({ 1: 2 }) },
      { name: "above", kind: "above", data: withTiles({ 2: 3 }) },
      { name: "detail", kind: "ground", data: withTiles({ 0: 4 }) }
    ])
    expect(tilesOfKind(m, "ground").map((t) => t.tile)).toEqual([2, 4])
    expect(tilesOfKind(m, "objects")).toEqual([])
    expect(tilemapView(m)).toEqual({ x: 0, y: 0, width: 4, height: 3 })
  })
})

describe("tilemapIssues", () => {
  test("a level without a map has none", () => {
    expect(tilemapIssues(level)).toEqual([])
  })

  test("a map that fits the level has none", () => {
    const fence = { name: "objects", kind: "objects" as const, data: withTiles({ 0: 7, 11: 7 }) }
    expect(tilemapIssues({ ...level, scene: { tilemap: map([fence]) } })).toEqual([])
  })

  test("a layer of the wrong length or with a bad tile is an error", () => {
    const issues = tilemapIssues({
      ...level,
      scene: { tilemap: map([{ name: "short", kind: "ground", data: [1, 2] }, { name: "bad", kind: "ground", data: withTiles({ 3: 1.5 }) }]) }
    })
    expect(issues.filter((i) => i.level === "error").map((i) => i.text)).toEqual([
      "Шар «short» має 2 плиток, а карта 4×3",
      "У шарі «bad» є номер плитки, що не є цілим додатним"
    ])
  })

  test("a bad size is an error and nothing else is checked", () => {
    expect(tilemapIssues({ ...level, scene: { tilemap: map([], { width: 0 }) } })).toEqual([
      { level: "error", text: "Розмір карти плиток має бути цілим і не меншим за 1" }
    ])
  })

  test("warns when the map leaves part of the level undrawn", () => {
    const issues = tilemapIssues({ ...level, scene: { tilemap: map([], { width: 3 }) } })
    expect(issues).toHaveLength(1)
    expect(issues[0]?.level).toBe("warning")
  })

  test("warns about objects standing where the hero walks", () => {
    const rock = { name: "objects", kind: "objects" as const, data: withTiles({ 5: 7, 6: 7 }) }
    const issues = tilemapIssues({ ...level, scene: { tilemap: map([rock]) } })
    expect(issues).toEqual([{ level: "warning", text: expect.stringContaining("(2, перший на 1, 1)") }])
  })

  test("checkLevel reports them", () => {
    const rock = { name: "objects", kind: "objects" as const, data: withTiles({ 5: 7 }) }
    expect(checkLevel({ ...level, scene: { tilemap: map([rock]) } }).some((i) => i.text.includes("об'єкти карти"))).toBe(true)
  })

  test("the farm mockup has no errors and nothing on its path", () => {
    expect(tilemapIssues(farmMockup)).toEqual([])
    expect(checkLevel(farmMockup).filter((i) => i.level === "error")).toEqual([])
  })
})
