import { describe, expect, test } from "vitest"
import { cellKey, parseMap } from "../core/world.ts"
import { buildScenery, cellHash } from "./scenery.ts"

const rows = ["##########", "##########", "#S......F#", "##########", "##########"]
const world = parseMap(rows)
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < world.width && y < world.height
const treeCells = (trees: ReadonlyArray<{ x: number; y: number }>) =>
  trees.flatMap(({ x, y }) => [cellKey(x, y), cellKey(x + 1, y), cellKey(x, y + 1), cellKey(x + 1, y + 1)])

describe("buildScenery", () => {
  test("the view is a square with the level in its middle and a meadow around it", () => {
    const { view } = buildScenery(world)
    expect(view).toEqual({ x: -3, y: -5, width: 16, height: 16 })
    expect(buildScenery(parseMap(["#####", "#S.F#", "#####"])).view).toEqual({ x: -3, y: -4, width: 11, height: 11 })
  })

  test("every wall cell of the level gets either a tree or one obstacle", () => {
    const { trees, obstacles } = buildScenery(world)
    const covered = [...treeCells(trees), ...obstacles.map(({ x, y }) => cellKey(x, y))]
    expect(new Set(covered).size).toBe(covered.length)
    const insideCovered = covered.filter((key) => {
      const [x, y] = key.split(",").map(Number)
      return inside(x ?? -1, y ?? -1)
    })
    expect(new Set(insideCovered)).toEqual(world.walls)
  })

  test("nothing but petals lies on the path, and nothing on the finish", () => {
    const { trees, decor } = buildScenery(world)
    const floor = new Set(treeCells(trees))
    for (const { x, y, kind } of decor) {
      expect(floor.has(cellKey(x, y))).toBe(false)
      if (!inside(x, y)) continue
      expect(world.walls.has(cellKey(x, y))).toBe(false)
      expect(kind).toBe("petals")
      expect({ x, y }).not.toEqual(world.finish)
    }
  })

  test("the meadow around the level gets trees and flowers", () => {
    const { trees, decor } = buildScenery(world)
    expect(trees.some(({ x, y }) => !inside(x, y))).toBe(true)
    expect(decor.some(({ x, y }) => !inside(x, y))).toBe(true)
  })

  test("the same map always gets the same scenery", () => {
    expect(buildScenery(world)).toEqual(buildScenery(parseMap(rows)))
  })
})

describe("cellHash", () => {
  test("differs for neighbouring cells", () => {
    expect(cellHash(0, 0)).not.toBe(cellHash(1, 0))
    expect(cellHash(0, 0)).not.toBe(cellHash(0, 1))
  })

  test("plateaus and their cliffs stay in the meadow, a cell away from the level, with no tree on them", () => {
    const { plateau, cliffs, trees } = buildScenery(world)
    expect(plateau.size).toBeGreaterThan(0)
    for (const key of [...plateau, ...cliffs]) {
      const [x = 0, y = 0] = key.split(",").map(Number)
      expect(x >= -1 && y >= -1 && x <= world.width && y <= world.height).toBe(false)
    }
    // Every cliff stands right under the plateau.
    for (const key of cliffs) {
      const [x = 0, y = 0] = key.split(",").map(Number)
      expect(plateau.has(`${x},${y - 1}`)).toBe(true)
    }
    for (const t of trees) {
      for (const key of [`${t.x},${t.y}`, `${t.x + 1},${t.y}`, `${t.x},${t.y + 1}`, `${t.x + 1},${t.y + 1}`]) {
        expect(plateau.has(key) || cliffs.has(key)).toBe(false)
      }
    }
  })

  test("nothing grows on water", () => {
    const water = new Set(["-2,-2", "-1,-2"])
    const { trees, obstacles, decor } = buildScenery(world, { water })
    const covered = new Set([...obstacles, ...decor].map((c) => `${c.x},${c.y}`))
    for (const t of trees) for (const key of [`${t.x},${t.y}`, `${t.x + 1},${t.y}`, `${t.x},${t.y + 1}`, `${t.x + 1},${t.y + 1}`]) covered.add(key)
    for (const key of water) expect(covered.has(key)).toBe(false)
  })

  test("sheep graze in the free meadow with room to step right", () => {
    const { sheep, obstacles, plateau, view } = buildScenery(world)
    expect(sheep.length).toBeGreaterThan(0)
    const things = new Set([...obstacles.map((o) => `${o.x},${o.y}`), ...plateau])
    for (const s of sheep) {
      for (const x of [s.x, s.x + 1]) {
        expect(x >= 0 && s.y >= 0 && x < world.width && s.y < world.height).toBe(false)
        expect(things.has(`${x},${s.y}`)).toBe(false)
        expect(x < view.x + view.width).toBe(true)
      }
    }
  })
})
