import { describe, expect, test } from "vitest"
import { buildProgram, type Step } from "./build.ts"
import {
  buildable,
  buildingNow,
  chooseBuilding,
  farmDay,
  farmPalette,
  type FarmReport,
  type FarmState,
  finishDay,
  isBuilt,
  NEW_FARM,
  NO_AMOUNTS,
  openOrders,
  partsOf,
  priceText,
  runFarmDay
} from "./farm.ts"
import { heroAct, heroCount, heroSense, newSession } from "./hero.ts"
import { judgeField, scratchCompare } from "./judge.ts"
import type { Level } from "./level.ts"
import { judgePythonField } from "./python/judge.ts"
import { programSource } from "./python/convert.ts"
import { runProgram } from "./run.ts"
import type { Action } from "./world.ts"

// The site at x 2, the barn at x 1, a mill at x 4: four logs and one gold in the barn.
const yard: Level = {
  id: "t",
  title: "t",
  task: [],
  map: ["######", "#HS..#", "######"],
  blocks: ["move", "build", "store", "atSite", "atStorehouse", "stock", "gt", "if", "ifElse", "and", "forever", "wallAhead"],
  goals: [],
  turns: 20,
  barn: { wood: 4, gold: 1 },
  site: { x: 2, y: 1, part: { wood: 2 }, left: 3 },
  mill: { x: 4, y: 1 }
}

const act = (level: Level, session: ReturnType<typeof newSession>, ...actions: ReadonlyArray<Action>) => {
  for (const a of actions) heroAct(level, session, a, { blockId: null })
  return session.frames.map((f) => f.outcome)
}

describe("будмайданчик", () => {
  test("«будувати» on the site takes the price of a part from the barn", () => {
    const session = newSession(yard)
    expect(heroSense(session, "atSite")).toBe(true)
    expect(act(yard, session, "build", "build", "build")).toEqual(["built", "built", "cannotBuild"])
    expect(heroCount(session, "wood")).toBe(0)
    expect(heroCount(session, "gold")).toBe(1)
    expect(session.world.site?.left).toBe(1)
  })

  test("«будувати» off the site or with nothing left to build does nothing", () => {
    const off = newSession(yard)
    expect(act(yard, off, "move", "build")).toEqual(["moved", "cannotBuild"])
    const done: Level = { ...yard, site: { x: 2, y: 1, part: { wood: 1 }, left: 0 } }
    expect(act(done, newSession(done), "build")).toEqual(["cannotBuild"])
  })

  test("the mill grinds the pumpkins in the hands into flour and leaves the rest", () => {
    const level: Level = { ...yard, map: ["######", "#HSRc#", "######"], scene: { item: "wood" }, capacity: 3 }
    const session = newSession(level)
    act(level, session, "move", "collect", "move", "collect")
    expect(heroSense(session, "atStorehouse")).toBe(false)
    expect(act(level, session, "store").at(-1)).toBe("milled")
    expect(heroCount(session, "flour")).toBe(1)
    expect(session.world.load).toEqual(["wood"])
    expect(act(level, session, "store").at(-1)).toBe("nothingToStore")
  })
})

describe("рахівниця", () => {
  test("Scratch compares numbers as numbers and the rest as text", () => {
    expect(scratchCompare("10", "9")).toBeGreaterThan(0)
    expect(scratchCompare(3, "3")).toBe(0)
    expect(scratchCompare("Ліс", "ліс")).toBe(0)
    expect(scratchCompare("", 0)).not.toBe(0)
  })

  // The program of the mockup: build while the barn has more than two logs, walk on otherwise.
  const steps: ReadonlyArray<Step> = [
    {
      forever: [
        {
          if: { and: ["atSite", { compare: ">", of: [{ stock: "wood" }, 2] }] },
          then: ["build"],
          else: [{ if: "wallAhead", then: ["build"], else: ["move"] }]
        }
      ]
    }
  ]

  test("blocks, the VM and Python build the same parts", async () => {
    const program = buildProgram(steps)
    const blocks = judgeField(yard, program)
    const vm = await runProgram(yard, program)
    const source = programSource(yard, program)
    expect(source).toContain('if (hero.at_site() and hero.stock("wood") > 2):')
    const python = judgePythonField(yard, source)
    const built = (r: typeof blocks) => r.frames.filter((f) => f.outcome === "built").length
    expect(built(blocks)).toBe(1)
    expect(built(vm)).toBe(1)
    expect(built(python)).toBe(1)
    expect(vm.frames.map((f) => f.outcome)).toEqual(blocks.frames.map((f) => f.outcome))
  })

  test("a number of the barn fits any number slot", () => {
    const source = programSource(yard, buildProgram([{ repeat: { stock: "gold" }, body: ["move"] }]))
    expect(source).toBe('for _ in range(hero.stock("gold")):\n    hero.move()')
    expect(judgePythonField(yard, 'hero.stock("bricks")').detail).toContain("У коморі не лічать")
  })
})

