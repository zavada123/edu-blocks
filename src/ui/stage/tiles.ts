import type { SpriteAsset, TileInfo } from "../../core/assets.ts"

/**
 * Tiles of a described tileset by what they show, not by number: the packs number their tiles differently, so the
 * code asks for «grass with edges to the north and west» and gets the tile of whichever pack it draws.
 */

const byKey = new WeakMap<SpriteAsset, ReadonlyMap<string, number>>()

const keysOf = (sprite: SpriteAsset): ReadonlyMap<string, number> => {
  const known = byKey.get(sprite)
  if (known !== undefined) return known
  const keys = new Map<string, number>()
  for (const t of sprite.tiles ?? []) {
    if (t.mask !== undefined && (t.role === "fill" || t.role === "edge")) keys.set(`${t.terrain}/${t.mask}`, t.index)
    if (!keys.has(`role:${t.role}`)) keys.set(`role:${t.role}`, t.index)
  }
  byKey.set(sprite, keys)
  return keys
}

/**
 * The tile (numbered from 1) of `terrain` whose open edges are `mask`: north 1, east 2, south 4, west 8. 0 is the
 * middle of a field of it. Null when the tileset has no such tile.
 */
export const groundTile = (sprite: SpriteAsset, terrain: TileInfo["terrain"], mask: number): number | null =>
  keysOf(sprite).get(`${terrain}/${mask}`) ?? null

/** The first tile with this role, as `horizontal-middle` of a bridge. */
export const tileByRole = (sprite: SpriteAsset, role: string): number | null => keysOf(sprite).get(`role:${role}`) ?? null
