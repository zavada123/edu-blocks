import { farmLook } from "./farm-map.ts"
import { ladderBlocks, LADDER_DONE, ladderStep } from "./farm-ladder.ts"
import { BOOK_PAGES, type BookPage } from "./book.ts"
import { craftBlocks, CRAFTS, craftLevel, type CraftResource, FASTER_LEVEL } from "./crafts.ts"
import { estateSeason, MAX_TREES, PALETTE_ORDER, randomOf, START_TREES } from "./estate.ts"
import { runCrew } from "./crew.ts"
import type { Stage } from "./hero.ts"
import { blocksRun, judgeField } from "./judge.ts"
import { BED_ITEM, type BlockName, type ItemAt, type Level, type Scene, TROUGH_ITEM } from "./level.ts"
import type { Program, RunResult } from "./program.ts"
import { judgePythonField, pythonRun } from "./python/judge.ts"
import { type Cell, cellKey, type EnemySpec, FLOUR, kindAt, type StockKind } from "./world.ts"

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
export type Resource = "wood" | "pumpkin" | "meat" | "gold" | "flour"

export const RESOURCES: ReadonlyArray<Resource> = ["wood", "pumpkin", "meat", "gold", "flour"]

export const RESOURCE_NAMES: Readonly<Record<Resource, string>> = { wood: "колоди", pumpkin: "гарбузи", meat: "м'ясо", gold: "золото", flour: "борошно" }

/** The kind of the game that each resource is: what lies on the map, what the worker carries, what the barn counts. */
const ITEM_OF: Readonly<Record<Resource, StockKind>> = { wood: "wood", pumpkin: BED_ITEM, meat: TROUGH_ITEM, gold: "gold", flour: FLOUR }
const resourceOf = (item: StockKind): Resource | null => RESOURCES.find((r) => ITEM_OF[r] === item) ?? null

export type Amounts = Readonly<Record<Resource, number>>
export const NO_AMOUNTS: Amounts = { wood: 0, pumpkin: 0, meat: 0, gold: 0, flour: 0 }

/** Amounts with every resource, from a save that may have fewer: a resource added later counts from 0. */
export const amountsOf = (a: Partial<Amounts> | undefined): Amounts =>
  RESOURCES.reduce((sum, r) => ({ ...sum, [r]: Math.max(0, Math.round(a?.[r] ?? 0)) }), NO_AMOUNTS)

/** The amounts as the barn of a level counts them, by kind. */
const byKind = (a: Partial<Amounts>): Readonly<Partial<Record<StockKind, number>>> =>
  Object.fromEntries(RESOURCES.filter((r) => (a[r] ?? 0) > 0).map((r) => [ITEM_OF[r], a[r] ?? 0]))

/** What an order opens: a building or a tool that changes how the farm works. */
export type FarmUnlock = "beds" | "basket" | "longDay" | "cart" | "tower" | "pen" | "mine" | "workshop" | "book" | "spyglass" | "site" | "abacus"

export interface FarmUnlockInfo {
  readonly id: FarmUnlock
  readonly name: string
  readonly about: string
}

export const FARM_UNLOCKS: ReadonlyArray<FarmUnlockInfo> = [
  { id: "beds", name: "Грядки", about: "Під кожним деревом грядка. «посіяти» і «тут порожня грядка?»: гарбуз достигає за кілька ходів." },
  { id: "basket", name: "Кошик", about: "Робітник несе 5 речей замість 3: менше ходок до комори." },
  { id: "longDay", name: "Ліхтар", about: "Робочий день довший: 160 ходів замість 120." },
  { id: "cart", name: "Візок", about: "Робітник несе 8 речей." },
  { id: "tower", name: "Сторожова вежа", about: "Вежа над стежкою гоблінів: лучник стріляє в кожного, хто підійде ближче ніж на 3 клітинки." },
  { id: "pen", name: "Вівчарня", about: "Годівниця на лівій стежці. «нагодувати» гарбузом, і за 12 ходів там лежить м'ясо. «вівці голодні?» підкаже, коли." },
  { id: "mine", name: "Золота шахта", about: "Під нижньою стежкою. Золото біля входу з'являється раз на 20 ходів. Воно важке: його беруть лише з порожніми руками." },
  {
    id: "workshop",
    name: "Майстерня",
    about: "«Створити змінну» і «Створити блок»: змінні зі своїми назвами і свої блоки з параметром-числом. У Python це змінні й def з параметрами."
  },
  {
    id: "book",
    name: "Книга команд",
    about: "Свій блок можна записати в книгу: він лишається в палітрі на всі наступні дні, і програма його лише викликає. У Python це готова функція."
  },
  {
    id: "spyglass",
    name: "Підзорна труба",
    about: "Датчик «у трубу видно річ?»: щось лежить на одній із трьох клітинок попереду. Робітник іде одразу туди, де є що взяти. У Python hero.item_ahead()."
  },
  {
    id: "site",
    name: "Будмайданчик",
    about: "На правій стежці, між лісом і грядками. Стань на нього й виконай «будувати»: з комори береться ціна однієї частини будівлі. У Python hero.build() і hero.at_site()."
  },
  {
    id: "abacus",
    name: "Рахівниця",
    about: "Блок-число «скільки ‹колод› у коморі» і порівняння «>», «<», «=». Програма спершу перевіряє запас, а тоді будує. У Python hero.stock(\"wood\") > 2."
  }
]

/** What the site builds: each building stands in parts, and a part costs its price from the barn. */
export type BuildingId = "barn" | "mill" | "helper"

