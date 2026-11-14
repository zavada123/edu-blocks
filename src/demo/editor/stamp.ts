import { setTile, tileAt, type MapTile } from "../../core/kit.ts"
import type { Level, Npc, PlacedSprite } from "../../core/level.ts"
import { groundAt } from "../../core/terrain.ts"
import type { EnemySpec } from "../../core/world.ts"
import { paintGround } from "./edit.ts"
import type { CellBox } from "./MapCanvas.tsx"

/**
 * The stamp of LDtk: copy a piece of a level (map signs, painted ground, pictures, villagers, enemies) and lay it down
 * elsewhere, on this level or on another one. Pure functions; a whole stamp is one step to undo.
 */

/** A copied piece, its cells counted from its top-left corner. */
export interface Patch {
  readonly width: number
  readonly height: number
  /** Map signs row by row; null where the piece lay on the meadow. */
  readonly tiles: ReadonlyArray<ReadonlyArray<MapTile | null>>
  /** Painted grounds row by row; null where nothing was painted. */
  readonly grounds: ReadonlyArray<ReadonlyArray<string | null>>
  readonly sprites: ReadonlyArray<PlacedSprite>
  readonly npcs: ReadonlyArray<Npc>
  readonly enemies: ReadonlyArray<EnemySpec>
}

/** The largest piece the stamp copies: a whole level at most. */
export const MAX_PATCH = 16

/** There must be only one start and one goal: a stamp lays them as path. */
const ONE_ONLY: ReadonlySet<MapTile> = new Set<MapTile>(["start", "finish"])

const inside = (level: Level, x: number, y: number) => y >= 0 && x >= 0 && y < level.map.length && x < (level.map[y]?.length ?? 0)

const within = (x: number, y: number, left: number, top: number, width: number, height: number) =>
  x >= left && y >= top && x < left + width && y < top + height

/** Copies the piece of a level under a box (at most `MAX_PATCH` cells a side). */
export const copyPatch = (level: Level, box: CellBox): Patch => {
  const left = Math.min(box.x0, box.x1)
  const top = Math.min(box.y0, box.y1)
  const width = Math.min(MAX_PATCH, Math.abs(box.x1 - box.x0) + 1)
  const height = Math.min(MAX_PATCH, Math.abs(box.y1 - box.y0) + 1)
  const terrain = level.scene?.terrain
  const rows = Array.from({ length: height }, (_, dy) => Array.from({ length: width }, (_, dx) => ({ x: left + dx, y: top + dy })))
  const shift = <T extends { readonly x: number; readonly y: number }>(thing: T): T => ({ ...thing, x: thing.x - left, y: thing.y - top })
  const here = (t: { readonly x: number; readonly y: number }) => within(Math.floor(t.x), Math.floor(t.y), left, top, width, height)
  return {
    width,
    height,
    tiles: rows.map((row) => row.map((c) => (inside(level, c.x, c.y) ? tileAt(level.map, c.x, c.y) : null))),
    grounds: rows.map((row) => row.map((c) => (terrain === undefined ? null : groundAt(terrain, c.x, c.y)))),
    sprites: (level.scene?.sprites ?? []).filter(here).map(shift),
    npcs: (level.scene?.npcs ?? []).filter(here).map(shift),
    enemies: (level.enemies ?? []).filter(here).map((e) => {
      const { route, ...rest } = shift(e)
      // A route is kept only while it stays inside the piece.
      const kept = route?.every((p) => here(p)) === true ? { route: route.map(shift) } : {}
      return { ...rest, ...kept }
    })
  }
}

/** Whether a patch carries anything at all. */
export const patchEmpty = (patch: Patch): boolean =>
  patch.tiles.every((r) => r.every((t) => t === null)) &&
  patch.grounds.every((r) => r.every((g) => g === null)) &&
  patch.sprites.length + patch.npcs.length + patch.enemies.length === 0

/**
 * Lays a patch with its top-left corner on a cell. Map signs go only inside the map, the start and the goal become
 * path; grounds, pictures and villagers go on the meadow too.
 */
export const pastePatch = (level: Level, patch: Patch, x: number, y: number): Level => {
  const moved = <T extends { readonly x: number; readonly y: number }>(thing: T): T => ({ ...thing, x: thing.x + x, y: thing.y + y })
  const under = (t: { readonly x: number; readonly y: number }) => within(Math.floor(t.x), Math.floor(t.y), x, y, patch.width, patch.height)
  let next = level
  patch.tiles.forEach((row, dy) =>
    row.forEach((tile, dx) => {
      if (tile !== null && inside(next, x + dx, y + dy)) next = { ...next, map: setTile(next.map, x + dx, y + dy, ONE_ONLY.has(tile) ? "floor" : tile) }
    })
  )
  patch.grounds.forEach((row, dy) =>
    row.forEach((ground, dx) => {
      if (ground !== null) next = paintGround(next, ground, x + dx, y + dy)
    })
  )
  const scene = next.scene ?? {}
  // Pictures pile up as they do under the brush; a villager or an enemy on a cell of the piece makes way.
  const sprites = [...(scene.sprites ?? []), ...patch.sprites.map(moved)]
  const npcs = [...(scene.npcs ?? []).filter((n) => !under(n)), ...patch.npcs.map(moved)]
  const enemies = [
    ...(next.enemies ?? []).filter((e) => !under(e)),
    ...patch.enemies.map((e) => ({ ...moved(e), ...(e.route === undefined ? {} : { route: e.route.map(moved) }) })).filter((e) => inside(next, e.x, e.y))
  ]
  return {
    ...next,
    scene: { ...scene, ...(sprites.length > 0 ? { sprites } : {}), ...(npcs.length > 0 ? { npcs } : {}) },
    ...(enemies.length > 0 || next.enemies !== undefined ? { enemies } : {})
  }
}

/** The cells a patch covers when laid on a cell, for the frame under the mouse. */
export const patchBox = (patch: Patch, x: number, y: number): CellBox => ({ x0: x, y0: y, x1: x + patch.width - 1, y1: y + patch.height - 1 })
