import { describe, expect, test } from "vitest"
import { parseMap } from "../core/world.ts"
import { springPond, waterCells } from "./water.ts"

const level = parseMap(["##########", "#S...#####", "####.#####", "####.#####", "####...F##", "##########"])

describe("springPond", () => {
  test("lies next to the goal and never on the path", () => {
    const pond = springPond(level) ?? []
    expect(pond.length).toBeGreaterThan(3)
    expect(pond.some((c) => Math.abs(c.x - 7) + Math.abs(c.y - 4) === 1)).toBe(true)
    for (const c of pond) {
      const onPath = c.x >= 0 && c.y >= 0 && c.x < level.width && c.y < level.height && !level.walls.has(`${c.x},${c.y}`)
      expect(onPath).toBe(false)
    }
  })

  test("goes on ahead of the hero, past the end of the path", () => {
    const pond = springPond(level) ?? []
    const middle = pond.reduce((sum, c) => sum + c.x, 0) / pond.length
    expect(middle).toBeGreaterThan(7)
  })

  test("keeps off the cells of a house or a villager", () => {
    const reserved = new Set(["8,4", "8,3", "8,5"])
    for (const c of springPond(level, reserved) ?? []) expect(reserved.has(`${c.x},${c.y}`)).toBe(false)
  })

  test("is null without a goal", () => {
    expect(springPond(parseMap(["####", "#S.#", "####"]))).toBeNull()
  })
})

describe("waterCells", () => {
  test("a spring gets its pond; a signpost does not", () => {
    expect(waterCells(level, { finish: "well" }).size).toBeGreaterThan(0)
    expect(waterCells(level, { finish: "flag" }).size).toBe(0)
    expect(waterCells(level, { finish: "well", finishLook: "pack:id" }).size).toBe(0)
  })

  test("painted water covers only cells the hero cannot enter", () => {
    const cells = waterCells(level, { water: { x: 0, y: 0, rows: ["~~~~", "~~~~"] } })
    expect([...cells].sort()).toEqual(["0,0", "0,1", "1,0", "2,0", "3,0"].sort())
  })

  test("painted water can lie in the meadow outside the level", () => {
    expect([...waterCells(level, { water: { x: -2, y: -1, rows: ["~."] } })]).toEqual(["-2,-1"])
  })
})
