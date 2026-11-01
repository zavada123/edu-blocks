import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { definitions, solutions } from "../levels/solutions.ts"
import { buildProgram } from "./build.ts"
import { combineFields, fieldCount, levelFields, MAX_FIELDS } from "./fields.ts"
import { judgeField, judgeFields, judgeProgram } from "./judge.ts"
import type { Level } from "./level.ts"
import { solutionSource } from "./python/convert.ts"
import { judgePython } from "./python/judge.ts"
import { solveLevel } from "./solve.ts"

const bridge: Level = {
  id: "t-bridge",
  title: "Міст",
  task: ["Іди мостом до ключа."],
  map: ["#######", "#S...c#", "#######"],
  dir: "right",
  maxSteps: 20,
  blocks: ["move", "collect", "repeat", "repeatUntil", "wallAhead"],
  goals: [{ type: "crystals" }],
  stars: { three: 4, two: 6 },
  scene: { theme: "winter", ground: "bridge", item: "key" },
  enemies: [{ kind: "slime", x: 3, y: 1, sight: 0 }],
  fields: [{ map: ["#####", "#S.c#", "#####"] }, { map: ["#########", "#S.....c#", "#########"], maxSteps: 3, dir: "left" }]
}

describe("levelFields", () => {
  test("a level without fields has one field: itself", () => {
    const level = levels[0]
    if (level === undefined) throw new Error("no levels")
    expect(levelFields(level)).toEqual([level])
    expect(fieldCount(level)).toBe(1)
  })

  test("a field takes the blocks, goals and stars of the level and its own map", () => {
    const [first, second, third] = levelFields(bridge)
    expect(first?.map).toEqual(bridge.map)
    expect(first?.fields).toBeUndefined()
    expect(second).toMatchObject({ id: "t-bridge", map: ["#####", "#S.c#", "#####"], blocks: bridge.blocks, goals: bridge.goals, stars: bridge.stars })
    expect(second?.fields).toBeUndefined()
    expect(third?.map).toEqual(["#########", "#S.....c#", "#########"])
  })

  test("a field keeps the direction, steps and scene of the level unless it has its own; enemies only its own", () => {
    const [first, second, third] = levelFields(bridge)
    expect(first?.enemies).toEqual(bridge.enemies)
    expect(second).toMatchObject({ dir: "right", maxSteps: 20, scene: bridge.scene })
    expect(second?.enemies).toBeUndefined()
    expect(third).toMatchObject({ dir: "left", maxSteps: 3 })
  })

  test("has at most MAX_FIELDS fields", () => {
    const many: Level = { ...bridge, fields: Array.from({ length: 9 }, () => ({ map: ["#####", "#S.c#", "#####"] })) }
    expect(levelFields(many)).toHaveLength(MAX_FIELDS)
  })
})

describe("judgeProgram on a level with fields", () => {
  const plain: Level = { ...bridge, enemies: [], fields: [{ map: ["#####", "#S.c#", "#####"] }, { map: ["#########", "#S.....c#", "#########"] }] }

  test("passes when the program passes every field, and names the fields", () => {
    const program = buildProgram([{ until: "wallAhead", body: ["move"] }, "collect"])
    const result = judgeProgram(plain, program)
    expect(result).toMatchObject({ passed: true, stars: 3, field: 0, fields: [true, true, true] })
    expect(judgeFields(plain, program).map((r) => r.passed)).toEqual([true, true, true])
  })

  test("fails on the first field the program fails, with the frames of that field", () => {
    const program = buildProgram([{ repeat: 4, body: ["move"] }, "collect"])
    const result = judgeProgram(plain, program)
    expect(result).toMatchObject({ passed: false, stars: 0, field: 1, fields: [true, false, false], reason: "crashed" })
    expect(result.frames).toEqual(judgeField(levelFields(plain)[1] ?? plain, program).frames)
  })

  test("a level with one field gives its run as it is", () => {
    const level = levels[0]
    if (level === undefined) throw new Error("no levels")
    const result = judgeProgram(level, buildProgram(solutions[level.id] ?? []))
    expect(result.field).toBeUndefined()
    expect(result.fields).toBeUndefined()
  })

  test("Python code is graded on every field too", () => {
    expect(judgePython(plain, "while not hero.wall_ahead():\n    hero.move()\nhero.collect()")).toMatchObject({ passed: true, fields: [true, true, true] })
    expect(judgePython(plain, "hero.move(4)\nhero.collect()")).toMatchObject({ passed: false, field: 1 })
  })

  test("combineFields of one run is that run", () => {
    const run = judgeField(plain, buildProgram(["move"]))
    expect(combineFields([run])).toBe(run)
  })
})

describe("the fields of the course", () => {
  const withFields = levels.filter((l) => fieldCount(l) > 1)

  test("conditions, loops «until», traps and custom blocks have levels with several fields", () => {
    expect(withFields.length).toBeGreaterThanOrEqual(10)
  })

  test.each(withFields.map((l) => [l.id, l]))("%s: the reference solution passes every field, in blocks and in Python", (_id, level) => {
    const program = buildProgram(solutions[level.id] ?? [], definitions[level.id])
    expect(judgeFields(level, program).map((r) => r.stars)).toEqual(levelFields(level).map(() => 3))
    expect(judgePython(level, solutionSource(level))).toMatchObject({ passed: true, stars: 3 })
  })

  test.each(withFields.map((l) => [l.id, l]))("%s: steps learned by heart for the first field fail another field", (_id, level) => {
    const first = levelFields(level)[0] ?? level
    const solved = solveLevel(first)
    expect(solved.kind).toBe("solved")
    if (solved.kind !== "solved") return
    const passed = judgeFields(level, buildProgram(solved.actions)).map((r) => r.passed)
    expect(passed[0]).toBe(true)
    expect(passed.includes(false)).toBe(true)
  })

  test.each(withFields.map((l) => [l.id, l]))("%s: every field can be passed with the blocks of the palette", (_id, level) => {
    for (const field of levelFields(level)) expect(solveLevel(field).kind).toBe("solved")
  })
})
