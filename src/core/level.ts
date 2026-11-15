import type { Definition, Step } from "./build.ts"
import { atFinish, type Cell, cellKey, type Direction, enemiesLeft, enemyOf, type EnemySpec, itemCount, type ItemKind, type MapRows, parseMap, type Tower, type World } from "./world.ts"
import type { Tier } from "./xp.ts"
import type { Program } from "./program.ts"

/** Blocks a level can put into the palette. Hero blocks and the Scratch blocks with the same meaning. */
export type BlockName =
  | "move"
  | "turnLeft"
  | "turnRight"
  | "collect"
  | "attack"
  /** «віднести на склад»: puts down on the storehouse what the hero carries. */
  | "store"
  /** «зачекати»: the hero stands one turn while the enemies move. */
  | "wait"
  /** «потягнути важіль»: switches the lever under the hero; the gates open when every lever is on. */
  | "pull"
  /** «посіяти»: sows the empty bed under the hero; the crop is ripe after `grow` turns. */
  | "sow"
  /** «нагодувати»: gives the sheep at the trough under the hero a pumpkin it carries; meat lies there later. */
  | "feed"
  | "wallAhead"
  | "enemyAhead"
  | "trapAhead"
  | "onCrystal"
  | "atFinish"
  | "handsFull"
  | "atStorehouse"
  | "onLever"
  | "leverOn"
  /** «тут ‹морква›?»: a question with a choice of the item kind in the block. */
  | "itemIs"
  /** «тут порожня грядка?»: the hero stands on a bed where nothing grows or lies. */
  | "bedEmpty"
  /** «вівці голодні?»: the hero stands on a trough where the sheep neither eat nor left meat. */
  | "sheepHungry"
  | "repeat"
  | "forever"
  | "repeatUntil"
  | "if"
  | "ifElse"
  | "not"
  | "and"
  | "or"
  /** «задати / змінити лічильник» and the (лічильник) reporter: one variable, as «Змінні» in Scratch. */
  | "counter"
  /** A custom block of the level: its «визначити» hat and the call, as «Мої блоки» in Scratch. */
  | "procedure"
  /** «Створити змінну»: the student makes variables with own names, each with «задати», «змінити» and its reporter. */
  | "variables"
  /** «Створити блок»: the student makes own blocks, with number parameters, as «Мої блоки» in Scratch. */
  | "myBlocks"

/** A gate (`G`) and the levers (`L`, `l`) that open it. */
export interface GateLink {
  readonly gate: Cell
  readonly levers: ReadonlyArray<Cell>
}

/** What the hero must achieve. All goals of a level are checked together. */
export type Goal =
  | { readonly type: "crystals" }
  | { readonly type: "finish" }
  | { readonly type: "enemies" }
  /** Every item taken and put down in the storehouse (`H`). */
  | { readonly type: "store" }
  /** Take every item of this kind and leave the others where they lie. */
  | { readonly type: "pick"; readonly item: ItemKind }

export type { ItemKind } from "./world.ts"

/** Another item on one `c` cell than the level's `item`: the carrots and eggs of the estate. */
export interface ItemAt {
  readonly x: number
  readonly y: number
  readonly item: ItemKind
}
/** What stands on the `F` cell. With «home» a house with its door above the cell stands nearby (a prop). */
export type FinishKind = "flag" | "well" | "grandma" | "home"
/** Pictures that stand on wall or meadow cells. Only looks: they never change where the hero can go. */
export type PropKind = "house" | "woodshed" | "appleTree"

export interface Prop {
  readonly kind: PropKind
  /** Top-left corner in cells. Halves are fine, and so are cells outside the map: the meadow lies there. */
  readonly x: number
  readonly y: number
}

/** Villagers from the pack. They only stand and look around: the hero walks past them, they never block. */
export type NpcKind = "grandpa" | "boy" | "girl" | "villager" | "hunter" | "kid"

export interface Npc {
  readonly who: NpcKind
  /** The cell the villager stands on. Best on a wall or meadow cell, so the hero does not walk through them. */
  readonly x: number
  readonly y: number
  /** A picture from an asset pack instead of the villager's own (`AssetRef`): any character or animal. */
  readonly look?: AssetRef
  /** What the villager says when the hero stands next to them: a hint or a line of the story. Only looks. */
  readonly say?: string
}

