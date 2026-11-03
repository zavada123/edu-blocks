import type { Definition, Step } from "./build.ts"
import { atFinish, type Direction, enemiesLeft, enemyOf, type EnemySpec, type MapRows, parseMap, type World } from "./world.ts"
import type { Tier } from "./xp.ts"

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
  | "wallAhead"
  | "enemyAhead"
  | "trapAhead"
  | "onCrystal"
  | "atFinish"
  | "handsFull"
  | "atStorehouse"
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

/** What the hero must achieve. All goals of a level are checked together. */
export type Goal =
  | { readonly type: "crystals" }
  | { readonly type: "finish" }
  | { readonly type: "enemies" }
  /** Every item taken and put down in the storehouse (`H`). */
  | { readonly type: "store" }

/** What lies on the `c` cells and what `collect` takes. A campfire is not taken but lit. */
export type ItemKind = "crystal" | "wood" | "apple" | "fish" | "key" | "campfire" | "carrot" | "egg"

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
}

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
  /** Enemies on floor cells. They act after each hero action: see `applyAction`. */
  readonly enemies?: ReadonlyArray<EnemySpec>
  /** Hearts of the hero. 3 by default; they matter only where there are enemies. */
  readonly hearts?: number
  /** Steps («крок уперед») the hero may take. No limit when left out. */
  readonly maxSteps?: number
  /** How many things the hero can carry at once («руки повні?»). No limit when left out. */
  readonly capacity?: number
  /** The name of the custom block when the palette has «procedure». «мій блок» when left out. */
  readonly procedure?: string
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
}

/** The world at the start of a level: the map, the enemies and the hearts. */
export const startWorld = (level: Level): World => {
  const world = parseMap(level.map, level.dir)
  const hearts = Math.max(1, Math.round(level.hearts ?? world.hearts))
  const energy = level.maxSteps === undefined ? null : Math.max(0, Math.round(level.maxSteps))
  const capacity = level.capacity === undefined ? null : Math.max(1, Math.round(level.capacity))
  return { ...world, enemies: (level.enemies ?? []).map(enemyOf), hearts, maxHearts: hearts, energy, capacity }
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
  }
}

export const allGoalsMet = (level: Level, world: World): boolean => level.goals.every((g) => goalMet(world, g))

/** Which goals of the level are met now, in the order of `level.goals`: the live goal list of the game. */
export const goalStatus = (level: Level, world: World): ReadonlyArray<boolean> => level.goals.map((g) => goalMet(world, g))

const ITEM_GOALS: Readonly<Record<ItemKind, (count: number) => string>> = {
  crystal: (n) => `Збери всі кристали (${n})`,
  wood: (n) => (n === 1 ? "Візьми дрова" : `Візьми дрова (${n})`),
  apple: (n) => `Збери яблука (${n})`,
  fish: (n) => `Злови всю рибу (${n})`,
  key: (n) => (n === 1 ? "Візьми ключ" : `Візьми ключі (${n})`),
  campfire: (n) => `Розпали вогнища (${n})`,
  carrot: (n) => `Збери моркву (${n})`,
  egg: (n) => (n === 1 ? "Візьми яйце" : `Збери яйця (${n})`)
}

/** The kind the goal names: the one kind of `itemsAt` when there is one, the level's `item` otherwise. */
const goalItem = (scene: Scene): ItemKind | "harvest" => {
  const kinds = new Set((scene.itemsAt ?? []).map((i) => i.item))
  if (kinds.size > 1) return "harvest"
  return [...kinds][0] ?? scene.item ?? "crystal"
}

const FINISH_GOALS: Readonly<Record<FinishKind, string>> = {
  flag: "Дійди до прапорця",
  well: "Дійди до криниці",
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
  }
}

export const starsFor = (level: Level, blocks: number): 1 | 2 | 3 => {
  if (level.stars === undefined || blocks <= level.stars.three) return 3
  return blocks <= level.stars.two ? 2 : 1
}