export interface Building {
  readonly id: BuildingId
  readonly name: string
  /** What it gives, in the words of its card. */
  readonly about: string
  readonly parts: number
  /** The price of one part. */
  readonly part: Partial<Amounts>
  /** Shown as the next building only: it comes with a later stage of the farm. */
  readonly later?: true
}

export const BUILDINGS: ReadonlyArray<Building> = [
  {
    id: "barn",
    name: "Комора біля грядок",
    about: "Друга комора в правому нижньому куті. Колоди з лісу можна скласти там, а гарбузи в хаті: ходки стають удвічі коротші.",
    parts: 5,
    part: { wood: 2 }
  },
  {
    id: "mill",
    name: "Млин",
    about: "Стає в лівому нижньому куті й мелить гарбуз на борошно: «віднести на склад» на млині кладе гарбузи в жорна, а борошно лягає в комору.",
    parts: 4,
    part: { wood: 3, gold: 1 }
  },
  {
    id: "helper",
    name: "Хата помічника",
    about: "Тут живе помічник Тарас: другий робітник зі своєю програмою. Він починає день у правому верхньому куті, і поки один рубає, другий носить.",
    parts: 5,
    part: { wood: 4, gold: 1 }
  }
]

export const buildingOf = (id: BuildingId): Building => BUILDINGS.find((b) => b.id === id) ?? (BUILDINGS[0] as Building)

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
  /** «Книга команд»: the own blocks the student wrote in it, a «визначити» script each (`book.ts`). */
  readonly book?: ReadonlyArray<BookPage>
  /** What the programs of all working days put in the barn: the crafts grow from it (`crafts.ts`). */
  readonly produced?: Amounts
  /** What the build site builds now: chosen under the journal, one building at a time. */
  readonly building?: BuildingId | null
  /** The parts of each building that stand already. */
  readonly parts?: Readonly<Partial<Record<BuildingId, number>>>
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
/** Turns the sheep eat a pumpkin until the meat lies on the trough, and until the mine has gold again. */
export const SHEEP_EAT = 12
export const GOLD_REGROW = 20
/** The share of trees with wood and of beds with a ripe pumpkin in the morning. */
const WOOD_CHANCE = 0.7
const RIPE_CHANCE = 0.4

export const has = (state: FarmState, unlock: FarmUnlock): boolean => state.unlocked.includes(unlock)

/** What the programs made so far, for the crafts. */
export const producedOf = (state: FarmState): Amounts => state.produced ?? NO_AMOUNTS

/** The level of a craft on this farm. */
export const craftLevelOf = (state: FarmState, resource: CraftResource): number => {
  const craft = CRAFTS.find((c) => c.resource === resource)
  return craft === undefined ? 1 : craftLevel(craft, producedOf(state)[resource])
}

/** Turns until a tree has wood again and until a sown pumpkin is ripe: shorter from the third level of the craft. */
export const FASTER_WOOD_REGROW = 12
export const FASTER_PUMPKIN_GROW = 18
export const woodRegrowOf = (state: FarmState): number => (craftLevelOf(state, "wood") >= FASTER_LEVEL ? FASTER_WOOD_REGROW : WOOD_REGROW)
export const pumpkinGrowOf = (state: FarmState): number => (craftLevelOf(state, "pumpkin") >= FASTER_LEVEL ? FASTER_PUMPKIN_GROW : PUMPKIN_GROW)

/** The parts of a building that stand, and whether it stands whole. */
export const partsOf = (state: FarmState, id: BuildingId): number => Math.min(buildingOf(id).parts, Math.max(0, Math.round(state.parts?.[id] ?? 0)))
export const isBuilt = (state: FarmState, id: BuildingId): boolean => partsOf(state, id) >= buildingOf(id).parts

/** The building the site builds now, or null: none chosen, it stands whole, or there is no site. */
export const buildingNow = (state: FarmState): Building | null => {
  if (!has(state, "site") || state.building == null || isBuilt(state, state.building)) return null
  return buildingOf(state.building)
}

/** The buildings the student may choose for the site now: not built yet, and not of a later stage. */
export const buildable = (state: FarmState): ReadonlyArray<Building> =>
  has(state, "site") ? BUILDINGS.filter((b) => b.later !== true && !isBuilt(state, b.id)) : []

/** The site builds this building from the next day; the parts of the one before stay. */
export const chooseBuilding = (state: FarmState, id: BuildingId): FarmState =>
  buildable(state).some((b) => b.id === id) ? { ...state, building: id } : state

export const farmTurns = (state: FarmState): number => (has(state, "longDay") ? LONG_DAY_TURNS : DAY_TURNS)

/**
 * Pages of «Книга команд»: three at first, one more for each building opened after the book, and one for each order
 * that gives a page.
 */
export const bookSize = (state: FarmState): number => {
  if (!has(state, "book")) return 0
  const later = state.unlocked.slice(state.unlocked.indexOf("book") + 1).length
  const given = FARM_ORDERS.filter((o) => o.bookPage === true && (state.orders[o.id] ?? 0) > 0).length
  return BOOK_PAGES + later + given
}

export const farmCapacity = (state: FarmState): number => (has(state, "cart") ? CART : has(state, "basket") ? BASKET : HANDS)

const treesOf = (state: FarmState): number => Math.min(MAX_TREES, Math.max(START_TREES, Math.round(state.trees)))

/**
 * The blocks of the farm: the commands the first days opened one by one (`FARM_LADDER`), from the last of those days
 * what the student learned in the course, and the commands of the buildings and tools.
 */
