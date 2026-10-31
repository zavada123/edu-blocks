import { CELL } from "./draw.ts"

/** A cell of the level. */
export interface Cell {
  readonly x: number
  readonly y: number
}

/** The part of the world that the field shows, in cells. */
export interface View {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The size of the level, in cells. */
export interface LevelSize {
  readonly width: number
  readonly height: number
}

/**
 * The cell of the level under a point of the field (`px`, `py` from the field's top left corner, in screen pixels),
 * or null when the point is on the meadow around the level.
 */
export const cellAt = (px: number, py: number, box: LevelSize, view: View, level: LevelSize): Cell | null => {
  if (box.width <= 0 || box.height <= 0) return null
  const x = view.x + Math.floor((px / box.width) * view.width)
  const y = view.y + Math.floor((py / box.height) * view.height)
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return null
  return { x, y }
}

const HOVER_FILL = "rgba(255, 255, 255, 0.25)"
const HOVER_EDGE = "rgba(255, 255, 255, 0.8)"

/** A light square on the cell under the mouse: children count the steps with it. */
export const drawHover = (ctx: CanvasRenderingContext2D, cell: Cell) => {
  ctx.fillStyle = HOVER_FILL
  ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL)
  ctx.strokeStyle = HOVER_EDGE
  ctx.lineWidth = 1
  ctx.strokeRect(cell.x * CELL + 0.5, cell.y * CELL + 0.5, CELL - 1, CELL - 1)
}
