import { setTile, tileAt, type MapTile } from "../../core/kit.ts"
import type { AssetRef, Level, Npc, NpcKind, PlacedSprite, PropKind, TerrainPaint } from "../../core/level.ts"
import { dropUnused, EMPTY, letterFor, paintCell } from "../../core/terrain.ts"
import { cellKey, type EnemyKind } from "../../core/world.ts"
import { PROPS } from "../../ui/look.ts"

/**
 * What a click on the map does, as pure functions of the level: the editor keeps them out of React so they are easy
 * to test and to undo.
 */

/** What the left mouse button paints. The right button always erases. */
export type Brush =
  | { readonly kind: "tile"; readonly tile: MapTile }
  | { readonly kind: "prop"; readonly prop: PropKind }
  | { readonly kind: "npc"; readonly who: NpcKind; readonly look?: AssetRef }
  | { readonly kind: "enemy"; readonly monster: EnemyKind; readonly look?: AssetRef }
  | {
      readonly kind: "sprite"
      readonly asset: AssetRef
      readonly tiles?: PlacedSprite["tiles"]
      readonly layer?: PlacedSprite["layer"]
    }
  /** A ground painted by cells (`Scene.terrain`), as `"ninja-adventure:tileset/floor#path"`; edges come by themselves. */
  | { readonly kind: "ground"; readonly ground: string }
  | { readonly kind: "erase" }

const inside = (level: Level, x: number, y: number) => y >= 0 && x >= 0 && y < level.map.length && x < (level.map[y]?.length ?? 0)

/** Whether dragging the mouse keeps painting: tiles and small ground pictures, not figures and houses. */
export const dragPaints = (brush: Brush): boolean =>
  brush.kind === "erase" ||
  brush.kind === "ground" ||
  (brush.kind === "tile" && brush.tile !== "start" && brush.tile !== "finish") ||
  (brush.kind === "sprite" && brush.tiles !== undefined && brush.tiles[2] === 1 && brush.tiles[3] === 1)

const withScene = (level: Level, patch: Partial<NonNullable<Level["scene"]>>): Level => ({ ...level, scene: { ...level.scene, ...patch } })

const covers = (sprite: PlacedSprite, x: number, y: number): boolean => {
  const [, , w, h] = sprite.tiles ?? [0, 0, 1, 1]
  return x >= Math.floor(sprite.x) && x < Math.ceil(sprite.x + w) && y >= Math.floor(sprite.y) && y < Math.ceil(sprite.y + h)
}

const placeSprite = (level: Level, brush: Extract<Brush, { kind: "sprite" }>, x: number, y: number): Level => {
  const sprite: PlacedSprite = {
    asset: brush.asset,
    x,
    y,
    ...(brush.tiles === undefined ? {} : { tiles: brush.tiles }),
    ...(brush.layer === undefined ? {} : { layer: brush.layer })
  }
  const sprites = level.scene?.sprites ?? []
  // A tile painted over a tile of the same place replaces it, so dragging over the ground does not pile them up.
  const kept = sprites.filter(
    (s) => !(s.x === x && s.y === y && (s.asset === sprite.asset || (s.tiles !== undefined && sprite.tiles !== undefined)) && s.layer === sprite.layer)
  )
  return withScene(level, { sprites: [...kept, sprite] })
}

const placeNpc = (level: Level, brush: Extract<Brush, { kind: "npc" }>, x: number, y: number): Level => {
  const npc: Npc = { who: brush.who, x, y, ...(brush.look === undefined ? {} : { look: brush.look }) }
  return withScene(level, { npcs: [...(level.scene?.npcs ?? []).filter((n) => n.x !== x || n.y !== y), npc] })
}

const placeEnemy = (level: Level, brush: Extract<Brush, { kind: "enemy" }>, x: number, y: number): Level => {
  if (!inside(level, x, y)) return level
  const enemies = level.enemies ?? []
  const old = enemies.find((e) => e.x === x && e.y === y)
  const { look: _, ...kept } = old ?? { kind: brush.monster, x, y }
  // A new look on an enemy keeps its settings.
  const enemy = { ...kept, kind: brush.monster, ...(brush.look === undefined ? {} : { look: brush.look }) }
  return { ...level, enemies: [...enemies.filter((e) => e.x !== x || e.y !== y), enemy] }
}

/** The left button on a cell. Cells outside the map (the meadow) take only pictures, houses and people. */
export const paint = (level: Level, brush: Brush, x: number, y: number): Level => {
  switch (brush.kind) {
    case "erase":
      return erase(level, x, y)
    case "tile":
      return inside(level, x, y) ? { ...level, map: setTile(level.map, x, y, brush.tile) } : level
    case "prop": {
      // The door of a house opens onto the clicked cell.
      const prop = { kind: brush.prop, x: x - (brush.prop === "house" ? 1.5 : 1), y: y - PROPS[brush.prop].height }
      return withScene(level, { props: [...(level.scene?.props ?? []), prop] })
    }
    case "npc":
      return placeNpc(level, brush, x, y)
    case "enemy":
      return placeEnemy(level, brush, x, y)
    case "sprite":
      return placeSprite(level, brush, x, y)
    case "ground":
      return paintGround(level, brush.ground, x, y)
  }
}