export const farmPalette = (state: FarmState, learned: ReadonlyArray<BlockName>): ReadonlyArray<BlockName> => {
  const have = new Set<BlockName>([...ladderBlocks(state.day), ...(state.day >= LADDER_DONE ? learned : [])])
  if (has(state, "beds")) {
    // Two kinds lie on the farm now: «тут ‹…›?» tells a pumpkin from a log.
    have.add("itemIs")
    have.add("sow")
    have.add("bedEmpty")
  } else {
    have.delete("sow")
    have.delete("bedEmpty")
  }
  for (const [unlock, blocks] of [["pen", ["feed", "sheepHungry"]]] as const)
    for (const b of blocks) {
      if (has(state, unlock)) have.add(b)
      else have.delete(b)
    }
  // «Майстерня»: the student makes variables and own blocks. The counter and the fixed custom block are in them now.
  if (has(state, "workshop")) {
    have.delete("counter")
    have.delete("procedure")
    have.add("variables")
    have.add("myBlocks")
  }
  // Goblins come once the farm has a basket worth taking: the worker needs a way to meet them.
  if (has(state, "basket")) {
    have.add("attack")
    have.add("enemyAhead")
  }
  // Ремесла and their tools: the questions, «рубати сокирою» and «полити» (a pumpkin needs the beds).
  for (const b of craftBlocks(producedOf(state))) if (has(state, "beds") || (b !== "ripeAhead" && b !== "water")) have.add(b)
  if (has(state, "spyglass")) have.add("itemAhead")
  if (has(state, "site")) {
    have.add("build")
    have.add("atSite")
  }
  // «Рахівниця»: the number of the barn, and the comparisons to ask about it.
  if (has(state, "abacus")) for (const b of ["stock", "gt", "lt", "equals"] as const) have.add(b)
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
/** The trough of the sheep pen on the left path, and the mouth of the gold mine on the bottom path. */
const TROUGH = { x: 1, y: TOP + 1 } as const
const MINE = { x: 2, y: BOTTOM } as const
/** The mill at the left end of the bottom path, where the pumpkins pass on their way to the farmhouse. */
const MILL = { x: 1, y: BOTTOM } as const
/** The chance that the mine has gold in the morning. */
const GOLD_CHANCE = 0.5

/** Goblins come every third day once the farm has a basket; an order can bring them on any day. */
export const GOBLIN_EVERY = 3
export const goblinDay = (state: FarmState, day: number): boolean => has(state, "basket") && Math.round(day) % GOBLIN_EVERY === 0

/** How far the archer on the watch tower shoots, in steps. */
export const TOWER_RANGE = 3

/**
 * Two goblins with torches walk round the ring against the worker's usual way (up the right side, back along the
 * forest), one from the far corner and one from the middle of the bottom path. One hit beats a goblin; next to the
 * worker a goblin swings first and hits the next turn.
 */
const goblinsOf = (right: number): ReadonlyArray<EnemySpec> => {
  const corners: ReadonlyArray<Cell> = [
    { x: right, y: TOP },
    { x: 1, y: TOP },
    { x: 1, y: BOTTOM },
    { x: right, y: BOTTOM }
  ]
  const goblin = (x: number, y: number, route: ReadonlyArray<Cell>): EnemySpec => ({ kind: "goblin", x, y, hp: 1, sight: 1, walk: "patrol", route })
  return [goblin(right, BOTTOM, corners), goblin(Math.ceil((1 + right) / 2), BOTTOM, [corners[3] as Cell, ...corners.slice(0, 3)])]
}

/**
 * The level of a working day. The farm is a ring of paths: the barn in the farmhouse at the top-left corner, the
 * worker next to it, the forest along the top path and the beds along the bottom path. The day number decides which
 * trees have wood and which pumpkins are ripe in the morning; a tree without wood grows it during the day.
 */
export const farmDay = (state: FarmState, blocks: ReadonlyArray<BlockName>, day = state.day, goblins = goblinDay(state, day)): Level => {
  const trees = treesOf(state)
  const beds = has(state, "beds")
  const random = dayRandom(day)
  const wood = chances(trees, WOOD_CHANCE, random)
  const later = wood.map(() => 1 + Math.floor(random() * WOOD_REGROW))
  const regrow = woodRegrowOf(state)
  const ripe = beds ? chances(trees, RIPE_CHANCE, random) : []
  const pen = has(state, "pen")
  const mine = has(state, "mine")
  // Drawn after the trees and the beds, so a day keeps its wood and pumpkins when the mine is built.
  const goldReady = mine && random() < GOLD_CHANCE
  const goldLater = 1 + Math.floor(random() * GOLD_REGROW)
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
      else if (pen && x === TROUGH.x && y === TROUGH.y) row += "t"
      else if (mine && x === MINE.x && y === MINE.y) row += goldReady ? "c" : "."
      else row += "."
    }
    rows.push(row)
  }
  const growingAt = [
    ...wood.flatMap((w, i) => (w ? [] : [{ x: FIRST + i, y: TOP, turns: Math.min(regrow, later[i] ?? regrow) }])),
    ...(mine && !goldReady ? [{ ...MINE, turns: goldLater }] : [])
  ]
  const tower = has(state, "tower") ? { x: right + 1, y: TOP + 1 } : null
  // The site on the right path between the forest and the beds; what was built: the second barn in the bottom-right
  // corner and the mill in the bottom-left one.
  const site = has(state, "site")
  const siteAt = { x: right, y: TOP + 1 }
  const barn = isBuilt(state, "barn")
  const mill = isBuilt(state, "mill") ? MILL : null
  if (barn) rows[BOTTOM] = `${rows[BOTTOM]?.slice(0, right) ?? ""}H${rows[BOTTOM]?.slice(right + 1) ?? ""}`
  const now = buildingNow(state)
  const helper = isBuilt(state, "helper")
  const look = farmLook({ rows, first: FIRST, trees, right, top: TOP, bottom: BOTTOM, beds, goblins, tower, pen, mine, site, barn, mill: mill !== null, helper })
  // The beds hold pumpkins and the mine gold: the field draws each such cell as its own thing.
  const itemsAt: ReadonlyArray<ItemAt> = [
    ...(beds ? Array.from({ length: trees }, (_, i) => ({ x: FIRST + i, y: BOTTOM, item: BED_ITEM })) : []),
    ...(mine ? [{ ...MINE, item: "gold" as const }] : [])
  ]
  const scene: Scene = { theme: estateSeason(day), item: "wood", itemsAt, storehouseName: "у коморі", tilemap: look.tilemap, sprites: look.sprites }
  const turns = farmTurns(state)
  const step = ladderStep(day)
  return {
    id: `farm-${day}`,
    title: `Хутір · день ${day}`,
    task: [
      ...(step === undefined ? [] : [step.goal]),
      `Робочий день: ${turns} ходів. Усе, що робітник віднесе в комору, піде в запас.`,
      beds ? "На деревах знову виростають колоди, а посіяний гарбуз достигає за кілька ходів." : "На зрубаному дереві згодом знову виростає колода.",
      `Робітник несе не більше ${farmCapacity(state)} речей: коли руки повні, неси в комору.`,
      ...(pen ? ["Вівці на годівниці їдять гарбуз, а за кілька ходів там лежить м'ясо."] : []),
      ...(mine ? ["Золото з шахти важке: його беруть лише з порожніми руками."] : []),
      ...(site
        ? [
            now === null
              ? "Будмайданчик стоїть порожній: обери будівлю під журналом."
              : `На будмайданчику будується ${now.name}: «будувати» бере з комори ${priceText(now.part)} за частину.`
          ]
        : []),
      ...(barn ? ["Друга комора стоїть у правому нижньому куті."] : []),
      ...(mill !== null ? ["Млин у лівому нижньому куті мелить гарбузи на борошно: «віднести на склад» там кладе їх у жорна."] : []),
      ...(helper ? [`${HELPER_NAME} починає день у правому верхньому куті, обличчям донизу, і робить свою програму: щоходу спершу робітник, потім він.`] : []),
      ...(goblins ? ["Сьогодні по стежках ходять гобліни з факелами. Ворог попереду? Бий, поки він не вдарив."] : [])
    ],
    map: rows,
    dir: "right",
    blocks,
    goals: [],
    capacity: farmCapacity(state),
    turns,
    grow: pumpkinGrowOf(state),
    regrow,
    feed: SHEEP_EAT,
    ...(mine ? { regrowAt: [{ ...MINE, turns: GOLD_REGROW }] } : {}),
    growingAt,
    ...(goblins ? { enemies: goblinsOf(right) } : {}),
    ...(tower === null ? {} : { towers: [{ ...tower, range: TOWER_RANGE }] }),
    ...(site || barn || mill !== null ? { barn: byKind(state.stock) } : {}),
    ...(site ? { site: { ...siteAt, part: byKind(now?.part ?? {}), left: now === null ? 0 : now.parts - partsOf(state, now.id) } } : {}),
    ...(mill === null ? {} : { mill }),
    ...(helper ? { helpers: [{ x: right, y: TOP, dir: "down" as const }] } : {}),
    procedure: "обійти ряд",
    ...(step === undefined ? {} : { lesson: step.lesson }),
    ...(has(state, "book") && (state.book ?? []).length > 0 ? { library: state.book } : {}),
    scene
  }
}

