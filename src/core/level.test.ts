import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { describeGoal } from "./level.ts"
import { parseMap } from "./world.ts"

describe("describeGoal", () => {
  const world = parseMap(["#######", "#Sc.cF#", "#######"])

  test("names crystals and the flag when the level has no scene", () => {
    expect(describeGoal({ type: "crystals" }, world)).toBe("Збери всі кристали (2)")
    expect(describeGoal({ type: "finish" }, world)).toBe("Дійди до прапорця")
  })

  test("names the item and the goal of the scene", () => {
    expect(describeGoal({ type: "crystals" }, world, { item: "apple" })).toBe("Збери яблука (2)")
    expect(describeGoal({ type: "crystals" }, parseMap(["#Sc#"]), { item: "wood" })).toBe("Візьми дрова")
    expect(describeGoal({ type: "finish" }, world, { finish: "well" })).toBe("Дійди до криниці")
  })
})

describe("story levels", () => {
  test("every level has a season and a reason to go", () => {
    for (const level of levels) {
      expect(level.scene?.theme).toBeDefined()
      expect(level.task.length).toBeGreaterThan(0)
    }
  })

  test("the year goes round: the course starts in autumn and has all four seasons", () => {
    expect(levels[0]?.scene?.theme).toBe("autumn")
    expect(new Set(levels.map((l) => l.scene?.theme))).toEqual(new Set(["autumn", "winter", "spring", "summer"]))
  })

  test("only winter levels have ice or ice holes", () => {
    for (const level of levels) if (level.scene?.ground === "ice" || level.scene?.item === "fish") expect(level.scene.theme).toBe("winter")
  })
})
