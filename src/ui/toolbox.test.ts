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

describe("toolboxXml: the counter and the custom block", () => {
  test("the counter brings «задати», «змінити» and the reporter with the fixed variable", () => {
    const xml = toolboxXml(["move", "counter"])
    expect(xml).toContain('<category name="Змінні"')
    for (const type of ["data_setvariableto", "data_changevariableby", "data_variable"]) expect(xml).toContain(`type="${type}"`)
    expect(xml).toContain('id="eb-counter"')
  })

  test("the custom block has the level's name, escaped", () => {
    const xml = toolboxXml(["move", "procedure"], false, 'обійти "камінь"')
    expect(xml).toContain('<category name="Мої блоки"')
    expect(xml).toContain('proccode="обійти &quot;камінь&quot;"')
    expect(xml.match(/proccode=/g)).toHaveLength(2)
  })
})
