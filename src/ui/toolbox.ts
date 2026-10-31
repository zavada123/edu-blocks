import {
  CALL_OPCODE,
  CHANGE_OPCODE,
  COUNTER_ID,
  COUNTER_NAME,
  DEFAULT_PROCEDURE,
  DEFINITION_OPCODE,
  HERO_BLOCKS,
  HERO_COLOR,
  opcodeOf,
  PROTOTYPE_OPCODE,
  SET_OPCODE,
  VARIABLE_OPCODE
} from "../core/blocks.ts"
import type { BlockName } from "../core/level.ts"

/** Palette categories with the Scratch 3 colours, so the blocks look as in the textbook. */
const CONTROL = { name: "Керування", colour: "#FFAB19", secondary: "#CF8B17" }
const OPERATORS = { name: "Оператори", colour: "#59C059", secondary: "#389438" }
const VARIABLES = { name: "Змінні", colour: "#FF8C1A", secondary: "#DB6E00" }
const MY_BLOCKS = { name: "Мої блоки", colour: "#FF6680", secondary: "#FF4D6A" }
const EVENTS = { name: "Події", colour: "#FFBF00", secondary: "#CC9900" }

const CONTROL_ORDER: ReadonlyArray<BlockName> = ["repeat", "forever", "repeatUntil", "if", "ifElse"]
const OPERATOR_ORDER: ReadonlyArray<BlockName> = ["not", "and", "or"]

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")

const blockXml = (name: BlockName): string =>
  name === "repeat"
    ? `<block type="${opcodeOf(name)}"><value name="TIMES"><shadow type="math_whole_number"><field name="NUM">4</field></shadow></value></block>`
    : `<block type="${opcodeOf(name)}"/>`

const counterField = `<field name="VARIABLE" id="${COUNTER_ID}" variabletype="">${COUNTER_NAME}</field>`

/** «задати лічильник 0», «змінити лічильник на 1» and the (лічильник) reporter. */
const counterXml = [
  `<block type="${SET_OPCODE}">${counterField}<value name="VALUE"><shadow type="text"><field name="TEXT">0</field></shadow></value></block>`,
  `<block type="${CHANGE_OPCODE}">${counterField}<value name="VALUE"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>`,
  `<block type="${VARIABLE_OPCODE}">${counterField}</block>`
].join("")

/** The «визначити» hat of the level's custom block and its call. The student does not make new ones. */
const procedureXml = (name: string): string => {
  const proccode = escapeXml(name)
  const prototype = `<mutation proccode="${proccode}" argumentids="[]" argumentnames="[]" argumentdefaults="[]" warp="false"/>`
  return [
    `<block type="${DEFINITION_OPCODE}"><statement name="custom_block"><shadow type="${PROTOTYPE_OPCODE}">${prototype}</shadow></statement></block>`,
    `<block type="${CALL_OPCODE}"><mutation proccode="${proccode}" argumentids="[]" warp="false"/></block>`
  ].join("")
}

const category = (id: string, c: { readonly name: string; readonly colour: string; readonly secondary: string }, blocks: string): string =>
  `<category name="${c.name}" id="${id}" colour="${c.colour}" secondaryColour="${c.secondary}">${blocks}</category>`

/**
 * Toolbox XML with only the blocks of the level. `flat` drops the category column: on a phone
 * the palette is one short scrolling list, and the program gets the width.
 */
export const toolboxXml = (palette: ReadonlyArray<BlockName>, flat = false, procedure = DEFAULT_PROCEDURE): string => {
  const has = new Set(palette)
  const hero = HERO_BLOCKS.filter((b) => has.has(b.name))
    .map((b) => blockXml(b.name))
    .join("")
  const control = CONTROL_ORDER.filter((n) => has.has(n)).map(blockXml).join("")
  const operators = OPERATOR_ORDER.filter((n) => has.has(n)).map(blockXml).join("")
  const variables = has.has("counter") ? counterXml : ""
  const myBlocks = has.has("procedure") ? procedureXml(procedure) : ""
  if (flat) return `<xml style="display: none">${hero}${control}${operators}${variables}${myBlocks}<block type="event_whenflagclicked"/></xml>`
  return [
    "<xml style=\"display: none\">",
    category("hero", { name: "Герой", colour: HERO_COLOR, secondary: "#0B8E69" }, hero),
    control === "" ? "" : category("control", CONTROL, control),
    operators === "" ? "" : category("operators", OPERATORS, operators),
    variables === "" ? "" : category("variables", VARIABLES, variables),
    myBlocks === "" ? "" : category("myBlocks", MY_BLOCKS, myBlocks),
    category("events", EVENTS, '<block type="event_whenflagclicked"/>'),
    "</xml>"
  ].join("")
}
