import { estateLook } from "./estate-map.ts"
import { estateSeason, MAX_TREES, PALETTE_ORDER, randomOf, START_TREES } from "./estate.ts"
import { judgeField } from "./judge.ts"
import { BED_ITEM, type BlockName, type Level, type Scene } from "./level.ts"
import type { Program, RunResult } from "./program.ts"
import { judgePythonField } from "./python/judge.ts"
import { cellKey, type ItemKind, kindAt } from "./world.ts"

/**
 * Хутір 2.0: a farm the student automates (analysis/hutir/plan.md). The farm stays from day to day: what was built,
 * what lies in the barn and which orders are done. A working day is a run of a fixed number of turns: the worker
 * does the student's program, wood grows again on the trees and pumpkins ripen on the beds, and what the worker puts
 * in the barn is the yield of the day. New things open by orders that ask for a yield in one day, so a better
 * algorithm, not more days, moves the farm on.
 *
 * Everything here is pure and the same in the browser and on a server, as the rest of the core.
 */

/** What the farm makes and keeps in the barn. */
export type Resource = "wood" | "pumpkin"

export const RESOURCES: ReadonlyArray<Resource> = ["wood", "pumpkin"]

export const RESOURCE_NAMES: Readonly<Record<Resource, string>> = { wood: "колоди", pumpkin: "гарбузи" }

/** The item of the game that each resource is: what lies on the map and what the worker carries. */
const ITEM_OF: Readonly<Record<Resource, ItemKind>> = { wood: "wood", pumpkin: BED_ITEM }
const resourceOf = (item: ItemKind): Resource | null => RESOURCES.find((r) => ITEM_OF[r] === item) ?? null

export type Amounts = Readonly<Record<Resource, number>>
export const NO_AMOUNTS: Amounts = { wood: 0, pumpkin: 0 }

/** What an order opens: a building or a tool that changes how the farm works. */
export type FarmUnlock = "beds" | "basket" | "longDay" | "cart"

export interface FarmUnlockInfo {
  readonly id: FarmUnlock
  readonly name: string
  readonly about: string
}

export const FARM_UNLOCKS: ReadonlyArray<FarmUnlockInfo> = [
  { id: "beds", name: "Грядки", about: "Під кожним деревом грядка. «посіяти» і «тут порожня грядка?»: гарбуз достигає за кілька ходів." },
  { id: "basket", name: "Кошик", about: "Робітник несе 5 речей замість 3: менше ходок до комори." },
  { id: "longDay", name: "Ліхтар", about: "Робочий день довший: 160 ходів замість 120." },
  { id: "cart", name: "Візок", about: "Робітник несе 8 речей." }
]

/** What the student keeps of the farm. */
export interface FarmState {
  /** The next working day, from 1: it decides which trees have wood and which pumpkins are ripe in the morning. */
  readonly day: number
  /** Trees in the forest row; with «Грядки» each tree has a bed under it. */
  readonly trees: number
  readonly unlocked: ReadonlyArray<FarmUnlock>
  /** What lies in the barn now. */
  readonly stock: Amounts
  /** The best grade of each order by its id: 1 done, 2 efficient, 3 universal. */
  readonly orders: Readonly<Record<string, number>>
}

export const NEW_FARM: FarmState = { day: 1, trees: START_TREES, unlocked: [], stock: NO_AMOUNTS, orders: {} }

/** The turns of a working day, and of a day with «Ліхтар». */
export const DAY_TURNS = 120
export const LONG_DAY_TURNS = 160
/** What the worker carries at once: with bare hands, a basket and a cart. */
export const HANDS = 3
export const BASKET = 5
export const CART = 8
/** Turns until a tree has wood again after it was cut, and until a sown pumpkin is ripe. */
export const WOOD_REGROW = 16
export const PUMPKIN_GROW = 24
/** The share of trees with wood and of beds with a ripe pumpkin in the morning. */
const WOOD_CHANCE = 0.7
const RIPE_CHANCE = 0.4

