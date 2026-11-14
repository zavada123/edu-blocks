import { describe, expect, test } from "vitest"
import type { Level } from "../../core/level.ts"
import { copyPatch, pastePatch, patchEmpty } from "./stamp.ts"

const PATH = "ninja-adventure:tileset/floor#path"

const level: Level = {
  id: "t",
  title: "Рівень",
  task: ["Дійди до прапорця."],
  map: ["#######", "#S.c.F#", "#.#x#.#", "#######"],
  blocks: ["move"],
  goals: [{ type: "finish" }],
  enemies: [{ kind: "slime", x: 2, y: 1, route: [{ x: 4, y: 1 }] }],
  scene: {
    npcs: [{ who: "grandpa", x: 2, y: 2 }],
    sprites: [{ asset: "ninja-adventure:item/apple", x: 3, y: 2 }],
    terrain: { x: 1, y: 1, kinds: { a: PATH }, rows: ["aaaaa"] }
  }
}

describe("copyPatch", () => {
  test("copies signs, ground and figures counted from the corner", () => {
    const patch = copyPatch(level, { x0: 1, y0: 1, x1: 3, y1: 2 })
    expect(patch.tiles).toEqual([
      ["start", "floor", "item"],
      ["floor", "wall", "trap"]
    ])
    expect(patch.grounds[0]).toEqual([PATH, PATH, PATH])
    expect(patch.grounds[1]).toEqual([null, null, null])
    expect(patch.npcs).toEqual([{ who: "grandpa", x: 1, y: 1 }])
    expect(patch.sprites).toEqual([{ asset: "ninja-adventure:item/apple", x: 2, y: 1 }])
    // The route of the slime leads out of the piece, so it stays behind.
    expect(patch.enemies).toEqual([{ kind: "slime", x: 1, y: 0 }])
  })

  test("the meadow gives no signs", () => {
    const patch = copyPatch(level, { x0: -2, y0: -1, x1: -1, y1: 0 })
    expect(patchEmpty(patch)).toBe(true)
  })
})

describe("pastePatch", () => {
  test("lays the piece elsewhere, the start as a path", () => {
    const patch = copyPatch(level, { x0: 1, y0: 1, x1: 3, y1: 1 })
    const laid = pastePatch(level, patch, 3, 2)
    expect(laid.map[2]).toBe("#.#..c#")
    expect(laid.map[1]).toBe("#S.c.F#")
    expect(laid.enemies).toEqual([{ kind: "slime", x: 2, y: 1, route: [{ x: 4, y: 1 }] }, { kind: "slime", x: 4, y: 2 }])
    expect(laid.scene?.terrain?.rows).toEqual(["aaaaa", "..aaa"])
  })

  test("a villager on a cell of the piece makes way; signs stop at the map's edge", () => {
    const patch = copyPatch(level, { x0: 2, y0: 2, x1: 2, y1: 2 })
    const laid = pastePatch(level, patch, 6, 3)
    expect(laid.map).toEqual(["#######", "#S.c.F#", "#.#x#.#", "#######"])
    expect(laid.scene?.npcs).toEqual([{ who: "grandpa", x: 2, y: 2 }, { who: "grandpa", x: 6, y: 3 }])
    const over = pastePatch(level, patch, 2, 2)
    expect(over.scene?.npcs).toEqual([{ who: "grandpa", x: 2, y: 2 }])
  })
})