/** The longest line a villager says: it has to fit in a bubble over the field. */
export const MAX_SAY = 80

/**
 * A picture from an asset pack: `"<pack>:<sprite id>"`, as `"ninja-adventure:animal/cat"`. See `assets/README.md`.
 * The pack is loaded by the field when a level needs it; until then the picture is not drawn.
 */
export type AssetRef = string

/**
 * A picture from an asset pack placed on the field. Only looks: it never changes where the hero can go, so a house
 * or a fence the hero must not cross stands on wall cells (`#`).
 */
export interface PlacedSprite {
  readonly asset: AssetRef
  /** The cell. Halves are fine, and so are cells outside the map: the meadow lies there. */
  readonly x: number
  readonly y: number
  /**
   * A part of a tileset, in its cells: column, row, width and height. It is drawn from the top-left corner of the
   * cell. Without it the sprite stands on the cell: the bottom middle of its frame on the bottom middle of the cell.
   */
  readonly tiles?: readonly [col: number, row: number, width: number, height: number]
  /** The animation to play; the sprite's `idle` or first clip when left out, a still picture when it has none. */
  readonly clip?: string
  /** Which way a sprite with directions looks. Down by default. */
  readonly dir?: Direction
  /** `ground` lies flat under everything (tiles, water, flowers); `object` stands up and hides what is behind it. */
  readonly layer?: "ground" | "object"
  /** Mirrored left to right. */
  readonly flip?: boolean
  /** One still frame of the sprite, counted from 0: a stage of a growing crop. Then no clip plays. */
  readonly frame?: number
}

/**
 * How a layer of a tile map is drawn. `ground` lies flat under everything and is drawn once (grass, soil, water,
 * paths). `objects` stand up: each tile is drawn with the figures by its row, so the hero walks behind a fence or a
 * house on a higher row and in front of one on a lower row. `above` is drawn over the hero: roofs and tree crowns.
 */
export type TileLayerKind = "ground" | "objects" | "above"

export interface TileLayer {
  /** A name for people and for the Tiled importer, as `ground`, `detail`, `objects`, `above`. */
  readonly name: string
  readonly kind: TileLayerKind
  /**
   * Tile numbers row by row, `width × height` of the map. 0 is an empty cell; tile n is cell n − 1 of the tileset,
   * counted left to right and top to bottom, as Tiled numbers them with the first gid 1.
   */
  readonly data: ReadonlyArray<number>
  /**
   * An upgrade of the estate the layer waits for, as `"coop"`: the layer shows only once it is bought. The field draws
   * a waiting layer only after `tilemapFor` keeps it for the upgrades the student has.
   */
  readonly when?: string
}

/**
 * A map drawn by hand from a tileset of an asset pack, in place of the meadow, trees and bushes the field adds on
 * its own. It is only looks: where the hero can go is still the `map` of the level, so a fence or water the hero must
 * not cross stands on wall cells (`#`). See `tilemapIssues`.
 */
export interface TileMap {
  /** The tileset sprite of a pack (`category: "tileset"`), as `"sunnyside:tileset/16px"`. */
  readonly tileset: AssetRef
  readonly width: number
  readonly height: number
  /** The level cell of the map's top-left cell: 0, 0 when the map starts where the level starts. */
  readonly x?: number
  readonly y?: number
  /** Drawn in this order within their kind. */
  readonly layers: ReadonlyArray<TileLayer>
}

/**
 * Ground painted by cells, as LDtk and Tiled paint terrain: each letter of `rows` names a ground of `kinds`, and the
 * field picks every cell's tile from its neighbours (`core/terrain.ts`), so edges and corners come by themselves. Only
 * looks, like `TileMap`: where the hero can go is still the `map`.
 */
