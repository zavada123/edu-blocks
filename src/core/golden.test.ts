import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { solutions } from "../levels/solutions.ts"
import { buildProgram, type Question, type Step } from "./build.ts"
import { judgeProgram } from "./judge.ts"
import type { BlockName, Level } from "./level.ts"
import type { RunResult } from "./program.ts"

/**
 * Golden runs: the grade and every frame of the hero and the enemies, for each level's solution, its shorter
 * versions and random programs. A change of the engine must not change how a program is graded; run with
 * UPDATE_GOLDEN=1 only when a rule changes on purpose.
 */

const FILE = new URL("./golden.json", import.meta.url)

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

/** Everything a run decides, as plain data: the grade and the state after each action. */
const trace = (r: RunResult) => ({
  passed: r.passed,
  reason: r.reason,
  stars: r.stars,
  blocks: r.blocks,
  collected: r.collected,
  frames: r.frames.map((f) => [
    f.action,
    f.outcome,
    f.blockId,
    f.world.hero.x,
    f.world.hero.y,
    f.world.hero.dir,
    f.world.hearts,
    f.world.energy,
    f.world.crystals.size,
    f.world.crashed,
    f.world.fell,
    f.world.enemies.map((e) => [e.x, e.y, e.hp, e.heading, e.swinging])
  ])
})

const digest = (r: RunResult): string => {
  const t = trace(r)
  const hash = createHash("sha256").update(JSON.stringify(t)).digest("hex").slice(0, 16)
  return `${t.passed ? "pass" : "fail"} ${t.reason ?? "-"} ${t.stars} ${t.frames.length} ${hash}`
}

const runsOf = (level: Level): Record<string, string> => {
  const solution = solutions[level.id] ?? []
  const open: Level = { ...level, blocks: ALL_BLOCKS }
  const runs: Record<string, string> = { solution: digest(judgeProgram(level, buildProgram(solution))) }
  for (let cut = 1; cut <= Math.min(3, solution.length); cut++)
    runs[`solution-${cut}`] = digest(judgeProgram(level, buildProgram(solution.slice(0, -cut))))
  const next = random([...level.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 17))
  for (let i = 0; i < 25; i++) runs[`random-${i}`] = digest(judgeProgram(open, buildProgram(randomProgram(next))))
  return runs
}

const current = (): Record<string, Record<string, string>> => Object.fromEntries(levels.map((l) => [l.id, runsOf(l)]))

describe("golden runs", () => {
  test("every level grades and plays as recorded", () => {
    const now = current()
    if (process.env.UPDATE_GOLDEN === "1") writeFileSync(FILE, `${JSON.stringify(now, null, 1)}\n`)
    const recorded = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Record<string, string>>
    expect(now).toEqual(recorded)
  })
})