export const has = (state: FarmState, unlock: FarmUnlock): boolean => state.unlocked.includes(unlock)

export const farmTurns = (state: FarmState): number => (has(state, "longDay") ? LONG_DAY_TURNS : DAY_TURNS)

export const farmCapacity = (state: FarmState): number => (has(state, "cart") ? CART : has(state, "basket") ? BASKET : HANDS)

const treesOf = (state: FarmState): number => Math.min(MAX_TREES, Math.max(START_TREES, Math.round(state.trees)))

/**
 * The blocks every farm has: the farm is a sandbox, so a loop, a branch and the questions about the road, the hands
 * and the barn are there from the first day, even before the course reached them.
 */
const FARM_BASE: ReadonlyArray<BlockName> = [
  "move",
  "turnLeft",
  "turnRight",
  "collect",
  "store",
  "wallAhead",
  "onCrystal",
  "handsFull",
  "atStorehouse",
  "repeat",
  "forever",
  "repeatUntil",
  "if",
  "ifElse",
  "not"
]

/** The blocks of the farm: the base, what the student learned in the course, and the beds once they are built. */
export const farmPalette = (state: FarmState, learned: ReadonlyArray<BlockName>): ReadonlyArray<BlockName> => {
  const have = new Set<BlockName>([...FARM_BASE, ...learned])
  if (has(state, "beds")) {
    have.add("sow")
    have.add("bedEmpty")
  } else {
    have.delete("sow")
    have.delete("bedEmpty")
  }
  return PALETTE_ORDER.filter((b) => have.has(b))
}

/** The same numbers for the same day on any computer, apart from the estate's own. */
const dayRandom = (day: number) => randomOf(Math.max(1, Math.round(day)) * 104_729 + 7)

const chances = (count: number, chance: number, random: () => number): ReadonlyArray<boolean> => {
  const picked = Array.from({ length: count }, () => random() < chance)
  if (count > 0 && !picked.includes(true)) picked[Math.floor(random() * count)] = true
  return picked
}

/** The first column of the forest and of the beds. */
const FIRST = 3
/** The row of the forest path and of the bed path. */
const TOP = 1
const BOTTOM = 3

/**
 * The level of a working day. The farm is a ring of paths: the barn in the farmhouse at the top-left corner, the
 * worker next to it, the forest along the top path and the beds along the bottom path. The day number decides which
 * trees have wood and which pumpkins are ripe in the morning; a tree without wood grows it during the day.
 */
export const farmDay = (state: FarmState, blocks: ReadonlyArray<BlockName>, day = state.day): Level => {
  const trees = treesOf(state)
  const beds = has(state, "beds")
  const random = dayRandom(day)
  const wood = chances(trees, WOOD_CHANCE, random)
  const later = wood.map(() => 1 + Math.floor(random() * WOOD_REGROW))
  const ripe = beds ? chances(trees, RIPE_CHANCE, random) : []
  const right = FIRST + trees
  const width = right + 2
  const rows: Array<string> = []
  for (let y = 0; y <= BOTTOM + 1; y++) {
    let row = ""
    for (let x = 0; x < width; x++) {
      const onRing = x >= 1 && x <= right && y >= TOP && y <= BOTTOM && (y === TOP || y === BOTTOM || x === 1 || x === right)
      const i = x - FIRST
      if (!onRing) row += "#"
      else if (x === 1 && y === TOP) row += "H"
      else if (x === 2 && y === TOP) row += "S"
      else if (y === TOP && i >= 0 && i < trees) row += wood[i] === true ? "c" : "."
      else if (y === BOTTOM && beds && i >= 0 && i < trees) row += ripe[i] === true ? "R" : "b"
      else row += "."
    }
    rows.push(row)
  }
  const growingAt = wood.flatMap((w, i) => (w ? [] : [{ x: FIRST + i, y: TOP, turns: later[i] ?? WOOD_REGROW }]))
  const look = estateLook({
    rows,
    trees,
    right,
    bottom: BOTTOM,
    carrots: beds,
    coop: false,
    nests: 3,
    carrotFrames: Array.from({ length: trees }, (_, i) => (ripe[i] === true ? 4 : 1)),
    frame: { width: MAX_TREES + FIRST + 2, height: BOTTOM + 2 },
    maxTrees: MAX_TREES
  })
  const scene: Scene = { theme: estateSeason(day), item: "wood", tilemap: look.tilemap, sprites: look.sprites }
  const turns = farmTurns(state)
  return {
    id: `farm-${day}`,
    title: `Хутір · день ${day}`,
    task: [
      `Робочий день: ${turns} ходів. Усе, що робітник віднесе в комору, піде в запас.`,
      beds ? "На деревах знову виростають колоди, а посіяний гарбуз достигає за кілька ходів." : "На зрубаному дереві згодом знову виростає колода.",
      `Робітник несе не більше ${farmCapacity(state)} речей: коли руки повні, неси в комору.`
    ],
    map: rows,
    dir: "right",
    blocks,
    goals: [],
    capacity: farmCapacity(state),
    turns,
    grow: PUMPKIN_GROW,
    regrow: WOOD_REGROW,
    growingAt,
    procedure: "обійти ряд",
    scene
  }
}

