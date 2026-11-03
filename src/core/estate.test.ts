import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { buildProgram, type Step } from "./build.ts"
import {
  buyUpgrade,
  canBuyUpgrade,
  carrotFrames,
  canStartDay,
  ESTATE_UPGRADES,
  type EstateUpgrade,
  type EstateUpgradeId,
  type EstateUpgrades,
  estateDay,
  estateDays,
  estateHarvest,
  estatePalette,
  estateSeason,
  FULL_DAY_COINS,
  isEstateLevel,
  MAX_TREES,
  NEW_ESTATE,
  PRODUCE_COINS,
  START_TREES,
  upgradeCount,
  upgradesCost
} from "./estate.ts"
import { judgeProgram } from "./judge.ts"
import { checkLevel } from "./kit.ts"
import { type BlockName, describeGoal, startWorld } from "./level.ts"
import { judgePython } from "./python/judge.ts"
import { solveLevel } from "./solve.ts"
import { tilemapIssues } from "./tilemap.ts"

const ALL: ReadonlyArray<BlockName> = ["move", "turnLeft", "turnRight", "collect", "wallAhead", "onCrystal", "atFinish", "repeat", "repeatUntil", "if", "ifElse", "not"]

/** The routine that works every day: take what lies here, turn at a wall, step otherwise, until home. */
const ROUTINE: ReadonlyArray<Step> = [
  {
    until: "atFinish",
    body: [{ if: "onCrystal", then: ["collect"] }, { if: "wallAhead", then: ["turnRight"], else: ["move"] }]
  }
]

const PYTHON_ROUTINE = ["while not hero.at_finish():", "    if hero.item_here():", "        hero.collect()", "    if hero.wall_ahead():", "        hero.turn_right()", "    else:", "        hero.move()"].join("\n")

const upgrade = (id: EstateUpgradeId): EstateUpgrade => {
  const found = ESTATE_UPGRADES.find((u) => u.id === id)
  if (found === undefined) throw new Error(`no upgrade ${id}`)
  return found
}
const FULL: EstateUpgrades = { tree: MAX_TREES - START_TREES, carrots: 1, coop: 1, patches: 1, flowers: 1, dog: 1, cat: 1 }
const SETS: ReadonlyArray<EstateUpgrades> = [{}, { tree: 2 }, { carrots: 1 }, { carrots: 1, coop: 1 }, { patches: 1, tree: 1 }, FULL]

