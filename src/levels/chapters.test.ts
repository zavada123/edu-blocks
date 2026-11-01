import { describe, expect, test } from "vitest"
import { chapterLevels, chapterOf, chapters, isFirstChapter } from "./chapters.ts"
import { levels } from "./index.ts"

describe("chapters", () => {
  test("every level is in exactly one chapter, and the chapters keep the order of the course", () => {
    expect(chapters.flatMap((c) => c.levels)).toEqual(levels.map((l) => l.id))
  })

  test("every chapter has levels, a title and a skill", () => {
    for (const chapter of chapters) {
      expect(chapterLevels(chapter).length).toBeGreaterThan(0)
      expect(chapter.title).not.toBe("")
      expect(chapter.skill).not.toBe("")
    }
  })

  test("finds the chapter of a level", () => {
    expect(chapterOf("g3-steps")?.id).toBe("sequence")
    expect(chapterOf("g6-bear")?.id).toBe("enemies")
    expect(chapterOf("task")).toBeUndefined()
    expect(isFirstChapter("g3-steps")).toBe(true)
    expect(isFirstChapter("g4-road")).toBe(false)
  })
})

describe("the «Правда чи ні» chapter", () => {
  const logic = chapters.find((c) => c.id === "logic")

  test("comes after the until loop and has three levels", () => {
    expect(chapters.map((c) => c.id).indexOf("logic")).toBe(chapters.map((c) => c.id).indexOf("while") + 1)
    expect(logic?.levels).toHaveLength(3)
  })

  test("every level puts «і», «або» or «не» into its palette", () => {
    for (const level of logic === undefined ? [] : chapterLevels(logic)) {
      expect(level.blocks.some((b) => b === "and" || b === "or" || b === "not")).toBe(true)
    }
  })
})
