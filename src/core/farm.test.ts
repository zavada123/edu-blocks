import { describe, expect, test } from "vitest"
import { buildProgram, type Step } from "./build.ts"
import {
  canPlantTree,
  checkOrder,
  DAY_TURNS,
  FARM_ORDERS,
  type FarmOrder,
  type FarmProgram,
  type FarmState,
  farmCapacity,
  farmDay,
  farmPalette,
  farmTips,
  goblinDay,
  finishDay,
  isFarmLevel,
  LONG_DAY_TURNS,
  metAt,
  NEW_FARM,
  openOrders,
  plantTree,
  PUMPKIN_GROW,
  recordOrder,
  runFarmDay,
  treePrice,
  WOOD_REGROW
} from "./farm.ts"
import { heroAct, newSession } from "./hero.ts"
import { judgeField } from "./judge.ts"
import { runProgram } from "./run.ts"
import type { BlockName, Level } from "./level.ts"
import { bedEmpty, cellKey } from "./world.ts"

const ALL: ReadonlyArray<BlockName> = [
  "move", "turnLeft", "turnRight", "collect", "store", "sow", "wallAhead", "onCrystal", "handsFull", "atStorehouse", "bedEmpty", "itemIs", "attack", "enemyAhead",
  "repeat", "forever", "repeatUntil", "if", "ifElse", "not", "and", "or", "procedure"
]

const python = (source: string): FarmProgram => ({ language: "python", source })

/** Around the ring: take what lies here while the hands have room, sow empty beds, unload in the barn. */
const BARE_RING = python(`while True:
    if hero.item_here() and not hero.hands_full():
        hero.collect()
    if hero.bed_empty():
        hero.sow()
    if hero.at_storehouse():
        hero.store()
    if hero.wall_ahead():
        hero.turn_right()
    else:
        hero.move()
`)

/** The same ring that beats a goblin in its way. */
const RING = python(`while True:
    if hero.item_here() and not hero.hands_full():
        hero.collect()
    if hero.bed_empty():
        hero.sow()
    if hero.at_storehouse():
        hero.store()
    if hero.enemy_ahead():
        hero.attack()
    elif hero.wall_ahead():
        hero.turn_right()
    else:
        hero.move()
`)

/** The same ring in blocks. */
const RING_STEPS: ReadonlyArray<Step> = [
  {
    forever: [
      { if: { and: ["onCrystal", { not: "handsFull" }] }, then: ["collect"] },
      { if: "bedEmpty", then: ["sow"] },
      { if: "atStorehouse", then: ["store"] },
      { if: "enemyAhead", then: ["attack"], else: [{ if: "wallAhead", then: ["turnRight"], else: ["move"] }] }
    ]
  }
]

/** Only the forest row, back and forth to the barn: a shorter way, so more wood. */
const SHUTTLE = python(`def turn_back():
    hero.turn_right()
    hero.turn_right()

def step():
    if hero.enemy_ahead():
        hero.attack()
    else:
        hero.move()

while True:
    while not hero.wall_ahead():
        step()
        if hero.item_here():
            hero.collect()
    turn_back()
    while not hero.at_storehouse():
        step()
    hero.store()
    turn_back()
`)

/** The ring, but it takes only pumpkins: wood would fill the hands first. */
const PUMPKINS = python(`while True:
    if hero.item_is("carrot") and not hero.hands_full():
        hero.collect()
    if hero.bed_empty():
        hero.sow()
    if hero.at_storehouse():
        hero.store()
    if hero.wall_ahead():
        hero.turn_right()
    else:
        hero.move()
`)

const withUnlocks = (...unlocked: FarmState["unlocked"]): FarmState => ({ ...NEW_FARM, unlocked })
const order = (id: string): FarmOrder => FARM_ORDERS.find((o) => o.id === id) as FarmOrder

