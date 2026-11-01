import type { Sensor } from "../hero.ts"
import type { BlockName } from "../level.ts"
import type { Action } from "../world.ts"

/**
 * The hero in Python: `hero.move()`, `hero.wall_ahead()` and the rest. Each method is a hero action or question of
 * the hero API, under the block that brings it into a level, so a level opens the same methods as blocks.
 * The editor shows this list as its palette.
 */

export interface PythonMethod {
  /** As the student writes it after `hero.`. */
  readonly name: string
  /** How it is called, for the palette: `move(кроки=1)`. */
  readonly signature: string
  /** What it does, for the palette. */
  readonly doc: string
  /** The block that opens it on a level. */
  readonly block: BlockName
  readonly action?: Action
  readonly sensor?: Sensor
}

export const PYTHON_METHODS: ReadonlyArray<PythonMethod> = [
  { name: "move", signature: "move()", doc: "Крок уперед. hero.move(3) робить три кроки.", block: "move", action: "move" },
  { name: "turn_left", signature: "turn_left()", doc: "Поворот ліворуч.", block: "turnLeft", action: "turnLeft" },
  { name: "turn_right", signature: "turn_right()", doc: "Поворот праворуч.", block: "turnRight", action: "turnRight" },
  { name: "collect", signature: "collect()", doc: "Взяти те, що лежить тут: на інших рівнях — розпалити вогнище чи зловити рибу.", block: "collect", action: "collect" },
  { name: "attack", signature: "attack()", doc: "Вдарити ворога попереду.", block: "attack", action: "attack" },
  { name: "wall_ahead", signature: "wall_ahead()", doc: "True, якщо попереду стіна.", block: "wallAhead", sensor: "wallAhead" },
  { name: "item_here", signature: "item_here()", doc: "True, якщо тут щось лежить.", block: "onCrystal", sensor: "onCrystal" },
  { name: "at_finish", signature: "at_finish()", doc: "True, якщо герой дійшов до мети.", block: "atFinish", sensor: "atFinish" },
  { name: "enemy_ahead", signature: "enemy_ahead()", doc: "True, якщо попереду ворог.", block: "enemyAhead", sensor: "enemyAhead" },
  { name: "trap_ahead", signature: "trap_ahead()", doc: "True, якщо попереду пастка.", block: "trapAhead", sensor: "trapAhead" }
]

/** The methods a level opens, in palette order. */
export const pythonMethodsOf = (blocks: ReadonlyArray<BlockName>): ReadonlyArray<PythonMethod> =>
  PYTHON_METHODS.filter((m) => blocks.includes(m.block))

/** The name the hero has in a program. */
export const HERO_NAME = "hero"

/** Steps one `hero.move(n)` may ask for. */
export const MAX_MOVE_STEPS = 100
