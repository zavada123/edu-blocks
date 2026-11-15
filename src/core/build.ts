import {
  ARGUMENT_OPCODE,
  CALL_OPCODE,
  type Comparison,
  COMPARISON_OPCODES,
  CHANGE_OPCODE,
  COUNTER_ID,
  COUNTER_NAME,
  DEFAULT_PROCEDURE,
  DEFINITION_OPCODE,
  ITEM_FIELD,
  opcodeOf,
  PROTOTYPE_OPCODE,
  SET_OPCODE,
  START_OPCODE,
  VARIABLE_OPCODE
} from "./blocks.ts"
import type { Sensor } from "./hero.ts"
import type { Program } from "./program.ts"
import type { Action, ItemKind, StockKind } from "./world.ts"

/**
 * A short way to write a program in code: reference solutions of the levels and tests.
 * `buildProgram(["move", { repeat: 3, body: ["move", "collect"] }])` gives the same blocks the editor makes.
 */
export type Question =
  | Sensor
  /** «тут ‹морква›?» */
  | { readonly itemIs: ItemKind }
  | { readonly not: Question } | { readonly and: readonly [Question, Question] } | { readonly or: readonly [Question, Question] }
  /** ‹ (скільки колод у коморі) > 2 ›: two numbers compared. */
  | Compare

/** Two number slots compared: «>», «<» or «=». */
export interface Compare {
  readonly compare: Comparison
  readonly of: readonly [Amount, Amount]
}

/**
 * A number slot: a number, the counter, a variable the student made («Створити змінну»), a parameter of the custom
 * block it is in, or «скільки ‹…› у коморі».
 */
export type Amount = number | "counter" | { readonly variable: string } | { readonly param: string } | { readonly stock: StockKind }

export type Step =
  | Action
  /** «повторити (лічильник)» with `repeat: "counter"`. */
  | { readonly repeat: Amount; readonly body: ReadonlyArray<Step> }
  /** «задати лічильник N» and «змінити лічильник на N»; with `variable`, a variable the student made. */
  | { readonly set: number; readonly variable?: string }
  | { readonly change: Amount; readonly variable?: string }
  /** The custom block of the level. */
  | "call"
  /** A custom block by name, with a value for each of its parameters. */
  | { readonly call: string; readonly args: ReadonlyArray<Amount> }
  | { readonly forever: ReadonlyArray<Step> }
  | { readonly until: Question; readonly body: ReadonlyArray<Step> }
  | { readonly if: Question; readonly then: ReadonlyArray<Step>; readonly else?: ReadonlyArray<Step> }

/** The custom block «визначити»: its name and what it does. */
export interface Definition {
  readonly name?: string
  /** Number parameters: «пройти (кроки)» has `["кроки"]`. */
  readonly params?: ReadonlyArray<string>
  readonly body: ReadonlyArray<Step>
}

/** The words of a custom block with a slot for each parameter, as Scratch keeps them: «пройти %s». */
export const proccodeOf = (name: string, params: ReadonlyArray<string> = []): string => [name, ...params.map(() => "%s")].join(" ")

/** The id of a variable the student made, as the tests and solutions write it. */
export const variableId = (name: string): string => `eb-var-${name}`

/** The mutation of a custom block, as the editor keeps it. */
const mutation = (proccode: string, ids: ReadonlyArray<string>, prototype: false | ReadonlyArray<string>): Record<string, unknown> => ({
  tagName: "mutation",
  children: [],
  proccode,
  argumentids: JSON.stringify(ids),
  ...(prototype === false ? {} : { argumentnames: JSON.stringify(prototype), argumentdefaults: JSON.stringify(prototype.map(() => "")) }),
  warp: "false"
})

type Block = {
  opcode: string
  next: string | null
  parent: string | null
  inputs: Record<string, [number, string | null] | [number, string, string]>
  fields: Record<string, [string, string | null]>
  mutation?: Record<string, unknown>
  shadow: boolean
  topLevel: boolean
  x?: number
  y?: number
}