describe("growing on the map", () => {
  const level: Level = { id: "t", title: "t", task: [], map: ["#####", "#Sb.#", "#####"], blocks: ["move", "sow", "collect"], goals: [], grow: 3, turns: 50 }

  test("«посіяти» sows an empty bed, and the crop is ripe after its turns", () => {
    const session = newSession(level)
    heroAct(level, session, "move", { blockId: null })
    expect(bedEmpty(session.world)).toBe(true)
    heroAct(level, session, "sow", { blockId: null })
    expect(session.frames.at(-1)?.outcome).toBe("sown")
    expect(bedEmpty(session.world)).toBe(false)
    heroAct(level, session, "sow", { blockId: null })
    expect(session.frames.at(-1)?.outcome).toBe("cannotSow")
    expect(session.world.crystals.has(cellKey(2, 1))).toBe(false)
    heroAct(level, session, "turnLeft", { blockId: null })
    expect(session.world.crystals.has(cellKey(2, 1))).toBe(true)
    expect(session.frames.at(-1)?.events).toContainEqual({ type: "itemGrew", at: { x: 2, y: 1 } })
    heroAct(level, session, "collect", { blockId: null })
    expect(bedEmpty(session.world)).toBe(true)
    expect(session.world.itemKinds.get(cellKey(2, 1))).toBe("carrot")
  })

  test("«посіяти» off a bed does nothing and the run goes on", () => {
    const session = newSession(level)
    expect(heroAct(level, session, "sow", { blockId: null })).toBe(false)
    expect(session.frames[0]?.outcome).toBe("cannotSow")
  })

  test("wood grows again on a tree after it is taken", () => {
    const tree: Level = { ...level, map: ["####", "#Sc#", "####"], regrow: 2, scene: { item: "wood" } }
    const session = newSession(tree)
    heroAct(tree, session, "move", { blockId: null })
    heroAct(tree, session, "collect", { blockId: null })
    expect(session.world.crystals.size).toBe(0)
    heroAct(tree, session, "turnLeft", { blockId: null })
    heroAct(tree, session, "turnLeft", { blockId: null })
    expect(session.world.crystals.has(cellKey(2, 1))).toBe(true)
  })

  test("a working day ends after its turns with no fault, whatever the goals", () => {
    const day: Level = { ...level, turns: 3 }
    const session = newSession(day)
    expect(heroAct(day, session, "turnLeft", { blockId: null })).toBe(false)
    expect(heroAct(day, session, "turnLeft", { blockId: null })).toBe(false)
    expect(heroAct(day, session, "turnLeft", { blockId: null })).toBe(true)
    expect(session.reason).toBeNull()
  })
})

describe("the day of the farm", () => {
  test("is the same for the same day and changes from day to day", () => {
    expect(farmDay(NEW_FARM, ALL, 4)).toEqual(farmDay(NEW_FARM, ALL, 4))
    const maps = new Set([1, 2, 3, 4, 5, 6].map((d) => JSON.stringify([farmDay(withUnlocks("beds"), ALL, d).map, farmDay(withUnlocks("beds"), ALL, d).growingAt])))
    expect(maps.size).toBeGreaterThan(1)
    expect(isFarmLevel(farmDay(NEW_FARM, ALL).id)).toBe(true)
  })

  test("has a barn, the worker, a tree row and, once built, a bed under each tree", () => {
    const plain = farmDay(NEW_FARM, ALL, 1)
    expect(plain.map[1]?.slice(1, 3)).toBe("HS")
    expect(plain.map.join("")).not.toMatch(/[bBR]/)
    const beds = farmDay({ ...withUnlocks("beds"), trees: 5 }, ALL, 1)
    expect(beds.map[3]?.slice(3, 8)).toMatch(/^[bR]{5}$/)
    expect(beds.turns).toBe(DAY_TURNS)
    expect(farmDay(withUnlocks("longDay"), ALL).turns).toBe(LONG_DAY_TURNS)
    expect(beds.grow).toBe(PUMPKIN_GROW)
    expect(beds.regrow).toBe(WOOD_REGROW)
  })

  test("the tools carry more", () => {
    expect(farmCapacity(NEW_FARM)).toBe(3)
    expect(farmCapacity(withUnlocks("basket"))).toBe(5)
    expect(farmCapacity(withUnlocks("basket", "cart"))).toBe(8)
  })

  test("the palette has the beds only once they are built", () => {
    expect(farmPalette(NEW_FARM, ["procedure", "sow"])).toEqual([
      "move",
      "turnLeft",
      "turnRight",
      "collect",
      "store",
      "wallAhead",
      "onCrystal",
      "handsFull",
      "atStorehouse",
      "repeat",
      "forever",
      "repeatUntil",
      "if",
      "ifElse",
      "not",
      "procedure"
    ])
    expect(farmPalette(withUnlocks("beds"), [])).toContain("bedEmpty")
  })
})

