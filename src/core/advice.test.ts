import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { solutions } from "../levels/solutions.ts"
import { adviseRun, MAX_ADVICE } from "./advice.ts"
import { buildProgram, type Step } from "./build.ts"
import { judgeProgram } from "./judge.ts"
import type { Level } from "./level.ts"

const level = (id: string): Level => {
  const found = levels.find((l) => l.id === id)
  if (found === undefined) throw new Error(id)
  return found
}

const advise = (id: string, steps: ReadonlyArray<Step>) => {
  const program = buildProgram(steps)
  return adviseRun(level(id), program, judgeProgram(level(id), program))
}

describe("adviseRun", () => {
  test.each(Object.keys(solutions))("no advice for the best solution of %s", (id) => {
    expect(advise(id, solutions[id] ?? [])).toEqual([])
  })

  test("a missing «взяти»: the hero stood on the wood but did not take it", () => {
    expect(advise("g3-steps", ["move", "move", "move", "move"])).toEqual([
      "У програмі немає блока «взяти». Герой дійшов до дров, але не взяв їх."
    ])
  })

  test("a «взяти» in the wrong place: on an empty cell and not on the item", () => {
    const tips = advise("g3-steps", ["move", "move", "move", "collect", "move"])
    expect(tips[0]).toContain("Постав «взяти» одразу після кроку")
    expect(tips).toContain("«Взяти» 1 раз спрацював на порожній клітинці. Прибери зайвий «взяти».")
  })

  test("a crash says which way to turn", () => {
    expect(advise("g3-turn", ["move", "move", "move"])[0]).toBe(
      "На 3-й дії герой урізався в перешкоду. Перед цим кроком треба повернути праворуч ↻."
    )
  })

  test("a short program says how far the goal still is", () => {
    expect(advise("g3-finish", ["move", "turnRight", "move"])).toEqual([
      "Програма закінчилась, коли до мети лишалось 4 кроки. Додай дій або збільш число повторень."
    ])
  })

  test("a pass with too many blocks points to «повторити» and to turns that cancel out", () => {
    const long: ReadonlyArray<Step> = [
      "turnLeft",
      "turnRight",
      ...Array.from({ length: 4 }, () => ["move", "turnLeft", "move", "turnRight"] as const).flat()
    ]
    const tips = advise("g4-stairs", long)
    expect(tips[0]).toBe("Блоків 18, а для трьох зірок досить 5.")
    expect(tips).toContain("Знайди дії, що повторюються, і поклади їх у «повторити».")
    expect(tips).toContain("Поворот ліворуч і одразу праворуч гасять один одного: прибери обидва.")
    expect(tips.length).toBeLessThanOrEqual(MAX_ADVICE)
  })

  test("a loop that never ends asks about the condition", () => {
    expect(advise("g6-maze", [{ until: "atFinish", body: ["turnLeft"] }])).toEqual([
      "Герой ходить без кінця. Перевір умову в «повторити до»: чи стане вона колись правдою?"
    ])
  })

  test("walking into an enemy: strike first, and ask «попереду ворог?» where the palette has it", () => {
    const tips = advise("g5-guards", [{ repeat: 4, body: ["move"] }])
    expect(tips[0]).toContain("наткнувся на ворога")
    expect(tips[1]).toContain("якщо попереду ворог?")
    expect(advise("g5-spirit", ["move", "move"])).toHaveLength(1)
  })

  test("beaten by a boss: how many blows are left", () => {
    const tips = advise("g6-bear", [{ until: "enemyAhead", body: ["move"] }, "attack", { repeat: 6, body: ["turnLeft"] }])
    expect(tips[0]).toContain("замахується")
    expect(tips.join(" ")).toContain("Лишилось 2 удари")
  })

  test("enemies left and blows into the air", () => {
    const tips = advise("g5-guards", ["attack", "move", "attack"])
    expect(tips.join(" ")).toContain("Лишилось ворогів: 2")
    expect(tips.join(" ")).toContain("влучив у порожнечу")
  })
})
