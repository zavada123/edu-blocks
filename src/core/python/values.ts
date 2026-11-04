import type { BinaryOp, CompareOp, Stmt } from "./ast.ts"
import type { PythonMethod } from "./api.ts"
import { PyError } from "./errors.ts"

/** Values of a running program, and the Python rules for them: truth, text, arithmetic and comparison. */

export interface PyList {
  readonly type: "list"
  /** Python lists change in place: `append` and `x[0] = …` change this array. */
  readonly items: Array<Value>
}

export interface PyFunction {
  readonly type: "function"
  readonly def: Extract<Stmt, { readonly k: "def" }>
}

export interface PyBuiltin {
  readonly type: "builtin"
  readonly name: string
  readonly call: (args: ReadonlyArray<Value>, line: number) => Value
}

export interface PyHero {
  readonly type: "hero"
}

export interface PyHeroMethod {
  readonly type: "heroMethod"
  readonly method: PythonMethod
}

export interface PyListMethod {
  readonly type: "listMethod"
  readonly name: "append" | "pop"
  readonly list: PyList
}

/** The methods of a text a course needs: `"Привіт".upper()`. */
export const TEXT_METHODS = ["upper", "lower", "strip"] as const
export type TextMethodName = (typeof TEXT_METHODS)[number]

export interface PyTextMethod {
  readonly type: "textMethod"
  readonly name: TextMethodName
  readonly text: string
}

export type Value = number | string | boolean | null | PyList | PyFunction | PyBuiltin | PyHero | PyHeroMethod | PyListMethod | PyTextMethod

/** Items one list or text may hold, so a program cannot fill the memory. */
export const MAX_ITEMS = 10_000

export const list = (items: Array<Value>): PyList => ({ type: "list", items })

export const isList = (v: Value): v is PyList => typeof v === "object" && v !== null && v.type === "list"

export const isCallable = (v: Value): boolean =>
  typeof v === "object" && v !== null && v.type !== "list" && v.type !== "hero"

/** Built-in functions that are types in Python: `type(5)` gives `int`, and it prints as `<class 'int'>`. */
export const TYPE_NAMES: ReadonlySet<string> = new Set(["int", "float", "str", "bool", "list", "NoneType", "function"])

/** The Python type of a value, as `type()` names it. A whole number is an `int`, any other number a `float`. */
export const pythonType = (v: Value): string => {
  if (v === null) return "NoneType"
  if (typeof v === "boolean") return "bool"
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float"
  if (typeof v === "string") return "str"
  if (v.type === "list") return "list"
  if (v.type === "hero") return "Hero"
  if (v.type === "builtin" && TYPE_NAMES.has(v.name)) return "type"
  return v.type === "function" ? "function" : "method"
}

/** What a value is, in the words of the messages. */
export const typeName = (v: Value): string => {
  if (v === null) return "None"
  if (typeof v === "boolean") return "True/False"
  if (typeof v === "number") return "число"
  if (typeof v === "string") return "текст"
  if (v.type === "list") return "список"
  if (v.type === "hero") return "герой"
  return "функція"
}

export const truthy = (v: Value): boolean => {
  if (v === null) return false
  if (typeof v === "boolean") return v
  if (typeof v === "number") return v !== 0
  if (typeof v === "string") return v.length > 0
  if (v.type === "list") return v.items.length > 0
  return true
}

const formatNumber = (n: number): string => {
  if (Number.isNaN(n)) return "nan"
  if (!Number.isFinite(n)) return n > 0 ? "inf" : "-inf"
  return String(n)
}

/** `str(v)`, as `print` shows it. */
export const str = (v: Value): string => (typeof v === "string" ? v : repr(v))

/** `repr(v)`: a text in quotes, as it shows inside a list. */
export const repr = (v: Value): string => {
  if (v === null) return "None"
  if (typeof v === "boolean") return v ? "True" : "False"
  if (typeof v === "number") return formatNumber(v)
  if (typeof v === "string") return `'${v.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`
  switch (v.type) {
    case "list":
      return `[${v.items.map(repr).join(", ")}]`
    case "function":
      return `<функція ${v.def.name}>`
    case "builtin":
      return TYPE_NAMES.has(v.name) ? `<class '${v.name}'>` : `<функція ${v.name}>`
    case "hero":
      return "hero"
    case "heroMethod":
      return `<метод hero.${v.method.name}>`
    case "listMethod":
      return `<метод ${v.name}>`
    case "textMethod":
      return `<метод ${v.name}>`
  }
}

/** A number for arithmetic: True and False count as 1 and 0, as in Python. */
const asNumber = (v: Value): number | null => (typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : null)

/** A text that holds a whole number, like the answer of `input()`: "3" or " 12 ". */
export const isNumberText = (v: Value): v is string => typeof v === "string" && /^\s*[-+]?\d+\s*$/.test(v)

