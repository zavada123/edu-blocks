import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { collectText, heroBlockText } from "./blocks.ts"
import type { Level } from "./level.ts"
import { paletteIssues, paletteActions, solveLevel } from "./solve.ts"
import { storyIssues } from "./story.ts"
import { applyAction } from "./world.ts"
import { allGoalsMet, startWorld } from "./level.ts"

const base: Level = {
  id: "t",
  title: "Тест",
  task: ["Дійди до прапорця."],
  map: ["#####", "#S.F#", "#####"],
  blocks: ["move"],
  goals: [{ type: "finish" }],
  hint: "Два кроки."
}

const replay = (level: Level, actions: ReadonlyArray<Parameters<typeof applyAction>[1]>) =>
  allGoalsMet(level, actions.reduce((w, a) => applyAction(w, a).world, startWorld(level)))

describe("solveLevel", () => {
  test("every level of the course can be passed with the blocks of its palette", () => {
    for (const level of levels) {
      const solved = solveLevel(level)
      expect(solved.kind, level.id).toBe("solved")
      if (solved.kind === "solved") {
        expect(solved.actions.every((a) => level.blocks.includes(a)), level.id).toBe(true)
        expect(replay(level, solved.actions), level.id).toBe(true)
      }
    }
  })

  test("finds the shortest way with only the actions of the palette", () => {
    const solved = solveLevel(base)
    expect(solved).toEqual({ kind: "solved", actions: ["move", "move"] })
  })

  test("turns three times right when the palette has no left turn", () => {
    const level: Level = { ...base, map: ["####", "#F.#", "#S.#", "####"], blocks: ["move", "turnRight"] }
    expect(solveLevel(level)).toEqual({ kind: "solved", actions: ["turnRight", "turnRight", "turnRight", "move"] })
  })

  test("a level without a turn in the palette that needs one cannot be passed", () => {
    const level: Level = { ...base, map: ["####", "#.F#", "#S.#", "####"], blocks: ["move"] }
    expect(solveLevel(level).kind).toBe("impossible")
  })

  test("items to light need the «розпалити» block, enemies to beat need «вдарити»", () => {
    const fires: Level = { ...base, map: ["#####", "#S.c#", "#####"], goals: [{ type: "crystals" }], scene: { item: "campfire" } }
    expect(solveLevel(fires).kind).toBe("impossible")
    expect(solveLevel({ ...fires, blocks: ["move", "collect"] }).kind).toBe("solved")
    const enemy: Level = { ...base, map: ["######", "#S...#", "######"], goals: [{ type: "enemies" }], enemies: [{ kind: "slime", x: 3, y: 1, sight: 0 }] }
    expect(solveLevel(enemy).kind).toBe("impossible")
    expect(solveLevel({ ...enemy, blocks: ["move", "attack"] }).kind).toBe("solved")
  })

  test("the steps of the level count: too few steps cannot reach the goal", () => {
    expect(solveLevel({ ...base, maxSteps: 1 }).kind).toBe("impossible")
    expect(solveLevel({ ...base, maxSteps: 2 }).kind).toBe("solved")
  })

  test("says unknown when the search goes over its limit", () => {
    const open: Level = { ...base, map: ["#######", "#S....#", "#.....#", "#....F#", "#######"], blocks: ["move", "turnLeft", "turnRight"] }
    expect(solveLevel(open, 3).kind).toBe("unknown")
  })

  test("takes only the hero actions of the palette", () => {
    expect(paletteActions({ ...base, blocks: ["repeat", "turnLeft", "move", "wallAhead"] })).toEqual(["move", "turnLeft"])
  })
})

describe("paletteIssues", () => {
  test("the course has no palette issues and its words match the field", () => {
    for (const level of levels) {
      expect(paletteIssues(level), level.id).toEqual([])
      expect(storyIssues(level), level.id).toEqual([])
    }
  })

  test("«якщо» without a question is an error, a question without «якщо» a warning", () => {
    expect(paletteIssues({ ...base, blocks: ["move", "if"] }).map((i) => i.level)).toEqual(["error"])
    expect(paletteIssues({ ...base, blocks: ["move", "wallAhead"] }).map((i) => i.level)).toEqual(["warning"])
    expect(paletteIssues({ ...base, blocks: ["move", "not"] }).map((i) => i.level)).toEqual(["warning"])
  })

  test("a level the palette cannot pass is an error that names the steps", () => {
    expect(paletteIssues({ ...base, maxSteps: 1 }).map((i) => i.text)).toEqual([
      "Рівень не пройти блоками палітри (кроків дозволено: 1): перевір блоки, мапу й ворогів"
    ])
  })
})

describe("the words of «взяти»", () => {
  test("follow the items of the level", () => {
    expect(collectText({ item: "campfire" })).toBe("розпалити")
    expect(collectText({ item: "fish" })).toBe("зловити")
    expect(collectText({ item: "wood" })).toBe("взяти")
    expect(collectText(undefined)).toBe("взяти")
    expect(heroBlockText("collect", { item: "campfire" })).toBe("розпалити")
    expect(heroBlockText("move", { item: "campfire" })).toBe("крок уперед")
  })
})
