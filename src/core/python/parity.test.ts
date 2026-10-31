import { describe, expect, test } from "vitest"
import { levels } from "../../levels/index.ts"
import { definitions, solutions } from "../../levels/solutions.ts"
import { COUNTER_NAME, procedureName } from "../blocks.ts"
import { buildProgram, type Definition, type Question, type Step } from "../build.ts"
import { judgeProgram } from "../judge.ts"
import type { BlockName, Level } from "../level.ts"
import type { RunResult } from "../program.ts"
import { PYTHON_METHODS } from "./api.ts"
import { judgePython } from "./judge.ts"

/**
 * The same program as blocks and as Python must play and grade the same: every frame of the hero and the
 * enemies, the verdict and the stars. Checked on the solution of each level and on random programs.
 */

const ALL_BLOCKS: ReadonlyArray<BlockName> = [
  "move", "turnLeft", "turnRight", "collect", "attack", "wallAhead", "onCrystal", "atFinish", "enemyAhead", "trapAhead",
  "repeat", "forever", "repeatUntil", "if", "ifElse", "not", "and", "or"
]

const METHOD = new Map(PYTHON_METHODS.map((m) => [m.action ?? m.sensor, m.name]))

const identifier = (name: string): string => name.replace(/[^\p{L}\p{N}_]+/gu, "_")

const question = (q: Question): string => {
  if (typeof q === "string") return `hero.${METHOD.get(q)}()`
  if ("not" in q) return `not ${question(q.not)}`
  const [a, b] = "and" in q ? q.and : q.or
  return `(${question(a)} ${"and" in q ? "and" : "or"} ${question(b)})`
}

/** The blocks of a program as Python lines. `uses` is set when the program reads the counter. */
const lines = (steps: ReadonlyArray<Step>, indent: string, procedure: string, uses: { counter: boolean }): Array<string> => {
  if (steps.length === 0) return [`${indent}pass`]
  const inner = `${indent}    `
  return steps.flatMap((s): Array<string> => {
    if (s === "call") return [`${indent}${procedure}()`]
    if (typeof s === "string") return [`${indent}hero.${METHOD.get(s)}()`]
    if ("set" in s) return [`${indent}${COUNTER_NAME} = ${s.set}`]
    if ("change" in s) {
      uses.counter = true
      return [`${indent}${COUNTER_NAME} += ${s.change}`]
    }
    if ("repeat" in s) {
      if (s.repeat === "counter") uses.counter = true
      const times = s.repeat === "counter" ? COUNTER_NAME : String(s.repeat)
      return [`${indent}for _ in range(${times}):`, ...lines(s.body, inner, procedure, uses)]
    }
    if ("forever" in s) return [`${indent}while True:`, ...lines(s.forever, inner, procedure, uses)]
    if ("until" in s) return [`${indent}while not ${question(s.until)}:`, ...lines(s.body, inner, procedure, uses)]
    const branch = [`${indent}if ${question(s.if)}:`, ...lines(s.then, inner, procedure, uses)]
    return s.else === undefined ? branch : [...branch, `${indent}else:`, ...lines(s.else, inner, procedure, uses)]
  })
}

/** The program in Python, and how many lines it has that the blocks do not (a start value of the counter). */
const toPython = (level: Level, steps: ReadonlyArray<Step>, definition?: Definition): { source: string; extra: number } => {
  const procedure = identifier(definition?.name ?? procedureName(level))
  const uses = { counter: false }
  const main = lines(steps, "", procedure, uses)
  const def = definition === undefined ? [] : [`def ${procedure}():`, `    global ${COUNTER_NAME}`, ...lines(definition.body, "    ", procedure, uses)]
  const start = uses.counter ? [`${COUNTER_NAME} = 0`] : []
  return { source: [...start, ...def, ...main].join("\n"), extra: start.length }
}

const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const randomProgram = (next: () => number): ReadonlyArray<Step> => {
  const pick = <T,>(xs: ReadonlyArray<T>): T => xs[Math.floor(next() * xs.length)] as T
  const q = (depth: number): Question => {
    const r = next()
    if (depth > 1 || r < 0.6) return pick(["wallAhead", "onCrystal", "atFinish", "enemyAhead", "trapAhead"] as const)
    if (r < 0.75) return { not: q(depth + 1) }
    return r < 0.88 ? { and: [q(depth + 1), q(depth + 1)] } : { or: [q(depth + 1), q(depth + 1)] }
  }
  const steps = (depth: number): ReadonlyArray<Step> =>
    Array.from({ length: 1 + Math.floor(next() * 4) }, (): Step => {
      const r = next()
      if (depth >= 3 || r < 0.55) return pick(["move", "move", "turnLeft", "turnRight", "collect", "attack"] as const)
      if (r < 0.7) return { repeat: Math.floor(next() * 6), body: steps(depth + 1) }
      if (r < 0.8) return { until: q(0), body: steps(depth + 1) }
      if (r < 0.88) return { if: q(0), then: steps(depth + 1) }
      if (r < 0.96) return { if: q(0), then: steps(depth + 1), else: steps(depth + 1) }
      return { forever: steps(depth + 1) }
    })
  return steps(0)
}

/** What must be the same: the verdict and every frame, without where in the program each action came from. */
const play = (r: RunResult) => ({
  passed: r.passed,
  reason: r.reason,
  frames: r.frames.map(({ blockId: _block, line: _line, ...frame }) => frame)
})

const expectSame = (level: Level, steps: ReadonlyArray<Step>, definition?: Definition) => {
  const blocks = judgeProgram(level, buildProgram(steps, definition))
  const { source, extra } = toPython(level, steps, definition)
  const python = judgePython(level, source)
  expect(python.detail, source).toBeUndefined()
  expect(play(python), source).toEqual(play(blocks))
  expect(python.blocks - extra, source).toBe(blocks.blocks)
  if (extra === 0) expect(python.stars, source).toBe(blocks.stars)
}

describe("Python plays as blocks", () => {
  test.each(levels.map((l) => [l.id, l] as const))("solution of %s", (_, level) => {
    expectSame(level, solutions[level.id] ?? [], definitions[level.id])
  })

  test.each(levels.map((l) => [l.id, l] as const))("random programs on %s", (_, level) => {
    const open: Level = { ...level, blocks: ALL_BLOCKS }
    const next = random([...level.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))
    for (let i = 0; i < 15; i++) expectSame(open, randomProgram(next))
  })

  test("frames carry the line of the call", () => {
    const level = levels[0] as Level
    const r = judgePython(level, "hero.move()\n\nhero.move(2)")
    expect(r.frames.map((f) => f.line)).toEqual([1, 3, 3])
  })
})
