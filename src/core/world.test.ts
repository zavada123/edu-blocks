import { describe, expect, test } from "vitest"
import { applyAction, atFinish, cellKey, onCrystal, parseMap, wallAhead } from "./world.ts"

describe("parseMap", () => {
  test("reads walls, crystals, start and finish", () => {
    const world = parseMap(["#####", "#Sc F", "#####"])
    expect(world.hero).toEqual({ x: 1, y: 1, dir: "right" })
    expect([...world.crystals]).toEqual([cellKey(2, 1)])
    expect(world.finish).toEqual({ x: 4, y: 1 })
    // A space is a wall.
    expect(world.walls.has(cellKey(3, 1))).toBe(true)
  })

  test("throws on a map without the start", () => {
    expect(() => parseMap(["#..#"])).toThrow("старту")
  })

  test("throws on an unknown sign", () => {
    expect(() => parseMap(["#S?#"])).toThrow("«?»")
  })
})

describe("applyAction", () => {
  const world = parseMap(["#####", "#Sc.#", "#..F#", "#####"])

  test("a step moves the hero where it looks", () => {
    const { world: next, outcome } = applyAction(world, "move")
    expect(outcome).toBe("moved")
    expect(next.hero).toEqual({ x: 2, y: 1, dir: "right" })
    expect(world.hero.x).toBe(1)
  })

  test("a step into a wall crashes and leaves the hero in place", () => {
    const facingUp = applyAction(world, "turnLeft").world
    const { world: next, outcome } = applyAction(facingUp, "move")
    expect(outcome).toBe("crashed")
    expect(next.crashed).toBe(true)
    expect(next.hero.y).toBe(1)
  })

  test("turns go round the four directions", () => {
    const dirs: Array<string> = []
    let current = world
    for (let i = 0; i < 4; i++) {
      current = applyAction(current, "turnRight").world
      dirs.push(current.hero.dir)
    }
    expect(dirs).toEqual(["down", "left", "up", "right"])
    expect(applyAction(world, "turnLeft").world.hero.dir).toBe("up")
  })

  test("collecting removes the crystal only where it lies", () => {
    expect(applyAction(world, "collect").outcome).toBe("nothingToCollect")
    const there = applyAction(world, "move").world
    expect(onCrystal(there)).toBe(true)
    const { world: after, outcome } = applyAction(there, "collect")
    expect(outcome).toBe("collected")
    expect(after.crystals.size).toBe(0)
    expect(there.crystals.size).toBe(1)
  })

  test("questions about the cell ahead and the finish", () => {
    expect(wallAhead(world)).toBe(false)
    expect(wallAhead(applyAction(world, "turnLeft").world)).toBe(true)
    const atF = { ...world, hero: { x: 3, y: 2, dir: "right" as const } }
    expect(atFinish(atF)).toBe(true)
    expect(atFinish(world)).toBe(false)
  })
})
