import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { heroLevelOf, maxXp, xpFor, xpGain } from "./xp.ts"

describe("xpFor", () => {
  test("gives nothing for a failed run", () => {
    expect(xpFor("challenge", { stars: 0, firstTry: true })).toBe(0)
  })

  test("gives the most for three stars at the first try", () => {
    expect(xpFor("intro", { stars: 3, firstTry: true })).toBe(35)
    expect(xpFor("challenge", { stars: 3, firstTry: true })).toBe(maxXp("challenge"))
    expect(maxXp("challenge")).toBe(60)
  })

  test("gives more for more stars, for the first try and for a harder tier", () => {
    expect(xpFor("practice", { stars: 1, firstTry: false })).toBe(25)
    expect(xpFor("practice", { stars: 2, firstTry: false })).toBe(30)
    expect(xpFor("practice", { stars: 2, firstTry: true })).toBe(40)
  })

  test("counts at most three stars", () => {
    expect(xpFor("intro", { stars: 7, firstTry: false })).toBe(25)
  })
})

describe("xpGain", () => {
  test("adds only the part above the best earlier run", () => {
    expect(xpGain(30, 0)).toBe(30)
    expect(xpGain(40, 30)).toBe(10)
    expect(xpGain(25, 40)).toBe(0)
  })
})

describe("heroLevelOf", () => {
  test("starts at level 1 and moves up at each threshold", () => {
    expect(heroLevelOf(0)).toEqual({ level: 1, from: 0, next: 100 })
    expect(heroLevelOf(99).level).toBe(1)
    expect(heroLevelOf(100)).toEqual({ level: 2, from: 100, next: 250 })
    expect(heroLevelOf(5000)).toEqual({ level: 10, from: 2700, next: null })
  })
})

describe("story levels", () => {
  test("every level has a tier and the chapter ends with a challenge", () => {
    for (const l of levels) expect(l.tier).toBeDefined()
    expect(levels.some((l) => l.tier === "challenge")).toBe(true)
  })
})