describe("estate days", () => {
  test("a new estate is a ring of paths from the door along the orchard and back home", () => {
    // Act
    const { level, produce } = estateDay(NEW_ESTATE, ALL)

    // Assert
    expect(level.map.every((row) => row.length === level.map[0]?.length)).toBe(true)
    expect(level.map[1]?.slice(0, 3)).toBe("#FS")
    expect(produce.every((p) => p.kind === "apple" && p.y === 1 && p.x >= 3 && p.x < 3 + START_TREES)).toBe(true)
    expect(produce.length).toBeGreaterThan(0)
    expect(checkLevel(level).filter((i) => i.level === "error")).toEqual([])
    expect(isEstateLevel(level.id)).toBe(true)
    expect(isEstateLevel("g3-steps")).toBe(false)
  })

  test("every day of every estate passes with one general routine, in blocks and in Python", () => {
    for (const upgrades of SETS) {
      for (let day = 1; day <= 40; day++) {
        // Arrange
        const { level } = estateDay({ upgrades, day }, ALL)

        // Act
        const blocks = judgeProgram(level, buildProgram(ROUTINE))
        const python = judgePython(level, PYTHON_ROUTINE)

        // Assert
        expect({ day, upgrades, passed: blocks.passed }).toEqual({ day, upgrades, passed: true })
        expect(python.passed).toBe(true)
      }
    }
  })

  test("every day is drawn as a Sunnyside map that covers the yard and keeps the paths clear", () => {
    for (const upgrades of SETS) {
      for (let day = 1; day <= 30; day++) {
        const { level } = estateDay({ upgrades, day }, ALL)
        expect(level.scene?.tilemap?.tileset, `day ${day}`).toBe("sunnyside:tileset/16px")
        expect(level.scene?.props, `day ${day}`).toBeUndefined()
        expect(tilemapIssues(level), `day ${day} ${JSON.stringify(upgrades)}`).toEqual([])
      }
    }
  })

  test("the carrot bed grows from day to day", () => {
    const frames = (day: number) =>
      (estateDay({ upgrades: { carrots: 1 }, day }, ALL).level.scene?.sprites ?? []).filter((s) => s.asset === "sunnyside:crop/carrot").map((s) => s.frame)
    expect(frames(1)).toHaveLength(START_TREES)
    expect(frames(1)).not.toEqual(frames(2))
  })

  test("the farm stays in place: the same map, house and pond for every day and every upgrade", () => {
    const placeOf = (upgrades: EstateUpgrades, day: number) => {
      const map = estateDay({ upgrades, day }, ALL).level.scene?.tilemap
      const ground = map?.layers.find((l) => l.name === "ground")?.data ?? []
      const water = ground.flatMap((t, i) => (t !== ground[0] && t > 300 ? [i] : []))
      return { x: map?.x, y: map?.y, width: map?.width, height: map?.height, above: map?.layers.find((l) => l.kind === "above")?.data, water }
    }
    const first = placeOf({}, 1)
    for (const upgrades of SETS) {
      for (const day of [1, 2, 9, 17]) {
        const place = placeOf(upgrades, day)
        expect({ ...place, above: undefined }, `${JSON.stringify(upgrades)} day ${day}`).toEqual({ ...first, above: undefined })
      }
    }
    // The farmhouse roof is the same; the hen house roof joins it once it is bought.
    const roofs = (upgrades: EstateUpgrades) => (placeOf(upgrades, 3).above ?? []).flatMap((t, i) => (t > 0 ? [i] : []))
    expect(roofs({ carrots: 1, coop: 1 })).toEqual(expect.arrayContaining(roofs({})))
    expect(roofs({ carrots: 1, coop: 1 }).length).toBeGreaterThan(roofs({}).length)
  })

  test("the shop's plots show on the farm until they are bought", () => {
    const sprites = (upgrades: EstateUpgrades) => estateDay({ upgrades, day: 4 }, ALL).level.scene?.sprites ?? []
    const dug = (upgrades: EstateUpgrades) => sprites(upgrades).filter((s) => s.asset === "sunnyside:crop/soil" && s.y === 0).length
    expect(dug({})).toBe(MAX_TREES - START_TREES)
    expect(dug({ tree: 2 })).toBe(MAX_TREES - START_TREES - 2)
    expect(dug(FULL)).toBe(0)
    expect(sprites({}).some((s) => s.asset === "sunnyside:item/seeds-generic")).toBe(true)
    expect(sprites({ carrots: 1 }).some((s) => s.asset === "sunnyside:item/seeds-generic")).toBe(false)
    expect(sprites({ carrots: 1 }).some((s) => s.asset === "sunnyside:item/crate-base")).toBe(true)
    expect(sprites({ carrots: 1, coop: 1 }).some((s) => s.asset === "sunnyside:item/crate-base")).toBe(false)
  })

  test("a carrot picked on one day is sown again the next and grows", () => {
    const upgrades: EstateUpgrades = { carrots: 1, tree: 2 }
    let checked = 0
    for (let day = 1; day <= 40; day++) {
      const today = carrotFrames(upgrades, day)
      const tomorrow = carrotFrames(upgrades, day + 1)
      const after = carrotFrames(upgrades, day + 2)
      today.forEach((frame, i) => {
        if (frame !== 4 || tomorrow[i] === 4) return
        expect(tomorrow[i], `day ${day + 1} carrot ${i}`).toBe(1)
        if (after[i] !== 4) expect(after[i], `day ${day + 2} carrot ${i}`).toBe(2)
        checked++
      })
    }
    expect(checked).toBeGreaterThan(10)
    // The ripe ones are the carrots lying on the path to pick.
    const day = estateDay({ upgrades, day: 6 }, ALL)
    expect(carrotFrames(upgrades, 6).filter((f) => f === 4)).toHaveLength(day.produce.filter((p) => p.kind === "carrot").length)
  })

  test("the biggest estate still fits the field", () => {
    const { level } = estateDay({ upgrades: FULL, day: 5 }, ALL)
    const world = startWorld(level)
    expect(world.width).toBeLessThanOrEqual(16)
    expect(world.height).toBeLessThanOrEqual(12)
  })

  test("the same day is the same everywhere, and days differ", () => {
    const first = estateDay({ upgrades: { carrots: 1, coop: 1 }, day: 3 }, ALL)
    expect(estateDay({ upgrades: { carrots: 1, coop: 1 }, day: 3 }, ALL)).toEqual(first)
    const maps = new Set(Array.from({ length: 10 }, (_, i) => estateDay({ upgrades: { carrots: 1, coop: 1 }, day: i + 1 }, ALL).level.map.join("/")))
    expect(maps.size).toBeGreaterThan(5)
  })

  test("some days the hens lay nothing, and the far end of the yard moves", () => {
    const days = Array.from({ length: 30 }, (_, i) => estateDay({ upgrades: { carrots: 1, coop: 1 }, day: i + 1 }, ALL))
    expect(days.some((d) => !d.produce.some((p) => p.kind === "egg"))).toBe(true)
    expect(days.some((d) => d.produce.some((p) => p.kind === "egg"))).toBe(true)
    expect(new Set(days.map((d) => d.level.map[1]?.lastIndexOf("."))).size).toBeGreaterThan(1)
  })

  test("a list of steps learned on one day fails on another", () => {
    // Arrange
    const first = estateDay(NEW_ESTATE, ALL)
    const solved = solveLevel(first.level)
    if (solved.kind !== "solved") throw new Error("day 1 has no solution")
    const program = buildProgram(solved.actions)

    // Act
    const later = Array.from({ length: 10 }, (_, i) => judgeProgram(estateDay({ upgrades: {}, day: i + 2 }, ALL).level, program))

    // Assert
    expect(judgeProgram(first.level, program).passed).toBe(true)
    expect(later.some((r) => !r.passed)).toBe(true)
  })

  test("the goal names the harvest when more than apples grow", () => {
    const day = estateDay({ upgrades: { carrots: 1 }, day: 2 }, ALL)
    const world = startWorld(day.level)
    expect(describeGoal({ type: "crystals" }, world, day.level.scene)).toBe(`Збери врожай (${day.produce.length})`)
    const apples = estateDay(NEW_ESTATE, ALL)
    expect(describeGoal({ type: "crystals" }, startWorld(apples.level), apples.level.scene)).toMatch(/^Збери яблука/)
  })

  test("the seasons change every week, from autumn", () => {
    expect([1, 7, 8, 15, 22, 29].map(estateSeason)).toEqual(["autumn", "autumn", "winter", "spring", "summer", "autumn"])
  })
})

