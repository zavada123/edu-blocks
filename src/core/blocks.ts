import type { BlockName } from "./level.ts"

/** ID of the VM extension with the hero blocks. Opcodes in a program read `hero_move`. */
export const HERO_EXTENSION_ID = "hero"
export const HERO_COLOR = "#0FBD8C"

export type HeroBlock = Extract<BlockName, "move" | "turnLeft" | "turnRight" | "collect" | "wallAhead" | "onCrystal" | "atFinish">

/** Hero blocks in palette order. `boolean` blocks are the questions for «якщо» and «повторити до». */
export const HERO_BLOCKS: ReadonlyArray<{ readonly name: HeroBlock; readonly text: string; readonly boolean: boolean }> = [
  { name: "move", text: "крок уперед", boolean: false },
  { name: "turnLeft", text: "поворот ліворуч ↺", boolean: false },
  { name: "turnRight", text: "поворот праворуч ↻", boolean: false },
  { name: "collect", text: "взяти", boolean: false },
  { name: "wallAhead", text: "попереду стіна?", boolean: true },
  { name: "onCrystal", text: "тут щось є?", boolean: true },
  { name: "atFinish", text: "дійшов до мети?", boolean: true }
]

const HERO_NAMES: ReadonlySet<string> = new Set(HERO_BLOCKS.map((b) => b.name))

const SCRATCH_OPCODES: Readonly<Record<Exclude<BlockName, HeroBlock>, string>> = {
  repeat: "control_repeat",
  forever: "control_forever",
  repeatUntil: "control_repeat_until",
  if: "control_if",
  ifElse: "control_if_else",
  not: "operator_not",
  and: "operator_and",
  or: "operator_or"
}

export const START_OPCODE = "event_whenflagclicked"

/** Shadow blocks that hold the number in «повторити 10». */
const NUMBER_SHADOWS: ReadonlySet<string> = new Set(["math_whole_number", "math_positive_number", "math_number"])

export const opcodeOf = (name: BlockName): string =>
  HERO_NAMES.has(name) ? `${HERO_EXTENSION_ID}_${name}` : SCRATCH_OPCODES[name as Exclude<BlockName, HeroBlock>]

/** Opcodes a program for this palette may contain: the palette, the start hat and number shadows. */
export const allowedOpcodes = (palette: ReadonlyArray<BlockName>): ReadonlySet<string> =>
  new Set([START_OPCODE, ...NUMBER_SHADOWS, ...palette.map(opcodeOf)])

export const isNumberShadow = (opcode: string): boolean => NUMBER_SHADOWS.has(opcode)
