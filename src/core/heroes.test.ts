import { describe, expect, test } from "vitest"
import { HEROES, heroOpen } from "./heroes.ts"

describe("heroes", () => {
  test("every hero has its own id and a name", () => {
    expect(new Set(HEROES.map((h) => h.id)).size).toBe(HEROES.length)
    for (const h of HEROES) expect(h.name.length).toBeGreaterThan(0)
  })

  test("a new student can play the first hero", () => {
    expect(HEROES.filter((h) => heroOpen(h, 1)).map((h) => h.id)).toEqual(["ninja"])
  })

  test("a hero opens at its hero level and stays open", () => {
    const robot = HEROES.find((h) => h.id === "robot")
    expect(robot).toBeDefined()
    if (robot === undefined) return
    expect(heroOpen(robot, robot.heroLevel - 1)).toBe(false)
    expect(heroOpen(robot, robot.heroLevel)).toBe(true)
    expect(heroOpen(robot, robot.heroLevel + 3)).toBe(true)
  })
})
