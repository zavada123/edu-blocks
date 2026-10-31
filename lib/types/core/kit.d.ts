import type { Step } from "./build.ts";
import { type Level } from "./level.ts";
import { type MapRows } from "./world.ts";
/**
 * Level kit: what a level editor (or a script) needs to make a level from the map signs and the scene pictures.
 * Change a map cell by cell, check that the level can be played, find a plain route for the hero and write the
 * level as code for `src/levels/index.ts`.
 *
 * Map signs: `#` wall (trees, bushes or water under a bridge), `.` floor, `S` start, `c` item, `F` finish, `x` trap.
 */
export type MapTile = "wall" | "floor" | "start" | "item" | "finish" | "trap";
/** The smallest and the largest map a level can have, walls around it included. */
export declare const MAP_LIMITS: {
    readonly min: 3;
    readonly max: 16;
};
/** A map of walls with the start in the top-left corner inside. */
export declare const emptyMap: (width: number, height: number) => MapRows;
export declare const tileAt: (map: MapRows, x: number, y: number) => MapTile;
/**
 * The map with one cell changed. A map has one start and at most one finish: putting one moves it, and the old
 * place becomes floor. The start is never painted over, so a map always keeps it.
 */
export declare const setTile: (map: MapRows, x: number, y: number, tile: MapTile) => MapRows;
/** The map cut or grown to a new size; new cells are walls, and the start stays. */
export declare const resizeMap: (map: MapRows, width: number, height: number) => MapRows;
export type IssueLevel = "error" | "warning";
export interface Issue {
    readonly level: IssueLevel;
    readonly text: string;
}
/** What keeps a level from being played (errors) and what would make it better (warnings). */
export declare const checkLevel: (level: Level) => ReadonlyArray<Issue>;
/**
 * A plain route without loops: to the nearest item each time, then to the nearest enemy (struck until it falls)
 * when the goal asks for it, then to the finish. An enemy in the way is struck too. The route is played on the
 * real rules, so walking enemies are followed. Good to check that a level can be done and to see how long a program
 * without «повторити» is. Null when the level cannot be done this way.
 */
export declare const plainRoute: (level: Level) => ReadonlyArray<Step> | null;
/** The level as a TypeScript object for `src/levels/index.ts`. */
export declare const levelSource: (level: Level) => string;
