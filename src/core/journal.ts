import { calledBlocks, definedBlocks, pageInfo } from "./book.ts"
import { procedureTitle } from "./blocks.ts"
import { type Amounts, farmDay, type FarmCode, type FarmProgram, type FarmReport, type FarmState, RESOURCES } from "./farm.ts"
import type { BlockName, Level } from "./level.ts"
import { checkProgram } from "./program.ts"
import { bookSignatures, programSource } from "./python/convert.ts"

/**
 * «Журнал господарства»: a record of each working day the student ended. With each day it keeps a print of the
 * program, so the journal knows when the program was rewritten and can compare the days of each program.
 */
export interface JournalEntry {
  readonly day: number
  /** What lay in the barn after the day. */
  readonly stored: Amounts
  readonly used: number
  readonly turns: number
  readonly idle: number
  readonly trips: number
  readonly goblins: number
  readonly beaten: number
  /** The turn by which the barn had 10 logs, or null when it never had. */
  readonly tenWoodAt: number | null
  readonly language: FarmProgram["language"]
  /** A short print of the program: the same print is the same program, whatever the places of its blocks. */
  readonly print: string
  /** Blocks of the program, or lines of the Python code without comments and empty lines. */
  readonly size: number
  /** The student's own blocks or functions, by their words. */
  readonly own: ReadonlyArray<string>
  /** The blocks or functions of «Книга команд» it called and did not define itself. */
  readonly book: ReadonlyArray<string>
  /** On a farm with a helper: what the helper put in the barn, a part of `stored`. */
  readonly helper?: Amounts
}

/** The days the journal keeps: older days leave it. */
export const JOURNAL_DAYS = 60

/** The logs of «Найшвидше 10 колод». */
export const TEN_WOOD = 10

/** FNV-1a, 32 bits, in hex: a print, not a secret. */
const hash = (text: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, "0")
}

