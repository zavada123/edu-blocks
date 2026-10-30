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
}
/** A small integer hash of a cell: the same cell always gets the same number. */
export declare const cellHash: (x: number, y: number, salt?: number) => number;
export declare const buildScenery: (world: Pick<World, "width" | "height" | "walls" | "finish">) => Scenery;
export {};
