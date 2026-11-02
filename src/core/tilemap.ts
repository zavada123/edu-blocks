import type { Level, TileLayer, TileLayerKind, TileMap } from "./level.ts"
import { cellKey, parseMap } from "./world.ts"

/**
 * A hand-drawn tile map in a scene (`Scene.tilemap`): reading its tiles in level coordinates and checking that it
 * fits the level. The map is only looks; the judge never reads it.
 */

/** A tile on the field: its level cell and its tile number (1 or more). */
export interface PlacedTile {
  readonly x: number
  readonly y: number
  readonly tile: number
}

/** The tiles of one layer that are not empty, in level coordinates, row by row. */
export const layerTiles = (map: TileMap, layer: TileLayer): ReadonlyArray<PlacedTile> => {
  const ox = map.x ?? 0
  const oy = map.y ?? 0
  const tiles: Array<PlacedTile> = []
  for (let i = 0; i < Math.min(layer.data.length, map.width * map.height); i++) {
    const tile = layer.data[i] ?? 0
    if (tile > 0) tiles.push({ x: ox + (i % map.width), y: oy + Math.floor(i / map.width), tile })
  }
  return tiles
}

/**
 * The tiles of every layer of a kind, in layer order. A layer that waits for an upgrade (`when`) is left out unless
 * `waiting` is set: the field shows it only after `tilemapFor`.
 */
export const tilesOfKind = (map: TileMap, kind: TileLayerKind, waiting = false): ReadonlyArray<PlacedTile> =>
  map.layers.filter((l) => l.kind === kind && (waiting || l.when === undefined)).flatMap((l) => layerTiles(map, l))

/**
 * The map as the student sees it with these upgrades: a layer that waits for an upgrade stays (as an ordinary layer)
 * when the upgrade is bought and goes away when it is not.
 */
export const tilemapFor = (map: TileMap, upgrades: ReadonlySet<string>): TileMap => ({
  ...map,
  layers: map.layers.flatMap(({ when, ...layer }) => (when === undefined || upgrades.has(when) ? [layer] : []))
})

/** The cells the map covers, in level coordinates: the field shows exactly these. */
export const tilemapView = (map: TileMap): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } => ({
  x: map.x ?? 0,
  y: map.y ?? 0,
  width: map.width,
  height: map.height
})

/**
 * What is wrong with the tile map of a level, for `checkLevel`: errors that break the drawing and warnings for a map
 * that does not match where the hero can go. Empty for a level without a map.
 */
export const tilemapIssues = (level: Level): ReadonlyArray<{ readonly level: "error" | "warning"; readonly text: string }> => {
  const map = level.scene?.tilemap
  if (map === undefined) return []
  const issues: Array<{ level: "error" | "warning"; text: string }> = []
  if (!(map.width >= 1 && map.height >= 1 && Number.isInteger(map.width) && Number.isInteger(map.height)))
    return [{ level: "error", text: "Розмір карти плиток має бути цілим і не меншим за 1" }]
  for (const layer of map.layers) {
    if (layer.data.length !== map.width * map.height)
      issues.push({ level: "error", text: `Шар «${layer.name}» має ${layer.data.length} плиток, а карта ${map.width}×${map.height}` })
    if (layer.data.some((t) => !Number.isInteger(t) || t < 0)) issues.push({ level: "error", text: `У шарі «${layer.name}» є номер плитки, що не є цілим додатним` })
  }
  const world = parseMap(level.map, level.dir)
  const view = tilemapView(map)
  if (view.x > 0 || view.y > 0 || view.x + view.width < world.width || view.y + view.height < world.height)
    issues.push({ level: "warning", text: "Карта плиток не вкриває всю мапу рівня: частину поля не буде намальовано" })
  // A layer bought later stands there too, so it is checked as well.
  const blocked = tilesOfKind(map, "objects", true).filter((t) => {
    const inside = t.x >= 0 && t.y >= 0 && t.x < world.width && t.y < world.height
    return inside && !world.walls.has(cellKey(t.x, t.y))
  })
  const first = blocked[0]
  if (first !== undefined)
    issues.push({
      level: "warning",
      text: `На стежці стоять об'єкти карти (${blocked.length}, перший на ${first.x}, ${first.y}): герой пройде крізь них. Постав там «#» або прибери об'єкт`
    })
  return issues
}
