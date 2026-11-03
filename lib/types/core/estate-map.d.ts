import type { PlacedSprite, TileMap } from "./level.ts";
/**
 * How a day of the estate looks: a Sunnyside farm drawn as a tile map around the ring of paths of `estateDay`. The
 * paths get grass edges, the farmhouse stands over the door, the orchard over the top path, the carrot bed under
 * the bottom path and the hen house beside the nests; a meadow with trees and a pond lies around. Only looks: the
 * map of the day stays the rules.
 */
export interface EstateLayout {
    /** The map of the day: `#` walls, the ring of paths and its `S`, `F` and `c` cells. */
    readonly rows: ReadonlyArray<string>;
    readonly trees: number;
    /** The column of the far end of the yard on this day. */
    readonly right: number;
    /** The row of the bottom path. */
    readonly bottom: number;
    readonly carrots: boolean;
    readonly coop: boolean;
    /** The nests: rows of the left path from 2. */
    readonly nests: number;
    /** The frame of the carrot of each tree column today, from 1 (just sown) to 4 (ripe). */
    readonly carrotFrames: ReadonlyArray<number>;
    /** The size of the map of the biggest estate: the farm is drawn for it, so nothing moves when the yard grows. */
    readonly frame: {
        readonly width: number;
        readonly height: number;
    };
    /** How many trees the orchard can have: the places of the trees not bought yet are dug. */
    readonly maxTrees: number;
}
/** The look of a day: its tile map and the pictures that stand on it. */
export declare const estateLook: (layout: EstateLayout) => {
    readonly tilemap: TileMap;
    readonly sprites: ReadonlyArray<PlacedSprite>;
};
