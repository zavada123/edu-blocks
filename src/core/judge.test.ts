import { serializeBlocks } from "scratch-vm/src/serialization/sb3.js"
import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { solutions } from "../levels/solutions.ts"
import { buildProgram, type Question, type Step } from "./build.ts"
import { judgeProgram } from "./judge.ts"
import type { BlockName, Level } from "./level.ts"
import type { Program, RunResult } from "./program.ts"
import { createVm, projectFor, runProgram, settle, withVmLock } from "./run.ts"

const ALL_BLOCKS: ReadonlyArray<BlockName> = [
  "move", "turnLeft", "turnRight", "collect", "attack", "wallAhead", "onCrystal", "atFinish", "enemyAhead", "trapAhead",
  "repeat", "forever", "repeatUntil", "if", "ifElse", "not", "and", "or"
]

const level = (id: string): Level => {
  const found = levels.find((l) => l.id === id)
  if (found === undefined) throw new Error(id)
  return found
}

/** What must be the same in the VM and in the interpreter. */
const summary = (r: RunResult) => ({
  passed: r.passed,
  reason: r.reason,
  stars: r.stars,
  blocks: r.blocks,
  frames: r.frames.map((f) => [f.action, f.outcome, f.blockId])
})

/** A small deterministic random generator (mulberry32), so a failing program can be found again. */
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const randomProgram = (next: () => number): ReadonlyArray<Step> => {
  const pick = <T,>(xs: ReadonlyArray<T>): T => xs[Math.floor(next() * xs.length)] as T
  const question = (depth: number): Question => {
    const r = next()
    if (depth > 1 || r < 0.6) return pick(["wallAhead", "onCrystal", "atFinish", "enemyAhead", "trapAhead"] as const)
    if (r < 0.75) return { not: question(depth + 1) }
    return r < 0.88 ? { and: [question(depth + 1), question(depth + 1)] } : { or: [question(depth + 1), question(depth + 1)] }
  }
  const steps = (depth: number): ReadonlyArray<Step> =>
    Array.from({ length: 1 + Math.floor(next() * 4) }, (): Step => {
      const r = next()
      if (depth >= 3 || r < 0.55) return pick(["move", "move", "turnLeft", "turnRight", "collect", "attack"] as const)
      if (r < 0.7) return { repeat: Math.floor(next() * 6), body: steps(depth + 1) }
      if (r < 0.8) return { until: question(0), body: steps(depth + 1) }
      if (r < 0.88) return { if: question(0), then: steps(depth + 1) }
      if (r < 0.96) return { if: question(0), then: steps(depth + 1), else: steps(depth + 1) }
      return { forever: steps(depth + 1) }
    })
  return steps(0)
}

/** Two scripts with their own start hats: the VM runs them as two threads. */
const twoScripts = (a: Program, b: Program): Program => {
  const rename = (program: Program, prefix: string): Program =>
    JSON.parse(JSON.stringify(program).replace(/"(b\d+)"/g, `"${prefix}$1"`)) as Program
  return { ...rename(a, "x"), ...rename(b, "y") }
}

/** The program as the editor sends it: loaded into the VM and saved back, numbers kept as `[4, "10"]`. */
const asEditorSaves = (program: Program): Promise<Program> =>
  withVmLock(async () => {
    const vm = createVm(null, null)
    await vm.loadProject(projectFor(program))
    await settle()
    const hero = vm.runtime.targets.find((t) => !t.isStage)
    return hero === undefined ? {} : serializeBlocks(hero.blocks._blocks)[0]
  })

describe("judgeProgram", () => {
  test.each(levels.map((l) => [l.id, l]))("%s: the reference solution passes with three stars", (_id, lvl) => {
    const result = judgeProgram(lvl, buildProgram(solutions[lvl.id] ?? []))
    expect(result).toMatchObject({ passed: true, reason: null, stars: 3 })
  })

  test("gives the same result as the VM on random programs", async () => {
    const next = random(20261029)
    for (const base of levels) {
      const lvl: Level = { ...base, blocks: ALL_BLOCKS }
      for (let i = 0; i < 30; i++) {
        const program = buildProgram(randomProgram(next))
        expect(summary(judgeProgram(lvl, program)), JSON.stringify(program)).toEqual(summary(await runProgram(lvl, program)))
      }
    }
  }, 120_000)

  test("runs two start scripts in turns, as the VM does", async () => {
    const next = random(7)
    for (const base of levels) {
      const lvl: Level = { ...base, blocks: ALL_BLOCKS }
      for (let i = 0; i < 10; i++) {
        const program = twoScripts(buildProgram(randomProgram(next)), buildProgram(randomProgram(next)))
        expect(summary(judgeProgram(lvl, program)), JSON.stringify(program)).toEqual(summary(await runProgram(lvl, program)))
      }
    }
  }, 120_000)

  test("reads the program in the form the editor saves", async () => {
    for (const lvl of levels) {
      const saved = await asEditorSaves(buildProgram(solutions[lvl.id] ?? []))
      expect(JSON.stringify(saved)).not.toContain("math_whole_number")
      expect(judgeProgram(lvl, saved)).toMatchObject({ passed: true, stars: 3 })
    }
  })

  test("a repeat count that is not a number is 0, as in Scratch", () => {
    const program = buildProgram([{ repeat: 4, body: ["move"] }, "collect"])
    const times = Object.values(program).find((b) => (b as { opcode: string }).opcode === "math_whole_number") as { fields: { NUM: [string, null] } }
    times.fields.NUM[0] = "abc"
    const lvl: Level = { ...level("g3-steps"), blocks: ALL_BLOCKS }
    expect(judgeProgram(lvl, program).frames.map((f) => f.action)).toEqual(["collect"])
  })

  test("stops a damaged program with a circle of blocks", () => {
    const lvl = level("g3-steps")
    const program = buildProgram(["move", "move"])
    const circle = { ...program, b3: { ...(program.b3 as object), next: "b2" } }
    const started = Date.now()
    const result = judgeProgram(lvl, circle)
    expect(result.passed).toBe(false)
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  test("stops a loop inside itself", () => {
    const lvl: Level = { ...level("g3-steps"), blocks: ALL_BLOCKS }
    const program = buildProgram([{ forever: ["move"] }])
    const loop = { ...program, b3: { ...(program.b3 as object), next: null, opcode: "control_forever", inputs: { SUBSTACK: [2, "b2"] } } }
    const result = judgeProgram(lvl, loop)
    expect(result.passed).toBe(false)
  })

  test("an endless loop without actions stops quickly as too long", () => {
    const lvl: Level = { ...level("g4-until"), blocks: ALL_BLOCKS }
    const started = Date.now()
    const result = judgeProgram(lvl, buildProgram([{ forever: [{ if: "wallAhead", then: ["collect"] }] }]))
    expect(result.reason).toBe("tooLong")
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  test("refuses blocks from outside the palette and programs without the start hat", () => {
    expect(judgeProgram(level("g3-steps"), buildProgram([{ repeat: 4, body: ["move"] }])).reason).toBe("badProgram")
    const loose = { a: { opcode: "hero_move", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true } }
    expect(judgeProgram(level("g3-steps"), loose).reason).toBe("noStart")
    expect(judgeProgram(level("g3-steps"), { a: "x" }).reason).toBe("badProgram")
  })
})