describe("harvest", () => {
  test("a full day pays for everything gathered and the way home", () => {
    // Arrange
    const day = estateDay({ upgrades: { carrots: 1, coop: 1 }, day: 4 }, ALL)

    // Act
    const harvest = estateHarvest(day, judgeProgram(day.level, buildProgram(ROUTINE)))

    // Assert
    const count = (kind: string) => day.produce.filter((p) => p.kind === kind).length
    expect(harvest).toEqual({
      apple: count("apple"),
      carrot: count("carrot"),
      egg: count("egg"),
      full: true,
      coins: count("apple") * PRODUCE_COINS.apple + count("carrot") * PRODUCE_COINS.carrot + count("egg") * PRODUCE_COINS.egg + FULL_DAY_COINS
    })
  })

  test("a day done in more than one piece is work by hand: no bonus of a full day", () => {
    // Arrange
    const day = estateDay({ upgrades: { carrots: 1, coop: 1 }, day: 4 }, ALL)
    const result = judgeProgram(day.level, buildProgram(ROUTINE))

    // Act
    const one = estateHarvest(day, result, 1)
    const two = estateHarvest(day, result, 2)

    // Assert
    expect(two).toEqual({ ...one, full: false, coins: one.coins - FULL_DAY_COINS })
  })

  test("a failed day still pays for what the hero gathered", () => {
    // Arrange: walk the top path, taking the apples, into the far wall.
    const day = estateDay(NEW_ESTATE, ALL)
    const program = buildProgram([{ repeat: 12, body: [{ if: "onCrystal", then: ["collect"] }, "move"] }])

    // Act
    const harvest = estateHarvest(day, judgeProgram(day.level, program))

    // Assert
    expect(harvest).toEqual({ apple: day.produce.length, carrot: 0, egg: 0, full: false, coins: day.produce.length * PRODUCE_COINS.apple })
  })
})