export interface TerrainPaint {
  /** The level cell of the first cell of `rows`: 0, 0 when the painting starts where the level starts. */
  readonly x?: number
  readonly y?: number
  /**
   * The ground under every cell of the field, as `"ninja-adventure:tileset/floor#grass"`. Without it the field's own
   * grass lies under the painting.
   */
  readonly base?: string
  /** What each letter paints: `{ p: "ninja-adventure:tileset/floor#path" }`. Drawn in this order. */
  readonly kinds: Readonly<Record<string, string>>
  /** Row by row, a letter of `kinds` per cell, or `.` for the base. Short rows end in the base. */
  readonly rows: ReadonlyArray<string>
}

export type Season = "spring" | "summer" | "autumn" | "winter"

/** How the level looks: the season, the floor, the things on the map. The rules of the game stay the same. */
export interface Scene {
  /** The season: summer when left out. Spring brings rain, autumn falling leaves, winter snow. */
  readonly theme?: Season
  /** The cells the hero walks on: a path, the ice of a pond or the planks of a bridge over water. */
  readonly ground?: "path" | "ice" | "bridge"
  readonly item?: ItemKind
  /**
   * What lies on some `c` cells instead of `item`. A level with more than one kind here lists every `c` cell, and
   * its goal says «Збери врожай».
   */
  readonly itemsAt?: ReadonlyArray<ItemAt>
  /** How the counter of the storehouse names it: «на складі» when left out, «у коморі» on the farm. */
  readonly storehouseName?: string
  readonly finish?: FinishKind
  readonly props?: ReadonlyArray<Prop>
  readonly npcs?: ReadonlyArray<Npc>
  /** Pictures from the asset packs: decor, buildings, animals, tiles. See `PlacedSprite`. */
  readonly sprites?: ReadonlyArray<PlacedSprite>
  /** How the items on `c` cells look, from an asset pack; `item` still names them in the goal. */
  readonly itemLook?: AssetRef
  /** How the goal on the `F` cell looks, from an asset pack; `finish` still names it in the goal. */
  readonly finishLook?: AssetRef
  /** A hand-drawn map of tiles: the field then shows it and adds no meadow, trees or bushes of its own. */
  readonly tilemap?: TileMap
  /** Ground painted by cells, with edges picked by themselves: paths, water, sand. Drawn over the field's ground. */
  readonly terrain?: TerrainPaint
}

