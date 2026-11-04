import { COUNTER_NAME } from "../blocks.ts"
import { heroAct, heroSense, newSession } from "../hero.ts"
import { combineFields, levelFields } from "../fields.ts"
import { allGoalsMet, type Level } from "../level.ts"
import { resultOf, type RunResult } from "../program.ts"
import type { Body } from "./ast.ts"
import { PyError } from "./errors.ts"
import { missingIdea, missingPrint } from "./ideas.ts"
import { execute, Halt, type PyHost } from "./interpreter.ts"
import { parse } from "./parser.ts"
import { programSize } from "./size.ts"
import { repr, str } from "./values.ts"

/**
 * Runs a Python program on a level and grades it, as `judgeProgram` does for blocks. Pure and synchronous:
 * the browser plays the frames, and the server runs the same text again and trusts only its own result.
 */

/** Lines of `print` kept for the student. */
export const MAX_OUTPUT_LINES = 200

/** Runs a Python program on one field: the map of `level` only, without its other `fields`. */
export const judgePythonField = (level: Level, source: string): RunResult => {
  const session = newSession(level)
  let program: Body
  try {
    program = parse(source)
  } catch (error) {
    if (!(error instanceof PyError)) throw error
    return resultOf(level, { ...session, reason: "badProgram" }, 0, { detail: error.message, line: error.line })
  }
  const size = programSize(program)
  if (program.length === 0) return resultOf(level, { ...session, reason: "noStart" }, 0)

  const output: Array<string> = []
  const answers = level.inputs ?? []
  let asked = 0
  const counted = level.blocks.includes("counter")
  // On a level that asks to print, the program goes on after the hero meets the goals, so the print at its end runs.
  const printsAtEnd = level.prints !== undefined || (level.uses ?? []).includes("print")
  const host: PyHost = {
    act: (action, line, globals) => {
      const counter = counted ? { counter: str(globals.get(COUNTER_NAME) ?? 0) } : {}
      if (!heroAct(level, session, action, { blockId: null, line, ...counter })) return
      if (printsAtEnd && session.reason === null) return
      throw new Halt(false)
    },
    sense: (sensor) => heroSense(session, sensor),
    allows: (method) => level.blocks.includes(method.block),
    print: (text) => {
      if (output.length < MAX_OUTPUT_LINES) output.push(text)
    },
    input: (prompt, line) => {
      const answer = answers[asked]
      if (answer === undefined) {
        const tail = answers.length === 0 ? "на цьому рівні ніхто не відповідає на input()" : `на цьому полі є лише ${answers.length} ${answers.length === 1 ? "відповідь" : "відповіді"}`
        throw new PyError(`input(${prompt === "" ? "" : repr(prompt)}) питає, але ${tail}`, line)
      }
      asked += 1
      return answer
    }
  }
  const printed = () => (output.length === 0 ? {} : { output })

  try {
    execute(program, host)
  } catch (error) {
    if (error instanceof Halt) {
      if (!session.done) session.reason = "tooLong"
    } else if (error instanceof PyError) {
      return resultOf(level, { ...session, reason: "badProgram" }, size, { detail: error.message, line: error.line, ...printed() })
    } else throw error
  }
  // A level that teaches an idea passes only when the program uses it, and prints what it was asked to.
  const passed = session.reason === null && allGoalsMet(level, session.world)
  const missing = passed ? (missingIdea(level, program) ?? missingPrint(level, output)) : null
  if (missing !== null) return resultOf(level, { ...session, reason: "badProgram" }, size, { detail: missing, ...printed() })
  return resultOf(level, session, size, printed())
}

/** Runs a Python program on every field of the level: one result for each field, in order. */
export const judgePythonFields = (level: Level, source: string): ReadonlyArray<RunResult> =>
  levelFields(level).map((field) => judgePythonField(field, source))

/** Grades a Python program: it passes only when it passes every field of the level (see `combineFields`). */
export const judgePython = (level: Level, source: string): RunResult => combineFields(judgePythonFields(level, source))
