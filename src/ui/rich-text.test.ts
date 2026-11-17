import { describe, expect, it } from "vitest"
import { parseRich, plainText, splitKeys } from "./rich-text.ts"

describe("parseRich", () => {
  it("gives one text part for text without markup", () => {
    expect(parseRich("Створи папку «Тварини».")).toEqual([{ kind: "text", text: "Створи папку «Тварини»." }])
  })

  it("finds a UI name, keys, code and a color", () => {
    expect(parseRich("Натисни **Копіювати** або [k]Ctrl+C[/k], введи `=A1+B1` у [red]червону[/red] клітинку")).toEqual([
      { kind: "text", text: "Натисни " },
      { kind: "ui", text: "Копіювати" },
      { kind: "text", text: " або " },
      { kind: "keys", keys: ["Ctrl", "C"] },
      { kind: "text", text: ", введи " },
      { kind: "code", text: "=A1+B1" },
      { kind: "text", text: " у " },
      { kind: "color", color: "red", text: "червону" },
      { kind: "text", text: " клітинку" }
    ])
  })

  it("keeps a mark without its end as text", () => {
    expect(parseRich("2 ** 3 і [k]Enter")).toEqual([{ kind: "text", text: "2 ** 3 і [k]Enter" }])
  })

  it("does not take an unknown color", () => {
    expect(plainText("[pink]рожевий[/pink]")).toBe("[pink]рожевий[/pink]")
  })

  it("never makes HTML: tags stay as text", () => {
    expect(parseRich("**<img src=x onerror=alert(1)>**")).toEqual([{ kind: "ui", text: "<img src=x onerror=alert(1)>" }])
  })
})

describe("splitKeys", () => {
  it("splits keys at plus", () => {
    expect(splitKeys("Ctrl + Shift + S")).toEqual(["Ctrl", "Shift", "S"])
  })

  it("keeps the plus key", () => {
    expect(splitKeys("Ctrl++")).toEqual(["Ctrl", "+"])
  })
})

describe("plainText", () => {
  it("removes the markup", () => {
    expect(plainText("Натисни **Копіювати** або [k]Ctrl + C[/k]")).toBe("Натисни Копіювати або Ctrl+C")
  })
})
