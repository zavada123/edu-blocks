/** A cell of the level. */
export interface Cell {
    readonly x: number;
    readonly y: number;
}
/** The part of the world that the field shows, in cells. */
export interface View {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/** The size of the level, in cells. */
export interface LevelSize {
    readonly width: number;
    readonly height: number;
}
/**
 * The cell of the level under a point of the field (`px`, `py` from the field's top left corner, in screen pixels),
 * or null when the point is on the meadow around the level.
 */
export declare const cellAt: (px: number, py: number, box: LevelSize, view: View, level: LevelSize) => Cell | null;
/** A light square on the cell under the mouse: children count the steps with it. */
export declare const drawHover: (ctx: CanvasRenderingContext2D, cell: Cell) => void;
