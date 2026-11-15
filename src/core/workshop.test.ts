import { serializeBlocks } from "scratch-vm/src/serialization/sb3.js"
import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { type Amount, buildProgram, type Definition, type Step } from "./build.ts"
import { judgeField, judgeProgram } from "./judge.ts"
import type { BlockName, Level } from "./level.ts"
import { checkProgram, type Program, programVariables, type RunResult } from "./program.ts"
import { judgePython } from "./python/judge.ts"
import { programSource } from "./python/convert.ts"
import { readProgram } from "./read.ts"
import { createVm, projectFor, runProgram, settle, withVmLock } from "./run.ts"

/** «Майстерня»: variables the student makes and own blocks with number parameters. */

const WORKSHOP: ReadonlyArray<BlockName> = [
  "move", "turnLeft", "turnRight", "collect", "wallAhead", "onCrystal", "atFinish",
  "repeat", "forever", "repeatUntil", "if", "ifElse", "not", "variables", "myBlocks"
]

const level = (id: string): Level => {
  const found = levels.find((l) => l.id === id)
  if (found === undefined) throw new Error(id)
  return found
}

const summary = (r: RunResult) => ({
  passed: r.passed,
  reason: r.reason,
  blocks: r.blocks,
  frames: r.frames.map((f) => [f.action, f.outcome, f.blockId])
})

const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const VARIABLES = ["ходки", "дрова"]
const BLOCKS: ReadonlyArray<{ readonly name: string; readonly params: ReadonlyArray<string> }> = [
  { name: "пройти", params: ["кроки"] },
  { name: "зигзаг", params: ["a", "b"] }
]

/** Random steps with variables, own blocks and their parameters (`params`: those of the block the steps are in). */
const randomSteps = (next: () => number, params: ReadonlyArray<string>, depth = 0): ReadonlyArray<Step> => {
  const pick = <T,>(xs: ReadonlyArray<T>): T => xs[Math.floor(next() * xs.length)] as T
  const amount = (): Amount => {
    const r = next()
    if (r < 0.4) return Math.floor(next() * 5)
    if (r < 0.7 || params.length === 0) return { variable: pick(VARIABLES) }
    return { param: pick(params) }
  }
  return Array.from({ length: 1 + Math.floor(next() * 4) }, (): Step => {
    const r = next()
    if (depth >= 3 || r < 0.4) return pick(["move", "move", "turnLeft", "turnRight", "collect"] as const)
    if (r < 0.5) return { set: Math.floor(next() * 4), variable: pick(VARIABLES) }
    if (r < 0.6) return { change: amount(), variable: pick(VARIABLES) }
    if (r < 0.75) {
      const b = pick(BLOCKS)
      return { call: b.name, args: b.params.map(amount) }
    }
    if (r < 0.88) return { repeat: amount(), body: randomSteps(next, params, depth + 1) }
    if (r < 0.95) return { if: "wallAhead", then: randomSteps(next, params, depth + 1), else: randomSteps(next, params, depth + 1) }
    return { until: "atFinish", body: randomSteps(next, params, depth + 1) }
  })
}

const randomWorkshop = (next: () => number): Program =>
  buildProgram(
    randomSteps(next, []),
    BLOCKS.map((b): Definition => ({ name: b.name, params: b.params, body: randomSteps(next, b.params) }))
  )

/** The program as the editor sends it: loaded into the VM and saved back. */
const asEditorSaves = (program: Program): Promise<Program> =>
  withVmLock(async () => {
    const vm = createVm(null, null)
    await vm.loadProject(projectFor(program))
    await settle()
    const hero = vm.runtime.targets.find((t) => !t.isStage)
    return hero === undefined ? {} : serializeBlocks(hero.blocks._blocks)[0]
  })

const corridor: Level = { ...level("g3-steps"), map: ["##########", "#S.......#", "##########"], blocks: WORKSHOP, goals: [{ type: "finish" }] }

