import type { TileInfo } from "./assets.ts";
import type { Level, TerrainPaint } from "./level.ts";
import type { PlacedTile } from "./tilemap.ts";
/** The letter of `TerrainPaint.rows` that leaves a cell to the base. */
export declare const EMPTY = ".";
export interface CellShape {
    readonly mask: number;
    readonly corners: number;
}
/** A ground of a described tileset: `"ninja-adventure:tileset/floor#path"` is the sprite and the terrain in it. */
export declare const parseTerrainRef: (ref: string) => {
    readonly sprite: string;
    readonly terrain: string;
} | null;
export declare const terrainRef: (sprite: string, terrain: string) => string;
/** Where a cell's ground ends and which of its inner corners are open, given which cells have the same ground. */
export declare const shapeAt: (same: (x: number, y: number) => boolean, x: number, y: number) => CellShape;
/**
 * The tile (numbered from 1) of `terrain` for a cell of this shape, or null when the tileset has nothing near it.
 * Without a tile for every open inner corner, the one with the most of them (and no others) stands in; the edges
 * must match. A whole cell now and then shows a `variant` tile: grass with a tuft.
 */
export declare const pickTile: (tiles: ReadonlyArray<TileInfo>, terrain: string, shape: CellShape, x?: number, y?: number) => number | null;
/** The ground painted on a level cell (`"<tileset>#<terrain>"`), or null where the base lies. */
export declare const groundAt: (paint: TerrainPaint, x: number, y: number) => string | null;
/**
 * The tiles of one ground of a painting, in level coordinates. `tilesOf` gives the described tiles of a tileset by its
 * sprite reference (null while it loads). A cell with no fitting tile is left out.
 */
export declare const paintTiles: (paint: TerrainPaint, letter: string, tilesOf: (sprite: string) => ReadonlyArray<TileInfo> | null) => ReadonlyArray<PlacedTile>;
/** The whole tiles of the base ground over a rectangle of level cells: grass with a tuft here and there. */
export declare const baseTiles: (ref: string, view: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}, tilesOf: (sprite: string) => ReadonlyArray<TileInfo> | null) => ReadonlyArray<PlacedTile>;
/** The level cells a painting covers with a ground, as `x,y` keys: no tree or bush of the meadow grows there. */
export declare const paintedCells: (paint: TerrainPaint) => ReadonlyArray<string>;
/** The grounds of a painting in drawing order: the letters as `kinds` lists them. */
export declare const paintLetters: (paint: TerrainPaint) => ReadonlyArray<string>;
/** The sprites a painting draws from, for loading their packs. */
export declare const paintSprites: (paint: TerrainPaint) => ReadonlyArray<string>;
/**
 * A painting with one cell changed. The rows grow to reach the cell, to the left and up too (the origin moves), and
 * shrink back when the cell was at their end.
 */
export declare const paintCell: (paint: TerrainPaint, x: number, y: number, letter: string) => TerrainPaint;
/** The letter that paints a ground in a painting: the one it already has, or the first free one. */
export declare const letterFor: (paint: TerrainPaint, ref: string) => {
    readonly paint: TerrainPaint;
    readonly letter: string;
};
/** Grounds no cell paints any more are left out of `kinds`. */
export declare const dropUnused: (paint: TerrainPaint) => TerrainPaint;
/** What is wrong with the painted ground of a level, for `checkLevel`. Empty for a level without one. */
export declare const terrainIssues: (level: Level) => ReadonlyArray<{
    readonly level: "error" | "warning";
    readonly text: string;
}>;
