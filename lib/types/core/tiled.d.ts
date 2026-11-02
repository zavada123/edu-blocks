import { type Issue } from "./kit.ts";
import type { AssetRef, Level } from "./level.ts";
/**
 * A map drawn in Tiled (https://www.mapeditor.org/) as a level: its tile layers become `scene.tilemap`, a layer of
 * the cells the hero can walk becomes the `map`, and point objects become the start, the goal, the items and the
 * pictures of the scene. `scripts/tiled-to-level.ts` runs it on a `.tmj` file. See «Карта з Tiled» in the README.
 */
/** The size of a tile in pixels: Tiled maps for the field use 16 × 16 tiles, like the field's cells. */
export declare const TILED_TILE = 16;
export interface TiledOptions {
    /**
     * The pack sprite of a tileset of the map, from its `source` (`.tsx` file) or `image`, as `"sunnyside:tileset/16px"`;
     * null when it is not a tileset of a pack, which is an error: the field draws only pictures of the packs.
     */
    readonly tileset: (source: string) => AssetRef | null;
}
export interface TiledResult {
    /** The level, or null when the map has errors that keep it from being one. */
    readonly level: Level | null;
    /** Errors and warnings of the import, then those of `checkLevel` for the level. */
    readonly issues: ReadonlyArray<Issue>;
}
/** Reads a Tiled map (the JSON of a `.tmj` file) as a level. */
export declare const levelFromTiled: (json: unknown, options: TiledOptions) => TiledResult;
