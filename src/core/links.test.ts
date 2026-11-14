import { describe, expect, test } from "vitest"
import { adviseRun } from "./advice.ts"
import { buildProgram } from "./build.ts"
import { judgeProgram } from "./judge.ts"
import { checkLevel, plainRoute } from "./kit.ts"
import { type Level, startWorld } from "./level.ts"
import { applyAction, cellKey, gateOpen, gatesOpen, isClosedGate } from "./world.ts"

/** Two levers and two gates: the first lever opens the first gate, the second lever the second one. */
const level = (links: Level["links"]): Level => ({
  id: "links",
  title: "Важелі й ворота",
  task: ["Дійди до мети."],
  map: ["#######", "#SLGlGF", "#######"],
  blocks: ["move", "pull"],
  goals: [{ type: "finish" }],
  hint: "Потягни важіль.",
  stars: { three: 6, two: 8 },
  ...(links === undefined ? {} : { links })
})

const LINKED = level([
  { gate: { x: 3, y: 1 }, levers: [{ x: 2, y: 1 }] },
  { gate: { x: 5, y: 1 }, levers: [{ x: 4, y: 1 }] }
])

describe("gates linked to their own levers", () => {
  test("without links every gate waits for every lever", () => {
    const world = startWorld(level(undefined))
    expect(gateOpen(world, cellKey(3, 1))).toBe(false)
    expect(gateOpen(world, cellKey(5, 1))).toBe(false)
  })

  test("a linked gate waits only for its own levers", () => {
    const world = startWorld(LINKED)
    expect(isClosedGate(world, 3, 1)).toBe(true)
    // The second lever is already on, so the second gate stands open.
    expect(isClosedGate(world, 5, 1)).toBe(false)
    expect(gatesOpen(world)).toBe(false)
  })

  test("pulling a gate's lever opens that gate only", () => {
    const on = applyAction(startWorld(LINKED), "move").world
    const pulled = applyAction(on, "pull")
    expect(pulled.events.map((e) => e.type)).toEqual(["leverPulled", "gatesOpened"])
    expect(isClosedGate(pulled.world, 3, 1)).toBe(false)
    expect(gatesOpen(pulled.world)).toBe(true)
  })

  test("switching a lever off shuts its gate", () => {
    let w = startWorld(LINKED)
    for (const a of ["move", "pull", "move", "move", "pull"] as const) w = applyAction(w, a).world
    expect(isClosedGate(w, 5, 1)).toBe(true)
    expect(isClosedGate(w, 3, 1)).toBe(false)
  })

  test("the plain route pulls only what it must and the level is clean", () => {
    expect(plainRoute(LINKED)).not.toBeNull()
    expect(checkLevel(LINKED).filter((i) => i.level === "error")).toEqual([])
  })

  test("links to cells that are no gate or no lever are errors", () => {
    const bad = level([
      { gate: { x: 2, y: 1 }, levers: [] },
      { gate: { x: 3, y: 1 }, levers: [{ x: 1, y: 1 }] }
    ])
    const texts = checkLevel(bad).map((i) => i.text)
    expect(texts).toContain("Зв'язок воріт на (2, 1): там немає воріт G")
    expect(texts).toContain("Ворота на (3, 1) пов'язані з (1, 1), а там немає важеля")
    expect(texts).toContain("Ворота на (3, 1) не пов'язані з жодним важелем: вони завжди відчинені")
  })

  test("a gate linked twice is an error", () => {
    const twice = level([
      { gate: { x: 3, y: 1 }, levers: [{ x: 2, y: 1 }] },
      { gate: { x: 3, y: 1 }, levers: [{ x: 4, y: 1 }] }
    ])
    expect(checkLevel(twice).map((i) => i.text)).toContain("Ворота на (3, 1) мають два зв'язки: залиш один")
  })

  test("the advice names the levers of the gate the hero walked into", () => {
    const program = buildProgram(["move", "move"])
    const tips = adviseRun(LINKED, program, judgeProgram(LINKED, program))
    expect(tips.join(" ")).toContain("Їх відчиняють важіль на (2, 1)")
  })
})

describe("villagers that speak", () => {
  test("a line too long for the bubble is a warning", () => {
    const say = "а".repeat(81)
    const l: Level = { ...LINKED, scene: { npcs: [{ who: "grandpa", x: 1, y: 0, say }] } }
    expect(checkLevel(l).map((i) => i.text)).toContain("Репліка людини на (1, 0) задовга: не більше 80 знаків")
  })
})
