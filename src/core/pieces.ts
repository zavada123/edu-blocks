import { START_OPCODE } from "./blocks.ts"
import { levelFields } from "./fields.ts"
import type { Level } from "./level.ts"
import type { Program, RunResult } from "./program.ts"

/**
 * «Продовжити звідси»: a run that ended before the goals lets the student go on from where the hero stopped, with a
 * new piece of program, instead of starting over. The pieces are never run apart. Each run joins all the pieces into
 * one program (`joinPrograms`, `joinSources`) and judges it from the start, and the screen plays only the frames
 * after the earlier pieces (`continuedResult`). So the result is always the result of one program, and the server
 * checks the same program the browser sent.
 *
 * This works because the judge is deterministic: a piece that ran to its end (`goalsNotMet`) gives the same frames as
 * the start of any program that goes on after it.
 */

/** Pieces in one try of a level. A student who needs more should start over and write a loop. */
export const MAX_PIECES = 8

/** Most stars when the program was written in more than one piece: three stars ask for one program. */
export const PIECES_STAR_CAP = 2

/** Palette blocks a piece cannot carry over: a custom block or the counter of an earlier piece. */
const KEPT_STATE: ReadonlySet<string> = new Set(["procedure", "counter"])

/**
 * Can the student go on from where this run stopped? Only when the program simply ended before the goals: after a
 * crash, a trap, the steps or hearts running out, or a run too long, the student starts over, so that obstacles keep
 * their meaning. A level with several fields needs one program for every field, and a «Зламаний робот» level is about
 * fixing the program it gives. In blocks, a level with a custom block or the counter keeps one program too.
 */
export const canContinue = (level: Level, result: RunResult, language: "blocks" | "python", pieces: number): boolean =>
  result.reason === "goalsNotMet" &&
  pieces < MAX_PIECES &&
  levelFields(level).length === 1 &&
  level.broken === undefined &&
  (language === "python" || !level.blocks.some((b) => KEPT_STATE.has(b)))

/** The stars of a program written in `pieces` pieces. The first chapter (`large`) keeps its stars: there finishing matters most. */
export const piecesStars = (stars: RunResult["stars"], pieces: number, large: boolean): RunResult["stars"] =>
  pieces > 1 && !large && stars > PIECES_STAR_CAP ? PIECES_STAR_CAP : stars

type Block = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Block => typeof value === "object" && value !== null && !Array.isArray(value)

/** The block ids an input points to: `[1, id]`, `[2, id]` or `[3, id, shadowId]`. */
const inputIds = (input: unknown): ReadonlyArray<string> =>
  Array.isArray(input) ? input.slice(1).filter((v): v is string => typeof v === "string") : []

/** The ids of every block in the script under the hat: the stack, its branches and the blocks in its slots. */
const scriptIds = (program: Program, hat: string): ReadonlyArray<string> => {
  const seen = new Set<string>()
  const visit = (id: unknown) => {
    if (typeof id !== "string" || seen.has(id) || !Object.hasOwn(program, id)) return
    const block = program[id]
    if (!isRecord(block)) return
    seen.add(id)
    visit(block.next)
    if (isRecord(block.inputs)) for (const input of Object.values(block.inputs)) for (const ref of inputIds(input)) visit(ref)
  }
  visit(hat)
  return [...seen]
}

/** The top-level start hats of a program: each starts a script. */
const startHats = (program: Program): ReadonlyArray<string> =>
  Object.entries(program)
    .filter(([, b]) => isRecord(b) && b.opcode === START_OPCODE && b.topLevel === true)
    .map(([id]) => id)

/** How many scripts a program has: one for each top-level start hat. */
export const scriptCount = (program: Program): number => startHats(program).length

/** The only top-level start hat of a piece, or null when it has none or more than one. */
const startHat = (program: Program): string | null => {
  const hats = startHats(program)
  return hats.length === 1 ? (hats[0] ?? null) : null
}

/** Can this piece be joined: exactly one script, under one start hat. Two scripts would run side by side. */
export const isPiece = (program: Program): boolean => startHat(program) !== null

/** The id a block of piece `n` has in the joined program. */
const joinedId = (n: number, id: string): string => `p${n}-${id}`

/** A copy of the block with its ids renamed for the joined program. */
const renamed = (block: Block, rename: (id: unknown) => unknown): Block => ({
  ...block,
  next: rename(block.next),
  parent: rename(block.parent),
  ...(isRecord(block.inputs)
    ? {
        inputs: Object.fromEntries(
          Object.entries(block.inputs).map(([name, input]) => [name, Array.isArray(input) ? input.map((v, i) => (i === 0 ? v : rename(v))) : input])
        )
      }
    : {})
})

/**
 * One program from the pieces, in order: the script of the first piece, then the blocks under the hat of each next
 * piece, joined to the end of the stack. Blocks outside the script do nothing in a run and are left out. Null when a
 * piece is not one script (`isPiece`).
 */
export const joinPrograms = (pieces: ReadonlyArray<Program>): Program | null => {
  const joined: Record<string, Block> = {}
  let tail: string | null = null
  for (const [n, piece] of pieces.entries()) {
    const hat = startHat(piece)
    if (hat === null) return null
    const ids = scriptIds(piece, hat)
    const own = new Set(ids)
    const rename = (id: unknown): unknown => (n > 0 && id === hat ? null : typeof id === "string" && own.has(id) ? joinedId(n, id) : id)
    for (const id of ids) {
      if (n > 0 && id === hat) continue
      joined[joinedId(n, id)] = renamed(piece[id] as Block, rename)
    }
    const hatBlock = piece[hat] as Block
    const first = n === 0 ? joinedId(0, hat) : typeof hatBlock.next === "string" ? joinedId(n, hatBlock.next) : null
    if (first === null) continue
    if (tail !== null) {
      joined[tail] = { ...joined[tail], next: first }
      joined[first] = { ...joined[first], parent: tail }
    }
    // The end of the stack so far: the next piece goes after it.
    let end = first
    for (let next = joined[end]?.next; typeof next === "string" && joined[next] !== undefined; next = joined[next]?.next) end = next
    tail = end
  }
  return joined
}

/** The id in the editor of a block of the joined program, when it is a block of piece `n`; null for another piece. */
export const pieceBlockId = (blockId: string | null, n: number): string | null => {
  const prefix = joinedId(n, "")
  return blockId !== null && blockId.startsWith(prefix) ? blockId.slice(prefix.length) : null
}

/** One Python program from the pieces, in order. Each piece starts on a new line. */
export const joinSources = (pieces: ReadonlyArray<string>): string =>
  pieces.map((p) => (p.endsWith("\n") ? p : `${p}\n`)).join("")

/** Lines of the earlier pieces: a line of the new piece is this many lines down in the joined program. */
export const linesBefore = (pieces: ReadonlyArray<string>): number => joinSources(pieces).split("\n").length - 1

/**
 * The run of the joined program as the screen plays it: only the frames after the earlier pieces, which the student
 * has seen already. `done` is the number of frames of the earlier pieces. The grade is the grade of the whole program.
 */
export const continuedResult = (result: RunResult, done: number): RunResult =>
  done <= 0 || done > result.frames.length ? result : { ...result, frames: result.frames.slice(done) }
