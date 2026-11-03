/**
 * Pieces of the Tiny Swords ground tileset (`tiny-swords:tileset/ground`, 10 columns of 64×64) for maps built in
 * code. Grass and sand are autotiles: a cell takes the tile whose open edges (north 1, east 2, south 4, west 8) are
 * the sides where its neighbour is not the same ground. The edges are soft and see-through, so grass laid over sand
 * shows a sandy border, as the islands of the pack are drawn. The manifest describes the same tiles (`tiles`).
 */
export declare const TINY_SWORDS_GROUND = "tiny-swords:tileset/ground";
export declare const TINY_SWORDS_WATER = "tiny-swords:tileset/water";
/** The tile number of a tileset cell, counted from 1 as tile layers count them. */
export declare const tinySwordsTile: (col: number, row: number) => number;
export type TinySwordsGround = "grass" | "sand";
/** The tile of `ground` whose open edges are `mask`. */
export declare const groundTileOf: (ground: TinySwordsGround, mask: number) => number;
/** A few pebbles on the sand: a dug bed, a plot for a tree. */
export declare const SAND_DETAIL: number;
/**
 * The grass of a map of `width × height` cells whose top-left is level cell (x, y): every cell that is not `low`
 * (a path, a pond) gets grass with edges toward the low cells; 0 on the low cells, where the sand below shows.
 */
export declare const grassOver: (low: (x: number, y: number) => boolean, area: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}) => Array<number>;
