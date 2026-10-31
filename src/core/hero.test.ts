import { describe, expect, test } from "vitest"
import { HERO_BLOCKS, opcodeOf } from "./blocks.ts"
import { buildProgram } from "./build.ts"
import { actionOfOpcode, HERO_ACTIONS, HERO_SENSORS, heroAct, heroSense, newSession, sensorOfOpcode } from "./hero.ts"
import { judgeProgram } from "./judge.ts"
import type { Level } from "./level.ts"
import { applyAction, type EnemySpec, type GameEvent, parseMap } from "./world.ts"

const level = (map: Level["map"], extra: Partial<Level> = {}): Level => ({
  id: "t",
  title: "t",
  task: [],
  map,
  blocks: ["move", "turnLeft", "turnRight", "collect", "attack", "repeat"],
  goals: [{ type: "crystals" }],
  ...extra
})

const types = (events: ReadonlyArray<GameEvent>) => events.map((e) => e.type)

describe("hero API", () => {
  test("every hero block is an action or a question of the API, and back", () => {
    const api = [...HERO_ACTIONS, ...Object.keys(HERO_SENSORS)].sort()
    expect(HERO_BLOCKS.map((b) => b.name).sort()).toEqual(api)
    for (const b of HERO_BLOCKS) {
      const found = b.boolean ? sensorOfOpcode(opcodeOf(b.name)) : actionOfOpcode(opcodeOf(b.name))
      expect(found).toBe(b.name)
    }
    expect(actionOfOpcode("control_repeat")).toBeUndefined()
    expect(sensorOfOpcode("hero_move")).toBeUndefined()
  })

  test("an action writes a frame with the block, the events and the goals", () => {
    const lvl = level(["#####", "#S.c#", "#####"], { goals: [{ type: "crystals" }, { type: "finish" }] })
    const session = newSession(lvl)
    expect(heroAct(lvl, session, "move", { blockId: "b1" })).toBe(false)
    expect(session.frames[0]).toMatchObject({ action: "move", outcome: "moved", blockId: "b1", goals: [false, false] })
    expect(session.frames[0]?.events).toEqual([{ type: "heroMoved", from: { x: 1, y: 1 }, to: { x: 2, y: 1 } }])
    expect(heroSense(session, "wallAhead")).toBe(false)
  })

  test("the run ends when the goals are met, and later actions do nothing", () => {
    const lvl = level(["#####", "#Sc.#", "#####"])
    const session = newSession(lvl)
    heroAct(lvl, session, "move", { blockId: null })
    expect(heroAct(lvl, session, "collect", { blockId: null })).toBe(true)
    expect(session).toMatchObject({ done: true, reason: null })
    expect(session.frames.at(-1)?.goals).toEqual([true])
    expect(heroAct(lvl, session, "move", { blockId: null })).toBe(true)
    expect(session.frames).toHaveLength(2)
  })

  test("a crash ends the run with its reason", () => {
    const lvl = level(["###", "#S#", "###"])
    const session = newSession(lvl)
    expect(heroAct(lvl, session, "move", { blockId: null })).toBe(true)
    expect(session.reason).toBe("crashed")
  })

  test("the frames of a judged program carry the events", () => {
    const lvl = level(["######", "#S..c#", "######"])
    const result = judgeProgram(lvl, buildProgram([{ repeat: 3, body: ["move"] }, "collect"]))
    expect(result.passed).toBe(true)
    expect(result.frames.map((f) => types(f.events))).toEqual([["heroMoved"], ["heroMoved"], ["heroMoved"], ["itemTaken"]])
  })
})

describe("events", () => {
  test("turns, an empty take and a bump", () => {
    const world = parseMap(["####", "#S.#", "####"])
    expect(applyAction(world, "turnLeft").events).toEqual([{ type: "heroTurned", from: "right", to: "up" }])
    expect(applyAction(world, "collect").events).toEqual([{ type: "nothingToTake", at: { x: 1, y: 1 } }])
    const there = applyAction(world, "move").world
    expect(applyAction(there, "move").events).toEqual([{ type: "heroBumped", into: { x: 3, y: 1 } }])
  })

  test("a trap: the step and then the fall", () => {
    const world = parseMap(["####", "#Sx#", "####"])
    expect(types(applyAction(world, "move").events)).toEqual(["heroMoved", "heroFell"])
  })

  test("no steps left", () => {
    const world = { ...parseMap(["####", "#S.#", "####"]), energy: 0 }
    expect(applyAction(world, "move").events).toEqual([{ type: "heroTired" }])
  })

  const fight = (spec: EnemySpec) => {
    const lvl = level(["#########", "#S......#", "#########"], { goals: [{ type: "enemies" }], enemies: [spec] })
    return newSession(lvl).world
  }

  test("an enemy comes, winds up, hits; the hero strikes it down", () => {
    let world = fight({ kind: "slime", x: 4, y: 1, sight: 2 })
    const step = applyAction(world, "move")
    expect(step.events).toEqual([
      { type: "heroMoved", from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
      { type: "enemyMoved", id: 0, from: { x: 4, y: 1 }, to: { x: 3, y: 1 } }
    ])
    world = step.world
    const wait = applyAction(world, "turnLeft")
    expect(types(wait.events)).toEqual(["heroTurned", "enemyWindUp"])
    const hurt = applyAction(wait.world, "turnRight")
    expect(hurt.events.at(-1)).toEqual({ type: "heroHurt", by: 0, hearts: 2 })
    const blow = applyAction(hurt.world, "attack")
    expect(blow.events).toEqual([{ type: "heroSwung", at: { x: 3, y: 1 } }, { type: "enemyDown", id: 0 }])
  })

  test("a strong enemy loses a hit point", () => {
    const world = fight({ kind: "goblin", x: 2, y: 1, hp: 2, sight: 0 })
    expect(applyAction(world, "attack").events).toEqual([
      { type: "heroSwung", at: { x: 2, y: 1 } },
      { type: "enemyHit", id: 0, hp: 1 },
      { type: "enemyWindUp", id: 0 }
    ])
  })
})
