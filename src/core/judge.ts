import {
  CALL_OPCODE,
  CHANGE_OPCODE,
  COUNTER_ID,
  COUNTER_NAME,
  DEFINITION_OPCODE,
  SET_OPCODE,
  START_OPCODE,
  VARIABLE_OPCODE,
  VARIABLE_PRIMITIVE
} from "./blocks.ts"
import { actionOfOpcode, heroAct, heroSense, newSession, sensorOfOpcode } from "./hero.ts"
import type { Level } from "./level.ts"
import {
  checkProgram,
  type FailReason,
  MAX_ACTIONS,
  MAX_FRAMES,
  MAX_PROGRAM_BLOCKS,
  PASSES_PER_FRAME,
  type Program,
  resultOf,
  type RunResult
} from "./program.ts"
import type { Action } from "./world.ts"

/**
 * Runs a program without the VM: a small interpreter for the blocks a level can have. Synchronous and pure,
 * so the browser and the server get the same result, and a server does not need scratch-vm.
 *
 * It follows the Scratch 3 sequencer. Each «коли прапорець натиснуто» script is a thread with a stack of frames,
 * as in the VM. A pass steps every thread in turn; a thread runs until the end of a loop iteration (or a custom
 * block that calls itself), then gives the turn to the next thread.
 * The tests compare it with the VM (`run.ts`) on many programs.
 */

/** Passes before a run stops as too long: the VM limit (MAX_FRAMES frames of PASSES_PER_FRAME passes). */
export const MAX_PASSES = MAX_FRAMES * PASSES_PER_FRAME
/** Blocks executed in one run. A program can go over it only with a damaged `next` that makes a circle. */
export const MAX_STEPS = 200_000
/**
 * Custom blocks running inside each other. Only a block that calls itself goes deep; the VM has no limit, but
 * each level that acts takes one of MAX_ACTIONS, so a run ends there before this limit.
 */
export const MAX_CALL_DEPTH = MAX_ACTIONS
/** Enclosing blocks the VM looks through to tell that a custom block calls itself (`Thread.isRecursiveCall`). */
const RECURSION_LOOKBACK = 6

/** A block as project.json keeps it. Fields the interpreter does not use are not listed. */
interface Block {
  readonly opcode: string
  readonly next: unknown
  readonly inputs: unknown
  readonly fields: unknown
  readonly topLevel: unknown
  readonly mutation: unknown
}

/** A variable of the run: the counter, or one a program names that the VM would create. */
interface Variable {
  readonly name: unknown
  value: unknown
}

/** A level of a thread's stack, as the VM keeps it: the block it is at and the state of a loop there. */
interface StackFrame {
  id: unknown
  isLoop: boolean
  loopCounter: number | undefined
  /** Stacks inside stacks since the script or custom block began: a damaged program can nest without end. */
  readonly depth: number
  /** Custom blocks running inside each other here. */
  readonly calls: number
}

/** The stack of one thread: a frame for each stack of blocks it is inside, the innermost last. */
type Thread = Array<StackFrame>

/** After a block: go to the next one, a branch or custom block was put on the stack, or give the turn away. */
type Signal = "next" | "pushed" | "yield"