describe("estate upgrades and days", () => {
  test("an upgrade needs its price, room for one more and the upgrade before it", () => {
    expect(canBuyUpgrade(upgrade("tree"), {}, 30)).toBe(true)
    expect(canBuyUpgrade(upgrade("tree"), {}, 29)).toBe(false)
    expect(canBuyUpgrade(upgrade("tree"), { tree: MAX_TREES - START_TREES }, 999)).toBe(false)
    expect(canBuyUpgrade(upgrade("coop"), {}, 999)).toBe(false)
    expect(canBuyUpgrade(upgrade("coop"), { carrots: 1 }, 999)).toBe(true)
  })

  test("buying adds one within the limit, and the cost sums the prices", () => {
    expect(buyUpgrade({}, "tree")).toEqual({ tree: 1 })
    expect(buyUpgrade({ tree: MAX_TREES - START_TREES }, "tree")).toEqual({ tree: MAX_TREES - START_TREES })
    expect(upgradesCost({ tree: 2, carrots: 1 })).toBe(2 * upgrade("tree").price + upgrade("carrots").price)
    expect(upgradesCost(FULL)).toBe(ESTATE_UPGRADES.reduce((sum, u) => sum + u.price * u.max, 0))
  })

  test("stored counts that make no sense count as nothing or the limit", () => {
    expect(upgradeCount({ tree: Number.NaN }, "tree")).toBe(0)
    expect(upgradeCount({ tree: -3 }, "tree")).toBe(0)
    expect(upgradeCount({ carrots: 7 }, "carrots")).toBe(1)
  })

  test("days come from passed levels, three to start with", () => {
    expect(estateDays(0)).toBe(3)
    expect(estateDays(5)).toBe(8)
    expect(canStartDay({ upgrades: {}, day: 2 }, 0)).toBe(true)
    expect(canStartDay({ upgrades: {}, day: 3 }, 0)).toBe(false)
    expect(canStartDay({ upgrades: {}, day: 3 }, 1)).toBe(true)
  })

  test("the palette has the blocks of the passed levels and always the walk and «взяти»", () => {
    expect(estatePalette([])).toEqual(["move", "turnLeft", "turnRight", "collect"])
    const palette = estatePalette(levels)
    expect(new Set(palette).size).toBe(palette.length)
    expect(palette).toEqual(expect.arrayContaining(["repeatUntil", "ifElse", "onCrystal", "procedure"]))
  })

  test("the days of the whole course pay for every upgrade, even without the coins of the levels", () => {
    // Arrange: a student plays each day with the general routine and buys what they can at once.
    let upgrades: EstateUpgrades = {}
    let coins = 0

    // Act
    for (let n = 1; n <= estateDays(levels.length); n++) {
      const day = estateDay({ upgrades, day: n }, ALL)
      coins += estateHarvest(day, judgeProgram(day.level, buildProgram(ROUTINE))).coins
      for (const u of ESTATE_UPGRADES) {
        while (canBuyUpgrade(u, upgrades, coins)) {
          coins -= u.price
          upgrades = buyUpgrade(upgrades, u.id)
        }
      }
    }

    // Assert
    expect(upgradesCost(upgrades)).toBe(upgradesCost(FULL))
  })
})