describe("будівництво на хуторі", () => {
  const farm = (extra: Partial<FarmState> = {}): FarmState => ({
    ...NEW_FARM,
    unlocked: ["beds", "pen", "mine", "site"],
    stock: { ...NO_AMOUNTS, wood: 7, gold: 2 },
    ...extra
  })

  test("the site builds what the student chose, one building at a time", () => {
    expect(buildable(farm()).map((b) => b.id)).toEqual(["barn", "mill"])
    expect(buildable({ ...farm(), unlocked: ["beds"] })).toEqual([])
    expect(chooseBuilding(farm(), "helper").building).toBeUndefined()
    const chosen = chooseBuilding(farm(), "mill")
    expect(buildingNow(chosen)?.name).toBe("Млин")
    expect(priceText(buildingNow(chosen)?.part ?? {})).toBe("3 колоди і 1 золото")
  })

  test("a day of the farm has the site with the price of a part and the barn of the morning", () => {
    const level = farmDay(chooseBuilding(farm({ parts: { mill: 1 } }), "mill"), [])
    expect(level.site).toMatchObject({ part: { wood: 3, gold: 1 }, left: 3 })
    expect(level.barn).toEqual({ wood: 7, gold: 2 })
    expect(farmDay(farm(), []).site?.left).toBe(0)
  })

  test("the parts built in a day stand, and their price leaves the barn", () => {
    const state = chooseBuilding(farm({ parts: { barn: 3 } }), "barn")
    const report = { day: 1, stored: { ...NO_AMOUNTS, wood: 2 }, built: 2, spent: { ...NO_AMOUNTS, wood: 4 } } as FarmReport
    const next = finishDay(state, report)
    expect(next.stock.wood).toBe(5)
    expect(partsOf(next, "barn")).toBe(5)
    expect(isBuilt(next, "barn")).toBe(true)
    expect(next.building).toBeNull()
    // The second barn stands in the bottom-right corner of the ring.
    expect(farmDay(next, []).map[3]?.at(-2)).toBe("H")
  })

  test("a working day reports the parts its program built", () => {
    const state = chooseBuilding(farm(), "barn")
    const code = "while True:\n    if hero.at_site():\n        hero.build()\n    if hero.wall_ahead():\n        hero.turn_right()\n    else:\n        hero.move()\n"
    const { report } = runFarmDay(state, { language: "python", source: code }, farmPalette(state, []))
    expect(report.stopped).toBeNull()
    expect(report.built).toBe(3)
    expect(report.spent?.wood).toBe(6)
    expect(finishDay(state, report).stock.wood).toBe(1 + report.stored.wood)
  })

  test("the palette has the site's blocks and, with «Рахівниця», the number and the comparisons", () => {
    expect(farmPalette(farm(), [])).toEqual(expect.arrayContaining(["build", "atSite"]))
    expect(farmPalette(farm(), [])).not.toContain("stock")
    const counted = farmPalette({ ...farm(), unlocked: [...farm().unlocked, "abacus"] }, [])
    expect(counted).toEqual(expect.arrayContaining(["stock", "gt", "lt", "equals"]))
  })

  test("the baker's order opens once the mill stands", () => {
    const done = { wood: 1, "wood-3": 1, fair: 1, count: 1 }
    expect(openOrders(farm({ orders: done })).map((o) => o.id)).not.toContain("bakery")
    expect(openOrders(farm({ orders: done, parts: { mill: 4 } })).map((o) => o.id)).toContain("bakery")
  })
})
