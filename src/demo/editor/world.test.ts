import { describe, expect, test } from "vitest"
import type { Chapter } from "../../levels/chapters.ts"
import { chapters, chapterLevels } from "../../levels/chapters.ts"
import { levelHealth, moveLevel, orderSource, sameOrder } from "./world.ts"

const course: ReadonlyArray<Chapter> = [
  { id: "sequence", title: "Послідовність", skill: "", levels: ["a", "b", "c"] },
  { id: "loops", title: "Цикли", skill: "", levels: ["d", "e"] }
]

describe("moveLevel", () => {
  test("moves a level later within its chapter", () => {
    expect(moveLevel(course, "a", { chapter: "sequence", index: 2 })[0]?.levels).toEqual(["b", "a", "c"])
    expect(moveLevel(course, "a", { chapter: "sequence", index: 3 })[0]?.levels).toEqual(["b", "c", "a"])
  })

  test("moves a level earlier and into another chapter", () => {
    expect(moveLevel(course, "c", { chapter: "sequence", index: 0 })[0]?.levels).toEqual(["c", "a", "b"])
    const moved = moveLevel(course, "b", { chapter: "loops", index: 1 })
    expect(moved.map((c) => c.levels)).toEqual([["a", "c"], ["d", "b", "e"]])
  })

  test("leaves the course alone for an unknown chapter and keeps untouched chapters as they were", () => {
    expect(moveLevel(course, "a", { chapter: "nope", index: 0 })).toBe(course)
    expect(moveLevel(course, "a", { chapter: "sequence", index: 1 })[1]).toBe(course[1])
  })
})

describe("orderSource", () => {
  test("gives the lines of the chapters that changed", () => {
    const moved = moveLevel(course, "b", { chapter: "loops", index: 0 })
    expect(sameOrder(moved, course)).toBe(false)
    expect(orderSource(moved, course)).toBe('// Послідовність\nlevels: ["a", "c"]\n\n// Цикли\nlevels: ["b", "d", "e"]')
    expect(orderSource(course, course)).toBe("")
  })
})

describe("the course on the map", () => {
  test("every level of the course has no errors", () => {
    for (const chapter of chapters) for (const level of chapterLevels(chapter)) expect(levelHealth(level).errors, level.id).toBe(0)
  })
})
