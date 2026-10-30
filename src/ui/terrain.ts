import { cellHash } from "./scenery.ts"

/**
 * The path drawn as one piece with soft grassy edges, the way the Ninja Adventure maps have it.
 *
 * The path sheets hold the 47 pieces of a "blob" tile set (sprites/path-*.png, 11×6 tiles, from the pack's
 * tileset_floor.png). The piece of a cell depends on which of its 8 neighbours are path too. The table below is
 * the pack's own terrain data (tileset.tres) for those pieces.
 */

export const PATH_SHEET_COLUMNS = 11

/** Neighbour bits in the order of the table: top-left, top, top-right, left, right, bottom-left, bottom, bottom-right. */
const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
]

const TL = 1
const T = 2
const TR = 4
const L = 8
const R = 16
const BL = 32
const B = 64
const BR = 128

/** Mask of the path around a cell → the pieces (indexes in the sheet) that fit. Some masks have a few looks. */
const PIECES: Readonly<Record<number, ReadonlyArray<number>>> = {
  0: [36],
  2: [25],
  8: [35],
  10: [40],
  11: [24],
  16: [33],
  18: [37],
  22: [22],
  24: [34],
  26: [41],
  27: [38],
  30: [39],
  31: [23],
  64: [3],
  66: [14],
  72: [7],
  74: [51],
  75: [18],
  80: [4],
  82: [48],
  86: [15],
  88: [8],
  90: [52],
  91: [43],
  94: [42],
  95: [19],
  104: [2],
  106: [29],
  107: [13],
  120: [5],
  122: [32],
  123: [49],
  126: [20],
  127: [16],
  208: [0],
  210: [26],
  214: [11],
  216: [6],
  218: [31],
  219: [9],
  222: [50],
  223: [17],
  248: [1],
  250: [30],
  251: [27],
  254: [28],
  255: [12, 12, 12, 44, 45]
}

/** A corner counts only when both sides next to it are path too: otherwise the grass already rounds it off. */
export const pathMask = (isPath: (x: number, y: number) => boolean, x: number, y: number): number => {
  let mask = 0
  NEIGHBOURS.forEach(([dx, dy], bit) => {
    if (isPath(x + dx, y + dy)) mask |= 1 << bit
  })
  if ((mask & (T | L)) !== (T | L)) mask &= ~TL
  if ((mask & (T | R)) !== (T | R)) mask &= ~TR
  if ((mask & (B | L)) !== (B | L)) mask &= ~BL
  if ((mask & (B | R)) !== (B | R)) mask &= ~BR
  return mask
}

/** Whether the sheet has a piece for this mask; every mask `pathMask` gives has one. */
export const hasPiece = (mask: number): boolean => PIECES[mask] !== undefined

/** The sheet piece for a path cell: its column and row in the path sheet. */
export const pathPiece = (isPath: (x: number, y: number) => boolean, x: number, y: number): { col: number; row: number } => {
  const looks = PIECES[pathMask(isPath, x, y)] ?? [12]
  const index = looks[cellHash(x, y, 7) % looks.length] ?? 12
  return { col: index % PATH_SHEET_COLUMNS, row: Math.floor(index / PATH_SHEET_COLUMNS) }
}

/** Meadow tiles in sprites/meadow.png: plain grass most of the time, now and then a few blades or a tuft. */
const MEADOW_LOOKS: ReadonlyArray<number> = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6]

export const meadowTile = (x: number, y: number): number => MEADOW_LOOKS[cellHash(x, y, 8) % MEADOW_LOOKS.length] ?? 0
