import { describe, expect, test } from "vitest"
import { levels } from "../../levels/index.ts"
import { definitions, solutions } from "../../levels/solutions.ts"
import { buildProgram, type Definition, type Question, type Step } from "../build.ts"
import { judgeProgram } from "../judge.ts"
import type { BlockName, Level } from "../level.ts"
import type { RunResult } from "../program.ts"
import { toPython } from "./convert.ts"
import { judgePython } from "./judge.ts"

/**
 * The same program as blocks and as Python must play and grade the same: every frame of the hero and the
 * enemies, the verdict and the stars. Checked on the solution of each level and on random programs.
 */

const ALL_BLOCKS: ReadonlyArray<BlockName> = [
  "move", "turnLeft", "turnRight", "collect", "attack", "wallAhead", "onCrystal", "atFinish", "enemyAhead", "trapAhead",
  "repeat", "forever", "repeatUntil", "if", "ifElse", "not", "and", "or"
]

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
