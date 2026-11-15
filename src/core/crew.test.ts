import { describe, expect, test } from "vitest"
import { buildProgram } from "./build.ts"
import { runCrew } from "./crew.ts"
import { blocksRun, judgeField } from "./judge.ts"
import type { Level } from "./level.ts"
import { startWorld } from "./level.ts"
import { judgePythonField, pythonRun } from "./python/judge.ts"
import { asWorker } from "./world.ts"

const yard: Level = {
  id: "crew",
  title: "crew",
  task: [],
  map: ["#######", "#S...c#", "#.....#", "#.....#", "#######"],
  blocks: ["move", "turnLeft", "turnRight", "collect", "store", "wallAhead", "forever", "if", "ifElse", "repeat"],
  goals: [],
  turns: 6,
  helpers: [{ x: 5, y: 3, dir: "up" }]
}

const blocks = (steps: Parameters<typeof buildProgram>[0]) => (stage: Parameters<typeof blocksRun>[2]) => blocksRun(yard, buildProgram(steps), stage)
const python = (source: string) => (stage: Parameters<typeof pythonRun>[2]) => pythonRun(yard, source, stage)

describe("двоє на одній мапі", () => {
  test("a helper starts where the level puts it, and stands aside from the hero", () => {
    const world = startWorld(yard)
    expect(world.crew).toEqual([{ hero: { x: 5, y: 3, dir: "up" }, load: [], carrying: 0 }])
    const helper = asWorker(world, 1)
    expect(helper.hero).toEqual({ x: 5, y: 3, dir: "up" })
    expect(helper.crew[0]?.hero).toEqual(world.hero)
    expect(asWorker(helper, 1)).toEqual(world)
  })

  test("each turn the hero acts first, then the helper: one frame a turn", () => {
    const result = runCrew(yard, [blocks([{ forever: ["move"] }]), blocks([{ forever: ["move"] }])])
    expect(result.frames.map((f) => f.action)).toEqual(["move", "move", "move", "move", "move"])
    expect(result.frames.map((f) => f.crew?.[0]?.outcome)).toEqual(["moved", "moved", "crashed", undefined, undefined])
    // The helper walked into the fence on its third step: it stays there, and the hero goes on until its own fence.
    expect(result.workers?.[1]?.reason).toBe("crashed")
    expect(result.world.crew[0]?.hero).toMatchObject({ x: 5, y: 1 })
    expect(result.frames.at(-1)?.outcome).toBe("crashed")
    expect(result.workers?.[0]?.reason).toBe("crashed")
  })

  test("the workers share the map: what one takes is gone for the other", () => {
    // The helper comes up to the crystal first and takes it; the hero gets there later and finds the cell empty.
    const hero = blocks([{ repeat: 4, body: ["move"] }, "collect"])
    const helper = python("hero.move()\nhero.move()\nhero.collect()\nhero.collect()")
    const result = runCrew({ ...yard, turns: 8 }, [hero, helper])
    expect(result.workers?.[1]?.frames.map((f) => f.outcome)).toEqual(["moved", "moved", "collected", "nothingToCollect"])
    expect(result.workers?.[0]?.frames.at(-1)?.outcome).toBe("nothingToCollect")
    expect(result.frames).toHaveLength(5)
    expect(result.world.crew[0]?.load).toEqual(["crystal"])
  })

  test("a program alone runs as before, step by step", () => {
    const steps = [{ forever: ["move", "turnRight"] }] as const
    const alone = judgeField(yard, buildProgram(steps))
    const crew = runCrew({ ...yard, helpers: [] }, [blocks(steps)])
    expect(crew.frames.map((f) => [f.action, f.outcome])).toEqual(alone.frames.map((f) => [f.action, f.outcome]))
    const py = judgePythonField(yard, "while True:\n    hero.move()\n    hero.turn_right()\n")
    expect(py.frames.map((f) => f.outcome)).toEqual(alone.frames.map((f) => f.outcome))
  })
})
