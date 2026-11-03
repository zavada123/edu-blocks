import type { TileMap } from "./level.ts";
/**
 * Pieces of the Sunnyside World tileset (`sunnyside:tileset/16px`, 64 columns) for maps built in code, and the corner
 * brush that Tiled's terrain sets use (`tiled/sunnyside-16px.tsx`), so code and Tiled draw the same edges.
 */
export declare const SUNNYSIDE_TILESET = "sunnyside:tileset/16px";
/** The tile number of a tileset cell, counted from 1 as tile layers count them. */
export declare const sunnysideTile: (col: number, row: number) => number;
/**
 * The autotiles of the Sunnyside GameMaker project: entry i is the tile (cell index) whose EMPTY corners are the bits
 * of i, top-left 1, top-right 2, bottom-left 4, bottom-right 8. 0 is no tile.
 */
export declare const SUNNYSIDE_TERRAIN: {
    readonly path: readonly [449, 450, 451, 452, 453, 454, 455, 456, 513, 514, 515, 516, 517, 518, 519, 0];
    readonly soil: readonly [460, 461, 462, 463, 464, 465, 466, 467, 524, 525, 526, 527, 528, 529, 530, 0];
    readonly water: readonly [470, 471, 472, 473, 474, 475, 476, 477, 534, 535, 536, 537, 538, 539, 540, 0];
};
export type SunnysideTerrain = keyof typeof SUNNYSIDE_TERRAIN;
/** The plain grass and its variants with a few blades and spots. */
export declare const GRASS: number;
export declare const GRASS_VARIANTS: ReadonlyArray<number>;
/** Small things on the grass that stand like objects: bushes, a rock, a stump. */
export declare const SHRUBS: ReadonlyArray<number>;
/** Flowers that lie flat. */
export declare const FLOWERS: ReadonlyArray<number>;
/** A building of 3 × 4 tiles: its top-left tileset cell. The door is in the middle of the bottom row. */
export declare const FARMHOUSE: {
    readonly col: 32;
    readonly row: 34;
};
export declare const HEN_HOUSE: {
    readonly col: 32;
    readonly row: 18;
};
/**
 * The tiles of a terrain over a map of `width × height` cells whose top-left is level cell (x, y): every corner of
 * every given cell is filled, and each tile shows the edges of its four corners, as Tiled's terrain brush paints them.
 * 0 where no corner is filled.
 */
export declare const terrainTiles: (terrain: SunnysideTerrain, cells: Iterable<{
    readonly x: number;
    readonly y: number;
}>, area: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}) => Array<number>;
/** An empty layer for a map. */
export declare const emptyLayer: (map: Pick<TileMap, "width" | "height">) => Array<number>;