/** The student's program for the worker, in blocks or in Python. */
export type FarmProgram = { readonly language: "blocks"; readonly program: Program } | { readonly language: "python"; readonly source: string }

/** What a working day brought, for the report under the field and for the orders. */
export interface FarmReport {
  readonly day: number
  /** What the worker put in the barn. */
  readonly stored: Amounts
  /** What the worker still carried when the day ended: it is lost. */
  readonly carried: Amounts
  /** The turn by which the barn had each amount: `byTurn[n]` is the yield after n + 1 turns. */
  readonly byTurn: ReadonlyArray<Amounts>
  /** Turns spent on actions that did nothing: «взяти» on an empty cell, «посіяти» off an empty bed and the like. */
  readonly idle: number
  /** Turns the program used; fewer than the day when it stopped early. */
  readonly used: number
  readonly turns: number
  /** Why the day ended before its turns: the worker walked into a fence, or the program has a mistake. */
  readonly stopped: RunResult["reason"]
  /** The explanation of a mistake in the program, as the judge gives it. */
  readonly detail?: string
  readonly line?: number
}

const IDLE: ReadonlySet<string> = new Set(["nothingToCollect", "handsFull", "notStorehouse", "nothingToStore", "cannotSow", "waited", "noLever", "swingMissed"])

const add = (a: Amounts, r: Resource, n = 1): Amounts => ({ ...a, [r]: a[r] + n })

/** Reads the yield of a day from the frames: what each «взяти» took, and what each «віднести на склад» put down. */
export const farmReport = (level: Level, result: RunResult, day: number): FarmReport => {
  let load: ReadonlyArray<Resource> = []
  let stored = NO_AMOUNTS
  const byTurn: Array<Amounts> = []
  for (const frame of result.frames) {
    if (frame.outcome === "collected") {
      // What lay on a cell never changes its kind, so the world after the action still tells it.
      const kind = resourceOf(kindAt(frame.world, cellKey(frame.world.hero.x, frame.world.hero.y)))
      if (kind !== null) load = [...load, kind]
    }
    if (frame.outcome === "stored") {
      stored = load.reduce((sum, r) => add(sum, r), stored)
      load = []
    }
    byTurn.push(stored)
  }
  const carried = load.reduce((sum, r) => add(sum, r), NO_AMOUNTS)
  return {
    day,
    stored,
    carried,
    byTurn,
    idle: result.frames.filter((f) => IDLE.has(f.outcome)).length,
    used: result.frames.length,
    turns: level.turns ?? result.frames.length,
    stopped: result.reason === "goalsNotMet" ? null : result.reason,
    ...(result.detail === undefined ? {} : { detail: result.detail }),
    ...(result.line === undefined ? {} : { line: result.line })
  }
}