describe("the report of a day", () => {
  test("counts what reached the barn, by kind, and what was still carried", () => {
    const { report } = runFarmDay(withUnlocks("beds", "basket"), RING, ALL, 2)
    expect(report.stopped).toBeNull()
    expect(report.used).toBe(DAY_TURNS)
    expect(report.stored.wood).toBeGreaterThan(5)
    expect(report.stored.pumpkin).toBeGreaterThan(3)
    expect(report.byTurn).toHaveLength(DAY_TURNS)
    expect(report.byTurn.at(-1)).toEqual(report.stored)
  })

  test("blocks and Python bring the same day", () => {
    const state = withUnlocks("beds", "basket")
    const blocks = runFarmDay(state, { language: "blocks", program: buildProgram(RING_STEPS) }, ALL, 3).report
    const code = runFarmDay(state, RING, ALL, 3).report
    expect(blocks.stored).toEqual(code.stored)
    expect(blocks.byTurn).toEqual(code.byTurn)
  })

  test("the Scratch VM plays the day as the judge does", async () => {
    const level = farmDay(withUnlocks("beds", "basket"), ALL, 3)
    const program = buildProgram(RING_STEPS)
    const vm = await runProgram(level, program)
    const judged = judgeField(level, program)
    expect(vm.frames.map((f) => f.outcome)).toEqual(judged.frames.map((f) => f.outcome))
    expect(vm.reason).toEqual(judged.reason)
  })

  test("a program that walks into the fence stops the day there", () => {
    const { report } = runFarmDay(NEW_FARM, python("hero.turn_left()\nhero.move()\n"), ALL)
    expect(report.stopped).toBe("crashed")
    expect(report.used).toBe(2)
  })

  test("a mistake in the code is explained with its line", () => {
    const { report } = runFarmDay(NEW_FARM, python("while True\n    hero.move()\n"), ALL)
    expect(report.stopped).toBe("badProgram")
    expect(report.line).toBe(1)
  })

  test("a working day adds the yield to the barn; the next day comes", () => {
    const { report } = runFarmDay(NEW_FARM, RING, ALL)
    const next = finishDay(NEW_FARM, report)
    expect(next.day).toBe(2)
    expect(next.stock.wood).toBe(report.stored.wood)
  })
})

describe("orders", () => {
  test("open one after another", () => {
    expect(openOrders(NEW_FARM).map((o) => o.id)).toEqual(["wood-3"])
    const done = recordOrder(NEW_FARM, order("wood-3"), 1)
    expect(openOrders(done).map((o) => o.id)).toEqual(["wood-8"])
  })

  test("the ring does the first order; the shorter shuttle does it efficiently", () => {
    expect(checkOrder(NEW_FARM, order("wood-3"), RING, ALL).grade).toBe(1)
    expect(checkOrder(NEW_FARM, order("wood-3"), SHUTTLE, ALL).grade).toBe(3)
  })

  test("a program that remembers one morning does not pass", () => {
    const fixed = python("hero.move()\nhero.collect()\nhero.move()\nhero.collect()\nhero.move()\nhero.collect()\n")
    expect(checkOrder(NEW_FARM, order("wood-3"), fixed, ALL).grade).toBe(0)
  })

  test("pumpkins with bare hands ask to take only pumpkins", () => {
    const state = withUnlocks("beds")
    expect(checkOrder(state, order("pumpkin-3"), RING, ALL).grade).toBe(0)
    expect(checkOrder(state, order("pumpkin-3"), PUMPKINS, ALL).grade).toBeGreaterThan(0)
  })

  test("the miller's cart is done with a basket", () => {
    expect(checkOrder(withUnlocks("beds", "basket"), order("mixed-10-4"), RING, ALL).grade).toBeGreaterThan(0)
  })

  test("twenty logs need the shuttle, the cart and the long day, not more days of the ring", () => {
    const all = withUnlocks("beds", "basket", "longDay", "cart")
    expect(checkOrder(all, order("wood-20"), RING, ALL).grade).toBe(0)
    expect(checkOrder(all, order("wood-20"), SHUTTLE, ALL).grade).toBeGreaterThan(0)
  })

  test("every order can be done with the tools the orders before it open", () => {
    let state = NEW_FARM
    for (const o of FARM_ORDERS) {
      const best = Math.max(...[RING, SHUTTLE, PUMPKINS].map((p) => checkOrder(state, o, p, ALL).grade))
      expect(best, o.id).toBeGreaterThan(0)
      state = recordOrder(state, o, best)
    }
    expect(state.unlocked).toEqual(["beds", "basket", "tower", "longDay", "cart"])
  })

  test("a lower grade later does not take back a better one", () => {
    const done = recordOrder(NEW_FARM, order("wood-3"), 3)
    expect(recordOrder(done, order("wood-3"), 1)).toBe(done)
  })

  test("metAt is the first turn the barn had enough", () => {
    const { report } = runFarmDay(NEW_FARM, SHUTTLE, ALL)
    const at = metAt(report, { wood: 3 })
    expect(at).not.toBeNull()
    expect(report.byTurn[(at ?? 1) - 1]?.wood).toBeGreaterThanOrEqual(3)
    expect(report.byTurn[(at ?? 1) - 2]?.wood ?? 0).toBeLessThan(3)
  })
})

describe("planting trees", () => {
  test("costs more for each tree and is paid from the barn", () => {
    const rich: FarmState = { ...withUnlocks("beds"), stock: { wood: 100, pumpkin: 100 } }
    expect(treePrice(rich)).toEqual({ wood: 10, pumpkin: 3 })
    const one = plantTree(rich)
    expect(one.trees).toBe(4)
    expect(one.stock).toEqual({ wood: 90, pumpkin: 97 })
    expect(treePrice(one)).toEqual({ wood: 20, pumpkin: 6 })
  })

  test("is not possible without enough in the barn", () => {
    expect(canPlantTree(NEW_FARM)).toBe(false)
    expect(plantTree(NEW_FARM)).toBe(NEW_FARM)
  })
})