/** The student's program for the worker, in blocks or in Python. */
export type FarmProgram = { readonly language: "blocks"; readonly program: Program } | { readonly language: "python"; readonly source: string }

/** The helper who lives in «Хата помічника». */
export const HELPER_NAME = "Тарас"
/** «Програма Тараса»: the name after a noun. */
export const HELPER_NAME_OF = "Тараса"

/** The programs of a farm with a helper: the worker's and the helper's, each runs on its own worker. */
export interface FarmCrew {
  readonly worker: FarmProgram
  readonly helper: FarmProgram
}

/** What a working day runs: the worker's program, or the programs of the worker and the helper. */
export type FarmCode = FarmProgram | FarmCrew

const isCrew = (code: FarmCode): code is FarmCrew => "worker" in code

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
  /** Of them, «нагодувати» where the sheep were not hungry or without a pumpkin. */
  readonly idleFeed?: number
  /** Turns the program used; fewer than the day when it stopped early. */
  readonly used: number
  readonly turns: number
  /** Goblins that came this day, and how many of them the worker or the tower beat. */
  readonly goblins: number
  readonly beaten: number
  /** Why the day ended before its turns: the worker walked into a fence, or the program has a mistake. */
  readonly stopped: RunResult["reason"]
  /** Times the worker put something in the barn: «віднести на склад» that stored anything. */
  readonly trips?: number
  /** Parts of the building the worker built this day, and what they took from the barn. */
  readonly built?: number
  readonly spent?: Amounts
  /** The student's variables when the day ended, by name, as Python writes the values: `5`, `"ходки"`. */
  readonly variables?: Readonly<Record<string, string>>
  /** An own block or function with parameters was called with different values this day. */
  readonly ownBlock?: boolean
  /** The program called a block or function of «Книга команд» it did not define itself. */
  readonly fromBook?: boolean
  /** The explanation of a mistake in the program, as the judge gives it. */
  readonly detail?: string
  readonly line?: number
  /**
   * On a farm with a helper: the report of each worker, the worker first. The report itself adds their yields up;
   * its variables, trips and mistake are the worker's.
   */
  readonly workers?: ReadonlyArray<FarmReport>
}

