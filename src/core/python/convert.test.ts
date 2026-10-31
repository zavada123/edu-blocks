import { describe, expect, test } from "vitest"
import { levels } from "../../levels/index.ts"
import type { Level } from "../level.ts"
import { solutionSource } from "./convert.ts"
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