const newFrame = (id: unknown, depth: number, calls: number): StackFrame => ({ id, isLoop: false, loopCounter: undefined, depth, calls })

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
  const session = newSession(level)
  const checked = checkProgram(level, program)
  if ("error" in checked) return resultOf(level, { ...session, reason: "badProgram" }, 0, { detail: checked.error })
  if (!checked.hasStart) return resultOf(level, { ...session, reason: "noStart" }, checked.blocks)

  /** What an input holds: a block id, a primitive `[type, value]`, or nothing. */
  const inputOf = (block: Block, name: string): unknown => {
    if (!isRecord(block.inputs)) return null
    const input = block.inputs[name]
    return Array.isArray(input) ? input[1] : null
  }

  const blockAt = (id: unknown): Block | null => {
    if (typeof id !== "string" || !Object.hasOwn(program, id)) return null
    const block = program[id]
    if (!isRecord(block) || typeof block.opcode !== "string") return null
    return { opcode: block.opcode, next: block.next, inputs: block.inputs, fields: block.fields, topLevel: block.topLevel, mutation: block.mutation }
  }

  const proccodeOf = (block: Block | null): unknown => (block !== null && isRecord(block.mutation) ? block.mutation.proccode : undefined)

  /** Custom blocks by name: the first «визначити» with that name, as the VM finds it. */
  const definitions = new Map<unknown, string>()
  for (const [id] of Object.entries(program)) {
    const block = blockAt(id)
    if (block === null || block.opcode !== DEFINITION_OPCODE) continue
    const name = proccodeOf(blockAt(inputOf(block, "custom_block")))
    if (name !== undefined && !definitions.has(name)) definitions.set(name, id)
  }

  // The VM looks a variable up by id, then by name, and creates a missing one with 0 (`lookupOrCreateVariable`).
  const variables = new Map<unknown, Variable>([[COUNTER_ID, { name: COUNTER_NAME, value: 0 }]])
  const variable = (field: unknown): Variable => {
    const [name, id] = Array.isArray(field) ? field : []
    const byId = variables.get(id)
    if (byId !== undefined) return byId
    for (const v of variables.values()) if (v.name === name) return v
    const created: Variable = { name, value: 0 }
    variables.set(id, created)
    return created
  }
  const fieldOf = (block: Block, name: string): unknown => (isRecord(block.fields) ? block.fields[name] : undefined)

  const counted = level.blocks.includes("counter")

  let steps = 0
  const step = () => {
    if (++steps > MAX_STEPS) throw new Stop("tooLong")
  }

  const act = (action: Action, blockId: string) => {
    const counter = counted ? { counter: String(variable([COUNTER_NAME, COUNTER_ID]).value) } : {}
    if (heroAct(level, session, action, { blockId, ...counter })) throw new Stop(session.reason)
  }

  /** A Boolean input: an empty slot is false, as in Scratch. */
  const question = (ref: unknown, depth: number): boolean => {
    if (depth > MAX_PROGRAM_BLOCKS) throw new Stop("badProgram")
    const block = blockAt(ref)
    if (block === null) return false
    step()
    const sensor = sensorOfOpcode(block.opcode)
    if (sensor !== undefined) return heroSense(session, sensor)
    switch (block.opcode) {
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

  /** What a number or text slot gives: a primitive, a shadow with the number, the counter or a question. */
  const value = (ref: unknown): unknown => {
    if (Array.isArray(ref)) return ref[0] === VARIABLE_PRIMITIVE ? variable([ref[1], ref[2]]).value : ref[1]
    const block = blockAt(ref)
    if (block === null) return ""
    if (block.opcode === VARIABLE_OPCODE) return variable(fieldOf(block, "VARIABLE")).value
    const field = fieldOf(block, "NUM") ?? fieldOf(block, "TEXT")
    if (Array.isArray(field)) return field[0]
    return question(ref, 0)
  }

  /** The count of «повторити», taken once when the loop starts, as in Scratch. */
  const count = (block: Block): number => Math.round(toNumber(value(inputOf(block, "TIMES"))))

  /** Does the VM see this call as a custom block calling itself (`Thread.isRecursiveCall`)? Then it yields. */
  const recursive = (thread: Thread, name: unknown): boolean => {
    for (let i = thread.length - 2, looked = 0; i >= 0 && looked < RECURSION_LOOKBACK; i--, looked++) {
      const block = blockAt(thread[i]?.id)
      if (block !== null && block.opcode === CALL_OPCODE && proccodeOf(block) === name) return true
    }
    return false
  }

  /** Puts a branch of the block on top of the stack, as `startBranch` does. */
  const branch = (thread: Thread, frame: StackFrame, block: Block, input: string, isLoop: boolean): Signal => {
    if (frame.depth >= MAX_PROGRAM_BLOCKS) throw new Stop("badProgram")
    frame.isLoop = isLoop
    thread.push(newFrame(inputOf(block, input), frame.depth + 1, frame.calls))
    return "pushed"
  }

  /** Runs the block on top of the stack. */
  const execute = (thread: Thread, frame: StackFrame, block: Block, id: string): Signal => {
    const action = actionOfOpcode(block.opcode)
    if (action !== undefined) {
      act(action, id)
      return "next"
    }
    switch (block.opcode) {
      case "control_repeat":
        frame.loopCounter ??= count(block)
        frame.loopCounter--
        return frame.loopCounter >= 0 ? branch(thread, frame, block, "SUBSTACK", true) : "next"
      case "control_forever":
        return branch(thread, frame, block, "SUBSTACK", true)
      case "control_repeat_until":
        return question(inputOf(block, "CONDITION"), 0) ? "next" : branch(thread, frame, block, "SUBSTACK", true)
      case "control_if":
        return question(inputOf(block, "CONDITION"), 0) ? branch(thread, frame, block, "SUBSTACK", false) : "next"
      case "control_if_else":
        return branch(thread, frame, block, question(inputOf(block, "CONDITION"), 0) ? "SUBSTACK" : "SUBSTACK2", false)
      case SET_OPCODE:
        variable(fieldOf(block, "VARIABLE")).value = value(inputOf(block, "VALUE"))
        return "next"
      case CHANGE_OPCODE: {
        const v = variable(fieldOf(block, "VARIABLE"))
        v.value = toNumber(v.value) + toNumber(value(inputOf(block, "VALUE")))
        return "next"
      }
      case CALL_OPCODE: {
        const name = proccodeOf(block)
        const definition = definitions.get(name)
        if (definition === undefined) return "next"
        if (frame.calls >= MAX_CALL_DEPTH) throw new Stop("tooLong")
        const yields = recursive(thread, name)
        thread.push(newFrame(definition, 0, frame.calls + 1))
        return yields ? "yield" : "pushed"
      }
      default:
        // The start hat, a «визначити» hat, and a reporter put where a command goes: nothing to do.
        return "next"
    }
  }

  /** Moves the frame to the next block, as `goToNextBlock` does. */
  const advance = (frame: StackFrame, block: Block | null) => {
    frame.id = block === null ? null : block.next
    frame.isLoop = false
    frame.loopCounter = undefined
  }

  /** One turn of a thread (`Sequencer.stepThread`). False when the thread is done. */
  const stepThread = (thread: Thread): boolean => {
    for (;;) {
      const frame = thread.at(-1)
      if (frame === undefined) return false
      const block = blockAt(frame.id)
      if (block !== null && typeof frame.id === "string") {
        step()
        const signal = execute(thread, frame, block, frame.id)
        if (signal === "yield") return true
        if (signal === "next") advance(frame, block)
      }
      // A stack that ran out returns to the block that started it: a loop yields, any other block goes on.
      while (blockAt(thread.at(-1)?.id) === null) {
        thread.pop()
        const below = thread.at(-1)
        if (below === undefined) return false
        if (below.isLoop) return true
        advance(below, blockAt(below.id))
      }
    }
  }

  // The VM starts a thread for each top-level start hat, in the order of the blocks in the project.
  const threads: Array<Thread> = Object.entries(program)
    .filter(([id]) => {
      const block = blockAt(id)
      return block !== null && block.opcode === START_OPCODE && block.topLevel === true
    })
    .map(([id]) => [newFrame(id, 0, 0)])

  try {
    let alive = threads
    for (let pass = 0; alive.length > 0; pass++) {
      if (pass >= MAX_PASSES) throw new Stop("tooLong")
      alive = alive.filter(stepThread)
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