export const toInt = (v: Value, what: string, line: number): number => {
  const n = asNumber(v)
  if (n !== null && Number.isInteger(n)) return n
  const hint = isNumberText(v) ? `: у лапках це текст, а число з нього робить int(…), наприклад int(${repr(v)})` : ""
  throw new PyError(`${what} має бути цілим числом, а тут ${typeName(v)} ${repr(v)}${hint}`, line)
}

const OP_WORDS: Readonly<Record<BinaryOp, string>> = {
  "+": "додати", "-": "відняти", "*": "помножити", "/": "поділити", "//": "поділити", "%": "взяти остачу", "**": "піднести до степеня"
}

/** True when a list or text of this length is allowed; a longer one stops the program. */
const limited = (length: number, line: number): true => {
  if (length > MAX_ITEMS) throw new PyError(`Забагато елементів: більше ніж ${MAX_ITEMS}`, line)
  return true
}

const repeatTimes = (n: number, length: number, line: number): number => {
  limited(Math.max(0, n) * length, line)
  return Math.max(0, n)
}

export const binary = (op: BinaryOp, a: Value, b: Value, line: number): Value => {
  const x = asNumber(a)
  const y = asNumber(b)
  if (x !== null && y !== null) return arithmetic(op, x, y, line)
  if (op === "+" && typeof a === "string" && typeof b === "string") return limited(a.length + b.length, line) && a + b
  if (op === "+" && isList(a) && isList(b)) return limited(a.items.length + b.items.length, line) && list([...a.items, ...b.items])
  if (op === "*") {
    const [seq, times] = x === null ? [a, y] : [b, x]
    if (typeof seq === "string" && times !== null && Number.isInteger(times)) return seq.repeat(repeatTimes(times, seq.length, line))
    if (isList(seq) && times !== null && Number.isInteger(times)) {
      const n = repeatTimes(times, seq.items.length, line)
      return list(Array.from({ length: n }, () => seq.items).flat())
    }
  }
  const textNumber = isNumberText(a) ? a : isNumberText(b) ? b : null
  const hint =
    textNumber !== null && (asNumber(a) !== null || asNumber(b) !== null)
      ? `: ${repr(textNumber)} у лапках — це текст. Щоб рахувати, зроби з нього число: int(${repr(textNumber)}). Щоб склеїти текст, число перетворює str(…)`
      : op === "+" && (typeof a === "string" || typeof b === "string")
        ? ": число в текст перетворює str(…)"
        : ""
  throw new PyError(`Не можна ${OP_WORDS[op]} ${typeName(a)} і ${typeName(b)}${hint}`, line)
}

const arithmetic = (op: BinaryOp, x: number, y: number, line: number): number => {
  if ((op === "/" || op === "//" || op === "%") && y === 0) throw new PyError("Ділити на нуль не можна", line)
  switch (op) {
    case "+":
      return x + y
    case "-":
      return x - y
    case "*":
      return x * y
    case "/":
      return x / y
    case "//":
      return Math.floor(x / y)
    case "%":
      return x - y * Math.floor(x / y)
    case "**":
      return x ** y
  }
}

export const equal = (a: Value, b: Value): boolean => {
  const x = asNumber(a)
  const y = asNumber(b)
  if (x !== null && y !== null) return x === y
  if (isList(a) && isList(b)) return a.items.length === b.items.length && a.items.every((item, i) => equal(item, b.items[i] ?? null))
  return a === b
}

const order = (a: Value, b: Value, line: number): number => {
  const x = asNumber(a)
  const y = asNumber(b)
  if (x !== null && y !== null) return x - y
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0
  throw new PyError(`Не можна порівняти ${typeName(a)} і ${typeName(b)}`, line)
}

const contains = (container: Value, item: Value, line: number): boolean => {
  if (typeof container === "string") {
    if (typeof item !== "string") throw new PyError(`У тексті можна шукати тільки текст, а не ${typeName(item)}`, line)
    return container.includes(item)
  }
  if (isList(container)) return container.items.some((x) => equal(x, item))
  throw new PyError(`«in» працює зі списком або текстом, а тут ${typeName(container)}`, line)
}

export const compare = (op: CompareOp, a: Value, b: Value, line: number): boolean => {
  switch (op) {
    case "==":
      return equal(a, b)
    case "!=":
      return !equal(a, b)
    case "<":
      return order(a, b, line) < 0
    case ">":
      return order(a, b, line) > 0
    case "<=":
      return order(a, b, line) <= 0
    case ">=":
      return order(a, b, line) >= 0
    case "in":
      return contains(b, a, line)
    case "not in":
      return !contains(b, a, line)
  }
}
