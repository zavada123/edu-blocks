import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { solutionProgram, solutions } from "../levels/solutions.ts"
import { buildProgram } from "./build.ts"
import type { Level } from "./level.ts"
import { allowedOpcodes } from "./blocks.ts"
import { checkProgram } from "./program.ts"
import { runProgram } from "./run.ts"
import { parseMap } from "./world.ts"

const level = (id: string): Level => {
  const found = levels.find((l) => l.id === id)
  if (found === undefined) throw new Error(id)
  return found
}

describe("reference solutions", () => {
  test.each(levels.map((l) => [l.id, l]))("%s passes with three stars", async (_id, lvl) => {
    const steps = solutions[lvl.id]
    expect(steps).toBeDefined()
    const result = await runProgram(lvl, solutionProgram(lvl.id))
    expect(result.reason).toBeNull()
    expect(result.passed).toBe(true)
    expect(result.stars).toBe(3)
  })

  test("every level has a solution and a unique id", () => {
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length)
    expect(Object.keys(solutions).sort()).toEqual(levels.map((l) => l.id).sort())
  })
})

describe("runProgram", () => {
  test("a longer program passes with fewer stars", async () => {
    const result = await runProgram(level("g4-repeat"), buildProgram(Array.from({ length: 5 }, () => ["move", "move", "collect"] as const).flat()))
    expect(result.passed).toBe(true)
    expect(result.blocks).toBe(15)
    expect(result.stars).toBe(1)
  })

  test("walking into a wall fails the run", async () => {
    const result = await runProgram(level("g3-steps"), buildProgram(["move", "move", "move", "move", "move", "collect"]))
    expect(result.passed).toBe(false)
    expect(result.reason).toBe("crashed")
    expect(result.frames.at(-1)?.outcome).toBe("crashed")
  })

  test("a program that stops early has unmet goals", async () => {
    const result = await runProgram(level("g3-steps"), buildProgram(["move"]))
    expect(result).toMatchObject({ passed: false, reason: "goalsNotMet", stars: 0, collected: 0, totalCrystals: 1 })
  })

  test("an endless loop without actions stops as too long", async () => {
    const lvl: Level = { ...level("g4-until"), blocks: ["move", "collect", "repeatUntil", "wallAhead", "forever", "if"] }
    const started = Date.now()
    const result = await runProgram(lvl, buildProgram([{ forever: [{ if: "wallAhead", then: ["collect"] }] }]))
    expect(result.reason).toBe("tooLong")
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  test("frames name the block that acted", async () => {
    const program = buildProgram(["move", "move", "move", "move", "collect"])
    const result = await runProgram(level("g3-steps"), program)
    expect(result.frames.map((f) => f.action)).toEqual(["move", "move", "move", "move", "collect"])
    expect(result.frames.every((f) => f.blockId !== null && f.blockId in program)).toBe(true)
  })

  test("blocks outside the start hat do not run", async () => {
    const program = { ...buildProgram(["move", "move", "move", "move"]), loose: { opcode: "hero_collect", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 300, y: 0 } }
    const result = await runProgram(level("g3-steps"), program)
    expect(result.reason).toBe("goalsNotMet")
  })

  test("a program without the start hat", async () => {
    const program = { a: { opcode: "hero_move", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0 } }
    expect((await runProgram(level("g3-steps"), program)).reason).toBe("noStart")
  })

  test("a block from outside the palette is refused", async () => {
    const result = await runProgram(level("g3-steps"), buildProgram([{ repeat: 4, body: ["move"] }, "collect"]))
    expect(result.reason).toBe("badProgram")
    expect(result.detail).toContain("control_repeat")
  })

  test("garbage is refused before the VM", () => {
    expect(checkProgram(level("g3-steps"), { a: ["x"] })).toHaveProperty("error")
    expect(checkProgram(level("g3-steps"), { a: null })).toHaveProperty("error")
    const huge = Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`b${i}`, { opcode: "hero_move" }]))
    expect(checkProgram(level("g3-steps"), huge)).toHaveProperty("error")
  })

  test("a loose counter is a block on a level with the counter, and a stranger elsewhere", () => {
    const program = { ...buildProgram(["move"]), v: [12, "лічильник", "eb-counter", 200, 40] }
    expect(checkProgram({ ...level("g3-steps"), blocks: ["move", "counter"] }, program)).toEqual({ blocks: 2, hasStart: true })
    expect(checkProgram(level("g3-steps"), program)).toHaveProperty("error")
  })

  test("a custom block counts its «визначити» and calls, not its name", () => {
    const lvl: Level = { ...level("g3-steps"), blocks: ["move", "collect", "procedure"] }
    expect(checkProgram(lvl, buildProgram(["call", "call"], { body: ["move", "move"] }))).toEqual({ blocks: 5, hasStart: true })
  })

  test("a custom block «без оновлення екрана» and a second «визначити» with the same name are refused", () => {
    const lvl: Level = { ...level("g3-steps"), blocks: ["move", "collect", "procedure"] }
    const program = buildProgram(["call"], { body: ["move"] })
    const warp = Object.fromEntries(
      Object.entries(program).map(([id, b]) => {
        const block = b as { opcode: string; mutation?: object }
        return [id, block.opcode === "procedures_prototype" ? { ...block, mutation: { ...block.mutation, warp: "true" } } : block]
      })
    )
    expect(checkProgram(lvl, warp)).toHaveProperty("error")
    const twice = { ...program, ...JSON.parse(JSON.stringify(buildProgram([], { body: ["move"] })).replace(/"(b\d+)"/g, '"z$1"')) }
    expect(checkProgram(lvl, twice)).toMatchObject({ error: expect.stringContaining("двічі") })
  })

  test("a block the VM cannot read is a bad program", async () => {
    const program = { ...buildProgram(["move"]), b9: { opcode: "hero_move", next: "missing", parent: 5 } }
    const result = await runProgram(level("g3-steps"), program)
    expect(result.passed).toBe(false)
  })

  test("runs at the same time do not mix their heroes", async () => {
    const [a, b] = await Promise.all([
      runProgram(level("g3-steps"), solutionProgram("g3-steps")),
      runProgram(level("g3-turn"), solutionProgram("g3-turn"))
    ])
    expect(a.passed && b.passed).toBe(true)
  })
})

describe("levels", () => {
  test.each(levels.map((l) => [l.id, l]))("%s has a valid map and goals that can be met", (_id, lvl) => {
    const world = parseMap(lvl.map, lvl.dir)
    if (lvl.goals.some((g) => g.type === "crystals")) expect(world.totalCrystals).toBeGreaterThan(0)
    if (lvl.goals.some((g) => g.type === "finish")) expect(world.finish).not.toBeNull()
    expect(allowedOpcodes(lvl.blocks).size).toBeGreaterThan(1)
  })
})
