import { describe, expect, test } from "vitest"
import { levels } from "../../levels/index.ts"
import { solutionProgram } from "../../levels/solutions.ts"
import { buildProgram } from "../build.ts"
import type { Level } from "../level.ts"
import { programSource, solutionSource } from "./convert.ts"
import { judgePython } from "./judge.ts"

describe("solutionSource", () => {
  test.each(levels.map((l) => [l.id, l] as const))("the Python solution of %s passes its level", (_, level) => {
    expect(judgePython(level, solutionSource(level)).passed).toBe(true)
  })

  test("is plain hero calls for a simple level", () => {
    const level = levels.find((l) => l.id === "g3-steps") as Level
    expect(solutionSource(level)).toBe("hero.move()\nhero.move()\nhero.move()\nhero.move()\nhero.collect()")
  })

  test("is empty for a level without a solution", () => {
    const level = levels[0] as Level
    expect(solutionSource({ ...level, id: "no-such-level" })).toBe("")
  })
})

describe("programSource", () => {
  const byId = (id: string): Level => levels.find((l) => l.id === id) as Level
  const withoutBlankLines = (source: string) => source.split("\n").filter((line) => line.trim() !== "").join("\n")

  test.each(levels.map((l) => [l.id, l] as const))("the blocks of the %s solution read as its Python solution", (_, level) => {
    // Arrange
    const program = solutionProgram(level.id)

    // Act
    const source = programSource(level, program)

    // Assert
    expect(withoutBlankLines(source)).toBe(withoutBlankLines(solutionSource(level)))
  })

  test("reads an empty condition as False and an empty loop as pass, as Scratch runs them", () => {
    // Arrange: the blocks of «повторити до ( )» with nothing inside, and «якщо (не ( )) то крок».
    const program = buildProgram([{ until: "wallAhead", body: [] }, { if: { not: "atFinish" }, then: ["move"] }])
    const emptied = Object.fromEntries(
      Object.entries(program).filter(([, b]) => (b as { opcode: string }).opcode !== "hero_wallAhead" && (b as { opcode: string }).opcode !== "hero_atFinish")
    )

    // Act
    const source = programSource(byId("g4-until"), emptied)

    // Assert
    expect(source).toBe("while not False:\n    pass\nif not False:\n    hero.move()")
  })

  test("says what to do when the program has no blocks under the start, or no start at all", () => {
    const level = byId("g3-steps")
    expect(programSource(level, buildProgram([]))).toBe("# Додай блоки під «коли прапорець натиснуто».")
    expect(programSource(level, {})).toBe("# Немає блока «коли прапорець натиснуто»: програма не почнеться.")
  })

  test("shows the first script only, with a note about the others", () => {
    // Arrange: two start scripts side by side.
    const first = buildProgram(["move"])
    const second = Object.fromEntries(Object.entries(buildProgram(["collect"])).map(([id, b]) => [`x${id}`, b]))

    // Act
    const source = programSource(byId("g3-steps"), { ...first, ...second })

    // Assert
    expect(source.split("\n")[0]).toBe("hero.move()")
    expect(source).toContain("# Ще скриптів «коли прапорець натиснуто»: 1.")
  })

  test("names each custom block the program calls and starts the counter it reads", () => {
    const level = byId("c-rocks")
    const source = programSource(level, solutionProgram(level.id))
    expect(source.startsWith("лічильник = 0\ndef обійти():\n    global лічильник")).toBe(true)
    expect(judgePython(level, source).passed).toBe(true)
  })
})
