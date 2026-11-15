import {
  ARGUMENT_OPCODE,
  CALL_OPCODE,
  CHANGE_OPCODE,
  comparisonOfOpcode,
  COUNTER_ID,
  DEFINITION_OPCODE,
  ITEM_FIELD,
  itemOfField,
  opcodeOf,
  procedureTitle,
  SET_OPCODE,
  START_OPCODE,
  stockOfField,
  VARIABLE_OPCODE,
  VARIABLE_PRIMITIVE
} from "./blocks.ts"
import type { Amount, Compare } from "./build.ts"
import { actionOfOpcode, type Sensor, sensorOfOpcode } from "./hero.ts"
import { MAX_PROGRAM_BLOCKS, type Program } from "./program.ts"
import type { Action, ItemKind } from "./world.ts"

/**
 * Reads a program of the editor back into steps, as `build.ts` writes them: for the Python view under the blocks.
 * Unlike a `Step`, a condition slot can be empty (`null`, which Scratch reads as false), and a call always names its
 * custom block. Blocks that do not run (outside every script) are left out.
 */

export type Condition = Sensor | { readonly itemIs: ItemKind } | Compare | { readonly not: Slot } | { readonly and: readonly [Slot, Slot] } | { readonly or: readonly [Slot, Slot] }
/** A condition slot: empty when the student has not put a question into it. */
export type Slot = Condition | null

export type ReadStep =
  | Action
  /** A custom block by its words without the slots («пройти»), with a value for each parameter. */
  | { readonly call: string; readonly args: ReadonlyArray<Amount> }
  | { readonly repeat: Amount; readonly body: ReadonlyArray<ReadStep> }
  /** `variable` names a variable the student made; without it, the counter. */
  | { readonly set: Amount; readonly variable?: string }
  | { readonly change: Amount; readonly variable?: string }
  | { readonly forever: ReadonlyArray<ReadStep> }
  | { readonly until: Slot; readonly body: ReadonlyArray<ReadStep> }
  | { readonly if: Slot; readonly then: ReadonlyArray<ReadStep>; readonly else?: ReadonlyArray<ReadStep> }

export interface ReadDefinition {
  /** The words of the block without its slots: «пройти». */
  readonly name: string
  /** The names of its number parameters. */
  readonly params: ReadonlyArray<string>
  readonly body: ReadonlyArray<ReadStep>
}

export interface ReadProgram {
  /** Each «коли прапорець натиснуто» script, in the order of the program. */
  readonly scripts: ReadonlyArray<ReadonlyArray<ReadStep>>
  /** Each «визначити» with its name, the first one of a name only (the VM runs that one). */
  readonly definitions: ReadonlyArray<ReadDefinition>
}

