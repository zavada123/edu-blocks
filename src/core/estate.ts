import type { BlockName, Level, PlacedSprite, Prop, Scene, Season } from "./level.ts"
import type { RunResult } from "./program.ts"
import { cellKey } from "./world.ts"

/**
 * Хутір: the hero's homestead. The student writes a morning routine once, and each new day checks whether it is
 * general enough: which apples are ripe, how far the yard is snowed in and whether the hens laid eggs change every
 * day. A day is an ordinary level made by `estateDay`, so the estate runs on the same judge, field and Python.
 *
 * The app keeps the estate (`EstateState`), the routine and the coins; the functions here are pure, the same for the
 * browser and a server. Days are earned by learning (`estateDays`), and upgrades bought with coins change the map so
 * that a routine learned by heart stops working (`ESTATE_UPGRADES`).
 */

export type EstateUpgradeId = "tree" | "carrots" | "coop" | "patches" | "flowers" | "dog" | "cat"

export interface EstateUpgrade {
  readonly id: EstateUpgradeId
  readonly name: string
  /** What it changes, for the shop. */
  readonly about: string
  readonly price: number
  /** How many times it can be bought. */
  readonly max: number
  /** An upgrade the student must have first. */
  readonly needs?: EstateUpgradeId
}

/** The trees every estate starts with, and how many more the student can plant. */
export const START_TREES = 3
export const MAX_TREES = 8

export const ESTATE_UPGRADES: ReadonlyArray<EstateUpgrade> = [
  {
    id: "tree",
    name: "Яблуня",
    about: "Ще одне дерево в саду. Ряд довшає, тож рахувати кроки вже не вийде.",
    price: 30,
    max: MAX_TREES - START_TREES
  },
  { id: "carrots", name: "Грядка моркви", about: "Морква вздовж нижньої стежки, за другим поворотом.", price: 60, max: 1 },
  { id: "coop", name: "Курник", about: "Кури несуться біля хати, але не щодня: перевір, чи є яйце.", price: 90, max: 1, needs: "carrots" },
  { id: "patches", name: "Розчищене подвір'я", about: "Кінець двору замітає менше, тож день коротшає.", price: 40, max: 1 },
  { id: "flowers", name: "Квітник", about: "Квіти посеред двору. Лише для краси.", price: 15, max: 1 },
  { id: "dog", name: "Песик", about: "Стереже двір. Лише для краси.", price: 35, max: 1 },
  { id: "cat", name: "Кіт", about: "Гріється біля хати. Лише для краси.", price: 50, max: 1 }
]

/** How many times the student bought each upgrade. */
export type EstateUpgrades = Readonly<Partial<Record<EstateUpgradeId, number>>>

/** What the app keeps of the estate. */
export interface EstateState {
  readonly upgrades: EstateUpgrades
  /** The day being played, from 1. */
  readonly day: number
}

/** The first day of a new estate. */
export const NEW_ESTATE: EstateState = { upgrades: {}, day: 1 }

const upgradeOf = (id: EstateUpgradeId): EstateUpgrade | undefined => ESTATE_UPGRADES.find((u) => u.id === id)

/** How many times an upgrade is bought, within its limit (stored data can be anything). */
export const upgradeCount = (upgrades: EstateUpgrades, id: EstateUpgradeId): number => {
  const n = Math.round(upgrades[id] ?? 0)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), upgradeOf(id)?.max ?? 0) : 0
}

/** Whether the student can buy one more of an upgrade now. */
export const canBuyUpgrade = (upgrade: EstateUpgrade, upgrades: EstateUpgrades, coins: number): boolean =>
  upgradeCount(upgrades, upgrade.id) < upgrade.max &&
  (upgrade.needs === undefined || upgradeCount(upgrades, upgrade.needs) > 0) &&
  coins >= upgrade.price

/** The upgrades after one more purchase. */
export const buyUpgrade = (upgrades: EstateUpgrades, id: EstateUpgradeId): EstateUpgrades => ({
  ...upgrades,
  [id]: Math.min(upgradeCount(upgrades, id) + 1, upgradeOf(id)?.max ?? 0)
})

/** The coins spent on the estate. */
export const upgradesCost = (upgrades: EstateUpgrades): number =>
  ESTATE_UPGRADES.reduce((sum, u) => sum + u.price * upgradeCount(upgrades, u.id), 0)

/** The days a new student has before passing any level. */
export const ESTATE_START_DAYS = 3

/** The days the student has opened: one for each passed level of the course and three to start with. */
export const estateDays = (passedLevels: number): number => Math.max(0, Math.round(passedLevels)) + ESTATE_START_DAYS

/** Whether the student may start the day after `state.day`. No timers: days come only from learning. */
export const canStartDay = (state: EstateState, passedLevels: number): boolean => state.day < estateDays(passedLevels)

/** What grows or lies on the estate. */
export type Produce = "apple" | "carrot" | "egg"

