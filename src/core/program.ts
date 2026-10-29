import { allowedOpcodes, isNumberShadow, START_OPCODE } from "./blocks.ts"
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

export type FailReason = "badProgram" | "noStart" | "crashed" | "goalsNotMet" | "tooLong"

export interface Frame {
  readonly action: Action
  readonly outcome: Outcome
  /** The block that made the move, to highlight it in the editor. */
  readonly blockId: string | null
  readonly world: World
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
}

const isProgramBlock = (value: unknown): value is ProgramBlock =>
  typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as ProgramBlock).opcode === "string"

/** Checks the program shape and palette before it runs. Returns the error text or the block count. */
export const checkProgram = (level: Level, program: Program): { readonly error: string } | { readonly blocks: number; readonly hasStart: boolean } => {
  const entries = Object.entries(program)
  if (entries.length > MAX_PROGRAM_BLOCKS) return { error: `Програма довша за ${MAX_PROGRAM_BLOCKS} блоків` }
  const allowed = allowedOpcodes(level.blocks)
  let blocks = 0
  let hasStart = false
  for (const [, block] of entries) {
    if (!isProgramBlock(block)) return { error: "Блок без опкоду або змінна: цей рівень їх не має" }
    if (!allowed.has(block.opcode)) return { error: `Блок ${block.opcode} не з цього рівня` }
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
