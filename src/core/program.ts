import { allowedOpcodes, isNumberShadow, PROTOTYPE_OPCODE, START_OPCODE, VARIABLE_OPCODE, VARIABLE_PRIMITIVE } from "./blocks.ts"
import { allGoalsMet, type Level, starsFor } from "./level.ts"
import type { Action, Outcome, World } from "./world.ts"

/**
 * A program is the `blocks` object of the hero sprite in a Scratch 3 project (project.json):
 * block id → block. The browser sends it; the server checks it again with `judgeProgram` and trusts only that result.
 */
export type Program = Readonly<Record<string, unknown>>

export const MAX_PROGRAM_BLOCKS = 300
/** Hero actions in one run. A textbook level needs fewer than 100. */
export const MAX_ACTIONS = 1_000
/** VM frames in one run. A «завжди» loop without actions ends here. */
export const MAX_FRAMES = 2_000
/**
 * Passes over the threads in one VM frame. The VM measures a frame in milliseconds; this package counts passes
 * instead, so a run gives the same result on a slow phone and on the server.
 */
export const PASSES_PER_FRAME = 20

/** `defeated`: the enemies took all the hearts. `trapped`: the hero stepped on a trap. `tired`: no steps left. */
export type FailReason = "badProgram" | "noStart" | "crashed" | "trapped" | "tired" | "defeated" | "goalsNotMet" | "tooLong"

/** The reason a run stops after this outcome, or null when it goes on. */
export const fatalReason = (outcome: Outcome): FailReason | null =>
  outcome === "crashed" ? "crashed" : outcome === "fell" ? "trapped" : outcome === "tired" ? "tired" : null

export interface Frame {
  readonly action: Action
  readonly outcome: Outcome
  /** The block that made the move, to highlight it in the editor. */
  readonly blockId: string | null
  readonly world: World
  /** The counter after the move, on a level with «лічильник». */
  readonly counter?: string
}

export interface RunResult {
  readonly levelId: string
  readonly passed: boolean
  /** 0 when not passed. */
  readonly stars: 0 | 1 | 2 | 3
  /** Blocks in the program, the start hat and number fields not counted. */
  readonly blocks: number
  readonly collected: number
  readonly totalCrystals: number
  readonly reason: FailReason | null
  /** For `badProgram`: what is wrong. */
  readonly detail?: string
  readonly frames: ReadonlyArray<Frame>
  readonly world: World
}

interface ProgramBlock {
  readonly opcode: string
  readonly shadow?: boolean
  readonly inputs?: unknown
  readonly mutation?: unknown
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isProgramBlock = (value: unknown): value is ProgramBlock => isRecord(value) && typeof value.opcode === "string"

/** A variable reporter as the editor keeps it: `[12, name, id]`, inside an input or alone on the canvas. */
const isVariablePrimitive = (value: unknown): boolean => Array.isArray(value) && value[0] === VARIABLE_PRIMITIVE

/** Variable reporters kept inside the inputs of a block. Each is a block the student put, so it counts. */
const variablesIn = (block: ProgramBlock): number =>
  isRecord(block.inputs) ? Object.values(block.inputs).filter((input) => Array.isArray(input) && isVariablePrimitive(input[1])).length : 0

/** A custom block «без оновлення екрана» runs on the clock in Scratch, so a run could differ: it is refused. */
const isWarp = (block: ProgramBlock): boolean => isRecord(block.mutation) && (block.mutation.warp === true || block.mutation.warp === "true")

const proccodeOf = (block: ProgramBlock): unknown => (isRecord(block.mutation) ? block.mutation.proccode : undefined)

/** Checks the program shape and palette before it runs. Returns the error text or the block count. */
export const checkProgram = (level: Level, program: Program): { readonly error: string } | { readonly blocks: number; readonly hasStart: boolean } => {
  const entries = Object.entries(program)
  if (entries.length > MAX_PROGRAM_BLOCKS) return { error: `Програма довша за ${MAX_PROGRAM_BLOCKS} блоків` }
  const allowed = allowedOpcodes(level.blocks)
  const defined = new Set<unknown>()
  let blocks = 0
  let hasStart = false
  for (const [, block] of entries) {
    if (isVariablePrimitive(block) && allowed.has(VARIABLE_OPCODE)) {
      blocks++
      continue
    }
    if (!isProgramBlock(block)) return { error: "Блок без опкоду або змінна: цей рівень їх не має" }
    if (!allowed.has(block.opcode)) return { error: `Блок ${block.opcode} не з цього рівня` }
    if (isWarp(block)) return { error: "Власний блок «без оновлення екрана» тут не працює: зніми цю позначку" }
    if (block.opcode === PROTOTYPE_OPCODE) {
      const name = proccodeOf(block)
      if (defined.has(name)) return { error: `Блок «${String(name)}» визначено двічі: залиш одне «визначити»` }
      defined.add(name)
    }
    blocks += variablesIn(block)
    if (block.opcode === START_OPCODE) hasStart = true
    else if (block.shadow !== true && !isNumberShadow(block.opcode)) blocks++
  }
  return { blocks, hasStart }
}

/** What the hero did in one run. */
export interface Session {
  world: World
  readonly frames: Array<Frame>
  done: boolean
  reason: FailReason | null
}

export const resultOf = (level: Level, session: Session, blocks: number, extra: Partial<RunResult> = {}): RunResult => {
  const passed = session.reason === null && allGoalsMet(level, session.world)
  return {
    levelId: level.id,
    passed,
    stars: passed ? starsFor(level, blocks) : 0,
    blocks,
    collected: session.world.totalCrystals - session.world.crystals.size,
    totalCrystals: session.world.totalCrystals,
    reason: passed ? null : (session.reason ?? "goalsNotMet"),
    frames: session.frames,
    world: session.world,
    ...extra
  }
}