export interface Level {
  readonly id: string
  readonly title: string
  /** Task lines for the student. */
  readonly task: ReadonlyArray<string>
  readonly map: MapRows
  /** Where the hero looks at the start. Right by default. */
  readonly dir?: Direction
  readonly blocks: ReadonlyArray<BlockName>
  readonly goals: ReadonlyArray<Goal>
  /** Most blocks (the start hat not counted) for three and for two stars. Without it any pass gets three. */
  readonly stars?: { readonly three: number; readonly two: number }
  /** Shown after a failed run. */
  readonly hint?: string
  /**
   * A ladder of hints, shown one more after each failed run: a nudge, then the idea, then a frame with gaps (`_`).
   * When given, it replaces `hint` in the game; `hint` stays the short answer for the teacher. A course level speaks
   * of blocks and an intro level of Python, so the ladder shows only where the level is played that way: `speaksTo`.
   */
  readonly hints?: ReadonlyArray<string>
  /**
   * A thing the hero gets for passing the level the first time, with the new command it stands for: boots for
   * `hero.move()`, a horn for `print`, a compass for «поворот». Shown in the verdict, as CodeCombat gives a new method
   * with new gear; like `hints`, only where the level is played the way it speaks of (`speaksTo`).
   */
  readonly gift?: { readonly name: string; readonly skill: string }
  /** Enemies on floor cells. They act after each hero action: see `applyAction`. */
  readonly enemies?: ReadonlyArray<EnemySpec>
  /** Watch towers on wall cells: each shoots one enemy within its range after the enemies' turn. */
  readonly towers?: ReadonlyArray<Tower>
  /**
   * Which levers open which gate: the gate opens once its own levers are on, and the others do not matter to it. A
   * gate left out waits for every lever of the map, as on a map without links.
   */
  readonly links?: ReadonlyArray<GateLink>
  /** Hearts of the hero. 3 by default; they matter only where there are enemies. */
  readonly hearts?: number
  /** Steps («крок уперед») the hero may take. No limit when left out. */
  readonly maxSteps?: number
  /** How many things the hero can carry at once («руки повні?»). No limit when left out. */
  readonly capacity?: number
  /**
   * A working day: the run lasts this many actions and then ends with no fault, and the goals are not checked on the
   * way. Хутір (`farm.ts`) counts what the day brought; a program that loops for ever is the normal case there.
   */
  readonly turns?: number
  /** Turns a sown bed grows until its crop is ripe (`DEFAULT_GROW_TURNS` when left out). */
  readonly grow?: number
  /** Turns until a thing taken off a cell that is not a bed grows there again, as wood on a tree. Never when left out. */
  readonly regrow?: number
  /** Cells where a thing is growing at the start, and the turns until it lies there ripe: a tree that has no wood yet. */
  readonly growingAt?: ReadonlyArray<{ readonly x: number; readonly y: number; readonly turns: number }>
  /** Cells that grow their thing again after their own turns, not `regrow`: the gold mine of the farm. */
  readonly regrowAt?: ReadonlyArray<{ readonly x: number; readonly y: number; readonly turns: number }>
  /** Turns the sheep eat a pumpkin until meat lies on the trough (`DEFAULT_FEED_TURNS` when left out). */
  readonly feed?: number
  /** The name of the custom block when the palette has «procedure». «мій блок» when left out. */
  readonly procedure?: string
  /**
   * «Книга команд»: the «визначити» scripts of own blocks the program may call without defining them (`book.ts`). Each
   * run joins them to the program; a block the program defines itself takes the place of its page.
   */
  readonly library?: ReadonlyArray<Program>
  /** Summer, crystals and a flag when left out. */
  readonly scene?: Scene
  /** Sets the XP of the level. An intro level when left out. */
  readonly tier?: Tier
  /**
   * More fields the same program must pass: the fish in other holes, a bridge of another length. The level's own
   * map is the first field. A program passes the level only when it passes every field (`judgeProgram`), so a list
   * of steps learned by heart for one map is not enough. See `levelFields`.
   */
  readonly fields?: ReadonlyArray<LevelField>
  /**
   * «Зламаний робот»: a program with a mistake that the level opens with, when the app gives no saved program. The
   * task tells what the robot had to do; the student runs it, finds the mistake and fixes it. Stars count as usual.
   * See `brokenProgram` and `brokenSource`.
   */
  readonly broken?: BrokenProgram
  /**
   * A level only for Python code: its ideas (variables, `print`, `input()`) have no blocks. `<EduBlocks>` and the
   * block course skip it. See `pythonLevels`.
   */
  readonly language?: "python"
  /** A short lesson shown over the code before the student starts: what the new idea is, with an example. */
  readonly lesson?: Lesson
  /** The Python code the level opens with when the app gives no saved program. */
  readonly starter?: string
  /**
   * The answers `input()` gets on this field, one for each call, in order: an old man tells the number of steps.
   * Other fields give their own, so the program has to read the answer and cannot know it in advance.
   */
  readonly inputs?: ReadonlyArray<string>
  /** Ideas a Python program must use to pass, not only reach the goals: a variable, `print`, `input()`. */
  readonly uses?: ReadonlyArray<PythonIdea>
  /** A line the Python program must print, exactly as written here. */
  readonly prints?: string
}

/** What a Python level can ask the program to use (`Level.uses`). */
export type PythonIdea = "variable" | "print" | "input" | "int" | "float" | "str"

/** A lesson over the code of a level: a title, a few short paragraphs and an example to read. */
export interface Lesson {
  readonly title: string
  readonly text: ReadonlyArray<string>
  /** Python code that shows the idea, with comments. It is not the solution of the level. */
  readonly example: string
}

/** A program with a mistake, written as steps (`buildProgram`), with the custom block when the level has one. */
export interface BrokenProgram {
  readonly steps: ReadonlyArray<Step>
  readonly definition?: Definition
}

/**
 * One more field of a level: another map with the same blocks, goals and stars. A field takes the direction, the
 * step limit and the scene of the level unless it gives its own; enemies only stand where the field puts them.
 */
