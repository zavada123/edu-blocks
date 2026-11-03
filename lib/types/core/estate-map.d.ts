import type { PlacedSprite, TileMap } from "./level.ts";
export declare const FARMHOUSE_ART: string;
export declare const HEN_HOUSE_ART: string;
/** Timber for the hen house not built yet. */
export declare const HEN_HOUSE_PLOT_ART: string;
export declare const ORCHARD_TREE_ART: string;
/** A scarecrow stands where the bed will be, until the seeds are bought. */
export declare const BED_PLOT_ART: string;
/** The hens of the hen house: the pack has sheep. */
export declare const HEN_ART: string;
/** The stages of a carrot in the bed, from just sown (1) to ripe (4): the pack grows pumpkins. */
export declare const CARROT_STAGES: ReadonlyArray<string>;
/** Dug ground: a bed or a plot for a tree, a piece of the ground tileset with pebbles. */
export declare const soilAt: (x: number, y: number) => PlacedSprite;
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
