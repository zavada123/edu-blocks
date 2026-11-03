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
    /** Which carrots are ripe today, one per tree column. */
    readonly ready: ReadonlyArray<boolean>;
    readonly day: number;
}
/** The look of a day: its tile map and the pictures that stand on it. */
export declare const estateLook: (layout: EstateLayout) => {
    readonly tilemap: TileMap;
    readonly sprites: ReadonlyArray<PlacedSprite>;
};