export interface LevelField {
  readonly map: MapRows
  readonly dir?: Direction
  readonly enemies?: ReadonlyArray<EnemySpec>
  readonly maxSteps?: number
  /** The look of this field when the houses and pictures of the level do not fit its map. */
  readonly scene?: Scene
  /** The answers to `input()` on this field, instead of the level's. */
  readonly inputs?: ReadonlyArray<string>
  /** The line to print on this field, instead of the level's: it follows from the answers of this field. */
  readonly prints?: string
}

/** The world at the start of a level: the map, the enemies and the hearts. */
export const startWorld = (level: Level): World => {
  const world = parseMap(level.map, level.dir)
  const hearts = Math.max(1, Math.round(level.hearts ?? world.hearts))
  const energy = level.maxSteps === undefined ? null : Math.max(0, Math.round(level.maxSteps))
  const capacity = level.capacity === undefined ? null : Math.max(1, Math.round(level.capacity))
  const itemKinds = itemKindsOf(world, level.scene ?? {}, (level.growingAt ?? []).map((g) => cellKey(g.x, g.y)))
  const gateLevers = gateLeversOf(world, level.links ?? [])
  const growTurns = level.grow === undefined ? world.growTurns : Math.max(1, Math.round(level.grow))
  const regrowTurns = level.regrow === undefined ? null : Math.max(1, Math.round(level.regrow))
  const growing = new Map([
    ...[...world.growing.keys()].map((key): [string, number] => [key, growTurns]),
    ...(level.growingAt ?? [])
      .filter((g) => !world.walls.has(cellKey(g.x, g.y)) && !world.crystals.has(cellKey(g.x, g.y)))
      .map((g): [string, number] => [cellKey(g.x, g.y), Math.max(1, Math.round(g.turns))])
  ])
  const towers = (level.towers ?? []).map((t) => ({ x: t.x, y: t.y, range: Math.max(1, Math.round(t.range)) }))
  const regrowAt = new Map((level.regrowAt ?? []).map((g): [string, number] => [cellKey(g.x, g.y), Math.max(1, Math.round(g.turns))]))
  const feedTurns = level.feed === undefined ? world.feedTurns : Math.max(1, Math.round(level.feed))
  return { ...world, enemies: (level.enemies ?? []).map(enemyOf), hearts, maxHearts: hearts, energy, capacity, itemKinds, gateLevers, growTurns, regrowTurns, regrowAt, feedTurns, growing, towers }
}

/** The levers of each linked gate: links to cells that are no gate or no lever are left out (`checkLevel` tells). */
const gateLeversOf = (world: World, links: ReadonlyArray<GateLink>): ReadonlyMap<string, ReadonlySet<string>> =>
  new Map(
    links
      .filter((link) => world.gates.has(cellKey(link.gate.x, link.gate.y)))
      .map((link) => [
        cellKey(link.gate.x, link.gate.y),
        new Set(link.levers.map((c) => cellKey(c.x, c.y)).filter((key) => world.levers.has(key)))
      ])
  )

/** What lies on each `c` cell: its own kind from `itemsAt`, the level's `item` otherwise. */
/** What grows on a bed when the level does not say: pumpkins in the pack. */
export const BED_ITEM: ItemKind = "carrot"
/** What the sheep leave on the trough after they ate. */
export const TROUGH_ITEM: ItemKind = "meat"

const itemKindsOf = (world: World, scene: Scene, growing: ReadonlyArray<string>): ReadonlyMap<string, ItemKind> => {
  const own = new Map((scene.itemsAt ?? []).map((i) => [cellKey(i.x, i.y), i.item]))
  const kindOf = (key: string): ItemKind => own.get(key) ?? (world.beds.has(key) ? BED_ITEM : world.troughs.has(key) ? TROUGH_ITEM : (scene.item ?? "crystal"))
  return new Map([...new Set([...world.crystals, ...world.beds, ...world.troughs, ...growing])].map((key) => [key, kindOf(key)]))
}

export const goalMet = (world: World, goal: Goal): boolean => {
  switch (goal.type) {
    case "crystals":
      return world.crystals.size === 0
    case "finish":
      return atFinish(world)
    case "enemies":
      return enemiesLeft(world) === 0
    case "store":
      return world.crystals.size === 0 && world.carrying === 0
    case "pick": {
      const mine = itemCount(world, goal.item)
      return mine.left === 0 && world.crystals.size === world.totalCrystals - mine.total
    }
  }
}

