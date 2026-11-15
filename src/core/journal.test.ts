import { describe, expect, test } from "vitest"
import { pageOf } from "./book.ts"
import { buildProgram, type Step } from "./build.ts"
import { type FarmProgram, type FarmState, finishDay, NEW_FARM, runFarmDay } from "./farm.ts"
import {
  dayRecord,
  harvestOf,
  JOURNAL_DAYS,
  type JournalEntry,
  journalRecords,
  newRecords,
  programRuns,
  writeDay
} from "./journal.ts"
import type { BlockName } from "./level.ts"

/** «Журнал господарства»: a record of each day the student ended, with a print of the program. */

const ALL: ReadonlyArray<BlockName> = [
  "move", "turnLeft", "turnRight", "collect", "store", "sow", "wallAhead", "onCrystal", "handsFull", "atStorehouse", "bedEmpty",
  "repeat", "forever", "if", "ifElse", "not", "and", "procedure", "variables", "myBlocks"
]
const python = (source: string): FarmProgram => ({ language: "python", source })

const WALK_ONLY = python(`while True:
    if hero.wall_ahead():
        hero.turn_right()
    else:
        hero.move()
`)
const WOOD_SOURCE = `while True:
    if hero.item_here() and not hero.hands_full():
        hero.collect()
    if hero.at_storehouse():
        hero.store()
    if hero.wall_ahead():
        hero.turn_right()
    else:
        hero.move()
`
const WOOD_RING = python(WOOD_SOURCE)

const RING_STEPS: ReadonlyArray<Step> = [
  {
    forever: [
      { if: { and: ["onCrystal", { not: "handsFull" }] }, then: ["collect"] },
      { if: "atStorehouse", then: ["store"] },
      { if: "wallAhead", then: ["turnRight"], else: ["move"] }
    ]
  }
]

/** Ends `days` days on a new farm with the program, as the page does at «Завершити день». */
const play = (programs: ReadonlyArray<FarmProgram>, start: FarmState = NEW_FARM) => {
  let state = start
  let journal: ReadonlyArray<JournalEntry> = []
  for (const code of programs) {
    const { report } = runFarmDay(state, code, ALL)
    journal = writeDay(journal, dayRecord(state, report, code, ALL))
    state = finishDay(state, report)
  }
  return journal
}

describe("a day in the journal", () => {
  test("keeps what the day brought and a print of the program", () => {
    const [entry] = play([WOOD_RING])
    expect(entry).toMatchObject({ day: 1, language: "python", own: [], book: [] })
    expect(harvestOf(entry as JournalEntry)).toBeGreaterThan(0)
    expect(entry?.trips).toBeGreaterThan(0)
    expect(entry?.print).toMatch(/^[0-9a-f]{8}$/)
    expect(entry?.size).toBe(9)
  })

  test("has the same print for the same code with other comments and empty lines", () => {
    const [a, b] = play([WOOD_RING, python(`# мій робітник\n\n${WOOD_SOURCE}\n\n`)])
    expect(b?.print).toBe(a?.print)
    expect(programRuns(play([WOOD_RING, WOOD_RING, WALK_ONLY]))).toHaveLength(2)
  })

  test("in blocks, does not change when a block is only moved", () => {
    const program = buildProgram(RING_STEPS)
    const moved = Object.fromEntries(Object.entries(program).map(([id, b]) => [id, typeof b === "object" && b !== null && "topLevel" in b && b.topLevel === true ? { ...b, x: 400, y: 300 } : b]))
    const [a, b] = play([{ language: "blocks", program }, { language: "blocks", program: moved }])
    expect(a?.language).toBe("blocks")
    expect(a?.size).toBeGreaterThan(5)
    expect(b?.print).toBe(a?.print)
  })

  test("names the own blocks and the blocks of the book the program called", () => {
    const body: ReadonlyArray<Step> = [{ repeat: { param: "кроки" }, body: ["move"] }]
    const full = buildProgram([{ forever: [{ call: "пройти", args: [2] }, "turnRight"] }], { name: "пройти", params: ["кроки"], body })
    const page = pageOf(full, "пройти %s")
    if (page === null) throw new Error("no page")
    const calls = Object.fromEntries(Object.entries(full).filter(([id]) => !Object.hasOwn(page, id)))
    const withBook: FarmState = { ...NEW_FARM, unlocked: ["book"], book: [page] }
    expect(play([{ language: "blocks", program: full }])[0]).toMatchObject({ own: ["пройти"], book: [] })
    expect(play([{ language: "blocks", program: calls }], withBook)[0]).toMatchObject({ own: [], book: ["пройти"] })
    expect(play([python("while True:\n    пройти(2)\n    hero.turn_right()")], withBook)[0]).toMatchObject({ own: [], book: ["пройти"] })
  })

  test("is written over when the day comes again, and only the last days stay", () => {
    const [entry] = play([WOOD_RING]) as [JournalEntry]
    expect(writeDay([entry], { ...entry, idle: 99 })).toEqual([{ ...entry, idle: 99 }])
    const many = Array.from({ length: JOURNAL_DAYS + 5 }, (_, i) => ({ ...entry, day: i + 1 }))
    const kept = many.reduce<ReadonlyArray<JournalEntry>>(writeDay, [])
    expect(kept).toHaveLength(JOURNAL_DAYS)
    expect(kept[0]?.day).toBe(6)
  })
})

describe("the programs of the journal", () => {
  test("group the days in a row of one program, with their averages", () => {
    const runs = programRuns(play([WALK_ONLY, WALK_ONLY, WOOD_RING, WOOD_RING, WOOD_RING]))
    expect(runs.map((r) => [r.number, r.days])).toEqual([
      [1, [1, 2]],
      [2, [3, 4, 5]]
    ])
    expect(runs[0]?.harvest).toBe(0)
    expect(runs[1]?.harvest).toBeGreaterThan(0)
    expect(runs[1]?.trips).toBeGreaterThan(0)
  })

  test("count a program again when the student comes back to it", () => {
    expect(programRuns(play([WOOD_RING, WALK_ONLY, WOOD_RING])).map((r) => r.number)).toEqual([1, 2, 3])
  })
})

describe("the records", () => {
  const entry = (day: number, wood: number, idle: number, trips: number, tenWoodAt: number | null): JournalEntry => ({
    day,
    stored: { wood, pumpkin: 0, meat: 0, gold: 0 },
    used: 100,
    turns: 100,
    idle,
    trips,
    goblins: 0,
    beaten: 0,
    tenWoodAt,
    language: "python",
    print: "00000000",
    size: 1,
    own: [],
    book: []
  })

  test("name the best value and every day that reached it", () => {
    const journal = [entry(1, 4, 9, 2, null), entry(2, 12, 0, 5, 80), entry(3, 12, 0, 3, 64)]
    expect(journalRecords(journal)).toEqual({
      harvest: { value: 12, days: [2, 3] },
      tenWood: { value: 64, days: [3] },
      idle: { value: 0, days: [2, 3] },
      trips: { value: 5, days: [2] }
    })
    expect(journalRecords([])).toEqual({ harvest: null, tenWood: null, idle: null, trips: null })
  })

  test("a new day sets those it reached alone", () => {
    expect(newRecords([entry(1, 4, 9, 2, null), entry(2, 12, 3, 1, 70)])).toEqual(["harvest", "tenWood", "idle"])
    expect(newRecords([entry(1, 4, 9, 2, null), entry(2, 4, 9, 2, null)])).toEqual([])
    expect(newRecords([entry(1, 4, 9, 2, null)])).toEqual([])
  })
})
