import type { Level, TileLayer, TileLayerKind, TileMap } from "./level.ts";
/**
 * A hand-drawn tile map in a scene (`Scene.tilemap`): reading its tiles in level coordinates and checking that it
 * fits the level. The map is only looks; the judge never reads it.
 */
/** A tile on the field: its level cell and its tile number (1 or more). */
export interface PlacedTile {
    readonly x: number;
    readonly y: number;
    readonly tile: number;
}
/** The tiles of one layer that are not empty, in level coordinates, row by row. */
export declare const layerTiles: (map: TileMap, layer: TileLayer) => ReadonlyArray<PlacedTile>;
/** The tiles of every layer of a kind, in layer order. */
export declare const tilesOfKind: (map: TileMap, kind: TileLayerKind) => ReadonlyArray<PlacedTile>;
/** The cells the map covers, in level coordinates: the field shows exactly these. */
export declare const tilemapView: (map: TileMap) => {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
};
/**
 * What is wrong with the tile map of a level, for `checkLevel`: errors that break the drawing and warnings for a map
 * that does not match where the hero can go. Empty for a level without a map.
 */
export declare const tilemapIssues: (level: Level) => ReadonlyArray<{
    readonly level: "error" | "warning";
    readonly text: string;
}>;