export const allGoalsMet = (level: Level, world: World): boolean => level.goals.every((g) => goalMet(world, g))

/** Which goals of the level are met now, in the order of `level.goals`: the live goal list of the game. */
export const goalStatus = (level: Level, world: World): ReadonlyArray<boolean> => level.goals.map((g) => goalMet(world, g))

const ITEM_GOALS: Readonly<Record<ItemKind, (count: number) => string>> = {
  crystal: (n) => `Збери все золото (${n})`,
  wood: (n) => (n === 1 ? "Візьми дрова" : `Візьми дрова (${n})`),
  apple: (n) => `Збери гриби (${n})`,
  fish: (n) => `Збери м'ясо (${n})`,
  key: (n) => (n === 1 ? "Візьми стрілу" : `Збери стріли (${n})`),
  campfire: (n) => `Розпали вогнища (${n})`,
  carrot: (n) => `Збери гарбузи (${n})`,
  egg: (n) => (n === 1 ? "Забери ягня" : `Збери ягнят (${n})`),
  meat: (n) => `Збери м'ясо (${n})`,
  gold: (n) => (n === 1 ? "Візьми злиток" : `Збери злитки (${n})`)
}

/** «Збери лише …»: the goal that takes one kind and leaves the others. */
const ITEM_PICKS: Readonly<Record<ItemKind, string>> = {
  crystal: "Збери лише золото",
  wood: "Візьми лише дрова",
  apple: "Збери лише гриби",
  fish: "Збери лише м'ясо",
  key: "Збери лише стріли",
  campfire: "Розпали лише вогнища",
  carrot: "Збери лише гарбузи",
  egg: "Забери лише ягнят",
  meat: "Збери лише м'ясо",
  gold: "Збери лише злитки"
}

/** The kind the goal names: the one kind of `itemsAt` when there is one, the level's `item` otherwise. */
const goalItem = (scene: Scene): ItemKind | "harvest" => {
  const kinds = new Set((scene.itemsAt ?? []).map((i) => i.item))
  if (kinds.size > 1) return "harvest"
  return [...kinds][0] ?? scene.item ?? "crystal"
}

const FINISH_GOALS: Readonly<Record<FinishKind, string>> = {
  flag: "Дійди до вказівника",
  well: "Дійди до джерела",
  grandma: "Дійди до бабусі",
  home: "Повернись додому"
}

const enemiesGoal = (world: World): string => {
  const boss = world.enemies.some((e) => e.boss)
  const n = world.enemies.length
  if (n === 1) return boss ? "Переможи боса" : "Переможи ворога"
  return boss ? `Переможи всіх ворогів і боса (${n})` : `Переможи всіх ворогів (${n})`
}

export const describeGoal = (goal: Goal, world: World, scene: Scene = {}): string => {
  switch (goal.type) {
    case "crystals": {
      const item = goalItem(scene)
      return item === "harvest" ? `Збери врожай (${world.totalCrystals})` : ITEM_GOALS[item](world.totalCrystals)
    }
    case "finish":
      return FINISH_GOALS[scene.finish ?? "flag"]
    case "enemies":
      return enemiesGoal(world)
    case "store":
      return `Віднеси все на склад (${world.totalCrystals})`
    case "pick":
      return `${ITEM_PICKS[goal.item]} (${itemCount(world, goal.item).total}), а решту не чіпай`
  }
}

export const starsFor = (level: Level, blocks: number): 1 | 2 | 3 => {
  if (level.stars === undefined || blocks <= level.stars.three) return 3
  return blocks <= level.stars.two ? 2 : 1
}

/**
 * Whether a level's `hints` and `gift` are written for the way it is played now. A level of «Python: перші кроки»
 * (`language: "python"`) speaks of Python code; a course level speaks of blocks, so in Python it keeps its `hint`.
 */
export const speaksTo = (level: Level, language: "blocks" | "python"): boolean => (level.language === "python") === (language === "python")
