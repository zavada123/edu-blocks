import {
  CALL_OPCODE,
  CHANGE_OPCODE,
  COUNTER_ID,
  COUNTER_NAME,
  DEFAULT_PROCEDURE,
  DEFINITION_OPCODE,
  opcodeOf,
  PROTOTYPE_OPCODE,
  SET_OPCODE,
  START_OPCODE,
  VARIABLE_OPCODE
} from "./blocks.ts"
import type { Sensor } from "./hero.ts"
import type { Program } from "./program.ts"
import type { Action } from "./world.ts"

/**
 * A short way to write a program in code: reference solutions of the levels and tests.
 * `buildProgram(["move", { repeat: 3, body: ["move", "collect"] }])` gives the same blocks the editor makes.
 */
export type Question =
  | Sensor
  | { readonly not: Question } | { readonly and: readonly [Question, Question] } | { readonly or: readonly [Question, Question] }

export type Step =
  | Action
  /** «повторити (лічильник)» with `repeat: "counter"`. */
  | { readonly repeat: number | "counter"; readonly body: ReadonlyArray<Step> }
  /** «задати лічильник N» and «змінити лічильник на N». */
  | { readonly set: number }
  | { readonly change: number }
  /** The custom block of the level. */
  | "call"
  | { readonly forever: ReadonlyArray<Step> }
  | { readonly until: Question; readonly body: ReadonlyArray<Step> }
  | { readonly if: Question; readonly then: ReadonlyArray<Step>; readonly else?: ReadonlyArray<Step> }

/** The custom block «визначити»: its name and what it does. */
export interface Definition {
  readonly name?: string
  readonly body: ReadonlyArray<Step>
}

/** The mutation of a custom block, as the editor keeps it. */
const mutation = (name: string, prototype: boolean): Record<string, unknown> => ({
  tagName: "mutation",
  children: [],
  proccode: name,
  argumentids: "[]",
  ...(prototype ? { argumentnames: "[]", argumentdefaults: "[]" } : {}),
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

export const buildProgram = (steps: ReadonlyArray<Step>, definition?: Definition): Program => {
  const blocks: Record<string, Block> = {}
  let counter = 0
  const add = (opcode: string, parent: string | null, extra: Partial<Block> = {}): string => {
    const id = `b${++counter}`
    blocks[id] = { opcode, next: null, parent, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra }
    return id
  }

  const question = (q: Question, parent: string): string => {
    if (typeof q === "string") return add(opcodeOf(q), parent)
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

  const procedure = definition?.name ?? DEFAULT_PROCEDURE

  /** A number slot: a shadow with the number, covered by the counter when it is `"counter"`. */
  const numberInput = (id: string, name: string, shadow: string, value: number | "counter") => {
    const number = add(shadow, id, { shadow: true, fields: { NUM: [value === "counter" ? "0" : String(value), null] } })
    if (value !== "counter") {
      blocks[id]!.inputs[name] = [1, number]
      return
    }
    const variable = add(VARIABLE_OPCODE, id, { fields: { VARIABLE: [COUNTER_NAME, COUNTER_ID] } })
    blocks[id]!.inputs[name] = [3, variable, number]
  }

  const step = (s: Step, parent: string): string => {
    if (s === "call") return add(CALL_OPCODE, parent, { mutation: mutation(procedure, false) })
    if (typeof s === "string") return add(opcodeOf(s), parent)
    if ("set" in s) {
      const id = add(SET_OPCODE, parent, { fields: { VARIABLE: [COUNTER_NAME, COUNTER_ID] } })
      blocks[id]!.inputs.VALUE = [1, add("text", id, { shadow: true, fields: { TEXT: [String(s.set), null] } })]
      return id
    }
    if ("change" in s) {
      const id = add(CHANGE_OPCODE, parent, { fields: { VARIABLE: [COUNTER_NAME, COUNTER_ID] } })
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
  if (definition !== undefined) {
    const define = add(DEFINITION_OPCODE, null, { topLevel: true, x: 360, y: 40 })
    blocks[define]!.inputs.custom_block = [1, add(PROTOTYPE_OPCODE, define, { shadow: true, mutation: mutation(procedure, true) })]
    blocks[define]!.next = stack(definition.body, define)
  }
  return blocks
}
