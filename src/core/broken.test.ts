import { describe, expect, test } from "vitest"
import { chapterOf } from "../levels/chapters.ts"
import { levels } from "../levels/index.ts"
import { solutionProgram } from "../levels/solutions.ts"
import { brokenProgram, brokenSource } from "./broken.ts"
import { judgeProgram } from "./judge.ts"
import { checkLevel } from "./kit.ts"
import type { Level } from "./level.ts"
import { checkProgram } from "./program.ts"
import { judgePython } from "./python/judge.ts"

const broken = levels.filter((l) => l.broken !== undefined)

describe("«Зламаний робот» levels", () => {
  test("there is one in each of the chapters of loops, conditions, the until loop and custom blocks", () => {
    expect(broken.map((l) => chapterOf(l.id)?.id)).toEqual(["loops", "conditions", "while", "functions"])
  })

  test.each(broken.map((l) => [l.id, l] as const))("the broken program of %s fits the level but does not pass it", (_, level) => {
    // Arrange
    const program = brokenProgram(level) ?? {}

    // Act
    const checked = checkProgram(level, program)
    const blocks = judgeProgram(level, program)
    const python = judgePython(level, brokenSource(level) ?? "")

    // Assert
    expect("error" in checked).toBe(false)
    expect(blocks.passed).toBe(false)
    expect(python.passed).toBe(false)
  })

  test.each(broken.map((l) => [l.id, l] as const))("the fixed program of %s passes with three stars", (_, level) => {
    const result = judgeProgram(level, solutionProgram(level.id))
    expect(result.passed).toBe(true)
    expect(result.stars).toBe(3)
  })

  test("a level without a broken program opens empty", () => {
    const level = levels.find((l) => l.broken === undefined) as Level
    expect(brokenProgram(level)).toBeNull()
    expect(brokenSource(level)).toBeNull()
  })

  test("the level kit finds a broken program that passes or uses blocks outside the palette", () => {
    // Arrange
    const level = broken[0] as Level
    const passing: Level = { ...level, broken: { steps: [{ repeat: 6, body: ["move", "move", "collect"] }] } }
    const foreign: Level = { ...level, broken: { steps: ["turnLeft"] } }

    // Act
    const passingIssues = checkLevel(passing).map((i) => i.text)
    const foreignIssues = checkLevel(foreign).map((i) => i.text)

    // Assert
    expect(passingIssues).toContain("Зламана програма проходить рівень: у ній немає помилки")
    expect(foreignIssues.some((t) => t.startsWith("Зламана програма не підходить до рівня"))).toBe(true)
    expect(checkLevel(level).filter((i) => i.level === "error")).toEqual([])
  })
})