interface Block {
  readonly opcode: string
  readonly next: unknown
  readonly inputs: Readonly<Record<string, unknown>>
  readonly fields: Readonly<Record<string, unknown>>
  readonly mutation: unknown
  readonly topLevel: unknown
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Scratch reads a text that is not a number as 0; a count is rounded. */
const numberOf = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export const readProgram = (program: Program): ReadProgram => {
  const blockAt = (id: unknown): Block | null => {
    if (typeof id !== "string" || !Object.hasOwn(program, id)) return null
    const b = program[id]
    if (!isRecord(b) || typeof b.opcode !== "string") return null
    return {
      opcode: b.opcode,
      next: b.next,
      inputs: isRecord(b.inputs) ? b.inputs : {},
      fields: isRecord(b.fields) ? b.fields : {},
      mutation: b.mutation,
      topLevel: b.topLevel
    }
  }
  const inputOf = (block: Block, name: string): unknown => {
    const input = block.inputs[name]
    return Array.isArray(input) ? input[1] : null
  }
  const proccodeOf = (block: Block | null): string | null =>
    block !== null && isRecord(block.mutation) && typeof block.mutation.proccode === "string" ? block.mutation.proccode : null
  /** A list the mutation keeps as JSON text: the argument ids or names. */
  const listOf = (block: Block | null, key: string): ReadonlyArray<string> => {
    const text = block !== null && isRecord(block.mutation) ? block.mutation[key] : undefined
    try {
      const list: unknown = typeof text === "string" ? JSON.parse(text) : []
      return Array.isArray(list) ? list.map(String) : []
    } catch {
      return []
    }
  }
  /** A variable field `[name, id]`: the counter or a variable the student made. */
  const variableOf = (field: unknown): Amount => {
    const [name, id] = Array.isArray(field) ? field : []
    return id === COUNTER_ID ? "counter" : { variable: String(name ?? "") }
  }
  /** The variable a «задати» or «змінити» sets: nothing for the counter. */
  const target = (block: Block): { readonly variable?: string } => {
    const v = variableOf(block.fields.VARIABLE)
    return typeof v === "object" && "variable" in v ? { variable: v.variable } : {}
  }

  // A damaged program can link blocks in a circle: each block is read once.
  const seen = new Set<string>()
  const visit = (id: unknown): Block | null => {
    if (typeof id !== "string" || seen.has(id) || seen.size > MAX_PROGRAM_BLOCKS) return null
    seen.add(id)
    return blockAt(id)
  }

  const slot = (ref: unknown): Slot => {
    const block = visit(ref)
    if (block === null) return null
    const sensor = sensorOfOpcode(block.opcode)
    if (sensor !== undefined) return sensor
    if (block.opcode === opcodeOf("itemIs")) return { itemIs: itemOfField(block.fields[ITEM_FIELD]) }
    const comparison = comparisonOfOpcode(block.opcode)
    if (comparison !== undefined) return { compare: comparison, of: [amount(inputOf(block, "OPERAND1")), amount(inputOf(block, "OPERAND2"))] }
    if (block.opcode === "operator_not") return { not: slot(inputOf(block, "OPERAND")) }
    const pair = (): readonly [Slot, Slot] => [slot(inputOf(block, "OPERAND1")), slot(inputOf(block, "OPERAND2"))]
    if (block.opcode === "operator_and") return { and: pair() }
    if (block.opcode === "operator_or") return { or: pair() }
    return null
  }

  const amount = (ref: unknown): Amount => {
    if (Array.isArray(ref)) return ref[0] === VARIABLE_PRIMITIVE ? variableOf([ref[1], ref[2]]) : numberOf(ref[1])
    const block = visit(ref)
    if (block === null) return 0
    if (block.opcode === VARIABLE_OPCODE) return variableOf(block.fields.VARIABLE)
    if (block.opcode === opcodeOf("stock")) return { stock: stockOfField(block.fields[ITEM_FIELD]) }
    if (block.opcode === ARGUMENT_OPCODE) {
      const field = block.fields.VALUE
      return { param: String(Array.isArray(field) ? field[0] : "") }
    }
    const field = block.fields.NUM ?? block.fields.TEXT
    return Array.isArray(field) ? numberOf(field[0]) : 0
  }

  const stack = (first: unknown): Array<ReadStep> => {
    const steps: Array<ReadStep> = []
    for (let block = visit(first); block !== null; block = visit(block.next)) {
      const s = stepOf(block)
      if (s !== null) steps.push(s)
    }
    return steps
  }

  const stepOf = (block: Block): ReadStep | null => {
    const action = actionOfOpcode(block.opcode)
    if (action !== undefined) return action
    switch (block.opcode) {
      case "control_repeat": {
        const times = amount(inputOf(block, "TIMES"))
        return { repeat: typeof times === "number" ? Math.max(0, Math.round(times)) : times, body: stack(inputOf(block, "SUBSTACK")) }
      }
      case "control_forever":
        return { forever: stack(inputOf(block, "SUBSTACK")) }
      case "control_repeat_until":
        return { until: slot(inputOf(block, "CONDITION")), body: stack(inputOf(block, "SUBSTACK")) }
      case "control_if":
        return { if: slot(inputOf(block, "CONDITION")), then: stack(inputOf(block, "SUBSTACK")) }
      case "control_if_else":
        return { if: slot(inputOf(block, "CONDITION")), then: stack(inputOf(block, "SUBSTACK")), else: stack(inputOf(block, "SUBSTACK2")) }
      case SET_OPCODE:
        return { set: amount(inputOf(block, "VALUE")), ...target(block) }
      case CHANGE_OPCODE:
        return { change: amount(inputOf(block, "VALUE")), ...target(block) }
      case CALL_OPCODE:
        return { call: procedureTitle(proccodeOf(block) ?? ""), args: listOf(block, "argumentids").map((id) => amount(inputOf(block, id))) }
      default:
        return null
    }
  }

  const tops = Object.keys(program).flatMap((id) => {
    const block = blockAt(id)
    return block !== null && block.topLevel === true ? [{ id, block }] : []
  })
  const scripts = tops
    .filter((t) => t.block.opcode === START_OPCODE)
    .map((t) => {
      seen.add(t.id)
      return stack(t.block.next)
    })
  const definitions: Array<ReadDefinition & { readonly proccode: string }> = []
  for (const t of tops) {
    if (t.block.opcode !== DEFINITION_OPCODE) continue
    const prototype = blockAt(inputOf(t.block, "custom_block"))
    const proccode = proccodeOf(prototype)
    if (proccode === null || definitions.some((d) => d.proccode === proccode)) continue
    seen.add(t.id)
    definitions.push({ proccode, name: procedureTitle(proccode), params: listOf(prototype, "argumentnames"), body: stack(t.block.next) })
  }
  return { scripts, definitions: definitions.map(({ proccode: _, ...d }) => d) }
}
