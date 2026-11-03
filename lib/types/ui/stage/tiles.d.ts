import type { SpriteAsset, TileInfo } from "../../core/assets.ts";
/**
 * The tile (numbered from 1) of `terrain` whose open edges are `mask`: north 1, east 2, south 4, west 8. 0 is the
 * middle of a field of it. Null when the tileset has no such tile.
 */
export declare const groundTile: (sprite: SpriteAsset, terrain: TileInfo["terrain"], mask: number) => number | null;
/** The first tile with this role, as `horizontal-middle` of a bridge. */
export declare const tileByRole: (sprite: SpriteAsset, role: string) => number | null;
