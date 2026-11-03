import { describe, expect, test } from "vitest"
import { estateDay, NEW_ESTATE } from "../core/estate.ts"
import { harvestRewardOf, harvestText } from "./Verdict.tsx"

const harvest = (apple: number, carrot: number, egg: number, full = false) => ({ apple, carrot, egg, full, coins: apple * 2 + carrot * 3 + egg * 4 + (full ? 5 : 0) })

describe("harvest in the result", () => {
  test("names what the hero gathered, as Ukrainian counts it", () => {
    expect(harvestText(harvest(3, 2, 1))).toBe("3 гриби, 2 гарбузи і 1 ягня")
    expect(harvestText(harvest(1, 0, 0))).toBe("1 гриб")
    expect(harvestText(harvest(11, 0, 5))).toBe("11 грибів і 5 ягнят")
    expect(harvestText(harvest(0, 0, 0))).toBe("нічого")
  })

  test("a day pays only the coins above its best run, and gives no XP", () => {
    // Arrange
    const day = estateDay(NEW_ESTATE, ["move"])

    // Act
    const better = harvestRewardOf(harvest(3, 0, 0, true), { day, best: 6 }, true, { total: 100, best: 0 }, { total: 40, best: 0 })
    const worse = harvestRewardOf(harvest(1, 0, 0), { day, best: 6 }, false, undefined, undefined)

    // Assert
    expect(better.runXp).toBe(0)
    expect(better.runCoins).toBe(11)
    expect(better.reward.coins).toEqual({ gain: 5, total: 45 })
    expect(better.reward.total).toBe(100)
    expect(worse.reward.coins).toEqual({ gain: 0, total: 0 })
  })
})