/** The program of `steps`, with one custom block or several (`definition`). */
export const buildProgram = (steps: ReadonlyArray<Step>, definition?: Definition | ReadonlyArray<Definition>): Program => {
  const defs: ReadonlyArray<Definition> = definition === undefined ? [] : "body" in definition ? [definition] : definition
  const blocks: Record<string, Block> = {}
  let counter = 0
  const add = (opcode: string, parent: string | null, extra: Partial<Block> = {}): string => {
    const id = `b${++counter}`
    blocks[id] = { opcode, next: null, parent, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra }
    return id
  }

  const question = (q: Question, parent: string): string => {
    if (typeof q === "string") return add(opcodeOf(q), parent)
    if ("itemIs" in q) return add(opcodeOf("itemIs"), parent, { fields: { [ITEM_FIELD]: [q.itemIs, null] } })
    if ("compare" in q) {
      const id = add(COMPARISON_OPCODES[q.compare], parent)
      numberInput(id, "OPERAND1", "text", q.of[0])
      numberInput(id, "OPERAND2", "text", q.of[1])
      return id
    }
    if ("not" in q) {
      const id = add("operator_not", parent)
      blocks[id]!.inputs.OPERAND = [2, question(q.not, id)]
      return id
    }
    const [a, b] = "and" in q ? q.and : q.or
    const id = add("and" in q ? "operator_and" : "operator_or", parent)
    blocks[id]!.inputs.OPERAND1 = [2, question(a, id)]
    blocks[id]!.inputs.OPERAND2 = [2, question(b, id)]
    return id
  }

  const stack = (list: ReadonlyArray<Step>, parent: string): string | null => {
    let first: string | null = null
    let prev: string | null = null
    for (const s of list) {
      const id = step(s, prev ?? parent)
      if (prev === null) first = id
      else blocks[prev]!.next = id
      prev = id
    }
    return first
  }

  const substack = (id: string, name: string, list: ReadonlyArray<Step>) => {
    const first = stack(list, id)
    if (first !== null) blocks[id]!.inputs[name] = [2, first]
  }

  const procedure = defs[0]?.name ?? DEFAULT_PROCEDURE
  /** The argument ids of each custom block by its name: the call and the «визначити» must agree. */
  const argumentIds = new Map(defs.map((d, i) => [d.name ?? DEFAULT_PROCEDURE, (d.params ?? []).map((_, j) => `eb-arg-${i}-${j}`)]))
  const paramsOf = new Map(defs.map((d) => [d.name ?? DEFAULT_PROCEDURE, d.params ?? []]))

  const variableField = (name: string | undefined): [string, string] => (name === undefined ? [COUNTER_NAME, COUNTER_ID] : [name, variableId(name)])

  /** A number slot: a shadow with the number, covered by the counter, a variable or a parameter. */
  const numberInput = (id: string, name: string, shadow: string, value: Amount) => {
    const number = add(shadow, id, { shadow: true, fields: { [shadow === "text" ? "TEXT" : "NUM"]: [typeof value === "number" ? String(value) : "0", null] } })
    if (typeof value === "number") {
      blocks[id]!.inputs[name] = [1, number]
      return
    }
    const reporter =
      value === "counter"
        ? add(VARIABLE_OPCODE, id, { fields: { VARIABLE: variableField(undefined) } })
        : "param" in value
          ? add(ARGUMENT_OPCODE, id, { fields: { VALUE: [value.param, null] } })
          : "stock" in value
            ? add(opcodeOf("stock"), id, { fields: { [ITEM_FIELD]: [value.stock, null] } })
            : add(VARIABLE_OPCODE, id, { fields: { VARIABLE: variableField(value.variable) } })
    blocks[id]!.inputs[name] = [3, reporter, number]
  }

  const call = (name: string, args: ReadonlyArray<Amount>, parent: string): string => {
    const ids = argumentIds.get(name) ?? []
    const id = add(CALL_OPCODE, parent, { mutation: mutation(proccodeOf(name, paramsOf.get(name) ?? []), ids, false) })
    ids.forEach((argId, i) => numberInput(id, argId, "text", args[i] ?? 0))
    return id
  }

  const step = (s: Step, parent: string): string => {
    if (s === "call") return call(procedure, [], parent)
    if (typeof s === "string") return add(opcodeOf(s), parent)
    if ("call" in s) return call(s.call, s.args, parent)
    if ("set" in s) {
      const id = add(SET_OPCODE, parent, { fields: { VARIABLE: variableField(s.variable) } })
      blocks[id]!.inputs.VALUE = [1, add("text", id, { shadow: true, fields: { TEXT: [String(s.set), null] } })]
      return id
    }
    if ("change" in s) {
      const id = add(CHANGE_OPCODE, parent, { fields: { VARIABLE: variableField(s.variable) } })
      numberInput(id, "VALUE", "math_number", s.change)
      return id
    }
    if ("repeat" in s) {
      const id = add("control_repeat", parent)
      numberInput(id, "TIMES", "math_whole_number", s.repeat)
      substack(id, "SUBSTACK", s.body)
      return id
    }
    if ("forever" in s) {
      const id = add("control_forever", parent)
      substack(id, "SUBSTACK", s.forever)
      return id
    }
    if ("until" in s) {
      const id = add("control_repeat_until", parent)
      blocks[id]!.inputs.CONDITION = [2, question(s.until, id)]
      substack(id, "SUBSTACK", s.body)
      return id
    }
    const id = add(s.else === undefined ? "control_if" : "control_if_else", parent)
    blocks[id]!.inputs.CONDITION = [2, question(s.if, id)]
    substack(id, "SUBSTACK", s.then)
    if (s.else !== undefined) substack(id, "SUBSTACK2", s.else)
    return id
  }

  const start = add(START_OPCODE, null, { topLevel: true, x: 40, y: 40 })
  const first = stack(steps, start)
  blocks[start]!.next = first
  defs.forEach((d, i) => {
    const name = d.name ?? DEFAULT_PROCEDURE
    const params = d.params ?? []
    const ids = argumentIds.get(name) ?? []
    const define = add(DEFINITION_OPCODE, null, { topLevel: true, x: 360, y: 40 + 300 * i })
    const prototype = add(PROTOTYPE_OPCODE, define, { shadow: true, mutation: mutation(proccodeOf(name, params), ids, params) })
    ids.forEach((argId, j) => {
      blocks[prototype]!.inputs[argId] = [1, add(ARGUMENT_OPCODE, prototype, { shadow: true, fields: { VALUE: [params[j] ?? "", null] } })]
    })
    blocks[define]!.inputs.custom_block = [1, prototype]
    blocks[define]!.next = stack(d.body, define)
  })
  return blocks
}
