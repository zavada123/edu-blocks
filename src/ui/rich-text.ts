/**
 * Markup for task and hint texts. The same file is in every eduprostir trainer (edu-* repositories and
 * mriya-study). Keep the copies the same; the convention is in mriya-study docs/trainer-text-markup.md.
 *
 *   **Створити**        name of a button, menu, field, tab or window: bold, in the accent color
 *   [k]Ctrl+C[/k]       keys: each key is a keyboard key, «+» between them
 *   `=SUM(A1:A3)`       text to type exactly: formula, code, name
 *   [red]червоний[/red] a term in its color: red, green, blue, yellow, orange, purple
 *   «Тварини»           name of a folder, file, sheet, site or other object: highlighted, the quotes stay
 *
 * The parser makes plain parts. It never makes HTML from the text, so a text cannot add tags or scripts.
 * Markup does not nest. A mark without its end stays as plain text.
 */

export const RichColors = { Red: "red", Green: "green", Blue: "blue", Yellow: "yellow", Orange: "orange", Purple: "purple" } as const
export type RichColor = (typeof RichColors)[keyof typeof RichColors]

export type RichPart =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "ui"; readonly text: string }
  | { readonly kind: "keys"; readonly keys: ReadonlyArray<string> }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "name"; readonly text: string }
  | { readonly kind: "color"; readonly color: RichColor; readonly text: string }

const MARK = /\*\*(.+?)\*\*|\[k\](.+?)\[\/k\]|`([^`]+)`|\[(red|green|blue|yellow|orange|purple)\](.+?)\[\/\4\]|«([^«»\n]+)»/g

const isRichColor = (value: string): value is RichColor => Object.values(RichColors).some((c) => c === value)

/** «Ctrl+Shift+S» → ["Ctrl", "Shift", "S"]; «Ctrl++» → ["Ctrl", "+"]. */
export const splitKeys = (keys: string): ReadonlyArray<string> =>
  keys
    .split(/(?<=\S)\s*\+\s*(?=\S)/)
    .map((k) => k.trim())
    .filter((k) => k !== "")

const markPart = (m: RegExpExecArray): RichPart => {
  const [, ui, keys, code, color, colored, name] = m
  if (ui !== undefined) return { kind: "ui", text: ui }
  if (keys !== undefined) return { kind: "keys", keys: splitKeys(keys) }
  if (code !== undefined) return { kind: "code", text: code }
  if (color !== undefined && colored !== undefined && isRichColor(color)) return { kind: "color", color, text: colored }
  if (name !== undefined) return { kind: "name", text: name }
  return { kind: "text", text: m[0] }
}

/** Splits a text with markup into parts. Text without markup gives one "text" part. */
export const parseRich = (source: string): ReadonlyArray<RichPart> => {
  const parts: Array<RichPart> = []
  let last = 0
  for (const m of source.matchAll(MARK)) {
    const at = m.index
    if (at > last) parts.push({ kind: "text", text: source.slice(last, at) })
    parts.push(markPart(m))
    last = at + m[0].length
  }
  if (last < source.length) parts.push({ kind: "text", text: source.slice(last) })
  return parts
}

const partText = (part: RichPart): string => {
  if (part.kind === "keys") return part.keys.join("+")
  if (part.kind === "name") return `«${part.text}»`
  return part.text
}

/** The text without markup: for aria-label, title, alt, comparisons and logs. */
export const plainText = (source: string): string => parseRich(source).map(partText).join("")
