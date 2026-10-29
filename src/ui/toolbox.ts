import { HERO_BLOCKS, HERO_COLOR, opcodeOf } from "../core/blocks.ts"
import type { BlockName } from "../core/level.ts"

/** Palette categories with the Scratch 3 colours, so the blocks look as in the textbook. */
const CONTROL = { name: "Керування", colour: "#FFAB19", secondary: "#CF8B17" }
const OPERATORS = { name: "Оператори", colour: "#59C059", secondary: "#389438" }
const EVENTS = { name: "Події", colour: "#FFBF00", secondary: "#CC9900" }

const CONTROL_ORDER: ReadonlyArray<BlockName> = ["repeat", "forever", "repeatUntil", "if", "ifElse"]
const OPERATOR_ORDER: ReadonlyArray<BlockName> = ["not", "and", "or"]

const blockXml = (name: BlockName): string =>
  name === "repeat"
    ? `<block type="${opcodeOf(name)}"><value name="TIMES"><shadow type="math_whole_number"><field name="NUM">4</field></shadow></value></block>`
    : `<block type="${opcodeOf(name)}"/>`

const category = (id: string, c: { readonly name: string; readonly colour: string; readonly secondary: string }, blocks: string): string =>
  `<category name="${c.name}" id="${id}" colour="${c.colour}" secondaryColour="${c.secondary}">${blocks}</category>`

/**
 * Toolbox XML with only the blocks of the level. `flat` drops the category column: on a phone
 * the palette is one short scrolling list, and the program gets the width.
 */
export const toolboxXml = (palette: ReadonlyArray<BlockName>, flat = false): string => {
  const has = new Set(palette)
  const hero = HERO_BLOCKS.filter((b) => has.has(b.name))
    .map((b) => blockXml(b.name))
    .join("")
  const control = CONTROL_ORDER.filter((n) => has.has(n)).map(blockXml).join("")
  const operators = OPERATOR_ORDER.filter((n) => has.has(n)).map(blockXml).join("")
  if (flat) return `<xml style="display: none">${hero}${control}${operators}<block type="event_whenflagclicked"/></xml>`
  return [
    "<xml style=\"display: none\">",
    category("hero", { name: "Робот", colour: HERO_COLOR, secondary: "#0B8E69" }, hero),
    control === "" ? "" : category("control", CONTROL, control),
    operators === "" ? "" : category("operators", OPERATORS, operators),
    category("events", EVENTS, '<block type="event_whenflagclicked"/>'),
    "</xml>"
  ].join("")
}
