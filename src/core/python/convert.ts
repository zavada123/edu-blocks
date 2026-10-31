import { definitions, solutions } from "../../levels/solutions.ts"
import { COUNTER_NAME, procedureName } from "../blocks.ts"
import type { Definition, Question, Step } from "../build.ts"
import type { Level } from "../level.ts"
import { PYTHON_METHODS } from "./api.ts"

/** Blocks programs as Python code, as a student would write them. */

const METHOD = new Map(PYTHON_METHODS.map((m) => [m.action ?? m.sensor, m.name]))

const identifier = (name: string): string => name.replace(/[^\p{L}\p{N}_]+/gu, "_")

const question = (q: Question): string => {
  if (typeof q === "string") return `hero.${METHOD.get(q)}()`
  if ("not" in q) return `not ${question(q.not)}`
  const [a, b] = "and" in q ? q.and : q.or
  return `(${question(a)} ${"and" in q ? "and" : "or"} ${question(b)})`
}

/** The blocks of a program as Python lines. `uses` is set when the program reads the counter. */
const lines = (steps: ReadonlyArray<Step>, indent: string, procedure: string, uses: { counter: boolean }): Array<string> => {
  if (steps.length === 0) return [`${indent}pass`]
  const inner = `${indent}    `
  return steps.flatMap((s): Array<string> => {
    if (s === "call") return [`${indent}${procedure}()`]
    if (typeof s === "string") return [`${indent}hero.${METHOD.get(s)}()`]
    if ("set" in s) return [`${indent}${COUNTER_NAME} = ${s.set}`]
    if ("change" in s) {
      uses.counter = true
      return [`${indent}${COUNTER_NAME} += ${s.change}`]
    }
    if ("repeat" in s) {
      if (s.repeat === "counter") uses.counter = true
      const times = s.repeat === "counter" ? COUNTER_NAME : String(s.repeat)
      return [`${indent}for _ in range(${times}):`, ...lines(s.body, inner, procedure, uses)]
    }
    if ("forever" in s) return [`${indent}while True:`, ...lines(s.forever, inner, procedure, uses)]
    if ("until" in s) return [`${indent}while not ${question(s.until)}:`, ...lines(s.body, inner, procedure, uses)]
    const branch = [`${indent}if ${question(s.if)}:`, ...lines(s.then, inner, procedure, uses)]
    return s.else === undefined ? branch : [...branch, `${indent}else:`, ...lines(s.else, inner, procedure, uses)]
  })
}

/**
 * The program in Python, and how many lines it has that the blocks do not (a start value of the counter). The code
 * plays as the blocks do: `parity.test.ts` checks it on every level.
 */
export const toPython = (level: Level, steps: ReadonlyArray<Step>, definition?: Definition): { source: string; extra: number } => {
  const procedure = identifier(definition?.name ?? procedureName(level))
  const uses = { counter: false }
  const main = lines(steps, "", procedure, uses)
  const def = definition === undefined ? [] : [`def ${procedure}():`, `    global ${COUNTER_NAME}`, ...lines(definition.body, "    ", procedure, uses)]
  const start = uses.counter ? [`${COUNTER_NAME} = 0`] : []
  return { source: [...start, ...def, ...main].join("\n"), extra: start.length }
}

/** The solution of a library level in Python. Empty for an unknown level. */
export const solutionSource = (level: Level): string => {
  const steps = solutions[level.id]
  return steps === undefined ? "" : toPython(level, steps, definitions[level.id]).source
}
