/**
 * Pieces of the Tiny Swords ground tileset (`tiny-swords:tileset/ground`, 10 columns of 64×64) for maps built in
 * code. Grass and sand are autotiles: a cell takes the tile whose open edges (north 1, east 2, south 4, west 8) are
 * the sides where its neighbour is not the same ground. The edges are soft and see-through, so grass laid over sand
 * shows a sandy border, as the islands of the pack are drawn. The manifest describes the same tiles (`tiles`).
 */

export const TINY_SWORDS_GROUND = "tiny-swords:tileset/ground"
export const TINY_SWORDS_WATER = "tiny-swords:tileset/water"
const COLUMNS = 10

/** The tile number of a tileset cell, counted from 1 as tile layers count them. */
export const tinySwordsTile = (col: number, row: number): number => row * COLUMNS + col + 1

/** The cell of each edge mask in a 4×4 block of the tileset: entry i is [col, row] for mask i. */
const BLOCK: ReadonlyArray<readonly [number, number]> = [
  [1, 1], // 0: all around the same ground
  [1, 0], // 1: N
  [2, 1], // 2: E
  [2, 0], // 3: N E
  [1, 2], // 4: S
  [1, 3], // 5: N S
  [2, 2], // 6: E S
  [2, 3], // 7: N E S
  [0, 1], // 8: W
  [0, 0], // 9: N W
  [3, 1], // 10: E W
  [3, 0], // 11: N E W
  [0, 2], // 12: S W
  [0, 3], // 13: N S W
  [3, 2], // 14: E S W
  [3, 3] // 15: alone
]

export type TinySwordsGround = "grass" | "sand"

/** The first column of each ground's block. */
const BLOCK_COLUMN: Readonly<Record<TinySwordsGround, number>> = { grass: 0, sand: 5 }

/** The tile of `ground` whose open edges are `mask`. */
export const groundTileOf = (ground: TinySwordsGround, mask: number): number => {
  const [col, row] = BLOCK[mask & 15] ?? [1, 1]
  return tinySwordsTile(BLOCK_COLUMN[ground] + col, row)
}

/** A few pebbles on the sand: a dug bed, a plot for a tree. */
export const SAND_DETAIL = tinySwordsTile(9, 0)

/**
 * The grass of a map of `width × height` cells whose top-left is level cell (x, y): every cell that is not `low`
 * (a path, a pond) gets grass with edges toward the low cells; 0 on the low cells, where the sand below shows.
 */
export const grassOver = (
  low: (x: number, y: number) => boolean,
  area: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): Array<number> => {
  const out: Array<number> = []
  for (let j = 0; j < area.height; j++) {
    for (let i = 0; i < area.width; i++) {
      const x = area.x + i
      const y = area.y + j
      if (low(x, y)) {
        out.push(0)
        continue
      }
      const mask = (low(x, y - 1) ? 1 : 0) | (low(x + 1, y) ? 2 : 0) | (low(x, y + 1) ? 4 : 0) | (low(x - 1, y) ? 8 : 0)
      out.push(groundTileOf("grass", mask))
    }
  }
  return out
}
