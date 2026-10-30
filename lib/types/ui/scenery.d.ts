import { type World } from "../core/world.ts";
/**
 * Where the field puts trees, bushes and flowers. Each cell picks its look from a hash of its place,
 * so a level always looks the same and the scenery never moves while the hero walks.
 */
export type Obstacle = "bush" | "bushRound" | "fern" | "rock" | "stump" | "sunflower";
export type Decor = "petals";
export interface Scenery {
    /** Top-left cells of big trees; a tree takes 2×2 wall cells. */
    readonly trees: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
    }>;
    /** One per wall cell that has no tree. */
    readonly obstacles: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
        readonly kind: Obstacle;
    }>;
    /** Tiny petals on some floor cells. Only petals: a stone or a flower on the path would look like a wall. */
    readonly decor: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
        readonly kind: Decor;
    }>;
}
/** A small integer hash of a cell: the same cell always gets the same number. */
export declare const cellHash: (x: number, y: number, salt?: number) => number;
export declare const buildScenery: (world: Pick<World, "width" | "height" | "walls" | "finish">) => Scenery;
