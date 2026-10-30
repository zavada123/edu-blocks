import { HERO_EXTENSION_ID, START_OPCODE } from "./blocks.ts"
import { allGoalsMet, type Level, startWorld } from "./level.ts"
import {
  checkProgram,
  type FailReason,
  MAX_ACTIONS,
  MAX_FRAMES,
  MAX_PROGRAM_BLOCKS,
  PASSES_PER_FRAME,
  type Program,
  resultOf,
  type RunResult,
  type Session
} from "./program.ts"
import { type Action, applyAction, atFinish, enemyAhead, onCrystal, wallAhead } from "./world.ts"

/**
 * Runs a program without the VM: a small interpreter for the blocks a level can have. Synchronous and pure,
 * so the browser and the server get the same result, and a server does not need scratch-vm.
 *
 * It follows the Scratch 3 sequencer. Each «коли прапорець натиснуто» script is a thread. A pass steps every
 * thread in turn; a thread runs until the end of a loop iteration, then gives the turn to the next thread.
 * The tests compare it with the VM (`run.ts`) on many programs.
 */

/** Passes before a run stops as too long: the VM limit (MAX_FRAMES frames of PASSES_PER_FRAME passes). */
export const MAX_PASSES = MAX_FRAMES * PASSES_PER_FRAME
/** Blocks executed in one run. A program can go over it only with a damaged `next` that makes a circle. */
export const MAX_STEPS = 200_000

/** A block as project.json keeps it. Fields the interpreter does not use are not listed. */
interface Block {
  readonly opcode: string
  readonly next: unknown
  readonly inputs: unknown
  readonly fields: unknown
  readonly topLevel: unknown
}

const HERO_ACTIONS: Readonly<Record<string, Action>> = {
  [`${HERO_EXTENSION_ID}_move`]: "move",
  [`${HERO_EXTENSION_ID}_turnLeft`]: "turnLeft",
  [`${HERO_EXTENSION_ID}_turnRight`]: "turnRight",
  [`${HERO_EXTENSION_ID}_collect`]: "collect",
  [`${HERO_EXTENSION_ID}_attack`]: "attack"
}

