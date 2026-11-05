import type { Level, PythonIdea } from "../level.ts"
import type { Body, Expr, Stmt } from "./ast.ts"

/**
 * The ideas a Python program uses, for levels that teach them (`Level.uses`): a level about variables passes only
 * when the program keeps a value in a variable and reads it back, not when it reaches the goal with numbers alone.
 */

const children = (e: Expr): ReadonlyArray<Expr> => {
  switch (e.k) {
    case "number":
    case "string":
    case "constant":
    case "name":
      return []
    case "list":
      return e.items
    case "attribute":
      return [e.object]
    case "index":
      return [e.object, e.index]
    case "call":
      return [e.fn, ...e.args]
    case "unary":
      return [e.arg]
    case "binary":
    case "bool":
      return [e.left, e.right]
    case "compare":
      return e.operands
  }
}

const allExprs = (e: Expr): ReadonlyArray<Expr> => [e, ...children(e).flatMap(allExprs)]

/** The expressions a statement reads, and the statements inside it. */
const statementParts = (s: Stmt): { readonly exprs: ReadonlyArray<Expr>; readonly bodies: ReadonlyArray<Body> } => {
  switch (s.k) {
    case "expr":
      return { exprs: [s.expr], bodies: [] }
    case "assign":
      return { exprs: s.target.k === "index" ? [s.value, s.target] : [s.value], bodies: [] }
    case "augassign":
      return { exprs: [s.value, s.target], bodies: [] }
    case "if":
      return { exprs: [s.test], bodies: [s.body, s.orelse] }
    case "while":
      return { exprs: [s.test], bodies: [s.body] }
    case "for":
      return { exprs: [s.iter], bodies: [s.body] }
    case "def":
      return { exprs: [], bodies: [s.body] }
    case "return":
      return { exprs: s.value === null ? [] : [s.value], bodies: [] }
    case "global":
    case "pass":
    case "break":
    case "continue":
      return { exprs: [], bodies: [] }
  }
}

const allStatements = (body: Body): ReadonlyArray<Stmt> => body.flatMap((s) => [s, ...statementParts(s).bodies.flatMap(allStatements)])

interface Usage {
  /** Names the program assigns to: `x = …`, `x += …`, `for x in …`. */
  readonly assigned: ReadonlySet<string>
  /** Names the program reads. */
  readonly read: ReadonlySet<string>
  /** Names of the functions it calls by name: `print`, `input`, `int`. */
  readonly called: ReadonlySet<string>
}

const usageOf = (program: Body): Usage => {
  const statements = allStatements(program)
  const exprs = statements.flatMap((s) => statementParts(s).exprs.flatMap(allExprs))
  const assigned = statements.flatMap((s) =>
    (s.k === "assign" || s.k === "augassign") && s.target.k === "name" ? [s.target.id] : s.k === "for" ? [s.target] : []
  )
  return {
    assigned: new Set(assigned),
    read: new Set(exprs.flatMap((e) => (e.k === "name" ? [e.id] : []))),
    called: new Set(exprs.flatMap((e) => (e.k === "call" && e.fn.k === "name" ? [e.fn.id] : [])))
  }
}

const uses = (usage: Usage, idea: PythonIdea): boolean => {
  switch (idea) {
    case "variable":
      return [...usage.assigned].some((name) => usage.read.has(name))
    case "print":
    case "input":
    case "int":
    case "float":
    case "str":
      return usage.called.has(idea)
  }
}

const MISSING: Readonly<Record<PythonIdea, string>> = {
  variable: "Герой дійшов, але без змінної-скриньки. Поклади число в скриньку, наприклад steps = 3, і пиши steps замість числа.",
  print: "Герой дійшов, але нічого не сказав. Додай print(…): так герой каже слова вголос.",
  input: "Програма не спитала. Відповідь дає input(\"…\"): на іншому полі вона буде інша.",
  int: "Відповідь input() — це текст. Зроби з неї число: int(input(\"…\")).",
  float: "Число з крапкою, тому зроби з відповіді таке число: float(input(\"…\")).",
  str: "Тут треба зробити з числа слова: str(…)."
}

/** What the program still has to use, as a message for the student, or null when it uses every idea of the level. */
export const missingIdea = (level: Level, program: Body): string | null => {
  const ideas = level.uses ?? []
  if (ideas.length === 0) return null
  const usage = usageOf(program)
  const missing = ideas.find((idea) => !uses(usage, idea))
  return missing === undefined ? null : MISSING[missing]
}

/** What is wrong with the printed lines, or null when the program printed the line the level asks for. */
export const missingPrint = (level: Level, output: ReadonlyArray<string>): string | null => {
  const want = level.prints
  if (want === undefined || output.some((line) => line.trim() === want)) return null
  const got = output.length === 0 ? "нічого не надрукувала" : `надрукувала «${output.at(-1) ?? ""}»`
  return `Програма мала надрукувати «${want}», а ${got}.`
}
