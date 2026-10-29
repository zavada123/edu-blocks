/**
 * The game field: a grid map, the hero and the crystals. Pure functions, no VM and no DOM,
 * so the browser and the server move the hero the same way.
 */
export type Direction = "up" | "right" | "down" | "left";
export interface Cell {
    readonly x: number;
    readonly y: number;
}
/**
 * Map rows, top to bottom. `#` wall, `.` floor, `S` start, `c` crystal, `F` finish.
 * A space or a cell outside the rows is a wall too.
 */
export type MapRows = ReadonlyArray<string>;
export interface World {
    readonly width: number;
    readonly height: number;
    readonly walls: ReadonlySet<string>;
    readonly finish: Cell | null;
    /** Crystals still on the map. */
    readonly crystals: ReadonlySet<string>;
    readonly totalCrystals: number;
    readonly hero: Cell & {
        readonly dir: Direction;
    };
    /** Set once the hero walked into a wall. The run stops there. */
    readonly crashed: boolean;
}
export declare const cellKey: (x: number, y: number) => string;
export declare const parseMap: (rows: MapRows, dir?: Direction) => World;
export declare const isWall: (world: World, x: number, y: number) => boolean;
export declare const cellAhead: (world: World) => Cell;
export declare const wallAhead: (world: World) => boolean;
export declare const onCrystal: (world: World) => boolean;
export declare const atFinish: (world: World) => boolean;
export type Action = "move" | "turnLeft" | "turnRight" | "collect";
/** What one action did, for the animation and the error message. */
export type Outcome = "moved" | "crashed" | "turned" | "collected" | "nothingToCollect";
export declare const applyAction: (world: World, action: Action) => {
    readonly world: World;
    readonly outcome: Outcome;
};
