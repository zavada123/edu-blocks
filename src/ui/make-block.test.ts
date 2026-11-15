import { describe, expect, test } from "vitest"
import { draftError, draftOf, mutationOf } from "./make-block.ts"

const mutation = (attrs: Readonly<Record<string, string>>) => ({ getAttribute: (n: string) => attrs[n] ?? null })

describe("«Створити блок»", () => {
  test("reads a block from its mutation: the name without slots and the parameters", () => {
    expect(draftOf(mutation({ proccode: "пройти %s", argumentnames: '["кроки"]' }))).toEqual({ name: "пройти", params: ["кроки"] })
    expect(draftOf(mutation({}))).toEqual({ name: "", params: [] })
  })

  test("asks for a name, names for the parameters, and words no other block has", () => {
    expect(draftError({ name: " ", params: [] }, [])).toMatch(/назву/)
    expect(draftError({ name: "пройти", params: [""] }, [])).toMatch(/параметру/)
    expect(draftError({ name: "пройти", params: ["n", "n"] }, [])).toMatch(/однаковою/)
    expect(draftError({ name: "пройти", params: ["n"] }, ["пройти %s"])).toMatch(/вже є/)
    expect(draftError({ name: "пройти", params: ["n"] }, ["пройти"])).toBeNull()
    expect(draftError({ name: "50%", params: [] }, [])).toMatch(/%/)
  })

  test("keeps the ids of the parameters that stay, so the calls keep their values", () => {
    let n = 0
    const m = mutationOf({ name: "пройти ", params: ["кроки", " раз "] }, ["a1"], () => `new${++n}`)
    expect(m).toEqual({
      proccode: "пройти %s %s",
      argumentids: '["a1","new1"]',
      argumentnames: '["кроки","раз"]',
      argumentdefaults: '["",""]',
      warp: "false"
    })
  })
})