describe("variables and own blocks with parameters", () => {
  test("give the same result in the interpreter and in the VM on random programs", async () => {
    const next = random(20261115)
    for (const base of levels.slice(0, 40)) {
      const lvl: Level = { ...base, blocks: WORKSHOP }
      for (let i = 0; i < 6; i++) {
        const program = randomWorkshop(next)
        expect(summary(judgeField(lvl, program)), JSON.stringify(program)).toEqual(summary(await runProgram(lvl, program)))
      }
    }
  }, 120_000)

  test("read the same after the editor saves them", async () => {
    const next = random(7)
    for (let i = 0; i < 20; i++) {
      const program = randomWorkshop(next)
      const saved = await asEditorSaves(program)
      expect(summary(judgeProgram(corridor, saved))).toEqual(summary(judgeProgram(corridor, program)))
    }
  }, 60_000)

  test("a parameter takes the value of each call, and a variable counts", () => {
    const program = buildProgram(
      [{ set: 0, variable: "ходки" }, { call: "пройти", args: [2] }, { change: 1, variable: "ходки" }, { call: "пройти", args: [{ variable: "ходки" }] }],
      { name: "пройти", params: ["кроки"], body: [{ repeat: { param: "кроки" }, body: ["move"] }] }
    )
    const result = judgeProgram(corridor, program)
    expect(result.frames.map((f) => f.action)).toEqual(["move", "move", "move"])
    expect(result.frames.at(-1)?.boxes).toEqual([{ name: "ходки", value: "1", kind: "int" }])
    expect(result.boxes).toEqual([{ name: "ходки", value: "1", kind: "int" }])
    expect(result.calls).toEqual(["пройти(2)", "пройти(1)"])
  })

  test("a parameter outside its block is 0, as in Scratch", async () => {
    const program = buildProgram([{ repeat: { param: "кроки" }, body: ["move"] }, "move"])
    const result = judgeProgram(corridor, program)
    expect(result.frames.map((f) => f.action)).toEqual(["move"])
    expect(summary(result)).toEqual(summary(await runProgram(corridor, program)))
  })

  test("a nested call keeps the outer block's parameters for after it returns", async () => {
    const program = buildProgram(
      [{ call: "двічі", args: [3] }],
      [
        { name: "двічі", params: ["n"], body: [{ call: "пройти", args: [1] }, { repeat: { param: "n" }, body: ["move"] }] },
        { name: "пройти", params: ["n"], body: [{ repeat: { param: "n" }, body: ["move"] }] }
      ]
    )
    const result = judgeProgram(corridor, program)
    expect(result.frames).toHaveLength(4)
    expect(summary(result)).toEqual(summary(await runProgram(corridor, program)))
  })

  test("the project declares every variable the program names", () => {
    const program = buildProgram([{ set: 1, variable: "ходки" }, { change: 2, variable: "дрова" }, { change: 1 }])
    expect(programVariables(program).map((v) => v.name)).toEqual(["ходки", "дрова", "лічильник"])
  })

  test("own blocks need «Створити блок» in the palette, variables need «Створити змінну»", () => {
    const withParam = buildProgram([{ call: "пройти", args: [2] }], { name: "пройти", params: ["кроки"], body: [{ repeat: { param: "кроки" }, body: ["move"] }] })
    expect(checkProgram({ ...corridor, blocks: ["move", "repeat", "procedure"] }, withParam)).toHaveProperty("error")
    expect(checkProgram(corridor, withParam)).toMatchObject({ hasStart: true })
    expect(checkProgram({ ...corridor, blocks: ["move"] }, buildProgram([{ set: 1, variable: "ходки" }]))).toHaveProperty("error")
  })

  test("read into steps and written as Python with def, parameters and global", () => {
    const program = buildProgram(
      [{ set: 0, variable: "ходки" }, { call: "пройти", args: [3] }],
      { name: "пройти", params: ["кроки"], body: [{ repeat: { param: "кроки" }, body: ["move"] }, { change: 1, variable: "ходки" }] }
    )
    const read = readProgram(program)
    expect(read.definitions).toEqual([{ name: "пройти", params: ["кроки"], body: [{ repeat: { param: "кроки" }, body: ["move"] }, { change: 1, variable: "ходки" }] }])
    expect(read.scripts[0]?.[1]).toEqual({ call: "пройти", args: [3] })
    const source = programSource(corridor, program)
    expect(source).toBe(["ходки = 0", "def пройти(кроки):", "    global ходки", "    for _ in range(кроки):", "        hero.move()", "    ходки += 1", "", "ходки = 0", "пройти(3)"].join("\n"))
    const python = judgePython(corridor, source)
    expect(python.frames.map((f) => f.action)).toEqual(judgeProgram(corridor, program).frames.map((f) => f.action))
    expect(python.calls).toEqual(["пройти(3)"])
    expect(python.boxes).toEqual([{ name: "ходки", value: "1", kind: "int" }])
  })

  test("names that are not Python words become Python names", () => {
    const program = buildProgram([{ set: 2, variable: "2 ходки" }, { call: "іти вперед", args: [{ variable: "2 ходки" }] }], {
      name: "іти вперед",
      params: ["скільки разів"],
      body: [{ repeat: { param: "скільки разів" }, body: ["move"] }]
    })
    const source = programSource(corridor, program)
    expect(source).toContain("def іти_вперед(скільки_разів):")
    expect(source).toContain("_2_ходки = 2")
    expect(source).toContain("іти_вперед(_2_ходки)")
    expect(judgePython(corridor, source).frames).toHaveLength(2)
  })
})
