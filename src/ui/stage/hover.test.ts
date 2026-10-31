import { describe, expect, it } from "vitest"
import { cellAt } from "./hover.ts"

describe("cellAt", () => {
  // A 5×3 level in a 9×9 view: the level starts at view cell (2, 3).
  const view = { x: -2, y: -3, width: 9, height: 9 }
  const level = { width: 5, height: 3 }
  const box = { width: 900, height: 900 }

  it("gives the level cell under the point", () => {
    expect(cellAt(250, 350, box, view, level)).toEqual({ x: 0, y: 0 })
    expect(cellAt(699, 599, box, view, level)).toEqual({ x: 4, y: 2 })
  })

  it("gives null on the meadow around the level", () => {
    expect(cellAt(150, 350, box, view, level)).toBeNull()
    expect(cellAt(250, 650, box, view, level)).toBeNull()
    expect(cellAt(750, 350, box, view, level)).toBeNull()
  })

  it("follows the size of the field on the screen", () => {
    expect(cellAt(25, 35, { width: 90, height: 90 }, view, level)).toEqual({ x: 0, y: 0 })
  })

  it("gives null for a field with no size", () => {
    expect(cellAt(0, 0, { width: 0, height: 0 }, view, level)).toBeNull()
  })
})
