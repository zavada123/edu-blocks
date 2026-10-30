import { describe, expect, it } from "vitest"
import { hasPiece, meadowTile, pathMask, pathPiece } from "./terrain.ts"

const cells = (rows: ReadonlyArray<string>) => (x: number, y: number) => rows[y]?.[x] === "."

describe("path pieces", () => {
  it("every neighbourhood has a piece of its own", () => {
    for (let around = 0; around < 256; around++) {
      const isPath = (x: number, y: number) => {
        if (x === 1 && y === 1) return true
        const bit = [
          [0, 0],
          [1, 0],
          [2, 0],
          [0, 1],
          [2, 1],
          [0, 2],
          [1, 2],
          [2, 2]
        ].findIndex(([cx, cy]) => cx === x && cy === y)
        return bit >= 0 && (around & (1 << bit)) !== 0
      }
      expect(hasPiece(pathMask(isPath, 1, 1))).toBe(true)
    }
  })

  it("a corner without both sides does not count", () => {
    expect(pathMask(cells(["..#", "#..", "###"]), 1, 1)).toBe(2 | 16)
    expect(pathMask(cells(["...", "...", "..."]), 1, 1)).toBe(255)
  })

  it("a lone cell, a straight piece and the inside of a wide path", () => {
    expect(pathPiece(cells(["###", "#.#", "###"]), 1, 1)).toEqual({ col: 3, row: 3 })
    expect(pathPiece(cells(["...", "...", "..."]), 1, 1).row).toBeGreaterThanOrEqual(1)
  })

  it("meadow tiles stay in the sheet and are mostly plain", () => {
    const looks = Array.from({ length: 400 }, (_, i) => meadowTile(i % 20, Math.floor(i / 20)))
    expect(looks.every((t) => t >= 0 && t < 7)).toBe(true)
    expect(looks.filter((t) => t === 0).length).toBeGreaterThan(150)
  })
})