const IDLE: ReadonlySet<string> = new Set(["nothingToCollect", "handsFull", "notStorehouse", "nothingToStore", "cannotSow", "waited", "noLever", "swingMissed", "cannotFeed", "cannotWater", "cannotBuild"])

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
    if (frame.outcome === "fed") {
      // The sheep ate one pumpkin of the load: it never reaches the barn.
      const i = load.indexOf("pumpkin")
      load = load.filter((_, j) => j !== i)
    }
    if (frame.outcome === "stored") {
      stored = load.reduce((sum, r) => add(sum, r), stored)
      load = []
    }
    if (frame.outcome === "milled") {
      // The millstones took every pumpkin of the load: as much flour lies in the barn.
      const ground = load.filter((r) => r === "pumpkin").length
      stored = add(stored, "flour", ground)
      load = load.filter((r) => r !== "pumpkin")
    }
    byTurn.push(stored)
  }
  const carried = load.reduce((sum, r) => add(sum, r), NO_AMOUNTS)
  const built = result.frames.filter((f) => f.outcome === "built").length
  const part = level.site?.part ?? {}
  const spent = RESOURCES.reduce((sum, r) => add(sum, r, built * (part[ITEM_OF[r]] ?? 0)), NO_AMOUNTS)
  return {
    day,
    stored,
    carried,
    byTurn,
    idle: result.frames.filter((f) => IDLE.has(f.outcome)).length,
    idleFeed: result.frames.filter((f) => f.outcome === "cannotFeed").length,
    used: result.frames.length,
    turns: level.turns ?? result.frames.length,
    goblins: level.enemies?.length ?? 0,
    beaten: result.frames.reduce((n, f) => n + f.events.filter((e) => e.type === "enemyDown").length, 0),
    stopped: result.reason === "goalsNotMet" ? null : result.reason,
    trips: result.frames.filter((f) => f.outcome === "stored").length,
    ...(built > 0 ? { built, spent } : {}),
    ...(result.boxes === undefined ? {} : { variables: Object.fromEntries(result.boxes.map((b) => [b.name, b.value])) }),
    ownBlock: calledWithDifferentValues(result.calls ?? []),
    fromBook: (result.bookCalls ?? []).length > 0,
    ...(result.detail === undefined ? {} : { detail: result.detail }),
    ...(result.line === undefined ? {} : { line: result.line })
  }
}

/**
 * The report of a crew's day: each worker's from its own frames, and their sum. The yield by turn adds up turn by
 * turn: a worker whose program stopped keeps what it brought.
 */
export const crewReport = (level: Level, result: RunResult, day: number): FarmReport => {
  const workers = (result.workers ?? [result]).map((w) => farmReport(level, w, day))
  const [first] = workers
  if (first === undefined || workers.length === 1) return farmReport(level, result, day)
  const sum = (pick: (r: FarmReport) => Amounts | undefined) => workers.reduce((total, r) => RESOURCES.reduce((a, k) => add(a, k, pick(r)?.[k] ?? 0), total), NO_AMOUNTS)
  const used = result.frames.length
  const byTurn = Array.from({ length: used }, (_, i) => sum((r) => r.byTurn[Math.min(i, r.byTurn.length - 1)]))
  const built = workers.reduce((n, r) => n + (r.built ?? 0), 0)
  const helperEvents = result.frames.flatMap((f) => (f.crew ?? []).flatMap((c) => c?.events ?? []))
  return {
    ...first,
    stored: sum((r) => r.stored),
    carried: sum((r) => r.carried),
    byTurn,
    idle: workers.reduce((n, r) => n + r.idle, 0),
    idleFeed: workers.reduce((n, r) => n + (r.idleFeed ?? 0), 0),
    used,
    turns: level.turns ?? used,
    beaten: result.frames.reduce((n, f) => n + f.events.filter((e) => e.type === "enemyDown").length, 0) + helperEvents.filter((e) => e.type === "enemyDown").length,
    // The helper's crash shows in its own line of the report; a mistake in its program stops the day's verdict.
    stopped: first.stopped ?? (workers.some((r) => r.stopped === "badProgram") ? "badProgram" : null),
    // A mistake in the helper's program is told in the day's own words (`runFarmCrew`).
    ...(result.detail === undefined ? {} : { detail: result.detail }),
    ...(built > 0 ? { built, spent: sum((r) => r.spent) } : {}),
    ownBlock: workers.some((r) => r.ownBlock === true),
    fromBook: workers.some((r) => r.fromBook === true),
    workers
  }
}

/** Whether one own block was called with different values: `calls` are like «пройти(6)», each once. */
export const calledWithDifferentValues = (calls: ReadonlyArray<string>): boolean => {
  const names = calls.map((c) => c.slice(0, c.indexOf("(")))
  return names.some((n, i) => names.indexOf(n) !== i)
}

/** Runs the worker's program through one day of the farm. */
export const runFarmDay = (
  state: FarmState,
  code: FarmCode,
  blocks: ReadonlyArray<BlockName>,
  day = state.day,
  goblins = goblinDay(state, day)
): { readonly level: Level; readonly result: RunResult; readonly report: FarmReport } => {
  const level = farmDay(state, blocks, day, goblins)
  if (isCrew(code) && (level.helpers ?? []).length > 0) {
    const result = runFarmCrew(level, code)
    return { level, result, report: crewReport(level, result, day) }
  }
  const one = isCrew(code) ? code.worker : code
  const result = one.language === "blocks" ? judgeField(level, one.program) : judgePythonField(level, one.source)
  return { level, result, report: farmReport(level, result, day) }
}

