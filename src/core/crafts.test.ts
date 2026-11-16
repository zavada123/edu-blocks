import { describe, expect, test } from "vitest"
import { COURSE_IDEAS, seasoned } from "./farm-course.fixture.ts"
import { craftBlocks, CRAFTS, craftLevel, craftProgress, craftUps } from "./crafts.ts"
import {
  FASTER_PUMPKIN_GROW,
  FASTER_WOOD_REGROW,
  farmDay,
  farmPalette,
  type FarmReport,
  type FarmState,
  finishDay,
  NEW_FARM,
  NO_AMOUNTS,
  PUMPKIN_GROW,
  runFarmDay,
  WOOD_REGROW
} from "./farm.ts"
import { heroAct, heroSense, newSession } from "./hero.ts"
import type { Level } from "./level.ts"
import { cellKey } from "./world.ts"

const woodcutter = CRAFTS.find((c) => c.id === "woodcutter")!
const made = (wood: number, pumpkin: number) => ({ wood, pumpkin })
const farm = (wood: number, pumpkin: number, unlocked: FarmState["unlocked"] = ["beds"]): FarmState => ({
  ...NEW_FARM,
  unlocked,
  produced: { ...NO_AMOUNTS, wood, pumpkin }
})
const act = (level: Level, session: ReturnType<typeof newSession>, ...actions: Parameters<typeof heroAct>[2][]) => {
  for (const a of actions) heroAct(level, session, a, { blockId: null })
  return session.frames.at(-1)?.outcome
}

describe("ремесла", () => {
  test("a craft has five levels by what the programs made", () => {
    expect(craftLevel(woodcutter, 0)).toBe(1)
    expect(craftLevel(woodcutter, 29)).toBe(1)
    expect(craftLevel(woodcutter, 30)).toBe(2)
    expect(craftLevel(woodcutter, 150)).toBe(4)
    expect(craftLevel(woodcutter, 10_000)).toBe(5)
    expect(craftProgress(woodcutter, 46)).toMatchObject({ level: 2, next: 80 })
    expect(craftProgress(woodcutter, 400).next).toBeNull()
  })

  test("each level gives its blocks: the question at 2, the tool at 4", () => {
    expect(craftBlocks(made(0, 0))).toEqual([])
    expect(craftBlocks(made(30, 0))).toEqual(["woodAhead"])
    expect(craftBlocks(made(150, 120))).toEqual(["woodAhead", "chop", "ripeAhead", "water"])
  })

  test("the levels reached between two yields come one by one", () => {
    const ups = craftUps(made(20, 24), made(90, 25))
    expect(ups.map((u) => `${u.craft.id} ${u.level}`)).toEqual(["woodcutter 2", "woodcutter 3", "gardener 2"])
    expect(craftUps(made(20, 0), made(25, 0))).toEqual([])
  })

  test("a working day adds what reached the barn to the yield of the programs", () => {
    const report = { day: 1, stored: { ...NO_AMOUNTS, wood: 7, pumpkin: 2 } } as FarmReport
    const next = finishDay(farm(10, 0), report)
    expect(next.produced).toEqual({ ...NO_AMOUNTS, wood: 17, pumpkin: 2 })
    expect(finishDay(NEW_FARM, report).produced?.wood).toBe(7)
  })

  test("the palette has the blocks of the crafts; the gardener's need the beds", () => {
    expect(farmPalette(seasoned(farm(150, 120)), COURSE_IDEAS)).toEqual(expect.arrayContaining(["woodAhead", "chop", "ripeAhead", "water"]))
    expect(farmPalette(seasoned(farm(0, 0)), COURSE_IDEAS)).not.toContain("chop")
    expect(farmPalette(seasoned(farm(150, 120, [])), COURSE_IDEAS)).not.toContain("water")
    expect(farmPalette(seasoned(farm(0, 0, ["spyglass"])), COURSE_IDEAS)).toContain("itemAhead")
  })

  test("from the third level trees and pumpkins grow faster", () => {
    expect(farmDay(farm(0, 0), []).regrow).toBe(WOOD_REGROW)
    expect(farmDay(farm(0, 0), []).grow).toBe(PUMPKIN_GROW)
    expect(farmDay(farm(80, 60), []).regrow).toBe(FASTER_WOOD_REGROW)
    expect(farmDay(farm(80, 60), []).grow).toBe(FASTER_PUMPKIN_GROW)
  })
})

describe("спорядження", () => {
  // A tree at x 2, a ripe pumpkin at x 3, a growing bed at x 4.
  const field: Level = {
    id: "t",
    title: "t",
    task: [],
    map: ["#######", "#ScRB.#", "#######"],
    blocks: [],
    goals: [],
    capacity: 3,
    grow: 10,
    regrow: 8,
    turns: 50,
    scene: { item: "wood", itemsAt: [{ x: 3, y: 1, item: "carrot" }] }
  }

  test("«рубати сокирою» takes the log, and the tree has it again in half the time", () => {
    const session = newSession(field)
    expect(heroSense(session, "woodAhead")).toBe(true)
    expect(act(field, session, "move", "chop")).toBe("collected")
    // Half of 8 turns, and the turn of the chop itself has passed.
    expect(session.world.growing.get(cellKey(2, 1))).toBe(3)
    expect(heroSense(session, "woodAhead")).toBe(false)
    expect(heroSense(session, "ripeAhead")).toBe(true)
  })

  test("«рубати сокирою» does nothing off a tree", () => {
    const session = newSession(field)
    expect(act(field, session, "move", "move", "chop")).toBe("nothingToCollect")
    expect(session.world.load).toEqual([])
  })

  test("«полити» makes the crop ripe in half of its time, once", () => {
    const session = newSession(field)
    act(field, session, "move", "move", "move")
    const before = session.world.growing.get(cellKey(4, 1))
    expect(act(field, session, "water")).toBe("watered")
    expect(before).toBeGreaterThan(5)
    // Half of 10 turns, and the turn of watering has passed.
    expect(session.world.growing.get(cellKey(4, 1))).toBe(4)
    expect(act(field, session, "water")).toBe("cannotWater")
    expect(act(field, session, "move", "water")).toBe("cannotWater")
  })

  test("«у трубу видно річ?» looks three cells ahead, not through a wall", () => {
    const far: Level = { ...field, map: ["#######", "#S..c.#", "#######"], scene: { item: "wood" } }
    const session = newSession(far)
    expect(heroSense(session, "itemAhead")).toBe(true)
    act(far, session, "turnLeft", "turnLeft")
    expect(heroSense(session, "itemAhead")).toBe(false)
    const tooFar: Level = { ...far, map: ["#######", "#S...c#", "#######"] }
    expect(heroSense(newSession(tooFar), "itemAhead")).toBe(false)
  })

  test("Python has the tools as methods", () => {
    const state = farm(150, 120)
    const code = "for i in range(3):\n    hero.move()\n    if hero.item_is(\"wood\"):\n        hero.chop()\n"
    const { report } = runFarmDay(state, { language: "python", source: code }, farmPalette(seasoned(state), COURSE_IDEAS))
    expect(report.stopped).toBeNull()
  })
})