/** Coins for each thing gathered, and for a day when the hero gathered everything and came home. */
export const PRODUCE_COINS: Readonly<Record<Produce, number>> = { apple: 2, carrot: 3, egg: 4 }
export const FULL_DAY_COINS = 5

export interface EstateDay {
  readonly day: number
  /** The level of the day: give it to `EduBlocks` or `EduPython`. */
  readonly level: Level
  /** What lies on each `c` cell of the map. */
  readonly produce: ReadonlyArray<{ readonly x: number; readonly y: number; readonly kind: Produce }>
}

/** Cells of the yard after the trees; some of them are snowed in on a day. */
const YARD = 3
const NESTS = 3
const RIPE_APPLE = 0.6
const RIPE_CARROT = 0.5
const EGG = 0.4
/** The name of the custom block when the palette has «procedure». */
export const ESTATE_PROCEDURE = "обійти ряд"
/** Days of each season, starting with autumn: the harvest time. */
const SEASON_DAYS = 7
const SEASONS: ReadonlyArray<Season> = ["autumn", "winter", "spring", "summer"]

/** The same numbers for the same day on any computer (mulberry32). */
const randomOf = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Which of `count` places have something today; with `atLeastOne` one of them always has. */
const pick = (random: () => number, count: number, chance: number, atLeastOne: boolean): ReadonlyArray<boolean> => {
  const picked = Array.from({ length: count }, () => random() < chance)
  if (atLeastOne && count > 0 && !picked.includes(true)) picked[Math.floor(random() * count)] = true
  return picked
}

/** The season of a day: a week each, from autumn. */
export const estateSeason = (day: number): Season => SEASONS[Math.floor((Math.max(1, day) - 1) / SEASON_DAYS) % SEASONS.length] ?? "autumn"

/** Blocks in the order of the palette. */
const BLOCK_ORDER: ReadonlyArray<BlockName> = [
  "move",
  "turnLeft",
  "turnRight",
  "collect",
  "attack",
  "wallAhead",
  "enemyAhead",
  "trapAhead",
  "onCrystal",
  "atFinish",
  "repeat",
  "forever",
  "repeatUntil",
  "if",
  "ifElse",
  "not",
  "and",
  "or",
  "counter",
  "procedure"
]

/** The blocks of the estate: those of every level the student passed, and always the hero's walk and «взяти». */
export const estatePalette = (passed: ReadonlyArray<Level>): ReadonlyArray<BlockName> => {
  const have = new Set<BlockName>(["move", "turnLeft", "turnRight", "collect", ...passed.flatMap((l) => l.blocks)])
  return BLOCK_ORDER.filter((b) => have.has(b))
}

/** The grown flowers in the farming-crops sheet (12 columns of 16×16): the last frame of their `grow`. */
const cropTile = (frame: number): readonly [number, number, number, number] => [frame % 12, Math.floor(frame / 12), 1, 1]
const tulipTile = cropTile(19)
const roseTile = cropTile(7)

/** The pictures of the estate: the orchard, the carrot bed, the hen house and what the student bought for looks. */
const decorOf = (upgrades: EstateUpgrades, trees: number, bottom: number): { readonly sprites: Array<PlacedSprite>; readonly props: Array<Prop> } => {
  const sprites: Array<PlacedSprite> = []
  // The house with its door over the finish, and the trees over the top path, one over each apple cell.
  const props: Array<Prop> = [{ kind: "house", x: -0.5, y: -2 }]
  for (let i = 0; i < trees; i++) props.push({ kind: "appleTree", x: 2.75 + i, y: -0.5 })
  if (upgradeCount(upgrades, "carrots") > 0) {
    for (let i = 0; i < trees; i++) sprites.push({ asset: "sunnyside:crop/soil", x: 3 + i, y: bottom, tiles: [1, 0, 1, 1], layer: "ground" })
  }
  const coop = upgradeCount(upgrades, "coop") > 0
  if (coop) {
    props.push({ kind: "woodshed", x: 2, y: 3 })
    sprites.push({ asset: "ninja-adventure:animal/chicken-white", x: 2, y: 2, clip: "idle" })
    sprites.push({ asset: "ninja-adventure:animal/chicken-brown", x: 3, y: 2, clip: "idle", flip: true })
  }
  // The middle of the yard: x from 2 to trees + 2 is a wall on every day.
  if (upgradeCount(upgrades, "flowers") > 0) {
    sprites.push({ asset: "farming-crops:crop/tulip", x: trees + 1, y: 2, tiles: tulipTile, layer: "object" })
    sprites.push({ asset: "farming-crops:crop/rose", x: trees + 2, y: 2, tiles: roseTile, layer: "object" })
  }
  if (upgradeCount(upgrades, "cat") > 0) sprites.push({ asset: "ninja-adventure:animal/cat", x: coop ? trees + 2 : 2, y: coop ? 3 : 2, clip: "idle" })
  if (upgradeCount(upgrades, "dog") > 0) sprites.push({ asset: "ninja-adventure:animal/dog", x: coop ? trees + 2 : 3, y: coop ? 4 : 2, clip: "idle" })
  return { sprites, props }
}