const crewProgram = (level: Level, code: FarmProgram) => (stage: Stage) =>
  code.language === "blocks" ? blocksRun(level, code.program, stage) : pythonRun(level, code.source, stage)

/**
 * The day of the worker and the helper on the level of a farm day (`farmDay` with the helper's house built). A
 * mistake in the helper's program is the mistake of the day, named after him: the worker's own comes first.
 */
export const runFarmCrew = (level: Level, crew: FarmCrew): RunResult => {
  const result = runCrew(level, [crewProgram(level, crew.worker), crewProgram(level, crew.helper)])
  const helper = result.workers?.[1]
  if (result.reason === "badProgram" || helper?.reason !== "badProgram") return result
  const where = helper.line === undefined ? "" : `, рядок ${helper.line}`
  const { line: _line, ...rest } = result
  return { ...rest, passed: false, stars: 0, reason: "badProgram", detail: `Програма ${HELPER_NAME_OF}${where}: ${helper.detail ?? "щось не так"}` }
}

/** The farm after a working day: the yield goes to the barn and the next day comes. A trial run changes nothing. */
export const finishDay = (state: FarmState, report: FarmReport): FarmState => {
  const spent = amountsOf(report.spent)
  const stock = RESOURCES.reduce((sum, r) => add(sum, r, (report.stored[r] ?? 0) - spent[r]), amountsOf(state.stock))
  const produced = RESOURCES.reduce((sum, r) => add(sum, r, report.stored[r] ?? 0), amountsOf(producedOf(state)))
  const now = buildingNow(state)
  const built = report.built ?? 0
  if (now === null || built === 0) return { ...state, day: Math.max(state.day, report.day) + 1, stock, produced }
  const parts = { ...state.parts, [now.id]: partsOf(state, now.id) + built }
  // A building that stands whole leaves the site free for the next one.
  const building = (parts[now.id] ?? 0) >= now.parts ? null : now.id
  return { ...state, day: Math.max(state.day, report.day) + 1, stock, produced, parts, building }
}

/** The price of a part in words: «3 колоди і 1 золото». */
export const priceText = (part: Partial<Amounts>): string => {
  const words = RESOURCES.filter((r) => (part[r] ?? 0) > 0).map((r) => amountText(r, part[r] ?? 0))
  return words.length <= 1 ? (words[0] ?? "нічого") : `${words.slice(0, -1).join(", ")} і ${words.at(-1)}`
}

/** The word after a number: one, two to four, five and more. */
const PRICE_WORDS: Readonly<Record<Resource, readonly [string, string, string]>> = {
  wood: ["колода", "колоди", "колод"],
  pumpkin: ["гарбуз", "гарбузи", "гарбузів"],
  meat: ["шматок м'яса", "шматки м'яса", "шматків м'яса"],
  gold: ["золото", "золота", "золота"],
  flour: ["мірка борошна", "мірки борошна", "мірок борошна"]
}

