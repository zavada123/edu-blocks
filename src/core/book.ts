import { CALL_OPCODE, DEFINITION_OPCODE, PROTOTYPE_OPCODE, procedureTitle, VARIABLE_PRIMITIVE } from "./blocks.ts"
import { type Program, programVariables } from "./program.ts"

/**
 * «Книга команд»: own blocks the student keeps from day to day. A page is the «визначити» script of one own block, as
 * the editor keeps it (block id → block). A program calls a block of the book without defining it: before a run the
 * pages join the program (`withLibrary`), and a «визначити» of the same block in the program wins over its page, as a
 * copy taken for editing does.
 */
export type BookPage = Program

/** Pages a new book has. */
export const BOOK_PAGES = 3

/** The start of the ids the blocks of a page get in a run: `eb-book-2-…` is a block of the third page. */
export const BOOK_ID_PREFIX = "eb-book-"

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value)

const opcodeOf = (block: unknown): string | null => (isRecord(block) && typeof block.opcode === "string" ? block.opcode : null)

/** The block ids an input holds: the block in it and its shadow. */
const inputIds = (input: unknown): ReadonlyArray<string> =>
  Array.isArray(input) ? input.slice(1).filter((x): x is string => typeof x === "string") : []

/** The prototype of a «визначити»: the block in its `custom_block` input. */
const prototypeOf = (program: Program, definition: unknown): Readonly<Record<string, unknown>> | null => {
  if (!isRecord(definition) || !isRecord(definition.inputs)) return null
  const id = inputIds(definition.inputs.custom_block)[0]
  const prototype = id === undefined ? undefined : program[id]
  return isRecord(prototype) && prototype.opcode === PROTOTYPE_OPCODE ? prototype : null
}

const proccodeIn = (block: Readonly<Record<string, unknown>> | null): string | null =>
  block !== null && isRecord(block.mutation) && typeof block.mutation.proccode === "string" ? block.mutation.proccode : null

