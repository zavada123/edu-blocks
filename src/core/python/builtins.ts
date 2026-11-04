import { PyError } from "./errors.ts"
import { isList, list, MAX_ITEMS, type PyBuiltin, pythonType, repr, str, toInt, truthy, typeName, type Value } from "./values.ts"

/** The built-in functions a program may call: `range`, `len`, `print`, `input`, `type` and a few for numbers. */

/** What the built-in functions reach outside the program. */
export interface BuiltinIo {
  readonly print: (text: string) => void
  /** The next answer to `input()`; throws a `PyError` when the level has no more answers. */
  readonly input: (prompt: string, line: number) => string
}

const arity = (name: string, args: ReadonlyArray<Value>, min: number, max: number, line: number) => {
  if (args.length >= min && args.length <= max) return
  const want = min === max ? `${min}` : `від ${min} до ${max}`
  throw new PyError(`${name}() приймає ${want} значень у дужках, а тут ${args.length}`, line)
}

const range = (args: ReadonlyArray<Value>, line: number): Value => {
  arity("range", args, 1, 3, line)
  const numbers = args.map((a) => toInt(a, "Число в range()", line))
  const [start, stop, step] = numbers.length === 1 ? [0, numbers[0] ?? 0, 1] : [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 1]
  if (step === 0) throw new PyError("Крок у range() не може бути нулем", line)
  const count = Math.max(0, Math.ceil((stop - start) / step))
  if (count > MAX_ITEMS) throw new PyError(`range() задовгий: більше ніж ${MAX_ITEMS} чисел`, line)
  return list(Array.from({ length: count }, (_, i) => start + i * step))
}

const len = (args: ReadonlyArray<Value>, line: number): Value => {
  arity("len", args, 1, 1, line)
  const [v] = args
  if (typeof v === "string") return v.length
  if (v !== undefined && isList(v)) return v.items.length
  throw new PyError(`len() рахує довжину списку або тексту, а тут ${typeName(v ?? null)}`, line)
}

/** The values `min`, `max` and `sum` look at: one list, or the values in the brackets. */
const valuesOf = (name: string, args: ReadonlyArray<Value>, line: number): ReadonlyArray<Value> => {
  const [first] = args
  const values = args.length === 1 && first !== undefined && isList(first) ? first.items : args
  if (values.length === 0) throw new PyError(`${name}() потрібне хоча б одне значення`, line)
  return values
}

const number = (name: string, v: Value, line: number): number => {
  if (typeof v === "number") return v
  if (typeof v === "boolean") return v ? 1 : 0
  throw new PyError(`${name}() працює з числами, а тут ${typeName(v)} ${repr(v)}`, line)
}

const extreme = (name: "min" | "max") => (args: ReadonlyArray<Value>, line: number): Value =>
  valuesOf(name, args, line)
    .map((v) => number(name, v, line))
    .reduce((a, b) => (name === "min" ? Math.min(a, b) : Math.max(a, b)))

const toIntValue = (args: ReadonlyArray<Value>, line: number): Value => {
  arity("int", args, 1, 1, line)
  const [v] = args
  if (typeof v === "string") {
    const n = Number(v.trim())
    if (v.trim() === "" || !Number.isInteger(n)) {
      const hint = Number.isNaN(n) ? "" : ": це дробове число, його робить float(…)"
      throw new PyError(`int() не може зробити ціле число з тексту ${repr(v)}${hint}`, line)
    }
    return n
  }
  return Math.trunc(number("int", v ?? null, line))
}

const toFloatValue = (args: ReadonlyArray<Value>, line: number): Value => {
  arity("float", args, 1, 1, line)
  const [v] = args
  if (typeof v === "string") {
    const n = Number(v.trim())
    if (v.trim() === "" || Number.isNaN(n)) throw new PyError(`float() не може зробити число з тексту ${repr(v)}`, line)
    return n
  }
  return number("float", v ?? null, line)
}

/** A type with no function of its own in the course, such as `list`: `type([])` gives it, but it cannot be called. */
const bareType = (name: string): PyBuiltin => ({
  type: "builtin",
  name,
  call: (_args, line) => {
    throw new PyError(`${name}() у цьому курсі не викликають: це лише назва типу`, line)
  }
})

export const makeBuiltins = ({ print, input }: BuiltinIo): ReadonlyMap<string, PyBuiltin> => {
  const types = new Map<string, PyBuiltin>()
  const typeOf = (args: ReadonlyArray<Value>, line: number): Value => {
    arity("type", args, 1, 1, line)
    const name = pythonType(args[0] ?? null)
    return builtins.get(name) ?? types.get(name) ?? types.set(name, bareType(name)).get(name) ?? null
  }
  const entries: ReadonlyArray<[string, PyBuiltin["call"]]> = [
    ["range", range],
    ["len", len],
    ["print", (args) => {
      print(args.map(str).join(" "))
      return null
    }],
    ["abs", (args, line) => {
      arity("abs", args, 1, 1, line)
      return Math.abs(number("abs", args[0] ?? null, line))
    }],
    ["min", extreme("min")],
    ["max", extreme("max")],
    ["sum", (args, line) => valuesOf("sum", args, line).reduce<number>((a, v) => a + number("sum", v, line), 0)],
    ["str", (args, line) => {
      arity("str", args, 1, 1, line)
      return str(args[0] ?? null)
    }],
    ["input", (args, line) => {
      arity("input", args, 0, 1, line)
      const prompt = args.length === 0 ? "" : str(args[0] ?? null)
      const answer = input(prompt, line)
      // As in a terminal: the question and the answer typed after it stay on one line.
      print(`${prompt}${answer}`)
      return answer
    }],
    ["type", typeOf],
    ["int", toIntValue],
    ["float", toFloatValue],
    ["bool", (args, line) => {
      arity("bool", args, 1, 1, line)
      return truthy(args[0] ?? null)
    }]
  ]
  const builtins: ReadonlyMap<string, PyBuiltin> = new Map(entries.map(([name, call]) => [name, { type: "builtin", name, call }]))
  return builtins
}
