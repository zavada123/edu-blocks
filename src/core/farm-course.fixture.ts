import { LADDER_DONE } from "./farm-ladder.ts"
import type { FarmState } from "./farm.ts"
import type { BlockName } from "./level.ts"

/**
 * For the tests of the farm: what a student brings from the course before the goblins (levels 7 to 35), the loops,
 * the branches and the questions.
 */
export const COURSE_IDEAS: ReadonlyArray<BlockName> = [
  "wallAhead",
  "onCrystal",
  "handsFull",
  "atStorehouse",
  "repeat",
  "forever",
  "repeatUntil",
  "if",
  "ifElse",
  "not",
  "and",
  "or"
]

/** The farm after the first days: the ladder has opened every command, and the course adds its own. */
export const seasoned = (state: FarmState): FarmState => ({ ...state, day: Math.max(state.day, LADDER_DONE) })