/** «1 колода», «3 колоди», «12 колод». */
export const amountText = (r: Resource, n: number): string => {
  const [one, few, many] = PRICE_WORDS[r]
  const tens = Math.abs(n) % 100
  const last = tens % 10
  const word = tens >= 11 && tens <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many
  return `${n} ${word}`
}

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
  /** Goblins come on every checked day, not only on their own days. */
  readonly goblins?: boolean
  /** A variable that must hold, when the day ends, how many times the worker put something in the barn. */
  readonly tally?: string
  /** The program must call one own block with parameters with different values. */
  readonly ownBlock?: boolean
  /** The program must call a block of «Книга команд» with parameters, without defining it again. */
  readonly fromBook?: boolean
  /** The order gives one more page of «Книга команд». */
  readonly bookPage?: boolean
  /** The building that must stand before the order is open. */
  readonly building?: BuildingId
  /** Every worker of the crew must bring something to the barn: the helper's program counts too. */
  readonly crew?: true
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
    id: "night-guests",
    title: "Нічні гості",
    text: "Староста Петро каже: по стежках ходять гобліни з факелами. Вісім колод за день, і щоб робітник не здався.",
    needs: { wood: 8 },
    fast: 100,
    after: "pumpkin-3",
    unlocks: "tower",
    goblins: true
  },
  {
    id: "mixed-10-4",
    title: "Підвода для мірошника",
    text: "Мірошник лагодить млин: десять колод і чотири гарбузи за один день.",
    needs: { wood: 10, pumpkin: 4 },
    fast: 110,
    after: "night-guests",
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
  },
  {
    id: "mowers",
    title: "Обід для косарів",
    text: "Косарі в полі до вечора: шість гарбузів за день.",
    needs: { pumpkin: 6 },
    fast: 110,
    after: "wood-20",
    unlocks: "pen"
  },
  {
    id: "school",
    title: "Гарбузи для школи",
    text: "Учителька Ганна готує свято врожаю: вісім гарбузів за день. За це вона дасть підзорну трубу, з якою видно, де щось лежить.",
    needs: { pumpkin: 8 },
    fast: 120,
    after: "mowers",
    unlocks: "spyglass"
  },
  {
    id: "stew",
    title: "Юшка на свято",
    text: "Кухар Остап просить три шматки м'яса за день. Гарбуз з грядки неси не в комору, а вівцям.",
    needs: { meat: 3 },
    fast: 130,
    after: "mowers",
    unlocks: "mine"
  },
  {
    id: "bridge",
    title: "Новий міст",
    text: "Громада будує міст: два злитки золота й вісім колод за день. Золото важке, тож по нього йди з порожніми руками.",
    needs: { gold: 2, wood: 8 },
    fast: 140,
    after: "stew",
    unlocks: "workshop"
  },
  {
    id: "fair",
    title: "Віз на ярмарок",
    text: "Усього потроху: вісім колод, чотири гарбузи, два шматки м'яса й злиток золота за один день.",
    needs: { wood: 8, pumpkin: 4, meat: 2, gold: 1 },
    fast: 150,
    after: "bridge",
    unlocks: "site"
  },
  {
    id: "count",
    title: "Облік комори",
    text: "Комірник Іван лічить запас: дванадцять колод і чотири гарбузи за день. За це він дасть рахівницю, і програма знатиме, скільки чого в коморі.",
    needs: { wood: 12, pumpkin: 4 },
    fast: 140,
    after: "fair",
    unlocks: "abacus"
  },
  {
    id: "bakery",
    title: "Борошно для пекарні",
    text: "Пекарка Марія просить чотири мірки борошна за день. Гарбузи неси не в хату, а на млин у лівому нижньому куті: «віднести на склад» там мелить їх. «Тут склад?» на млині каже «ні».",
    needs: { flour: 4 },
    fast: 140,
    after: "count",
    building: "mill"
  },
  {
    id: "two",
    title: "Двоє на хуторі",
    text: "Староста хоче побачити, як працюють двоє: шістнадцять колод і вісім гарбузів за день. У Тараса своя програма: нехай один рубає, а другий носить гарбузи, і кожен щось принесе в комору.",
    needs: { wood: 16, pumpkin: 8 },
    fast: 110,
    after: "count",
    building: "helper",
    crew: true
  },
  {
    id: "tally",
    title: "Облік ходок",
    text: "Комірник записує кожну ходку. Дванадцять колод за день, і наприкінці дня змінна «ходки» має показати, скільки разів робітник відніс речі в комору.",
    needs: { wood: 12 },
    fast: 130,
    after: "fair",
    tally: "ходки",
    unlocks: "book"
  },
  {
    id: "carpenter",
    title: "Підряд теслі",
    text: "Тесля дивиться і на креслення: дванадцять колод і вісім гарбузів за день, а в програмі свій блок з параметром, який кличуть з різними числами.",
    needs: { wood: 12, pumpkin: 8 },
    fast: 150,
    after: "tally",
    ownBlock: true
  },
  {
    id: "garden-field",
    title: "Сад і поле",
    text: "Мірошник хоче і гарбузи, і дрова: по десять за день. Обходи схожі, тож хай програма кличе блоки з Книги команд, а не визначає їх заново.",
    needs: { wood: 10, pumpkin: 10 },
    fast: 150,
    after: "carpenter",
    fromBook: true,
    bookPage: true
  }
]

/** What an order asks besides the yield, in the words of its card. */
export const orderRules = (order: FarmOrder): ReadonlyArray<string> => [
  ...(order.tally === undefined ? [] : [`змінна «${order.tally}» наприкінці дня дорівнює кількості ходок до комори`]),
  ...(order.ownBlock === true ? ["свій блок з параметром, викликаний з різними числами"] : []),
  ...(order.fromBook === true ? ["виклик блоку з Книги команд, не визначеного в програмі заново"] : []),
  ...(order.crew === true ? [`і робітник, і ${HELPER_NAME} щось приносять у комору`] : [])
]

/**
 * What a day missed of the order's rules besides the yield, for the student: empty when the day keeps them. The tally
 * counts each «віднести на склад» that put something in the barn.
 */
export const orderMisses = (order: FarmOrder, report: FarmReport, language: "blocks" | "python" = "blocks"): ReadonlyArray<string> => {
  const misses: Array<string> = []
  if (order.tally !== undefined) {
    const value = report.variables?.[order.tally]
    const trips = report.trips ?? 0
    if (value === undefined)
      misses.push(
        language === "python"
          ? `Немає змінної ${order.tally}: задай ${order.tally} = 0 на початку і додавай 1 після кожного hero.store().`
          : `Немає змінної «${order.tally}»: створи її в «Змінні», задай 0 на початку і змінюй на 1 після кожного «віднести на склад».`
      )
    else if (Number(value) !== trips) misses.push(`Змінна «${order.tally}» наприкінці дня: ${value}, а ходок до комори було ${trips}.`)
  }
  if (order.ownBlock === true && report.ownBlock !== true)
    misses.push(
      language === "python"
        ? "Потрібна своя функція з параметром, наприклад def пройти(кроки):, і виклики з різними числами."
        : "Потрібен свій блок з параметром («Створити блок»), і виклики з різними числами."
    )
  if (order.crew === true) {
    const [worker, helper] = report.workers ?? [report]
    if (worker !== undefined && totalOf(worker.stored) === 0) misses.push("Робітник за день нічого не приніс у комору: подивись його програму.")
    if (helper === undefined || totalOf(helper.stored) === 0)
      misses.push(`${HELPER_NAME} за день нічого не приніс у комору: напиши програму і для нього, на вкладці «${HELPER_NAME}».`)
  }
  if (order.fromBook === true && report.fromBook !== true)
    misses.push(
      language === "python"
        ? "Виклич функцію з Книги команд і не пиши для неї свій def: вона вже визначена."
        : "Виклич блок з Книги команд («Мої блоки → З книги») і не визначай його в програмі заново."
    )
  return misses
}

