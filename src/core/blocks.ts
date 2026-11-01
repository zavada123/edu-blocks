import type { BlockName, ItemKind } from "./level.ts"

/** ID of the VM extension with the hero blocks. Opcodes in a program read `hero_move`. */
export const HERO_EXTENSION_ID = "hero"
export const HERO_COLOR = "#0FBD8C"

export type HeroBlock = Extract<BlockName, "move" | "turnLeft" | "turnRight" | "collect" | "attack" | "wallAhead" | "onCrystal" | "atFinish" | "enemyAhead" | "trapAhead">

/** Hero blocks in palette order. `boolean` blocks are the questions for «якщо» and «повторити до». */
export const HERO_BLOCKS: ReadonlyArray<{ readonly name: HeroBlock; readonly text: string; readonly boolean: boolean }> = [
  { name: "move", text: "крок уперед", boolean: false },
  { name: "turnLeft", text: "поворот ліворуч ↺", boolean: false },
  { name: "turnRight", text: "поворот праворуч ↻", boolean: false },
  { name: "collect", text: "взяти", boolean: false },
  { name: "attack", text: "вдарити ⚔", boolean: false },
  { name: "wallAhead", text: "попереду стіна?", boolean: true },
  { name: "onCrystal", text: "тут щось є?", boolean: true },
  { name: "atFinish", text: "дійшов до мети?", boolean: true },
  { name: "enemyAhead", text: "попереду ворог?", boolean: true },
  { name: "trapAhead", text: "попереду пастка?", boolean: true }
]

/**
 * What «взяти» says on a level: the hero lights a campfire and catches a fish, not «takes» them. Only the words on
 * the block change; the opcode and the rule stay the same.
 */
const COLLECT_TEXT: Readonly<Record<ItemKind, string>> = {
  crystal: "взяти",
  wood: "взяти",
  apple: "взяти",
  key: "взяти",
  fish: "зловити",
  campfire: "розпалити"
}

/** The words of the «взяти» block on a level with these items. */
export const collectText = (scene: { readonly item?: ItemKind } | undefined): string => COLLECT_TEXT[scene?.item ?? "crystal"]

/** The words of a hero block on a level: «взяти» follows the level's items. */
export const heroBlockText = (name: HeroBlock, scene?: { readonly item?: ItemKind }): string =>
  name === "collect" ? collectText(scene) : (HERO_BLOCKS.find((b) => b.name === name)?.text ?? name)

const HERO_NAMES: ReadonlySet<string> = new Set(HERO_BLOCKS.map((b) => b.name))

type ScratchBlock = Exclude<BlockName, HeroBlock | "counter" | "procedure">

const SCRATCH_OPCODES: Readonly<Record<ScratchBlock, string>> = {
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

/** The one variable of the game. Its id is fixed, so the editor, the project and the judge agree on it. */
export const COUNTER_ID = "eb-counter"
export const COUNTER_NAME = "лічильник"
export const SET_OPCODE = "data_setvariableto"
export const CHANGE_OPCODE = "data_changevariableby"
export const VARIABLE_OPCODE = "data_variable"
/** A variable reporter that the editor keeps not as a block but as `[12, name, id]`. */
export const VARIABLE_PRIMITIVE = 12

export const DEFINITION_OPCODE = "procedures_definition"
export const PROTOTYPE_OPCODE = "procedures_prototype"
export const CALL_OPCODE = "procedures_call"
export const DEFAULT_PROCEDURE = "мій блок"

/** Shadow blocks that hold the number in «повторити 10», and the text in «задати лічильник 0». */
const NUMBER_SHADOWS: ReadonlySet<string> = new Set(["math_whole_number", "math_positive_number", "math_number", "text"])

/** Blocks a palette name brings. Most names are one block; the counter and the custom block are several. */
export const opcodesOf = (name: BlockName): ReadonlyArray<string> => {
  if (name === "counter") return [SET_OPCODE, CHANGE_OPCODE, VARIABLE_OPCODE]
  if (name === "procedure") return [DEFINITION_OPCODE, PROTOTYPE_OPCODE, CALL_OPCODE]
  return [HERO_NAMES.has(name) ? `${HERO_EXTENSION_ID}_${name}` : SCRATCH_OPCODES[name as ScratchBlock]]
}

/** The block of a palette name. For the counter it is «змінити», for the custom block the call. */
export const opcodeOf = (name: BlockName): string => {
  if (name === "counter") return CHANGE_OPCODE
  if (name === "procedure") return CALL_OPCODE
  return opcodesOf(name)[0] ?? ""
}

/** Opcodes a program for this palette may contain: the palette, the start hat and number shadows. */
export const allowedOpcodes = (palette: ReadonlyArray<BlockName>): ReadonlySet<string> =>
  new Set([START_OPCODE, ...NUMBER_SHADOWS, ...palette.flatMap(opcodesOf)])

export const isNumberShadow = (opcode: string): boolean => NUMBER_SHADOWS.has(opcode)

/** The name of the custom block on this level. */
export const procedureName = (level: { readonly procedure?: string }): string => level.procedure?.trim() || DEFAULT_PROCEDURE
