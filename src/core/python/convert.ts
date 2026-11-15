import { definitions, solutions } from "../../levels/solutions.ts"
import { COUNTER_NAME, procedureName } from "../blocks.ts"
import type { Amount, Definition, Question, Step } from "../build.ts"
import type { Level } from "../level.ts"
import type { Program } from "../program.ts"
import { type ReadStep, readProgram, type Slot } from "../read.ts"
import { ITEM_METHOD, PYTHON_METHODS } from "./api.ts"

/** Blocks programs as Python code, as a student would write them. */

const METHOD = new Map(PYTHON_METHODS.map((m) => [m.action ?? m.sensor, m.name]))

/** A Python name for the words of a block or a variable: letters, digits and `_`, not a digit first, not a keyword. */
const identifier = (name: string): string => {
  const word = name.trim().replace(/[^\p{L}\p{N}_]+/gu, "_") || "_"
  const safe = /^\p{N}/u.test(word) ? `_${word}` : word
  return KEYWORDS.has(safe) ? `${safe}_` : safe
}

const KEYWORDS: ReadonlySet<string> = new Set(
  "False None True and as assert break class continue def del elif else for from global if import in is lambda not or pass return try while with yield hero".split(" ")
)

/** A step as the solutions write it, or as the editor holds it (`readProgram`). */
type CodeStep = Step | ReadStep

/** A condition. An empty slot is `False`, as Scratch reads it. */
const question = (q: Question | Slot): string => {
  if (q === null) return "False"
  if (typeof q === "string") return `hero.${METHOD.get(q)}()`
  if ("itemIs" in q) return `hero.${ITEM_METHOD}("${q.itemIs}")`
  if ("not" in q) return `not ${question(q.not)}`
  const [a, b] = "and" in q ? q.and : q.or
  return `(${question(a)} ${"and" in q ? "and" : "or"} ${question(b)})`
}

/** What a program does with its variables: those it reads (they need a start value) and those it sets. */
interface Uses {
  /** Variables read or changed, in the order the program first does it: each gets `= 0` before the program. */
  readonly read: Set<string>
  /** Variables set or changed: a function that does it says `global`. */
  readonly set: Set<string>
}

const newUses = (): Uses => ({ read: new Set(), set: new Set() })

/** The Python name of the variable a step sets: the counter when it names none. */
const variableName = (variable: string | undefined): string => (variable === undefined ? COUNTER_NAME : identifier(variable))

/** A number slot: a number, a variable or a parameter. A variable read goes to `uses`. */
const amount = (value: Amount, uses: Uses): string => {
  if (typeof value === "number") return String(value)
  if (value !== "counter" && "param" in value) return identifier(value.param)
  const name = variableName(value === "counter" ? undefined : value.variable)
  uses.read.add(name)
  return name
}

/** The blocks of a program as Python lines. */
const lines = (steps: ReadonlyArray<CodeStep>, indent: string, procedure: string, uses: Uses): Array<string> => {
  if (steps.length === 0) return [`${indent}pass`]
  const inner = `${indent}    `
  return steps.flatMap((s): Array<string> => {
    if (s === "call") return [`${indent}${procedure}()`]
    if (typeof s === "string") return [`${indent}hero.${METHOD.get(s)}()`]
    if ("call" in s) return [`${indent}${identifier(s.call)}(${s.args.map((a) => amount(a, uses)).join(", ")})`]
    if ("set" in s) {
      const name = variableName(s.variable)
      uses.set.add(name)
      return [`${indent}${name} = ${amount(s.set, uses)}`]
    }
    if ("change" in s) {
      const name = variableName(s.variable)
      uses.read.add(name)
      uses.set.add(name)
      return [`${indent}${name} += ${amount(s.change, uses)}`]
    }
    if ("repeat" in s) return [`${indent}for _ in range(${amount(s.repeat, uses)}):`, ...lines(s.body, inner, procedure, uses)]
    if ("forever" in s) return [`${indent}while True:`, ...lines(s.forever, inner, procedure, uses)]
    if ("until" in s) return [`${indent}while not ${question(s.until)}:`, ...lines(s.body, inner, procedure, uses)]
    const branch = [`${indent}if ${question(s.if)}:`, ...lines(s.then, inner, procedure, uses)]
    return s.else === undefined ? branch : [...branch, `${indent}else:`, ...lines(s.else, inner, procedure, uses)]
  })
}

/**
 * A function: its `def` line, `global` for the variables it sets, and its body. On a level with the counter a function
 * says `global` for it always, as the course writes it.
 */
const functionLines = (level: Level, name: string, params: ReadonlyArray<string>, body: ReadonlyArray<CodeStep>, procedure: string, uses: Uses): Array<string> => {
  const own = newUses()
  const code = lines(body, "    ", procedure, own)
  for (const v of own.read) uses.read.add(v)
  for (const v of own.set) uses.set.add(v)
  const globals = new Set([...(level.blocks.includes("counter") ? [COUNTER_NAME] : []), ...own.set])
  return [`def ${identifier(name)}(${params.map(identifier).join(", ")}):`, ...[...globals].map((g) => `    global ${g}`), ...code]
}

/** `= 0` for each variable the program reads, the counter first. */
const startLines = (uses: Uses): Array<string> =>
  [...uses.read].sort((a, b) => Number(b === COUNTER_NAME) - Number(a === COUNTER_NAME)).map((v) => `${v} = 0`)

/**
 * The program in Python, and how many lines it has that the blocks do not (the start values of the variables). The
 * code plays as the blocks do: `parity.test.ts` checks it on every level.
 */
export const toPython = (level: Level, steps: ReadonlyArray<Step>, definition?: Definition): { source: string; extra: number } => {
  const procedure = identifier(definition?.name ?? procedureName(level))
  const uses = newUses()
  const main = lines(steps, "", procedure, uses)
  const def = definition === undefined ? [] : functionLines(level, definition.name ?? procedureName(level), definition.params ?? [], definition.body, procedure, uses)
  const start = startLines(uses)
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
  const uses = newUses()
  const defs = definitions.flatMap((d) => [...functionLines(level, d.name, d.params, d.body, procedure, uses), ""])
  const [first, ...others] = scripts
  const main =
    first === undefined
      ? ["# Немає блока «коли прапорець натиснуто»: програма не почнеться."]
      : first.length === 0
        ? ["# Додай блоки під «коли прапорець натиснуто»."]
        : lines(first, "", procedure, uses)
  const note = others.length === 0 ? [] : ["", `# Ще скриптів «коли прапорець натиснуто»: ${others.length}. У Python програма одна, тут лише перший.`]
  return [...startLines(uses), ...defs, ...main, ...note].join("\n")
}
