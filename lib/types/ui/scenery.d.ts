import { type World } from "../core/world.ts";
/**
 * Where the field puts trees, bushes and flowers. Each cell picks its look from a hash of its place,
 * so a level always looks the same and the scenery never moves while the hero walks.
 *
 * Around the level lies a meadow about as wide as the level itself, so the map has twice the cells.
 * The meadow is only scenery: the hero never gets there, since every level is walled in.
 */
export type Obstacle = "bush" | "bushRound" | "fern" | "rock" | "stump" | "sunflower";
export type Decor = "petals" | "flower" | "tuft" | "clover" | "sprout";
type At = {
    readonly x: number;
    readonly y: number;
};
export interface Scenery {
    /** The cells to draw, in level coordinates: the meadow cells have negative or too big x and y. */
    readonly view: At & {
        readonly width: number;
        readonly height: number;
    };
    /** Top-left cells of big trees; a tree takes 2×2 blocked cells. */
    readonly trees: ReadonlyArray<At>;
    /** One per wall cell without a tree, and some in the meadow. */
    readonly obstacles: ReadonlyArray<At & {
        readonly kind: Obstacle;
    }>;
    /** Small things that do not block the way. On the path only petals: a flower there would look like a wall. */
    readonly decor: ReadonlyArray<At & {
        readonly kind: Decor;
    }>;
    /** Cells of water: ponds and the sea, with nothing growing there (see water.ts). */
    readonly water: ReadonlySet<string>;
    /**
     * Raised ground in the meadow, as the plateaus of Tiny Swords: the grass on top, by keys. Under the bottom row of
     * each plateau a cliff wall stands in the cell below (`cliffs`).
     */
    readonly plateau: ReadonlySet<string>;
    readonly cliffs: ReadonlySet<string>;
    /** Where sheep graze in the meadow: each walks between its cell and the cell to the right of it. */
    readonly sheep: ReadonlyArray<At>;
}
/** A small integer hash of a cell: the same cell always gets the same number. */
export declare const cellHash: (x: number, y: number, salt?: number) => number;
export interface SceneryOptions {
    /** Cells under props (a house, a woodshed): nothing else grows there. */
    readonly reserved?: ReadonlySet<string>;
    /** Walls of the level stay bare, as the water under a bridge. The meadow still gets its scenery. */
    readonly bareWalls?: boolean;
    /** Cells of water: no tree, bush or flower there. */
    readonly water?: ReadonlySet<string>;
}
export declare const buildScenery: (world: Pick<World, "width" | "height" | "walls" | "finish">, { reserved, bareWalls, water }?: SceneryOptions) => Scenery;
export {};