/** The orders the student can take now: not done yet, and the one before them is done. */
export const openOrders = (state: FarmState): ReadonlyArray<FarmOrder> =>
  FARM_ORDERS.filter(
    (o) => (state.orders[o.id] ?? 0) === 0 && (o.after === undefined || (state.orders[o.after] ?? 0) > 0) && (o.building === undefined || isBuilt(state, o.building))
  )

/** The turn after which the barn first held what the order needs, or null when it never did that day. */
export const metAt = (report: FarmReport, needs: Partial<Amounts>): number | null => {
  const i = report.byTurn.findIndex((a) => RESOURCES.every((r) => (a[r] ?? 0) >= (needs[r] ?? 0)))
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
export const checkOrder = (state: FarmState, order: FarmOrder, code: FarmCode, blocks: ReadonlyArray<BlockName>): OrderCheck => {
  const days = (s: FarmState, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const day = state.day + i
      return runFarmDay(s, code, blocks, day, order.goblins === true || goblinDay(s, day)).report
    })
  const kept = (r: FarmReport) => orderMisses(order, r).length === 0
  const reports = days(state, ORDER_DAYS)
  const at = reports.map((r) => metAt(r, order.needs))
  if (at.some((t) => t === null) || !reports.every(kept)) return { grade: 0, reports }
  if (at.some((t) => t !== null && t > order.fast)) return { grade: 1, reports }
  const bigger = { ...state, trees: Math.min(MAX_TREES, treesOf(state) + 1) }
  if (bigger.trees === treesOf(state)) return { grade: 3, reports }
  const universal = days(bigger, UNIVERSAL_DAYS).every((r) => metAt(r, order.needs) !== null && kept(r))
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
  return { ...NO_AMOUNTS, wood: 10 * n, pumpkin: has(state, "beds") ? 3 * n : 0 }
}

export const canPlantTree = (state: FarmState): boolean =>
  treesOf(state) < MAX_TREES && RESOURCES.every((r) => (state.stock[r] ?? 0) >= treePrice(state)[r])

/** One more tree, and one more bed under it, paid from the barn. */
export const plantTree = (state: FarmState): FarmState => {
  if (!canPlantTree(state)) return state
  const price = treePrice(state)
  return { ...state, trees: treesOf(state) + 1, stock: RESOURCES.reduce((s, r) => ({ ...s, [r]: s[r] - price[r] }), amountsOf(state.stock)) }
}

/** Whether a level is a day of the farm (its id). */
export const isFarmLevel = (levelId: string): boolean => /^farm-\d+$/.test(levelId)

/** All the barn held after a day, both resources together: the height of a bar in the chart of the report. */
export const totalOf = (amounts: Amounts): number => RESOURCES.reduce((sum, r) => sum + amounts[r], 0)

/**
 * What to improve after a working day, in the words of the report: the turns spent for nothing, what was left in the
 * hands, a program that stopped before the evening. At most three tips, the most useful first.
 *
 * `blocks`: the palette of the day. A tip names only the commands the student has; on the first days, before the
 * loops and the questions open, it says what to do in other words.
 */
export const farmTips = (
  report: FarmReport,
  capacity: number,
  language: "blocks" | "python" = "blocks",
  blocks?: ReadonlyArray<BlockName>
): ReadonlyArray<string> => {
  const py = language === "python"
  const can = (b: BlockName) => blocks === undefined || blocks.includes(b)
  const tips: Array<string> = []
  if (report.stopped === "defeated")
    tips.push(`Гобліни здолали робітника: ${py ? "if hero.enemy_ahead(): hero.attack()" : "«якщо попереду ворог? то вдарити»"} перед кожним кроком.`)
  else if (report.stopped === "crashed")
    tips.push(
      can("wallAhead")
        ? `Робітник урізався в ${report.goblins > 0 ? "паркан або в гобліна" : "паркан"}: перед кроком спитай ${py ? "hero.wall_ahead()" : "«попереду стіна?»"}${report.goblins > 0 ? (py ? " і hero.enemy_ahead()" : " і «попереду ворог?»") : ""}.`
        : `Робітник урізався в паркан: порахуй клітинки стежки й поверни там, де вона повертає.`
    )
  else if (report.used < report.turns && report.stopped === null)
    tips.push(
      can("forever")
        ? `Програма закінчилась на ході ${report.used} з ${report.turns}: ${py ? "загорни роботу в while True" : "загорни роботу в «завжди»"}, щоб робітник працював до вечора.`
        : `Програма закінчилась на ході ${report.used} з ${report.turns}: ходів ще багато, допиши команди, щоб робітник приніс більше.`
    )
  const left = totalOf(report.carried)
  if (left > 0) tips.push(`Наприкінці дня в руках лишилось ${left}: це пропало. Неси в комору, щойно руки повні (${capacity}).`)
  if (report.idle > 0)
    tips.push(
      (report.idleFeed ?? 0) > 0
        ? `Ходів дарма: ${report.idle}, з них ${report.idleFeed} ${py ? "hero.feed()" : "«нагодувати»"} без гарбуза в руках або коли вівці ще їли. Годуй, лише коли ${py ? "hero.sheep_hungry()" : "«вівці голодні?»"} і в руках є гарбуз.`
        : `Ходів дарма: ${report.idle}. ${py ? "hero.collect()" : "«Взяти»"} на порожній клітинці теж забирає хід: ${can("onCrystal") ? `спершу спитай ${py ? "hero.item_here()" : "«тут щось є?»"}` : "бери лише там, де лежить колода"}.`
    )
  return tips.slice(0, 3)
}
