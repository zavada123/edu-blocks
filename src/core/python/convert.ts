import { definitions, solutions } from "../../levels/solutions.ts"
import { COUNTER_NAME, procedureName } from "../blocks.ts"
import type { Definition, Question, Step } from "../build.ts"
import type { Level } from "../level.ts"
import type { Program } from "../program.ts"
import { type ReadStep, readProgram, type Slot } from "../read.ts"
import { PYTHON_METHODS } from "./api.ts"

/** Blocks programs as Python code, as a student would write them. */

const METHOD = new Map(PYTHON_METHODS.map((m) => [m.action ?? m.sensor, m.name]))

const identifier = (name: string): string => name.replace(/[^\p{L}\p{N}_]+/gu, "_")

/** A step as the solutions write it, or as the editor holds it (`readProgram`). */
type CodeStep = Step | ReadStep

/** A condition. An empty slot is `False`, as Scratch reads it. */
const question = (q: Question | Slot): string => {
  if (q === null) return "False"
  if (typeof q === "string") return `hero.${METHOD.get(q)}()`
  if ("not" in q) return `not ${question(q.not)}`
  const [a, b] = "and" in q ? q.and : q.or
  return `(${question(a)} ${"and" in q ? "and" : "or"} ${question(b)})`
}

/** A number slot: the counter or a number. Sets `uses` when it reads the counter. */
const amount = (value: number | "counter", uses: { counter: boolean }): string => {
  if (value !== "counter") return String(value)
  uses.counter = true
  return COUNTER_NAME
}

/** The blocks of a program as Python lines. `uses` is set when the program reads the counter. */
const lines = (steps: ReadonlyArray<CodeStep>, indent: string, procedure: string, uses: { counter: boolean }): Array<string> => {
  if (steps.length === 0) return [`${indent}pass`]
  const inner = `${indent}    `
  return steps.flatMap((s): Array<string> => {
    if (s === "call") return [`${indent}${procedure}()`]
    if (typeof s === "string") return [`${indent}hero.${METHOD.get(s)}()`]
    if ("call" in s) return [`${indent}${identifier(s.call)}()`]
    if ("set" in s) return [`${indent}${COUNTER_NAME} = ${amount(s.set, uses)}`]
    if ("change" in s) {
      uses.counter = true
      return [`${indent}${COUNTER_NAME} += ${amount(s.change, uses)}`]
    }
    if ("repeat" in s) return [`${indent}for _ in range(${amount(s.repeat, uses)}):`, ...lines(s.body, inner, procedure, uses)]
    if ("forever" in s) return [`${indent}while True:`, ...lines(s.forever, inner, procedure, uses)]
    if ("until" in s) return [`${indent}while not ${question(s.until)}:`, ...lines(s.body, inner, procedure, uses)]
    const branch = [`${indent}if ${question(s.if)}:`, ...lines(s.then, inner, procedure, uses)]
    return s.else === undefined ? branch : [...branch, `${indent}else:`, ...lines(s.else, inner, procedure, uses)]
  })
}

/** A function changes the counter only on a level that has it: there it says `global`, elsewhere nothing. */
const globalsOf = (level: Level): ReadonlyArray<string> => (level.blocks.includes("counter") ? [`    global ${COUNTER_NAME}`] : [])

/**
 * The program in Python, and how many lines it has that the blocks do not (a start value of the counter). The code
 * plays as the blocks do: `parity.test.ts` checks it on every level.
 */
export const toPython = (level: Level, steps: ReadonlyArray<Step>, definition?: Definition): { source: string; extra: number } => {
  const procedure = identifier(definition?.name ?? procedureName(level))
  const uses = { counter: false }
  const main = lines(steps, "", procedure, uses)
  const def = definition === undefined ? [] : [`def ${procedure}():`, ...globalsOf(level), ...lines(definition.body, "    ", procedure, uses)]
  const start = uses.counter ? [`${COUNTER_NAME} = 0`] : []
  return { source: [...start, ...def, ...main].join("\n"), extra: start.length }
}

/** The solution of a library level in Python. Empty for an unknown level. */
export const solutionSource = (level: Level): string => {
  const steps = solutions[level.id]
  return steps === undefined ? "" : toPython(level, steps, definitions[level.id]).source
}

/**
 * A program of the blocks editor in Python, for the view under the blocks. It writes the code as `toPython` does;
 * an empty condition is `False`, as in Scratch. Python has no scripts that run side by side, so only the first
 * «коли прапорець натиснуто» script is shown, with a note about the others.
 */
export const programSource = (level: Level, program: Program): string => {
  const { scripts, definitions } = readProgram(program)
  const procedure = identifier(procedureName(level))
  const uses = { counter: false }
  const defs = definitions.flatMap((d) => [`def ${identifier(d.name)}():`, ...globalsOf(level), ...lines(d.body, "    ", procedure, uses), ""])
  const [first, ...others] = scripts
  const main =
    first === undefined
      ? ["# Немає блока «коли прапорець натиснуто»: програма не почнеться."]
      : first.length === 0
        ? ["# Додай блоки під «коли прапорець натиснуто»."]
        : lines(first, "", procedure, uses)
  const note = others.length === 0 ? [] : ["", `# Ще скриптів «коли прапорець натиснуто»: ${others.length}. У Python програма одна, тут лише перший.`]
  const start = uses.counter ? [`${COUNTER_NAME} = 0`] : []
  return [...start, ...defs, ...main, ...note].join("\n")
}