/** The run stops: the hero is done, a limit is reached, or the program is damaged. */
class Stop {
  constructor(readonly reason: FailReason | null) {}
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Scratch `Cast.toNumber`: a text that is not a number is 0. */
const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value
  if (typeof value === "boolean") return value ? 1 : 0
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

export const judgeProgram = (level: Level, program: Program): RunResult => {
  const session: Session = { world: startWorld(level), frames: [], done: false, reason: null }
  const checked = checkProgram(level, program)
  if ("error" in checked) return resultOf(level, { ...session, reason: "badProgram" }, 0, { detail: checked.error })
  if (!checked.hasStart) return resultOf(level, { ...session, reason: "noStart" }, checked.blocks)

  const blockAt = (id: unknown): Block | null => {
    if (typeof id !== "string" || !Object.hasOwn(program, id)) return null
    const block = program[id]
    if (!isRecord(block) || typeof block.opcode !== "string") return null
    return { opcode: block.opcode, next: block.next, inputs: block.inputs, fields: block.fields, topLevel: block.topLevel }
  }

  /** What an input holds: a block id, a primitive `[type, value]`, or nothing. */
  const inputOf = (block: Block, name: string): unknown => {
    if (!isRecord(block.inputs)) return null
    const input = block.inputs[name]
    return Array.isArray(input) ? input[1] : null
  }

  let steps = 0
  const step = () => {
    if (++steps > MAX_STEPS) throw new Stop("tooLong")
  }

  const act = (action: Action, blockId: string) => {
    if (session.done) return
    const { world, outcome } = applyAction(session.world, action)
    session.world = world
    session.frames.push({ action, outcome, blockId, world })
    if (outcome === "crashed") finish("crashed")
    else if (allGoalsMet(level, world)) finish(null)
    else if (world.hearts === 0) finish("defeated")
    else if (session.frames.length >= MAX_ACTIONS) finish("tooLong")
  }

  const finish = (reason: FailReason | null) => {
    session.done = true
    session.reason = reason
    throw new Stop(reason)
  }

  /** A Boolean input: an empty slot is false, as in Scratch. */
  const question = (ref: unknown, depth: number): boolean => {
    if (depth > MAX_PROGRAM_BLOCKS) throw new Stop("badProgram")
    const block = blockAt(ref)
    if (block === null) return false
    step()
    switch (block.opcode) {
      case `${HERO_EXTENSION_ID}_wallAhead`:
        return wallAhead(session.world)
      case `${HERO_EXTENSION_ID}_onCrystal`:
        return onCrystal(session.world)
      case `${HERO_EXTENSION_ID}_atFinish`:
        return atFinish(session.world)
      case `${HERO_EXTENSION_ID}_enemyAhead`:
        return enemyAhead(session.world)
      case "operator_not":
        return !question(inputOf(block, "OPERAND"), depth + 1)
      case "operator_and":
        return question(inputOf(block, "OPERAND1"), depth + 1) && question(inputOf(block, "OPERAND2"), depth + 1)
      case "operator_or":
        return question(inputOf(block, "OPERAND1"), depth + 1) || question(inputOf(block, "OPERAND2"), depth + 1)
      default:
        return false
    }
  }

  /** The count of «повторити»: a number field, a primitive `[4, "10"]`, or a reporter that covers the field. */
  const count = (block: Block): number => {
    const ref = inputOf(block, "TIMES")
    if (Array.isArray(ref)) return Math.round(toNumber(ref[1]))
    const inner = blockAt(ref)
    if (inner === null) return 0
    if (isRecord(inner.fields) && Array.isArray(inner.fields.NUM)) return Math.round(toNumber(inner.fields.NUM[0]))
    return question(ref, 0) ? 1 : 0
  }

  /** Runs a stack of blocks. A generator yields at the end of each loop iteration, where the VM yields. */
  function* stack(first: unknown, depth: number): Generator<void, void, void> {
    if (depth > MAX_PROGRAM_BLOCKS) throw new Stop("badProgram")
    let id = first
    let block = blockAt(id)
    while (block !== null && typeof id === "string") {
      step()
      const action = HERO_ACTIONS[block.opcode]
      if (action !== undefined) act(action, id)
      else yield* control(block, depth)
      id = block.next
      block = blockAt(id)
    }
  }

  function* control(block: Block, depth: number): Generator<void, void, void> {
    switch (block.opcode) {
      case "control_repeat": {
        for (let left = count(block); left > 0; left--) {
          yield* stack(inputOf(block, "SUBSTACK"), depth + 1)
          yield
          step()
        }
        return
      }
      case "control_forever":
        for (;;) {
          yield* stack(inputOf(block, "SUBSTACK"), depth + 1)
          yield
          step()
        }
      case "control_repeat_until":
        while (!question(inputOf(block, "CONDITION"), 0)) {
          yield* stack(inputOf(block, "SUBSTACK"), depth + 1)
          yield
          step()
        }
        return
      case "control_if":
        if (question(inputOf(block, "CONDITION"), 0)) yield* stack(inputOf(block, "SUBSTACK"), depth + 1)
        return
      case "control_if_else":
        yield* stack(inputOf(block, question(inputOf(block, "CONDITION"), 0) ? "SUBSTACK" : "SUBSTACK2"), depth + 1)
        return
      default:
        // The start hat, and a reporter put where a command goes: nothing to do.
        return
    }
  }

  // The VM starts a thread for each top-level start hat, in the order of the blocks in the project.
  const threads = Object.entries(program)
    .filter(([id]) => {
      const block = blockAt(id)
      return block !== null && block.opcode === START_OPCODE && block.topLevel === true
    })
    .map(([id]) => stack(id, 0))

  try {
    let alive = threads
    for (let pass = 0; alive.length > 0; pass++) {
      if (pass >= MAX_PASSES) throw new Stop("tooLong")
      alive = alive.filter((thread) => thread.next().done !== true)
    }
  } catch (error) {
    if (!(error instanceof Stop)) throw error
    if (!session.done) {
      session.reason = error.reason
      if (error.reason === "badProgram") return resultOf(level, session, checked.blocks, { detail: "Програму пошкоджено: блоки замкнулися в коло" })
    }
  }
  return resultOf(level, session, checked.blocks)
}