describe("tips after a working day", () => {
  test("a program without a loop is told to work till the evening", () => {
    // Arrange
    const once = python("hero.move()\nhero.collect()")

    // Act
    const { report } = runFarmDay(NEW_FARM, once, ALL)

    // Assert
    expect(report.used).toBeLessThan(report.turns)
    expect(farmTips(report, 3, "python")[0]).toContain("while True")
    expect(farmTips(report, 3, "blocks")[0]).toContain("«завжди»")
  })

  test("names what was left in the hands and the turns spent for nothing", () => {
    // Arrange: takes on every cell and never goes to the barn.
    const greedy = python(`while True:
    hero.collect()
    if hero.wall_ahead():
        hero.turn_right()
    else:
        hero.move()`)

    // Act
    const { report } = runFarmDay(NEW_FARM, greedy, ALL)
    const tips = farmTips(report, 3, "blocks")

    // Assert
    expect(report.carried.wood).toBeGreaterThan(0)
    expect(tips.some((t) => t.startsWith("Наприкінці дня в руках лишилось"))).toBe(true)
    expect(tips.some((t) => t.startsWith("Ходів дарма") && t.includes("«тут щось є?»"))).toBe(true)
  })

  test("a program that works till the evening without idle turns is told at most about the last load", () => {
    const { report } = runFarmDay(NEW_FARM, SHUTTLE, ALL)
    expect(report.idle).toBe(0)
    expect(farmTips(report, 3).every((t) => t.startsWith("Наприкінці дня"))).toBe(true)
  })
})

describe("goblins and the watch tower", () => {
  test("goblins come every third day once the farm has a basket", () => {
    // Arrange
    const basket = withUnlocks("beds", "basket")

    // Act
    const days = [1, 2, 3, 4, 5, 6].filter((d) => goblinDay(basket, d))

    // Assert
    expect(days).toEqual([3, 6])
    expect(goblinDay(withUnlocks("beds"), 3)).toBe(false)
    expect(farmDay(basket, ALL, 3).enemies).toHaveLength(2)
    expect(farmDay(basket, ALL, 2).enemies).toBeUndefined()
  })

  test("the palette gets «вдарити» and «попереду ворог?» with the basket", () => {
    expect(farmPalette(withUnlocks("beds"), [])).not.toContain("attack")
    expect(farmPalette(withUnlocks("beds", "basket"), [])).toEqual(expect.arrayContaining(["attack", "enemyAhead"]))
  })

  test("a ring that does not look for goblins walks into one; a ring that beats them works till the evening", () => {
    // Arrange
    const state = withUnlocks("beds", "basket")

    // Act
    const bare = runFarmDay(state, BARE_RING, ALL, 3).report
    const guarded = runFarmDay(state, RING, ALL, 3).report

    // Assert
    expect(bare.stopped).toBe("crashed")
    expect(bare.goblins).toBe(2)
    expect(guarded.stopped).toBeNull()
    expect(guarded.beaten).toBe(2)
    expect(farmTips(bare, 5, "python")[0]).toContain("hero.enemy_ahead()")
  })

  test("«Нічні гості» brings goblins on every checked day and opens the tower", () => {
    const state = recordOrder(withUnlocks("beds", "basket"), order("pumpkin-3"), 1)
    expect(openOrders(state).map((o) => o.id)).toContain("night-guests")
    expect(checkOrder(state, order("night-guests"), BARE_RING, ALL).grade).toBe(0)
    const done = recordOrder(state, order("night-guests"), checkOrder(state, order("night-guests"), RING, ALL).grade)
    expect(done.unlocked).toContain("tower")
  })

  test("the archer on the tower beats the goblins even for a ring that does not look for them", () => {
    // Arrange
    const state = withUnlocks("beds", "basket", "tower")
    const level = farmDay(state, ALL, 3)

    // Act
    const { report } = runFarmDay(state, BARE_RING, ALL, 3)

    // Assert
    expect(level.towers).toHaveLength(1)
    expect(report.stopped).toBeNull()
    expect(report.beaten).toBe(2)
  })

  test("blocks and Python meet the goblins the same way", () => {
    const state = withUnlocks("beds", "basket", "tower")
    const blocks = runFarmDay(state, { language: "blocks", program: buildProgram(RING_STEPS) }, ALL, 6, true).report
    const code = runFarmDay(state, RING, ALL, 6, true).report
    expect(blocks).toEqual(code)
  })
})