const taskOf = (upgrades: EstateUpgrades, day: number): ReadonlyArray<string> => [
  `День ${day} на хуторі. Збери все, що достигло, і повернись до хати.`,
  [
    "Не всі яблука достигають одразу, а кінець двору щодня інший.",
    upgradeCount(upgrades, "carrots") > 0 ? "Морква на нижній стежці теж дозріває не вся." : "",
    upgradeCount(upgrades, "coop") > 0 ? "Кури несуться не щодня." : ""
  ]
    .filter((s) => s !== "")
    .join(" "),
  "Програма лишається на завтра: склади її так, щоб вона працювала щодня."
]

/**
 * The level of a day. The yard is a ring of paths: from the door along the orchard, down the far end of the yard,
 * back along the carrot bed and up past the hen house to the door. The trees, the bed and the hen house come from
 * the upgrades; the ripe apples, carrots, eggs and the snowed-in end of the yard come from the day number.
 */
export const estateDay = (state: EstateState, blocks: ReadonlyArray<BlockName>): EstateDay => {
  const { upgrades } = state
  const day = Math.max(1, Math.round(state.day))
  const random = randomOf(day * 7919 + 17)
  const trees = START_TREES + upgradeCount(upgrades, "tree")
  const carrots = upgradeCount(upgrades, "carrots") > 0
  const coop = upgradeCount(upgrades, "coop") > 0
  const drift = Math.floor(random() * (upgradeCount(upgrades, "patches") > 0 ? 2 : 3))
  const ripe = pick(random, trees, RIPE_APPLE, true)
  const ready = pick(random, carrots ? trees : 0, RIPE_CARROT, true)
  const eggs = pick(random, coop ? NESTS : 0, EGG, false)

  const width = trees + YARD + 4
  const right = trees + YARD + 2 - drift
  const bottom = coop ? NESTS + 2 : 3
  const produce: Array<{ x: number; y: number; kind: Produce }> = []
  const rows: Array<string> = []
  for (let y = 0; y <= bottom + 1; y++) {
    let row = ""
    for (let x = 0; x < width; x++) {
      const inside = x >= 1 && x <= right && y >= 1 && y <= bottom
      const onRing = inside && (y === 1 || y === bottom || x === 1 || x === right)
      if (!onRing) row += "#"
      else if (x === 1 && y === 1) row += "F"
      else if (x === 2 && y === 1) row += "S"
      else if (y === 1 && ripe[x - 3] === true) {
        row += "c"
        produce.push({ x, y, kind: "apple" })
      } else if (y === bottom && ready[x - 3] === true) {
        row += "c"
        produce.push({ x, y, kind: "carrot" })
      } else if (x === 1 && eggs[y - 2] === true) {
        row += "c"
        produce.push({ x, y, kind: "egg" })
      } else row += "."
    }
    rows.push(row)
  }

  const { sprites, props } = decorOf(upgrades, trees, bottom)
  const scene: Scene = {
    theme: estateSeason(day),
    item: "apple",
    finish: "home",
    props,
    sprites,
    itemsAt: produce.map(({ x, y, kind }) => ({ x, y, item: kind }))
  }
  const level: Level = {
    id: `estate-${day}`,
    title: `Хутір · день ${day}`,
    task: taskOf(upgrades, day),
    map: rows,
    dir: "right",
    blocks,
    goals: [{ type: "crystals" }, { type: "finish" }],
    procedure: ESTATE_PROCEDURE,
    hint: "Повторюй, доки не повернешся додому: якщо тут щось є, візьми; якщо попереду стіна, поверни праворуч, інакше зроби крок.",
    scene
  }
  return { day, level, produce }
}

/** Whether a level is a day of the estate (its id), so the game shows it as one. */
export const isEstateLevel = (levelId: string): boolean => /^estate-\d+$/.test(levelId)

/** What a run of a day gathered and the coins it brings. */
export interface Harvest {
  readonly apple: number
  readonly carrot: number
  readonly egg: number
  /** The hero gathered everything and came home. */
  readonly full: boolean
  readonly coins: number
}

/**
 * The harvest of a run: what the hero took before the run ended, even when it failed, and the bonus of a full day.
 * The bonus asks for one program from the morning: a day done in more `pieces` («Продовжити звідси») is work by hand,
 * and pays only for what the hero gathered.
 */
export const estateHarvest = (day: EstateDay, result: RunResult, pieces = 1): Harvest => {
  const left = result.world.crystals
  const taken = (kind: Produce) => day.produce.filter((p) => p.kind === kind && !left.has(cellKey(p.x, p.y))).length
  const apple = taken("apple")
  const carrot = taken("carrot")
  const egg = taken("egg")
  const full = result.passed && pieces <= 1
  return {
    apple,
    carrot,
    egg,
    full,
    coins: apple * PRODUCE_COINS.apple + carrot * PRODUCE_COINS.carrot + egg * PRODUCE_COINS.egg + (full ? FULL_DAY_COINS : 0)
  }
}
