import { describe, expect, test } from "vitest"
import { cellKey, parseMap } from "../core/world.ts"
import { buildScenery, cellHash } from "./scenery.ts"

const world = parseMap(["##########", "##########", "#S......F#", "##########", "##########"])

describe("buildScenery", () => {
  test("every wall cell gets either a tree or one obstacle", () => {
    const { trees, obstacles } = buildScenery(world)
    const covered = [
      ...trees.flatMap(({ x, y }) => [cellKey(x, y), cellKey(x + 1, y), cellKey(x, y + 1), cellKey(x + 1, y + 1)]),
      ...obstacles.map(({ x, y }) => cellKey(x, y))
    ]
    expect(new Set(covered).size).toBe(covered.length)
    expect(new Set(covered)).toEqual(world.walls)
  })

  test("trees stand only on walls", () => {
    const { trees } = buildScenery(world)
    expect(trees.length).toBeGreaterThan(0)
    for (const { x, y } of trees) expect(world.walls.has(cellKey(x + 1, y + 1))).toBe(true)
  })

  test("decor lies on floor cells and never on the finish", () => {
    const { decor } = buildScenery(world)
    for (const { x, y } of decor) {
      expect(world.walls.has(cellKey(x, y))).toBe(false)
      expect({ x, y }).not.toEqual(world.finish)
    }
  })

  test("the same map always gets the same scenery", () => {
    expect(buildScenery(world)).toEqual(buildScenery(parseMap(["##########", "##########", "#S......F#", "##########", "##########"])))
  })
})

describe("cellHash", () => {
  test("differs for neighbouring cells", () => {
    expect(cellHash(0, 0)).not.toBe(cellHash(1, 0))
    expect(cellHash(0, 0)).not.toBe(cellHash(0, 1))
  })
})
