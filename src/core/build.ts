import { type HeroBlock, opcodeOf, START_OPCODE } from "./blocks.ts"
import type { Program } from "./program.ts"

/**
 * A short way to write a program in code: reference solutions of the levels and tests.
 * `buildProgram(["move", { repeat: 3, body: ["move", "collect"] }])` gives the same blocks the editor makes.
 */
export type Question = "wallAhead" | "onCrystal" | "atFinish" | "enemyAhead" | { readonly not: Question } | { readonly and: readonly [Question, Question] } | { readonly or: readonly [Question, Question] }

export type Step =
  | Exclude<HeroBlock, "wallAhead" | "onCrystal" | "atFinish" | "enemyAhead">
  | { readonly repeat: number; readonly body: ReadonlyArray<Step> }
  | { readonly forever: ReadonlyArray<Step> }
  | { readonly until: Question; readonly body: ReadonlyArray<Step> }
  | { readonly if: Question; readonly then: ReadonlyArray<Step>; readonly else?: ReadonlyArray<Step> }

type Block = {
  opcode: string
  next: string | null
  parent: string | null
  inputs: Record<string, [number, string | null]>
  fields: Record<string, [string, null]>
  shadow: boolean
  topLevel: boolean
  x?: number
  y?: number
}

export const buildProgram = (steps: ReadonlyArray<Step>): Program => {
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

  const step = (s: Step, parent: string): string => {
    if (typeof s === "string") return add(opcodeOf(s), parent)
    if ("repeat" in s) {
      const id = add("control_repeat", parent)
      const times = add("math_whole_number", id, { shadow: true, fields: { NUM: [String(s.repeat), null] } })
      blocks[id]!.inputs.TIMES = [1, times]
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
  return blocks
}
