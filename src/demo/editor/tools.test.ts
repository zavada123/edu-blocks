import { describe, expect, test } from "vitest"
import type { Level } from "../../core/level.ts"
import { erase, paint } from "./edit.ts"
import { visibleScene } from "./layers.ts"
import { ENEMY_FIELDS, fieldIssues, fieldProblems } from "./fields.ts"
import { boxCells, fillArea, fillCells, fillsArea, MAX_FILL, paintBox, pickBrush } from "./tools.ts"

const level: Level = {
  id: "t",
  title: "Рівень",
  task: ["Збери кристали."],
  map: ["######", "#S..c#", "#.##.#", "######"],
  blocks: ["move", "collect"],
  goals: [{ type: "crystals" }]
}

const PATH = "ninja-adventure:tileset/floor#path"
const WATER = "ninja-adventure:tileset/water#water"

describe("box", () => {
  test("covers the cells between the corners, whichever way it was dragged", () => {
    expect(boxCells({ x0: 2, y0: 1, x1: 1, y1: 2 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ])
  })

  test("fills the map with the brush, or erases it", () => {
    const walls = paintBox(level, { kind: "tile", tile: "wall" }, { x0: 2, y0: 1, x1: 3, y1: 1 }, false)
    expect(walls.map[1]).toBe("#S##c#")
    const water = paintBox(level, { kind: "ground", ground: WATER }, { x0: 0, y0: 0, x1: 1, y1: 1 }, false)
    expect(water.scene?.terrain?.rows).toEqual(["aa", "aa"])
    expect(paintBox(water, { kind: "ground", ground: WATER }, { x0: 0, y0: 0, x1: 1, y1: 1 }, true).scene?.terrain).toBeUndefined()
  })

  test("figures, houses and the start do not fill areas", () => {
    expect(fillsArea({ kind: "tile", tile: "start" })).toBe(false)
    expect(fillsArea({ kind: "enemy", monster: "slime" })).toBe(false)
    expect(fillsArea({ kind: "tile", tile: "wall" })).toBe(true)
    expect(fillsArea({ kind: "ground", ground: PATH })).toBe(true)
  })
})

describe("bucket", () => {
  test("fills the joined cells of the same sign, sideways only", () => {
    const cells = fillCells(level, { kind: "tile", tile: "trap" }, 2, 1)
    expect(cells.map((c) => `${c.x},${c.y}`).sort()).toEqual(["2,1", "3,1"])
    expect(fillArea(level, { kind: "tile", tile: "wall" }, 0, 0, false)).toEqual(level)
  })

  test("fills a painted ground area and stops at another ground", () => {
    const painted = paint(paint(level, { kind: "ground", ground: PATH }, 1, 1), { kind: "ground", ground: PATH }, 2, 1)
    const filled = fillArea(painted, { kind: "ground", ground: WATER }, 1, 1, false)
    expect(filled.scene?.terrain?.rows[0]?.slice(0, 2)).toBe(filled.scene?.terrain?.rows[0]?.[0]?.repeat(2))
    expect(Object.values(filled.scene?.terrain?.kinds ?? {})).toEqual([WATER])
  })

  test("never fills more than the limit", () => {
    const big: Level = { ...level, map: Array.from({ length: 20 }, () => ".".repeat(20)) }
    expect(fillCells(big, { kind: "tile", tile: "wall" }, 0, 0)).toHaveLength(MAX_FILL)
  })
})

describe("eyedropper", () => {
  test("takes the brush of the topmost thing on the cell", () => {
    const withEnemy = paint(level, { kind: "enemy", monster: "goblin" }, 2, 1)
    expect(pickBrush(withEnemy, 2, 1)).toEqual({ kind: "enemy", monster: "goblin" })
    const tiled = paint(level, { kind: "sprite", asset: "p:tileset/a", tiles: [1, 2, 1, 1], layer: "ground" }, 3, 1)
    expect(pickBrush(tiled, 3, 1)).toEqual({ kind: "sprite", asset: "p:tileset/a", tiles: [1, 2, 1, 1], layer: "ground" })
    const ground = paint(level, { kind: "ground", ground: PATH }, 4, 1)
    expect(pickBrush(ground, 4, 1)).toEqual({ kind: "ground", ground: PATH })
    expect(pickBrush(level, 4, 1)).toEqual({ kind: "tile", tile: "item" })
    expect(pickBrush(level, -2, -2)).toBeNull()
  })
})

describe("layers", () => {
  const scene = {
    terrain: { kinds: { p: PATH }, rows: ["p"] },
    sprites: [
      { asset: "p:tileset/a", x: 1, y: 1, tiles: [0, 0, 1, 1] as const },
      { asset: "p:prop/rock", x: 2, y: 1 }
    ],
    props: [{ kind: "house" as const, x: 1, y: -3 }]
  }

  test("a hidden layer is left off the field", () => {
    expect(visibleScene(scene, new Set())).toBe(scene)
    expect(visibleScene(scene, new Set(["terrain"])).terrain).toBeUndefined()
    expect(visibleScene(scene, new Set(["decor"])).sprites).toEqual([scene.sprites[1]])
    const noObjects = visibleScene(scene, new Set(["objects"]))
    expect(noObjects.sprites).toEqual([scene.sprites[0]])
    expect(noObjects.props).toBeUndefined()
  })

  test("the eraser leaves locked layers alone", () => {
    const l: Level = { ...level, scene, enemies: [{ kind: "slime", x: 2, y: 1 }] }
    const keepObjects = (layer: string) => layer !== "objects"
    expect(erase(l, 2, 1, keepObjects)).toBe(l)
    expect(erase(l, 1, 1, keepObjects).scene?.sprites).toEqual([scene.sprites[1]])
    expect(erase(l, 4, 1, (layer) => layer !== "logic")).toBe(l)
  })
})

describe("fields", () => {
  test("a field outside its limits is a problem of the level", () => {
    expect(fieldProblems(ENEMY_FIELDS, { kind: "slime", x: 1, y: 1, hp: 3 })).toEqual([])
    const wild: Level = { ...level, enemies: [{ kind: "slime", x: 2, y: 1, hp: 40, sight: -1 }] }
    expect(fieldIssues(wild).map((i) => i.text)).toEqual([
      "Ворог на (2, 1): «Бачить за X клітинок» має бути від 0 до 12, а тут -1",
      "Ворог на (2, 1): «Ударів витримує» має бути від 1 до 9, а тут 40"
    ])
  })

  test("setting a field to its default takes it off the enemy", () => {
    const walk = ENEMY_FIELDS.find((f) => f.key === "walk")
    if (walk?.type !== "choice") throw new Error("walk")
    expect(walk.set({ kind: "slime", x: 1, y: 1, walk: "across" }, "stand")).toEqual({ kind: "slime", x: 1, y: 1 })
  })
})
