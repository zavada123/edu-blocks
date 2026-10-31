import { PyError } from "./errors.ts"

/**
 * Splits a program into tokens, as Python does: names, numbers, texts, operators, and the line ends and indents
 * that make the blocks of Python. Inside brackets a line may go on to the next one.
 */

export type TokenKind = "name" | "keyword" | "number" | "string" | "op" | "newline" | "indent" | "dedent" | "eof"

export interface Token {
  readonly kind: TokenKind
  readonly value: string
  readonly line: number
}

export const KEYWORDS: ReadonlySet<string> = new Set([
  "if", "elif", "else", "while", "for", "in", "def", "return", "pass", "break", "continue", "and", "or", "not",
  "True", "False", "None", "global"
])

/** Python words this course does not use yet. A program with them gets a clear message, not a strange error. */
export const UNSUPPORTED: ReadonlySet<string> = new Set([
  "class", "import", "from", "try", "except", "finally", "raise", "lambda", "with", "as", "yield", "async", "await",
  "del", "assert", "nonlocal", "is"
])

/** Longest first, so `//=` is not read as `//` and `=`. */
const OPERATORS = [
  "//=", "**", "//", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "->",
  "+", "-", "*", "/", "%", "<", ">", "=", "(", ")", "[", "]", ",", ":", ".", ";"
]

const OPENING: Readonly<Record<string, string>> = { "(": ")", "[": "]" }
const CLOSING: ReadonlySet<string> = new Set([")", "]"])

const NAME_START = /[\p{L}_]/u
const NAME_PART = /[\p{L}\p{N}_]/u
const DIGIT = /[0-9]/

/** A program longer than this is refused before it runs. */
export const MAX_SOURCE_LENGTH = 20_000

const ESCAPES: Readonly<Record<string, string>> = { n: "\n", t: "\t", "\\": "\\", "'": "'", '"': '"' }

const indentOf = (text: string): number => {
  let width = 0
  for (const ch of text) {
    if (ch === " ") width++
    else if (ch === "\t") width += 4
    else break
  }
  return width
}

export const tokenize = (source: string): ReadonlyArray<Token> => {
  if (source.length > MAX_SOURCE_LENGTH) throw new PyError(`Програма задовга: більше ніж ${MAX_SOURCE_LENGTH} знаків`, 1)
  const tokens: Array<Token> = []
  const indents = [0]
  const brackets: Array<{ readonly ch: string; readonly line: number }> = []
  const lines = source.replace(/\r\n?/g, "\n").split("\n")

  lines.forEach((text, index) => {
    const line = index + 1
    const body = text.trimStart()
    if (brackets.length === 0) {
      if (body === "" || body.startsWith("#")) return
      indentLine(tokens, indents, indentOf(text), line)
    }
    scanLine(text, text.length - body.length, line, tokens, brackets)
    if (brackets.length === 0 && tokens.at(-1)?.kind !== "newline") tokens.push({ kind: "newline", value: "", line })
  })

  const open = brackets.at(-1)
  if (open !== undefined) throw new PyError(`Дужка «${open.ch}» не закрита: додай «${OPENING[open.ch]}»`, open.line)
  const last = lines.length
  while (indents.length > 1) {
    indents.pop()
    tokens.push({ kind: "dedent", value: "", line: last })
  }
  tokens.push({ kind: "eof", value: "", line: last })
  return tokens
}

const indentLine = (tokens: Array<Token>, indents: Array<number>, width: number, line: number) => {
  const current = indents.at(-1) ?? 0
  if (width > current) {
    indents.push(width)
    tokens.push({ kind: "indent", value: "", line })
    return
  }
  while (width < (indents.at(-1) ?? 0)) {
    indents.pop()
    tokens.push({ kind: "dedent", value: "", line })
  }
  if (width !== (indents.at(-1) ?? 0)) {
    throw new PyError("Відступ не збігається з жодним рядком вище: вирівняй рядок з початком блоку", line)
  }
}

const scanLine = (
  text: string,
  start: number,
  line: number,
  tokens: Array<Token>,
  brackets: Array<{ readonly ch: string; readonly line: number }>
) => {
  let i = start
  while (i < text.length) {
    const ch = text[i] ?? ""
    if (ch === " " || ch === "\t") {
      i++
      continue
    }
    if (ch === "#") return
    if (NAME_START.test(ch)) {
      let end = i + 1
      while (end < text.length && NAME_PART.test(text[end] ?? "")) end++
      const word = text.slice(i, end)
      tokens.push({ kind: KEYWORDS.has(word) ? "keyword" : "name", value: word, line })
      i = end
      continue
    }
    if (DIGIT.test(ch) || (ch === "." && DIGIT.test(text[i + 1] ?? ""))) {
      i = scanNumber(text, i, line, tokens)
      continue
    }
    if (ch === "'" || ch === '"') {
      i = scanString(text, i, line, tokens)
      continue
    }
    const op = OPERATORS.find((o) => text.startsWith(o, i))
    if (op === undefined) throw new PyError(unknownCharacter(ch), line)
    trackBracket(op, line, brackets)
    tokens.push({ kind: "op", value: op, line })
    i += op.length
  }
}

const unknownCharacter = (ch: string): string => {
  if (ch === "“" || ch === "”" || ch === "«" || ch === "»") return `Знак «${ch}» Python не знає: для тексту бери прості лапки " або '`
  if (ch === "{" || ch === "}") return "Фігурні дужки { } тут не потрібні: блок у Python задає відступ"
  return `Знак «${ch}» Python не знає`
}

const trackBracket = (op: string, line: number, brackets: Array<{ readonly ch: string; readonly line: number }>) => {
  if (OPENING[op] !== undefined) brackets.push({ ch: op, line })
  if (!CLOSING.has(op)) return
  const open = brackets.pop()
  if (open === undefined) throw new PyError(`Зайва дужка «${op}»: перед нею немає відкритої`, line)
  if (OPENING[open.ch] !== op) throw new PyError(`Дужка «${open.ch}» закривається дужкою «${OPENING[open.ch]}», а не «${op}»`, line)
}

const scanNumber = (text: string, start: number, line: number, tokens: Array<Token>): number => {
  let end = start
  while (end < text.length && /[0-9_.]/.test(text[end] ?? "")) end++
  const raw = text.slice(start, end).replaceAll("_", "")
  if (NAME_START.test(text[end] ?? "")) throw new PyError(`Ім'я не може починатися з цифри: «${text.slice(start, end + 1)}…»`, line)
  if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) throw new PyError(`Це не число: «${raw}»`, line)
  tokens.push({ kind: "number", value: raw, line })
  return end
}

const scanString = (text: string, start: number, line: number, tokens: Array<Token>): number => {
  const quote = text[start]
  let value = ""
  let i = start + 1
  while (i < text.length && text[i] !== quote) {
    const ch = text[i] ?? ""
    if (ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1] ?? ""
      value += ESCAPES[next] ?? `\\${next}`
      i += 2
      continue
    }
    value += ch
    i++
  }
  if (i >= text.length) throw new PyError(`Текст не закрито: додай ${quote} у кінці`, line)
  tokens.push({ kind: "string", value, line })
  return i + 1
}
