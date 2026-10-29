import { describe, expect, test } from "vitest"
import { toolboxXml } from "./toolbox.ts"

describe("toolboxXml", () => {
  test("shows only the blocks of the level, in categories", () => {
    const xml = toolboxXml(["move", "repeat"])
    expect(xml).toContain('type="hero_move"')
    expect(xml).toContain('type="control_repeat"')
    expect(xml).not.toContain("hero_collect")
    expect(xml).not.toContain("Оператори")
    expect(xml).toContain('<category name="Керування"')
    // The start hat is always there, so a deleted one can be put back.
    expect(xml).toContain('type="event_whenflagclicked"')
  })

  test("the flat palette for phones has no categories", () => {
    const xml = toolboxXml(["move", "not"], true)
    expect(xml).not.toContain("<category")
    expect(xml).toContain('type="operator_not"')
  })

  test("«повторити» comes with a number to edit", () => {
    expect(toolboxXml(["repeat"])).toContain('<shadow type="math_whole_number"><field name="NUM">4</field></shadow>')
  })
})