const listIn = (block: Readonly<Record<string, unknown>> | null, key: string): ReadonlyArray<string> => {
  const text = block !== null && isRecord(block.mutation) ? block.mutation[key] : undefined
  if (typeof text !== "string") return []
  try {
    const list: unknown = JSON.parse(text)
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

/** The «визначити» hats of a program, by the proccode of their block, the first one of each. */
const definitionsOf = (program: Program): ReadonlyMap<string, string> => {
  const found = new Map<string, string>()
  for (const [id, block] of Object.entries(program)) {
    if (opcodeOf(block) !== DEFINITION_OPCODE) continue
    const proccode = proccodeIn(prototypeOf(program, block))
    if (proccode !== null && !found.has(proccode)) found.set(proccode, id)
  }
  return found
}

/** The own blocks a program defines, by proccode («пройти %s»). */
export const definedBlocks = (program: Program): ReadonlyArray<string> => [...definitionsOf(program).keys()]

/** The own blocks a program calls, by proccode, each once. */
export const calledBlocks = (program: Program): ReadonlyArray<string> => [
  ...new Set(
    Object.values(program)
      .filter((b) => opcodeOf(b) === CALL_OPCODE)
      .map((b) => proccodeIn(b as Readonly<Record<string, unknown>>))
      .filter((p): p is string => p !== null)
  )
]

/** A page as the book shows it: the proccode of its block, its words and its parameters. */
export interface PageInfo {
  readonly proccode: string
  /** The words of the block without its slots: «пройти». */
  readonly name: string
  readonly params: ReadonlyArray<string>
  /** The ids of its parameters, as a call of the block names its slots. */
  readonly ids: ReadonlyArray<string>
}

/** What a page holds, or null when it holds no «визначити» (stored data can be anything). */
export const pageInfo = (page: BookPage): PageInfo | null => {
  const [entry] = definitionsOf(page)
  if (entry === undefined) return null
  const [proccode, id] = entry
  const prototype = prototypeOf(page, page[id])
  return { proccode, name: procedureTitle(proccode), params: listIn(prototype, "argumentnames"), ids: listIn(prototype, "argumentids") }
}

/** The pages of a book that hold a block, each block once: what stored data keeps of a book. */
export const cleanBook = (book: ReadonlyArray<BookPage>): ReadonlyArray<BookPage> => {
  const seen = new Set<string>()
  return book.filter((page) => {
    const info = pageInfo(page)
    if (info === null || seen.has(info.proccode)) return false
    seen.add(info.proccode)
    return true
  })
}

/** The «визначити» script of one own block of a program, as a page: the hat and every block under and inside it. */
export const pageOf = (program: Program, proccode: string): BookPage | null => {
  const start = definitionsOf(program).get(proccode)
  if (start === undefined) return null
  const page: Record<string, unknown> = {}
  const visit = (id: unknown) => {
    if (typeof id !== "string" || Object.hasOwn(page, id) || !Object.hasOwn(program, id)) return
    const block = program[id]
    page[id] = block
    if (!isRecord(block)) return
    visit(block.next)
    if (isRecord(block.inputs)) for (const input of Object.values(block.inputs)) for (const inner of inputIds(input)) visit(inner)
  }
  visit(start)
  return page
}

/** The book with `page`: it takes the place of the page of the same block, or a free page. Null when the book is full. */
export const writePage = (book: ReadonlyArray<BookPage>, page: BookPage, size: number): ReadonlyArray<BookPage> | null => {
  const proccode = pageInfo(page)?.proccode
  if (proccode === undefined) return null
  const at = book.findIndex((p) => pageInfo(p)?.proccode === proccode)
  if (at >= 0) return book.map((p, i) => (i === at ? page : p))
  return book.length < size ? [...book, page] : null
}

/** The book without the page of a block. */
export const tearPage = (book: ReadonlyArray<BookPage>, proccode: string): ReadonlyArray<BookPage> =>
  book.filter((p) => pageInfo(p)?.proccode !== proccode)

/** The pages a program uses from the book: those of blocks it calls and does not define itself. */
export const pagesUsed = (program: Program, book: ReadonlyArray<BookPage>): ReadonlyArray<PageInfo> => {
  const own = new Set(definedBlocks(program))
  const called = new Set(calledBlocks(program))
  return book.map(pageInfo).filter((p): p is PageInfo => p !== null && called.has(p.proccode) && !own.has(p.proccode))
}

/**
 * The program with the pages of the book it does not define itself, ready to run. The blocks of a page get ids of their
 * own, so they never meet the ids of the program, and a variable of a page is the program's variable of that name.
 */
export const withLibrary = (program: Program, book: ReadonlyArray<BookPage> | undefined): Program => {
  if (book === undefined || book.length === 0) return program
  const own = new Set(definedBlocks(program))
  const variableIds = new Map(programVariables(program).map((v) => [v.name, v.id]))
  const joined: Record<string, unknown> = { ...program }
  book.forEach((page, i) => {
    const info = pageInfo(page)
    if (info === null || own.has(info.proccode)) return
    own.add(info.proccode)
    const idOf = (id: string) => (Object.hasOwn(page, id) ? `${BOOK_ID_PREFIX}${i}-${id}` : id)
    const variable = (name: unknown, id: unknown): unknown => (typeof name === "string" ? (variableIds.get(name) ?? id) : id)
    const input = (value: unknown): unknown => {
      if (!Array.isArray(value)) return value
      return value.map((x, j) => {
        if (j === 0) return x
        if (typeof x === "string") return idOf(x)
        if (Array.isArray(x) && x[0] === VARIABLE_PRIMITIVE) return [x[0], x[1], variable(x[1], x[2]), ...x.slice(3)]
        return x
      })
    }
    for (const [id, block] of Object.entries(page)) {
      if (Array.isArray(block)) {
        joined[idOf(id)] = block[0] === VARIABLE_PRIMITIVE ? [block[0], block[1], variable(block[1], block[2]), ...block.slice(3)] : block
        continue
      }
      if (!isRecord(block)) continue
      const fields = block.fields
      joined[idOf(id)] = {
        ...block,
        next: typeof block.next === "string" ? idOf(block.next) : block.next,
        parent: typeof block.parent === "string" ? idOf(block.parent) : block.parent,
        ...(isRecord(block.inputs) ? { inputs: Object.fromEntries(Object.entries(block.inputs).map(([k, v]) => [k, input(v)])) } : {}),
        ...(isRecord(fields) && Array.isArray(fields.VARIABLE)
          ? { fields: { ...fields, VARIABLE: [fields.VARIABLE[0], variable(fields.VARIABLE[0], fields.VARIABLE[1]), ...fields.VARIABLE.slice(2)] } }
          : {})
      }
    }
  })
  return joined
}
