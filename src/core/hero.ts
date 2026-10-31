import { opcodeOf } from "./blocks.ts"
import { allGoalsMet, goalStatus, type Level, startWorld } from "./level.ts"
import { fatalReason, MAX_ACTIONS, type Session } from "./program.ts"
import { type Action, applyAction, atFinish, enemyAhead, onCrystal, trapAhead, wallAhead, type World } from "./world.ts"

/**
 * The hero API: what a program may tell the hero to do and ask the hero about. Every way of programming calls
 * only this: the Scratch blocks today (`judge.ts`, and the VM in `run.ts`), Python blocks and Python code later.
 * So a new language needs no change of the game, and a new action or question needs no change of a language.
 */

/** The questions a program may ask, for «якщо» and «повторити до». */
export type Sensor = "wallAhead" | "onCrystal" | "atFinish" | "enemyAhead" | "trapAhead"

/** The hero's actions, in palette order. */
export const HERO_ACTIONS: ReadonlyArray<Action> = ["move", "turnLeft", "turnRight", "collect", "attack"]

/** Each question and how the world answers it. */
export const HERO_SENSORS: Readonly<Record<Sensor, (world: World) => boolean>> = {
  wallAhead,
  onCrystal,
  atFinish,
  enemyAhead,
  trapAhead
}

const SENSOR_NAMES = Object.keys(HERO_SENSORS) as ReadonlyArray<Sensor>

const ACTION_BY_OPCODE: ReadonlyMap<string, Action> = new Map(HERO_ACTIONS.map((a) => [opcodeOf(a), a]))
const SENSOR_BY_OPCODE: ReadonlyMap<string, Sensor> = new Map(SENSOR_NAMES.map((s) => [opcodeOf(s), s]))

/** The action of a hero block, such as `hero_move`, or undefined for any other block. */
export const actionOfOpcode = (opcode: string): Action | undefined => ACTION_BY_OPCODE.get(opcode)

/** The question of a hero block, such as `hero_wallAhead`, or undefined for any other block. */
export const sensorOfOpcode = (opcode: string): Sensor | undefined => SENSOR_BY_OPCODE.get(opcode)

/** A new run of the level: the hero at the start, nothing done yet. */
export const newSession = (level: Level): Session => ({ world: startWorld(level), frames: [], done: false, reason: null })

/** Where in the program an action came from, to show it while the run plays. */
export interface ActionSource {
  /** The block, for block programs. */
  readonly blockId: string | null
}

/**
 * The hero does one action, the enemies take their turn, and the frame is written down. Returns true when the run
 * is over after it: the goals are met, the hero crashed, fell, ran out of steps or hearts, or did too many actions.
 * The caller then stops the program.
 */
export const heroAct = (level: Level, session: Session, action: Action, source: ActionSource): boolean => {
  if (session.done) return true
  const { world, outcome, events } = applyAction(session.world, action)
  session.world = world
  session.frames.push({ action, outcome, blockId: source.blockId, events, goals: goalStatus(level, world), world })
  const fatal = fatalReason(outcome)
  if (fatal !== null) return end(session, fatal)
  if (allGoalsMet(level, world)) return end(session, null)
  if (world.hearts === 0) return end(session, "defeated")
  if (session.frames.length >= MAX_ACTIONS) return end(session, "tooLong")
  return false
}

/** The answer to a question about the world as it is now. */
export const heroSense = (session: Session, sensor: Sensor): boolean => HERO_SENSORS[sensor](session.world)

const end = (session: Session, reason: Session["reason"]): true => {
  session.done = true
  session.reason = reason
  return true
}
