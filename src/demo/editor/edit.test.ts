import { describe, expect, test } from "vitest"
import type { Level } from "../../core/level.ts"
import { dragPaints, erase, paint } from "./edit.ts"

const level: Level = {
  id: "t",
  title: "Рівень",
  task: ["Збери кристали."],
  map: ["######", "#S..c#", "######"],
  blocks: ["move", "collect"],
  goals: [{ type: "crystals" }]
}

describe("paint", () => {
  test("a tile changes the map and leaves the meadow alone", () => {
    expect(paint(level, { kind: "tile", tile: "trap" }, 2, 1).map[1]).toBe("#Sx.c#")
    expect(paint(level, { kind: "tile", tile: "floor" }, -2, 1)).toBe(level)
  })

  test("an enemy with a pack look replaces the one on the cell and keeps its settings", () => {
    const one = paint(level, { kind: "enemy", monster: "slime" }, 3, 1)
    const strong = { ...one, enemies: [{ ...one.enemies![0]!, hp: 3 }] }
    const looked = paint(strong, { kind: "enemy", monster: "goblin", look: "ninja-adventure:enemy/beast" }, 3, 1)
    expect(looked.enemies).toEqual([{ kind: "goblin", x: 3, y: 1, hp: 3, look: "ninja-adventure:enemy/beast" }])
  })

  test("enemies stay inside the map", () => {
    expect(paint(level, { kind: "enemy", monster: "slime" }, 9, 9)).toBe(level)
  })

  test("pictures go anywhere, the meadow too; a tile over a tile replaces it", () => {
    const a = paint(level, { kind: "sprite", asset: "p:tileset/a", tiles: [0, 0, 1, 1] }, -1, -1)
    const b = paint(a, { kind: "sprite", asset: "p:tileset/a", tiles: [2, 3, 1, 1] }, -1, -1)
    expect(b.scene?.sprites).toEqual([{ asset: "p:tileset/a", x: -1, y: -1, tiles: [2, 3, 1, 1] }])
    const c = paint(b, { kind: "sprite", asset: "p:prop/boat" }, -1, -1)
    expect(c.scene?.sprites).toHaveLength(2)
  })

  test("villagers can wear any character of a pack", () => {
    const l = paint(level, { kind: "npc", who: "villager", look: "ninja-adventure:character/boy" }, 2, 0)
    expect(l.scene?.npcs).toEqual([{ who: "villager", x: 2, y: 0, look: "ninja-adventure:character/boy" }])
  })
})

describe("erase (the right button)", () => {
  test("takes the enemy first, then the villager, then the last picture", () => {
    let l = paint(level, { kind: "sprite", asset: "p:a" }, 3, 1)
    l = paint(l, { kind: "sprite", asset: "p:b" }, 3, 1)
    l = paint(l, { kind: "npc", who: "boy" }, 3, 1)
    l = paint(l, { kind: "enemy", monster: "slime" }, 3, 1)
    l = erase(l, 3, 1)
    expect(l.enemies).toEqual([])
    l = erase(l, 3, 1)
    expect(l.scene?.npcs).toEqual([])
    l = erase(l, 3, 1)
    expect(l.scene?.sprites?.map((s) => s.asset)).toEqual(["p:a"])
  })

  test("a big tile picture is taken from any of its cells", () => {
    const l = paint(level, { kind: "sprite", asset: "p:t", tiles: [0, 0, 3, 2] }, 0, 0)
    expect(erase(l, 2, 1).scene?.sprites).toEqual([])
  })

  test("an item turns into path; walls and the start stay", () => {
    expect(erase(level, 4, 1).map[1]).toBe("#S...#")
    expect(erase(level, 0, 0)).toBe(level)
    expect(erase(level, 1, 1)).toBe(level)
  })
})

test("dragging paints tiles and single ground tiles, not figures", () => {
  expect(dragPaints({ kind: "tile", tile: "wall" })).toBe(true)
  expect(dragPaints({ kind: "tile", tile: "start" })).toBe(false)
  expect(dragPaints({ kind: "enemy", monster: "slime" })).toBe(false)
  expect(dragPaints({ kind: "sprite", asset: "p:t", tiles: [1, 1, 1, 1] })).toBe(true)
  expect(dragPaints({ kind: "sprite", asset: "p:t", tiles: [1, 1, 2, 1] })).toBe(false)
})
