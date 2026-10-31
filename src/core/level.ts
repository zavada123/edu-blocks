import { atFinish, type Direction, enemiesLeft, enemyOf, type EnemySpec, type MapRows, parseMap, type World } from "./world.ts"
import type { Tier } from "./xp.ts"

/** Blocks a level can put into the palette. Hero blocks and the Scratch blocks with the same meaning. */
export type BlockName =
  | "move"
  | "turnLeft"
  | "turnRight"
  | "collect"
  | "attack"
  | "wallAhead"
  | "enemyAhead"
  | "trapAhead"
  | "onCrystal"
  | "atFinish"
  | "repeat"
  | "forever"
  | "repeatUntil"
  | "if"
  | "ifElse"
  | "not"
  | "and"
  | "or"

/** What the hero must achieve. All goals of a level are checked together. */
export type Goal = { readonly type: "crystals" } | { readonly type: "finish" } | { readonly type: "enemies" }

/** What lies on the `c` cells and what `collect` takes. A campfire is not taken but lit. */
export type ItemKind = "crystal" | "wood" | "apple" | "fish" | "key" | "campfire"
/** What stands on the `F` cell. With «home» a house with its door above the cell stands nearby (a prop). */
export type FinishKind = "flag" | "well" | "grandma" | "home"
/** Pictures that stand on wall or meadow cells. Only looks: they never change where the hero can go. */
export type PropKind = "house" | "woodshed"

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
}

/** How the level looks: the season, the floor, the things on the map. The rules of the game stay the same. */
export interface Scene {
  readonly theme?: "summer" | "winter"
  /** The cells the hero walks on: a path, the ice of a pond or the planks of a bridge over water. */
  readonly ground?: "path" | "ice" | "bridge"
  readonly item?: ItemKind
  readonly finish?: FinishKind
  readonly props?: ReadonlyArray<Prop>
  readonly npcs?: ReadonlyArray<Npc>
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
  /** Summer, crystals and a flag when left out. */
  readonly scene?: Scene
  /** Sets the XP of the level. An intro level when left out. */
  readonly tier?: Tier
}

/** The world at the start of a level: the map, the enemies and the hearts. */
export const startWorld = (level: Level): World => {
  const world = parseMap(level.map, level.dir)
  const hearts = Math.max(1, Math.round(level.hearts ?? world.hearts))
  const energy = level.maxSteps === undefined ? null : Math.max(0, Math.round(level.maxSteps))
  return { ...world, enemies: (level.enemies ?? []).map(enemyOf), hearts, maxHearts: hearts, energy }
}

export const goalMet = (world: World, goal: Goal): boolean => {
  switch (goal.type) {
    case "crystals":
      return world.crystals.size === 0
    case "finish":
      return atFinish(world)
    case "enemies":
      return enemiesLeft(world) === 0
  }
}

export const allGoalsMet = (level: Level, world: World): boolean => level.goals.every((g) => goalMet(world, g))

const ITEM_GOALS: Readonly<Record<ItemKind, (count: number) => string>> = {
  crystal: (n) => `Збери всі кристали (${n})`,
  wood: (n) => (n === 1 ? "Візьми дрова" : `Візьми дрова (${n})`),
  apple: (n) => `Збери яблука (${n})`,
  fish: (n) => `Злови всю рибу (${n})`,
  key: (n) => (n === 1 ? "Візьми ключ" : `Візьми ключі (${n})`),
  campfire: (n) => `Розпали вогнища (${n})`
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
    case "crystals":
      return ITEM_GOALS[scene.item ?? "crystal"](world.totalCrystals)
    case "finish":
      return FINISH_GOALS[scene.finish ?? "flag"]
    case "enemies":
      return enemiesGoal(world)
  }
}

export const starsFor = (level: Level, blocks: number): 1 | 2 | 3 => {
  if (level.stars === undefined || blocks <= level.stars.three) return 3
  return blocks <= level.stars.two ? 2 : 1
}
