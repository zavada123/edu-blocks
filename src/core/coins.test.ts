import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { coinGain, coinsFor, levelCoins, STAR_COINS, TIER_COINS, walletOf } from "./coins.ts"
import { canBuyHero, HEROES, heroesCost, heroOpen } from "./heroes.ts"

describe("coins", () => {
  test("a pass gives the coins of its tier and five for each star, a fail gives none", () => {
    expect(coinsFor("intro", 3)).toBe(TIER_COINS.intro + 3 * STAR_COINS)
    expect(coinsFor("practice", 2)).toBe(25)
    expect(coinsFor("challenge", 1)).toBe(30)
    expect(coinsFor("challenge", 0)).toBe(0)
    expect(coinsFor("intro", 9)).toBe(25)
  })

  test("a replay gives only the coins of new stars", () => {
    expect(coinGain(coinsFor("intro", 3), coinsFor("intro", 2))).toBe(STAR_COINS)
    expect(coinGain(coinsFor("intro", 1), coinsFor("intro", 3))).toBe(0)
  })

  test("the levels give coins by their best stars, and unknown ids give nothing", () => {
    // Arrange
    const [first, second] = levels
    const bests = { [first?.id ?? ""]: 3, [second?.id ?? ""]: 1, "no-such-level": 3 }

    // Act
    const earned = levelCoins(levels, bests)

    // Assert
    expect(earned).toBe(coinsFor(first?.tier ?? "intro", 3) + coinsFor(second?.tier ?? "intro", 1))
    expect(levelCoins(levels, {})).toBe(0)
  })

  test("the wallet is the earned coins and income less the spent coins, never below zero", () => {
    expect(walletOf({ earned: 200, income: 30, spent: 60 })).toBe(170)
    expect(walletOf({ earned: 50, spent: 60 })).toBe(0)
  })

  test("the whole course gives enough coins for every hero of the shop", () => {
    const all = Object.fromEntries(levels.map((l) => [l.id, 3]))
    expect(levelCoins(levels, all)).toBeGreaterThan(heroesCost(HEROES.map((h) => h.id)))
  })
})

describe("the hero shop", () => {
  const knight = HEROES.find((h) => h.id === "knight")
  const gold = HEROES.find((h) => h.id === "knight-gold")

  test("sells six heroes for 60 to 250 coins", () => {
    const prices = HEROES.flatMap((h) => (h.price === undefined ? [] : [h.price]))
    expect(prices).toHaveLength(6)
    expect(Math.min(...prices)).toBe(60)
    expect(Math.max(...prices)).toBe(250)
  })

  test("a hero with a price opens only when bought", () => {
    if (knight === undefined) throw new Error("no knight")
    expect(heroOpen(knight, 5)).toBe(false)
    expect(heroOpen(knight, 5, ["knight"])).toBe(true)
  })

  test("a hero is sold when the hero level is reached and the coins are enough, and only once", () => {
    if (knight === undefined || gold === undefined) throw new Error("no heroes")
    expect(canBuyHero(knight, 1, [], 60)).toBe(true)
    expect(canBuyHero(knight, 1, [], 59)).toBe(false)
    expect(canBuyHero(knight, 1, ["knight"], 500)).toBe(false)
    expect(canBuyHero(gold, gold.heroLevel - 1, [], 500)).toBe(false)
    expect(heroesCost(["knight", "ninja"])).toBe(60)
  })
})
