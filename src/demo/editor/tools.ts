import { tileAt } from "../../core/kit.ts"
import type { Level } from "../../core/level.ts"
import { groundAt } from "../../core/terrain.ts"
import type { Cell } from "../../core/world.ts"
import { type Brush, dragPaints, eraseWith, paint } from "./edit.ts"
import type { CellBox } from "./MapCanvas.tsx"

/**
 * The drawing tools of LDtk for every brush that paints by cells: a box (drag a frame, fill it), a bucket (fill the
 * joined area of the same kind) and the eyedropper (Alt+click takes the brush of a cell). Pure functions of the level:
 * each is one step to undo, and the grounds recount their edges by themselves.
 */

/** How the left button lays the brush. */
export type Shape = "pen" | "box" | "fill"

/** The largest area the bucket fills at once: a mistake on the meadow never floods the whole field. */
export const MAX_FILL = 16 * 16

/** The cells of a box, row by row. */
export const boxCells = (box: CellBox): ReadonlyArray<Cell> => {
  const cells: Array<Cell> = []
  for (let y = Math.min(box.y0, box.y1); y <= Math.max(box.y0, box.y1); y++)
    for (let x = Math.min(box.x0, box.x1); x <= Math.max(box.x0, box.x1); x++) cells.push({ x, y })
  return cells
}

/** Whether the brush can fill an area: the brushes that paint while dragging, not figures, houses or the start. */
export const fillsArea = (brush: Brush): boolean => brush.kind !== "erase" && dragPaints(brush)

/** Paints (or erases) every cell of a box. */
export const paintBox = (level: Level, brush: Brush, box: CellBox, erase: boolean): Level =>
  boxCells(box).reduce((l, c) => (erase ? eraseWith(l, brush, c.x, c.y) : paint(l, brush, c.x, c.y)), level)

const inside = (level: Level, x: number, y: number) => y >= 0 && x >= 0 && y < level.map.length && x < (level.map[y]?.length ?? 0)

/** What the bucket compares: the map sign under a tile brush, the painted ground under a ground brush. */
const kindOf = (level: Level, brush: Brush): ((x: number, y: number) => string) =>
  brush.kind === "ground" ? (x, y) => groundAt(level.scene?.terrain ?? { kinds: {}, rows: [] }, x, y) ?? "" : (x, y) => tileAt(level.map, x, y)

/** The joined cells of the same kind as the clicked one, inside the map, sideways neighbours only. */
export const fillCells = (level: Level, brush: Brush, x: number, y: number): ReadonlyArray<Cell> => {
  if (!inside(level, x, y)) return []
  const kind = kindOf(level, brush)
  const want = kind(x, y)
  const seen = new Set([`${x},${y}`])
  const cells: Array<Cell> = []
  const queue: Array<Cell> = [{ x, y }]
  for (let c = queue.shift(); c !== undefined && cells.length < MAX_FILL; c = queue.shift()) {
    cells.push(c)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ] as const) {
      const n = { x: c.x + dx, y: c.y + dy }
      const key = `${n.x},${n.y}`
      if (seen.has(key) || !inside(level, n.x, n.y) || kind(n.x, n.y) !== want) continue
      seen.add(key)
      queue.push(n)
    }
  }
  return cells
}

/** The bucket: paints (or erases) the joined area of the clicked cell. */
export const fillArea = (level: Level, brush: Brush, x: number, y: number, erase: boolean): Level =>
  fillCells(level, brush, x, y).reduce((l, c) => (erase ? eraseWith(l, brush, c.x, c.y) : paint(l, brush, c.x, c.y)), level)

/**
 * The eyedropper: the brush that put the topmost thing on a cell. An enemy, a villager, a picture, the painted
 * ground, then the map sign; null on the plain meadow.
 */
export const pickBrush = (level: Level, x: number, y: number): Brush | null => {
  const enemy = (level.enemies ?? []).find((e) => e.x === x && e.y === y)
  if (enemy !== undefined) return { kind: "enemy", monster: enemy.kind, ...(enemy.look === undefined ? {} : { look: enemy.look }) }
  const npc = (level.scene?.npcs ?? []).find((n) => n.x === x && n.y === y)
  if (npc !== undefined) return { kind: "npc", who: npc.who, ...(npc.look === undefined ? {} : { look: npc.look }) }
  const sprite = (level.scene?.sprites ?? []).findLast((s) => {
    const [, , w, h] = s.tiles ?? [0, 0, 1, 1]
    return x >= Math.floor(s.x) && x < Math.ceil(s.x + w) && y >= Math.floor(s.y) && y < Math.ceil(s.y + h)
  })
  if (sprite !== undefined)
    return {
      kind: "sprite",
      asset: sprite.asset,
      ...(sprite.tiles === undefined ? {} : { tiles: sprite.tiles }),
      ...(sprite.layer === undefined ? {} : { layer: sprite.layer })
    }
  const ground = level.scene?.terrain === undefined ? null : groundAt(level.scene.terrain, x, y)
  if (ground !== null) return { kind: "ground", ground }
  return inside(level, x, y) ? { kind: "tile", tile: tileAt(level.map, x, y) } : null
}
