import { describe, expect, test } from "vitest"
import { checkLevel } from "../core/kit.ts"
import { levelFields } from "../core/fields.ts"
import { judgePython } from "../core/python/judge.ts"
import { chapterOf, chapters, courseChapters, pythonStartChapter } from "./chapters.ts"
import { pythonLevels, pythonSolutions } from "./python-start.ts"

const level = (id: string) => {
  const found = pythonLevels.find((l) => l.id === id)
  if (found === undefined) throw new Error(`no level ${id}`)
  return found
}

describe("«Python: перші кроки»", () => {
  test("opens the Python course and is not in the course of blocks", () => {
    expect(courseChapters("python")[0]).toBe(pythonStartChapter)
    expect(courseChapters("blocks")).toBe(chapters)
    expect(chapterOf("py-input")?.id).toBe("pythonStart")
  })

  test("every level is for Python, has a lesson and a starter", () => {
    for (const l of pythonLevels) {
      expect(l.language).toBe("python")
      expect(l.lesson?.text.length).toBeGreaterThan(0)
      expect(l.starter).toBeDefined()
    }
  })

  test.each(pythonLevels.map((l) => l.id))("the solution of %s earns three stars", (id) => {
    const result = judgePython(level(id), pythonSolutions[id] ?? "")
    expect(result.reason).toBeNull()
    expect(result.stars).toBe(3)
  })

  test.each(pythonLevels.map((l) => l.id))("the map of %s is a valid level", (id) => {
    for (const field of levelFields(level(id))) expect(checkLevel(field).filter((i) => i.level === "error")).toEqual([])
  })

  test("the starter of «Число чи текст» fails and tells to use int()", () => {
    const l = level("py-types")
    const result = judgePython(l, l.starter ?? "")
    expect(result.passed).toBe(false)
    expect(result.line).toBe(3)
    expect(result.detail).toContain("int(")
    expect(result.output).toEqual(["<class 'str'>"])
  })

  test("a level about a variable does not pass with numbers alone", () => {
    const result = judgePython(level("py-variable"), "hero.move(3)\nhero.turn_right()\nhero.move(3)\nhero.turn_left()\nhero.move(3)\n")
    expect(result.passed).toBe(false)
    expect(result.reason).toBe("badProgram")
    expect(result.detail).toContain("змінн")
    expect(result.frames.length).toBeGreaterThan(0)
  })

  test("a level with print checks the printed line", () => {
    expect(judgePython(level("py-print"), "hero.move(5)\n").detail).toContain("print")
    expect(judgePython(level("py-print"), "print(\"Привіт\")\nhero.move(5)\n").detail).toContain("Добрий день!")
    expect(judgePython(level("py-count"), pythonSolutions["py-count"]?.replace("mushrooms)", "2)") ?? "").passed).toBe(false)
  })

  test("a number written by hand passes one field of «Дід підкаже» and fails the others", () => {
    const result = judgePython(level("py-input"), "steps = int(input())\nhero.move(3)\nhero.collect()\n")
    expect(result.passed).toBe(false)
    expect(result.fields).toEqual([true, false, false])
  })

  test("the answer of input() is a text: without int() the hero cannot move", () => {
    const result = judgePython(level("py-input"), "steps = input(\"Скільки кроків?\")\nhero.move(steps)\n")
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("int('3')")
    expect(result.output).toEqual(["Скільки кроків?3"])
  })

  test("input() with no answer left says so", () => {
    const result = judgePython(level("py-input"), "a = input()\nb = input()\n")
    expect(result.detail).toContain("лише 1 відповідь")
    expect(result.line).toBe(2)
  })
})