const NO_PAINT: TerrainPaint = { kinds: {}, rows: [] }

/** Paints a ground on a cell, or takes it away (`null`), leaving the painting without grounds nothing paints. */
export const paintGround = (level: Level, ground: string | null, x: number, y: number): Level => {
  const before = level.scene?.terrain ?? NO_PAINT
  const { paint, letter } = ground === null ? { paint: before, letter: EMPTY } : letterFor(before, ground)
  const after = dropUnused(paintCell(paint, x, y, letter))
  if (after.rows.length === 0 && after.base === undefined) {
    const { terrain: _, ...scene } = level.scene ?? {}
    return { ...level, scene }
  }
  return withScene(level, { terrain: after })
}

/** The right button with a brush: a ground brush takes away only the ground, any other the topmost thing. */
export const eraseWith = (level: Level, brush: Brush, x: number, y: number): Level =>
  brush.kind === "ground" ? paintGround(level, null, x, y) : erase(level, x, y)

/** The ground under the whole field (`TerrainPaint.base`), or the field's own grass (`null`). */
export const setBaseGround = (level: Level, base: string | null): Level => {
  const { base: _, ...paint } = level.scene?.terrain ?? NO_PAINT
  if (base !== null) return withScene(level, { terrain: { ...paint, base } })
  if (paint.rows.length > 0) return withScene(level, { terrain: paint })
  const { terrain: __, ...scene } = level.scene ?? {}
  return { ...level, scene }
}

/**
 * Lays a ground under every cell the hero can walk on, on a base: a new level looks finished at once. What was
 * painted stays where the hero cannot walk.
 */
export const groundUnderPath = (level: Level, ground: string, base: string): Level => {
  let next = setBaseGround(level, base)
  level.map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) next = paintGround(next, tileAt(level.map, x, y) === "wall" ? null : ground, x, y)
  })
  return next
}

const propCovers = (p: { readonly kind: PropKind; readonly x: number; readonly y: number }, x: number, y: number) => {
  const { width, height } = PROPS[p.kind]
  return x >= Math.floor(p.x) && x < Math.ceil(p.x + width) && y >= Math.floor(p.y) && y < Math.ceil(p.y + height)
}

/**
 * The right button: takes away the topmost thing on the cell. An enemy first, then a villager, a picture (the last
 * placed first), a house. With nothing of these, an item, a trap or the goal turns back into path.
 */
export const erase = (level: Level, x: number, y: number): Level => {
  const enemies = level.enemies ?? []
  if (enemies.some((e) => e.x === x && e.y === y)) return { ...level, enemies: enemies.filter((e) => e.x !== x || e.y !== y) }
  const npcs = level.scene?.npcs ?? []
  if (npcs.some((n) => n.x === x && n.y === y)) return withScene(level, { npcs: npcs.filter((n) => n.x !== x || n.y !== y) })
  const sprites = level.scene?.sprites ?? []
  const top = sprites.findLastIndex((s) => covers(s, x, y))
  if (top >= 0) return withScene(level, { sprites: sprites.filter((_, i) => i !== top) })
  const props = level.scene?.props ?? []
  const prop = props.findLastIndex((p) => propCovers(p, x, y))
  if (prop >= 0) return withScene(level, { props: props.filter((_, i) => i !== prop) })
  if (!inside(level, x, y)) return level
  const tile = tileAt(level.map, x, y)
  return tile === "item" || tile === "trap" || tile === "finish" ? { ...level, map: setTile(level.map, x, y, "floor") } : level
}

/** What stands on a cell, for the tooltip of the map. */
export const describeCell = (level: Level, x: number, y: number): string => {
  const parts: Array<string> = []
  if (inside(level, x, y)) parts.push(TILE_NAMES[tileAt(level.map, x, y)])
  else parts.push("луг")
  if ((level.enemies ?? []).some((e) => e.x === x && e.y === y)) parts.push("ворог")
  if ((level.scene?.npcs ?? []).some((n) => n.x === x && n.y === y)) parts.push("людина")
  const pictures = (level.scene?.sprites ?? []).filter((s) => covers(s, x, y)).length
  if (pictures > 0) parts.push(`картинок: ${pictures}`)
  if ((level.scene?.props ?? []).some((p) => propCovers(p, x, y))) parts.push("будинок")
  return `(${x}, ${y}) ${parts.join(", ")}`
}

const TILE_NAMES: Readonly<Record<MapTile, string>> = {
  wall: "стіна",
  floor: "стежка",
  start: "старт",
  item: "предмет",
  finish: "мета",
  trap: "пастка",
  storehouse: "склад",
  lever: "важіль (вимкнений)",
  leverOn: "важіль (увімкнений)",
  gate: "ворота"
}

/** Cells of the level that pictures cover, for a quick look in tests and the tooltip. */
export const coveredCells = (level: Level): ReadonlySet<string> => {
  const cells = new Set<string>()
  for (const s of level.scene?.sprites ?? []) {
    const [, , w, h] = s.tiles ?? [0, 0, 1, 1]
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.add(cellKey(Math.floor(s.x) + dx, Math.floor(s.y) + dy))
  }
  return cells
}
