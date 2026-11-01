import { describe, expect, test } from "vitest"
import { buildProgram, type Step } from "../core/build.ts"
import { judgeProgram } from "../core/judge.ts"
import type { Level } from "../core/level.ts"
import { levels } from "./index.ts"

/** The levels of «Правда чи ні» cannot be passed with one simple question where they ask for a combined one. */

const passes = (id: string, steps: ReadonlyArray<Step>): boolean => judgeProgram(levels.find((l) => l.id === id) as Level, buildProgram(steps)).passed

describe("the «Правда чи ні» levels need combined conditions", () => {
  test("«До млина»: turning only at walls, or only at holes, fails", () => {
    const turnAt = (q: "wallAhead" | "trapAhead"): ReadonlyArray<Step> => [{ until: "atFinish", body: [{ if: q, then: ["turnRight"], else: ["move"] }] }]
    expect(passes("l-mill", turnAt("wallAhead"))).toBe(false)
    expect(passes("l-mill", turnAt("trapAhead"))).toBe(false)
    expect(passes("l-mill", [{ until: "atFinish", body: [{ if: { or: ["wallAhead", "trapAhead"] }, then: ["turnRight"], else: ["move"] }] }])).toBe(true)
  })

  test("«Риба біля берега»: without «не» the hero walks past the turn", () => {
    expect(passes("l-fish", ["move", { until: "atFinish", body: ["collect", "move"] }])).toBe(false)
    expect(passes("l-fish", [{ until: "atFinish", body: [{ until: "onCrystal", body: ["move"] }, "collect"] }])).toBe(false)
  })

  test("«Хата в заметі»: going on until a wall only falls into a hole", () => {
    expect(passes("l-drift", [{ until: "atFinish", body: [{ until: "wallAhead", body: ["move"] }, "turnRight"] }])).toBe(false)
    expect(passes("l-drift", [{ until: "atFinish", body: [{ until: { or: ["wallAhead", "trapAhead"] }, body: ["move"] }, "turnRight"] }])).toBe(true)
  })
})
