import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { BOOK_ID_PREFIX, type BookPage, calledBlocks, cleanBook, pageInfo, pageOf, pagesUsed, tearPage, withLibrary, writePage } from "./book.ts"
import { buildProgram, type Step } from "./build.ts"
import { judgeProgram } from "./judge.ts"
import type { BlockName, Level } from "./level.ts"
import type { Program, RunResult } from "./program.ts"
import { programSource } from "./python/convert.ts"
import { judgePython } from "./python/judge.ts"
import { runProgram } from "./run.ts"

/** «Книга команд»: own blocks kept from day to day, called without a «визначити» in the program. */

const PALETTE: ReadonlyArray<BlockName> = ["move", "turnLeft", "turnRight", "collect", "repeat", "forever", "if", "wallAhead", "variables", "myBlocks"]
const base = levels.find((l) => l.id === "g3-steps") as Level
const corridor: Level = { ...base, map: ["##########", "#S.......#", "##########"], blocks: PALETTE, goals: [{ type: "finish" }] }

const WALK = { name: "пройти", params: ["кроки"], body: [{ repeat: { param: "кроки" }, body: ["move"] }, { change: 1, variable: "ходки" }] as ReadonlyArray<Step> }
const MAIN: ReadonlyArray<Step> = [{ set: 0, variable: "ходки" }, { call: "пройти", args: [2] }, { call: "пройти", args: [3] }]
const FULL = buildProgram(MAIN, WALK)
const PAGE = pageOf(FULL, "пройти %s") as BookPage
/** The program after «Записати в книгу»: the «визначити» left for the book. */
const CALLS: Program = Object.fromEntries(Object.entries(FULL).filter(([id]) => !Object.hasOwn(PAGE, id)))
const withBook: Level = { ...corridor, library: [PAGE] }

const summary = (r: RunResult) => ({ passed: r.passed, reason: r.reason, frames: r.frames.map((f) => [f.action, f.outcome]), boxes: r.boxes })

describe("a page of the book", () => {
  test("holds the «визначити» script of one block, and nothing of the main script", () => {
    expect(pageInfo(PAGE)).toMatchObject({ proccode: "пройти %s", name: "пройти", params: ["кроки"] })
    expect(pageInfo(PAGE)?.ids).toHaveLength(1)
    expect(Object.keys(PAGE).length + Object.keys(CALLS).length).toBe(Object.keys(FULL).length)
    expect(calledBlocks(CALLS)).toEqual(["пройти %s"])
    expect(pageOf(FULL, "нема %s")).toBeNull()
  })

  test("is written in place of a page of the same block, or on a free page while there is one", () => {
    const other = pageOf(buildProgram([], { name: "інший", params: [], body: ["move"] }), "інший") as BookPage
    expect(writePage([], PAGE, 3)).toEqual([PAGE])
    expect(writePage([PAGE], PAGE, 1)).toEqual([PAGE])
    expect(writePage([PAGE], other, 1)).toBeNull()
    expect(writePage([PAGE], other, 2)).toEqual([PAGE, other])
    expect(tearPage([PAGE, other], "пройти %s")).toEqual([other])
    expect(cleanBook([PAGE, {}, PAGE, other])).toEqual([PAGE, other])
  })

  test("is used by a program that calls it and does not define it", () => {
    expect(pagesUsed(CALLS, [PAGE]).map((p) => p.name)).toEqual(["пройти"])
    expect(pagesUsed(FULL, [PAGE])).toEqual([])
  })
})

describe("a program with the book", () => {
  test("runs as the program with its own «визначити», and counts only its own blocks", async () => {
    const own = judgeProgram(corridor, FULL)
    const book = judgeProgram(withBook, CALLS)
    expect(summary(book)).toEqual(summary(own))
    expect(book.frames).toHaveLength(5)
    expect(book.boxes).toEqual([{ name: "ходки", value: "2", kind: "int" }])
    expect(book.blocks).toBeLessThan(own.blocks)
    expect(book.bookCalls).toEqual(["пройти"])
    expect(own.bookCalls).toBeUndefined()
    // The VM runs the same.
    expect({ ...summary(await runProgram(withBook, CALLS)), boxes: book.boxes }).toEqual(summary(book))
  })

  test("without the book does nothing at a call, as Scratch does with a block it does not know", () => {
    expect(judgeProgram(corridor, CALLS).frames).toHaveLength(0)
  })

  test("keeps its own «визначити» of a block over the page", () => {
    const twice = buildProgram([{ call: "пройти", args: [1] }], { ...WALK, body: [{ repeat: { param: "кроки" }, body: ["move", "move"] }] })
    const result = judgeProgram(withBook, twice)
    expect(result.frames).toHaveLength(2)
    expect(result.bookCalls).toBeUndefined()
  })

  test("joins the page with ids of its own, and with the program's variable of the same name", () => {
    const renamed = Object.fromEntries(
      Object.entries(CALLS).map(([id, b]) => {
        const block = b as { readonly fields?: { readonly VARIABLE?: ReadonlyArray<string> } }
        return [id, block.fields?.VARIABLE === undefined ? b : { ...block, fields: { VARIABLE: ["ходки", "інший-id"] } }]
      })
    )
    const joined = withLibrary(renamed, [PAGE])
    const pageIds = Object.keys(joined).filter((id) => !Object.hasOwn(renamed, id))
    expect(pageIds.length).toBe(Object.keys(PAGE).length)
    expect(pageIds.every((id) => id.startsWith(BOOK_ID_PREFIX))).toBe(true)
    expect(JSON.stringify(pageIds.map((id) => joined[id]))).toContain("інший-id")
    expect(judgeProgram(withBook, renamed).boxes).toEqual([{ name: "ходки", value: "2", kind: "int" }])
  })
})

describe("the book in Python", () => {
  test("its functions are there before the program, and the program's own def takes their place", () => {
    const calls = judgePython(withBook, "ходки = 0\nпройти(2)\nпройти(3)")
    expect(calls.frames).toHaveLength(5)
    expect(calls.bookCalls).toEqual(["пройти"])
    expect(calls.boxes).toEqual([{ name: "ходки", value: "2", kind: "int" }])
    // The moves of a function of the book light up no line of the student.
    expect(calls.frames.map((f) => f.line)).toEqual([0, 0, 0, 0, 0])
    const own = judgePython(withBook, "def пройти(кроки):\n    hero.move()\n\nпройти(5)")
    expect(own.frames).toHaveLength(1)
    expect(own.bookCalls).toBeUndefined()
    expect(judgePython(corridor, "пройти(2)").reason).toBe("badProgram")
  })

  test("the view under the blocks names the book above the code", () => {
    expect(programSource(withBook, CALLS).split("\n").slice(0, 2)).toEqual(["# Книга команд: пройти(кроки)", ""])
    expect(programSource(corridor, CALLS)).not.toContain("Книга команд")
  })
})