const DEF = /^def\s+([^\s(]+)\s*\(/u

/** The code of a Python program without comments, empty lines and spaces at the end of lines. */
const codeLines = (source: string): ReadonlyArray<string> =>
  source
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trimEnd())
    .filter((l) => l.trim() !== "")

/** The functions a Python program calls by name: «пройти(», but not «hero.move(» or a def. */
const pythonCalls = (lines: ReadonlyArray<string>): ReadonlySet<string> =>
  new Set(lines.filter((l) => !DEF.test(l.trim())).flatMap((l) => [...l.matchAll(/(?<![.\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*)\s*\(/gu)].map((m) => m[1] ?? "")))

/** The print, size and own blocks of a program. `level` is the day it ran, `book` the words of the pages of the book. */
export const programPrint = (
  level: Level,
  code: FarmProgram,
  book: ReadonlyArray<string>
): Pick<JournalEntry, "language" | "print" | "size" | "own" | "book"> => {
  if (code.language === "python") {
    const lines = codeLines(code.source)
    const own = lines.flatMap((l) => DEF.exec(l.trim())?.[1] ?? [])
    const calls = pythonCalls(lines)
    return { language: "python", print: hash(lines.join("\n")), size: lines.length, own, book: book.filter((b) => calls.has(b) && !own.includes(b)) }
  }
  // The Python view of the blocks: it does not change when a block is only moved.
  const plain: Level = { ...level, library: [] }
  const checked = checkProgram(plain, code.program)
  const defined = definedBlocks(code.program)
  const called = calledBlocks(code.program).filter((p) => !defined.includes(p))
  return {
    language: "blocks",
    print: hash(programSource(plain, code.program)),
    size: "blocks" in checked ? checked.blocks : 0,
    own: defined.map(procedureTitle),
    book: called.map(procedureTitle).filter((name) => book.includes(name))
  }
}

/** The record of a day for the journal. */
export const journalEntry = (report: FarmReport, program: Pick<JournalEntry, "language" | "print" | "size" | "own" | "book">): JournalEntry => {
  const ten = report.byTurn.findIndex((a) => a.wood >= TEN_WOOD)
  return {
    day: report.day,
    stored: report.stored,
    used: report.used,
    turns: report.turns,
    idle: report.idle,
    trips: report.trips ?? 0,
    goblins: report.goblins,
    beaten: report.beaten,
    tenWoodAt: ten < 0 ? null : ten + 1,
    ...program,
    ...(report.workers?.[1] === undefined ? {} : { helper: report.workers[1].stored })
  }
}

/**
 * The record of a day the student ended on the farm `state`, with the program that ran: the page calls it at «Завершити
 * день», before the day changes.
 */
export const dayRecord = (state: FarmState, report: FarmReport, code: FarmCode, blocks: ReadonlyArray<BlockName>): JournalEntry => {
  const level = { ...farmDay(state, blocks, report.day), library: state.book ?? [] }
  const worker = "worker" in code ? code.worker : code
  const book =
    worker.language === "python"
      ? bookSignatures(level).map((s) => s.slice(0, s.indexOf("(")))
      : (state.book ?? []).flatMap((p) => pageInfo(p)?.name ?? [])
  const own = programPrint(level, worker, book)
  if (!("worker" in code)) return journalEntry(report, own)
  // Two programs are one program of the day: a change of either is a new one in the journal.
  const helper = programPrint(level, code.helper, book)
  return journalEntry(report, {
    ...own,
    print: hash(`${own.print}+${helper.print}`),
    size: own.size + helper.size,
    own: [...new Set([...own.own, ...helper.own])],
    book: [...new Set([...own.book, ...helper.book])]
  })
}

/** The journal with the day: a day already there is written over, and only the last `JOURNAL_DAYS` stay. */
export const writeDay = (journal: ReadonlyArray<JournalEntry>, entry: JournalEntry): ReadonlyArray<JournalEntry> =>
  [...journal.filter((e) => e.day !== entry.day), entry].sort((a, b) => a.day - b.day).slice(-JOURNAL_DAYS)

/** All that a day put in the barn. */
export const harvestOf = (entry: Pick<JournalEntry, "stored">): number => RESOURCES.reduce((sum, r) => sum + entry.stored[r], 0)

/** One program in the journal: the days in a row it ran, and what they brought on average. */
export interface ProgramRun {
  /** 1 for the first program of the journal. */
  readonly number: number
  readonly days: ReadonlyArray<number>
  readonly language: JournalEntry["language"]
  readonly size: number
  readonly own: ReadonlyArray<string>
  readonly book: ReadonlyArray<string>
  readonly harvest: number
  readonly idle: number
  readonly trips: number
}

const average = (values: ReadonlyArray<number>): number => Math.round(values.reduce((s, v) => s + v, 0) / Math.max(1, values.length))

/** The programs of the journal, in order. A program the student came back to after another counts again. */
export const programRuns = (journal: ReadonlyArray<JournalEntry>): ReadonlyArray<ProgramRun> => {
  const groups: Array<Array<JournalEntry>> = []
  for (const entry of journal) {
    const last = groups.at(-1)
    if (last !== undefined && last[0]?.print === entry.print && last[0].language === entry.language) last.push(entry)
    else groups.push([entry])
  }
  return groups.map((days, i) => {
    const first = days[0] as JournalEntry
    return {
      number: i + 1,
      days: days.map((d) => d.day),
      language: first.language,
      size: first.size,
      own: first.own,
      book: first.book,
      harvest: average(days.map(harvestOf)),
      idle: average(days.map((d) => d.idle)),
      trips: average(days.map((d) => d.trips))
    }
  })
}

/** A record of the journal: its value and the days that reached it. */
export interface JournalRecord {
  readonly value: number
  readonly days: ReadonlyArray<number>
}

export interface JournalRecords {
  readonly harvest: JournalRecord | null
  readonly tenWood: JournalRecord | null
  readonly idle: JournalRecord | null
  readonly trips: JournalRecord | null
}

const best = (journal: ReadonlyArray<JournalEntry>, value: (e: JournalEntry) => number | null, better: (a: number, b: number) => boolean): JournalRecord | null =>
  journal.reduce<JournalRecord | null>((found, e) => {
    const v = value(e)
    if (v === null) return found
    if (found === null || better(v, found.value)) return { value: v, days: [e.day] }
    return v === found.value ? { ...found, days: [...found.days, e.day] } : found
  }, null)

/** «Рекорди»: the most in the barn, the fastest 10 logs, the fewest idle turns in a whole working day, the most trips. */
export const journalRecords = (journal: ReadonlyArray<JournalEntry>): JournalRecords => ({
  harvest: best(journal, (e) => (harvestOf(e) > 0 ? harvestOf(e) : null), (a, b) => a > b),
  tenWood: best(journal, (e) => e.tenWoodAt, (a, b) => a < b),
  // Only a whole day that brought something: a program that stopped at once wastes no turn, but does no work either.
  idle: best(journal, (e) => (e.used === e.turns && harvestOf(e) > 0 ? e.idle : null), (a, b) => a < b),
  trips: best(journal, (e) => (e.trips > 0 ? e.trips : null), (a, b) => a > b)
})

/** The records the newest day set, for «Рекорд!» in the report of the day: those it reached alone. */
export const newRecords = (journal: ReadonlyArray<JournalEntry>): ReadonlyArray<keyof JournalRecords> => {
  const last = journal.at(-1)
  if (last === undefined || journal.length < 2) return []
  const records = journalRecords(journal)
  return (Object.keys(records) as Array<keyof JournalRecords>).filter((k) => {
    const r = records[k]
    return r !== null && r.days.length === 1 && r.days[0] === last.day
  })
}