/** Runs the worker's program through one day of the farm. */
export const runFarmDay = (state: FarmState, code: FarmProgram, blocks: ReadonlyArray<BlockName>, day = state.day): { readonly level: Level; readonly result: RunResult; readonly report: FarmReport } => {
  const level = farmDay(state, blocks, day)
  const result = code.language === "blocks" ? judgeField(level, code.program) : judgePythonField(level, code.source)
  return { level, result, report: farmReport(level, result, day) }
}

/** The farm after a working day: the yield goes to the barn and the next day comes. A trial run changes nothing. */
export const finishDay = (state: FarmState, report: FarmReport): FarmState => ({
  ...state,
  day: Math.max(state.day, report.day) + 1,
  stock: RESOURCES.reduce((sum, r) => add(sum, r, report.stored[r]), state.stock)
})

/** An order of the village: a yield in one working day. */
export interface FarmOrder {
  readonly id: string
  readonly title: string
  /** Who asks and why, in one or two sentences. */
  readonly text: string
  readonly needs: Partial<Amounts>
  /** The turns within which the yield must be in the barn for «Ефективно». */
  readonly fast: number
  /** The order that must be done first. */
  readonly after?: string
  readonly unlocks?: FarmUnlock
}

export const FARM_ORDERS: ReadonlyArray<FarmOrder> = [
  {
    id: "wood-3",
    title: "Дрова для печі",
    text: "Сусідка просить три колоди: піч холодна. Дерева біля хати, комора в хаті.",
    needs: { wood: 3 },
    fast: 40
  },
  {
    id: "wood-8",
    title: "Запас на тиждень",
    text: "Вісім колод за день. Колода на зрубаному дереві виростає знову, але руки беруть лише три.",
    needs: { wood: 8 },
    fast: 90,
    after: "wood-3",
    unlocks: "beds"
  },
  {
    id: "pumpkin-3",
    title: "Гарбузи на ярмарок",
    text: "Три гарбузи за день. Достиглий гарбуз лежить на стежці, а порожню грядку треба засіяти.",
    needs: { pumpkin: 3 },
    fast: 80,
    after: "wood-8",
    unlocks: "basket"
  },
  {
    id: "mixed-10-4",
    title: "Підвода для мірошника",
    text: "Мірошник лагодить млин: десять колод і чотири гарбузи за один день.",
    needs: { wood: 10, pumpkin: 4 },
    fast: 110,
    after: "pumpkin-3",
    unlocks: "longDay"
  },
  {
    id: "wood-20",
    title: "Ліс на нову хату",
    text: "Громада будує хату вчительці: двадцять колод за день.",
    needs: { wood: 20 },
    fast: 140,
    after: "mixed-10-4",
    unlocks: "cart"
  }
]

/** The orders the student can take now: not done yet, and the one before them is done. */
export const openOrders = (state: FarmState): ReadonlyArray<FarmOrder> =>
  FARM_ORDERS.filter((o) => (state.orders[o.id] ?? 0) === 0 && (o.after === undefined || (state.orders[o.after] ?? 0) > 0))

/** The turn after which the barn first held what the order needs, or null when it never did that day. */
export const metAt = (report: FarmReport, needs: Partial<Amounts>): number | null => {
  const i = report.byTurn.findIndex((a) => RESOURCES.every((r) => a[r] >= (needs[r] ?? 0)))
  return i < 0 ? null : i + 1
}

/** Days an order is checked on, and on how many more for «Універсально». */
export const ORDER_DAYS = 3
export const UNIVERSAL_DAYS = 5

export const ORDER_GRADES = ["Не виконано", "Виконано", "Ефективно", "Універсально"] as const

export interface OrderCheck {
  /** 0 not done, 1 done on every checked day, 2 also within `fast` turns, 3 also on a bigger farm on more days. */
  readonly grade: 0 | 1 | 2 | 3
  /** The reports of the days the order was checked on. */
  readonly reports: ReadonlyArray<FarmReport>
}

/**
 * Checks an order with the student's program: it must bring the yield on three different days, from the next working
 * day on, so a program that remembers one morning does not pass. «Ефективно» asks for it within `fast` turns, and
 * «Універсально» asks the same on five days of a farm with one more tree.
 */
