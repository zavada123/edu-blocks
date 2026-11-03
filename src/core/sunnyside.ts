import type { TileMap } from "./level.ts"

/**
 * Pieces of the Sunnyside World tileset (`sunnyside:tileset/16px`, 64 columns) for maps built in code, and the corner
 * brush that Tiled's terrain sets use (`tiled/sunnyside-16px.tsx`), so code and Tiled draw the same edges.
 */

export const SUNNYSIDE_TILESET = "sunnyside:tileset/16px"
const COLUMNS = 64

/** The tile number of a tileset cell, counted from 1 as tile layers count them. */
export const sunnysideTile = (col: number, row: number): number => row * COLUMNS + col + 1

/**
 * The autotiles of the Sunnyside GameMaker project: entry i is the tile (cell index) whose EMPTY corners are the bits
 * of i, top-left 1, top-right 2, bottom-left 4, bottom-right 8. 0 is no tile.
 */
export const SUNNYSIDE_TERRAIN = {
  path: [449, 450, 451, 452, 453, 454, 455, 456, 513, 514, 515, 516, 517, 518, 519, 0],
  soil: [460, 461, 462, 463, 464, 465, 466, 467, 524, 525, 526, 527, 528, 529, 530, 0],
  water: [470, 471, 472, 473, 474, 475, 476, 477, 534, 535, 536, 537, 538, 539, 540, 0]
} as const

export type SunnysideTerrain = keyof typeof SUNNYSIDE_TERRAIN

/** The plain grass and its variants with a few blades and spots. */
export const GRASS = sunnysideTile(2, 1)
export const GRASS_VARIANTS: ReadonlyArray<number> = [sunnysideTile(1, 2), sunnysideTile(2, 2), sunnysideTile(3, 2), sunnysideTile(5, 2)]

/** Small things on the grass that stand like objects: bushes, a rock, a stump. */
export const SHRUBS: ReadonlyArray<number> = [sunnysideTile(28, 2), sunnysideTile(29, 2), sunnysideTile(30, 2), sunnysideTile(28, 4), sunnysideTile(31, 4), sunnysideTile(31, 5)]
/** Flowers that lie flat. */
export const FLOWERS: ReadonlyArray<number> = [sunnysideTile(31, 1), sunnysideTile(31, 2), sunnysideTile(31, 3)]

/** A building of 3 × 4 tiles: its top-left tileset cell. The door is in the middle of the bottom row. */
export const FARMHOUSE = { col: 32, row: 34 } as const
export const HEN_HOUSE = { col: 32, row: 18 } as const

/**
 * The tiles of a terrain over a map of `width × height` cells whose top-left is level cell (x, y): every corner of
 * every given cell is filled, and each tile shows the edges of its four corners, as Tiled's terrain brush paints them.
 * 0 where no corner is filled.
 */
export const terrainTiles = (
  terrain: SunnysideTerrain,
  cells: Iterable<{ readonly x: number; readonly y: number }>,
  area: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): Array<number> => {
  const filled = new Set<string>()
  for (const { x, y } of cells) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) filled.add(`${x + dx},${y + dy}`)
  const tiles = SUNNYSIDE_TERRAIN[terrain]
  const out: Array<number> = []
  for (let j = 0; j < area.height; j++) {
    for (let i = 0; i < area.width; i++) {
      const x = area.x + i
      const y = area.y + j
      const corners = [`${x},${y}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x + 1},${y + 1}`]
      const empty = corners.reduce((mask, key, bit) => (filled.has(key) ? mask : mask | (1 << bit)), 0)
      const cell = tiles[empty] ?? 0
      out.push(cell === 0 ? 0 : cell + 1)
    }
  }
  return out
}

/** An empty layer for a map. */
export const emptyLayer = (map: Pick<TileMap, "width" | "height">): Array<number> => Array.from({ length: map.width * map.height }, () => 0)
