import { describe, expect, test } from "vitest"
import { judgeProgram } from "../core/judge.ts"
import { type Level, speaksTo } from "../core/level.ts"
import { counterBoxes } from "../core/python/boxes.ts"
import { chapterLevels, chapters } from "./chapters.ts"
import { levels } from "./index.ts"
import { pythonLevels } from "./python-start.ts"
import { solutionProgram } from "./solutions.ts"

const course: ReadonlyArray<Level> = chapters.flatMap(chapterLevels)

describe("hints and gifts in the course of blocks", () => {
  test("every course level has a ladder of three hints that ends with a frame with gaps", () => {
    expect(course).toHaveLength(levels.length)
    for (const l of course) {
      expect(l.hints, l.id).toHaveLength(3)
      expect(l.hints?.[2], l.id).toContain("_")
      // The ladder speaks of blocks: no Python code in it.
      expect(l.hints?.join("\n"), l.id).not.toMatch(/hero\.|\(\)/)
    }
  })

  test("a gift comes with a level that brings a block not seen before in the course", () => {
    const seen = new Set<string>()
    const gifted: Array<string> = []
    for (const l of course) {
      const fresh = l.blocks.filter((b) => !seen.has(b))
      if (l.gift !== undefined) {
        expect(fresh.length, l.id).toBeGreaterThan(0)
        gifted.push(l.id)
      }
      for (const b of l.blocks) seen.add(b)
    }
    expect(gifted).toContain("g3-steps")
    expect(gifted).toContain("f-stairs")
  })

  test("a course level keeps its single hint in Python, an intro level keeps its ladder there", () => {
    const course0 = course[0]
    const intro0 = pythonLevels[0]
    if (course0 === undefined || intro0 === undefined) throw new Error("no levels")
    expect(speaksTo(course0, "blocks")).toBe(true)
    expect(speaksTo(course0, "python")).toBe(false)
    expect(speaksTo(intro0, "python")).toBe(true)
    expect(speaksTo(intro0, "blocks")).toBe(false)
  })
})

describe("«Скриньки» of a block program", () => {
  test("show the counter as a box with its kind", () => {
    expect(counterBoxes(undefined)).toEqual([])
    expect(counterBoxes("3")).toEqual([{ name: "лічильник", value: "3", kind: "int" }])
    expect(counterBoxes("2.5")).toEqual([{ name: "лічильник", value: "2.5", kind: "float" }])
    expect(counterBoxes("так")).toEqual([{ name: "лічильник", value: "\"так\"", kind: "str" }])
  })

  test("follow the counter through a run of «Гриби все далі»", () => {
    const level = levels.find((l) => l.id === "c-apples")
    if (level === undefined) throw new Error("no c-apples")
    const run = judgeProgram(level, solutionProgram("c-apples"))
    expect(run.passed).toBe(true)
    expect(counterBoxes(run.frames[0]?.counter)).toEqual([{ name: "лічильник", value: "1", kind: "int" }])
    expect(counterBoxes(run.frames.at(-1)?.counter)[0]?.value).toBe("4")
  })
})