export const checkOrder = (state: FarmState, order: FarmOrder, code: FarmProgram, blocks: ReadonlyArray<BlockName>): OrderCheck => {
  const days = (s: FarmState, n: number) => Array.from({ length: n }, (_, i) => runFarmDay(s, code, blocks, state.day + i).report)
  const reports = days(state, ORDER_DAYS)
  const at = reports.map((r) => metAt(r, order.needs))
  if (at.some((t) => t === null)) return { grade: 0, reports }
  if (at.some((t) => t !== null && t > order.fast)) return { grade: 1, reports }
  const bigger = { ...state, trees: Math.min(MAX_TREES, treesOf(state) + 1) }
  if (bigger.trees === treesOf(state)) return { grade: 3, reports }
  const universal = days(bigger, UNIVERSAL_DAYS).every((r) => metAt(r, order.needs) !== null)
  return { grade: universal ? 3 : 2, reports }
}

/** The farm after an order was checked: its best grade, and what it opens. */
export const recordOrder = (state: FarmState, order: FarmOrder, grade: number): FarmState => {
  if (grade <= (state.orders[order.id] ?? 0)) return state
  const unlocked = order.unlocks !== undefined && !state.unlocked.includes(order.unlocks) ? [...state.unlocked, order.unlocks] : state.unlocked
  return { ...state, orders: { ...state.orders, [order.id]: grade }, unlocked }
}

/** What one more tree costs: the price grows with the forest, so a better program pays more than more days. */
export const treePrice = (state: FarmState): Amounts => {
  const n = treesOf(state) - START_TREES + 1
  return { wood: 10 * n, pumpkin: has(state, "beds") ? 3 * n : 0 }
}

export const canPlantTree = (state: FarmState): boolean =>
  treesOf(state) < MAX_TREES && RESOURCES.every((r) => state.stock[r] >= treePrice(state)[r])

/** One more tree, and one more bed under it, paid from the barn. */
export const plantTree = (state: FarmState): FarmState => {
  if (!canPlantTree(state)) return state
  const price = treePrice(state)
  return { ...state, trees: treesOf(state) + 1, stock: RESOURCES.reduce((s, r) => ({ ...s, [r]: s[r] - price[r] }), state.stock) }
}

/** Whether a level is a day of the farm (its id). */
export const isFarmLevel = (levelId: string): boolean => /^farm-\d+$/.test(levelId)

/** All the barn held after a day, both resources together: the height of a bar in the chart of the report. */
export const totalOf = (amounts: Amounts): number => RESOURCES.reduce((sum, r) => sum + amounts[r], 0)

/**
 * What to improve after a working day, in the words of the report: the turns spent for nothing, what was left in the
 * hands, a program that stopped before the evening. At most three tips, the most useful first.
 */
export const farmTips = (report: FarmReport, capacity: number, language: "blocks" | "python" = "blocks"): ReadonlyArray<string> => {
  const py = language === "python"
  const tips: Array<string> = []
  if (report.stopped === "crashed")
    tips.push(`Робітник урізався в паркан: перед кроком спитай ${py ? "hero.wall_ahead()" : "«попереду стіна?»"} і поверни.`)
  else if (report.used < report.turns && report.stopped === null)
    tips.push(`Програма закінчилась на ході ${report.used} з ${report.turns}: ${py ? "загорни роботу в while True" : "загорни роботу в «завжди»"}, щоб робітник працював до вечора.`)
  const left = totalOf(report.carried)
  if (left > 0) tips.push(`Наприкінці дня в руках лишилось ${left}: це пропало. Неси в комору, щойно руки повні (${capacity}).`)
  if (report.idle > 0)
    tips.push(`Ходів дарма: ${report.idle}. ${py ? "hero.collect()" : "«Взяти»"} на порожній клітинці теж забирає хід: спершу спитай ${py ? "hero.item_here()" : "«тут щось є?»"}.`)
  return tips.slice(0, 3)
}
