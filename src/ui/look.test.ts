import { describe, expect, test } from "vitest"
import { cellKey } from "../core/world.ts"
import { propCells } from "./look.ts"

describe("propCells", () => {
  test("a house at a half cell covers every cell it touches", () => {
    const cells = propCells([{ kind: "house", x: -0.5, y: -2 }])
    expect(cells.size).toBe(5 * 3)
    expect(cells.has(cellKey(-1, -2))).toBe(true)
    expect(cells.has(cellKey(3, 0))).toBe(true)
    expect(cells.has(cellKey(4, 0))).toBe(false)
  })
})
