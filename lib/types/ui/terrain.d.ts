/**
 * The path drawn as one piece with soft grassy edges, the way the Ninja Adventure maps have it.
 *
 * The path sheets hold the 47 pieces of a "blob" tile set (sprites/path-*.png, 11×6 tiles, from the pack's
 * tileset_floor.png). The piece of a cell depends on which of its 8 neighbours are path too. The table below is
 * the pack's own terrain data (tileset.tres) for those pieces.
 */
export declare const PATH_SHEET_COLUMNS = 11;
/** A corner counts only when both sides next to it are path too: otherwise the grass already rounds it off. */
export declare const pathMask: (isPath: (x: number, y: number) => boolean, x: number, y: number) => number;
/** Whether the sheet has a piece for this mask; every mask `pathMask` gives has one. */
export declare const hasPiece: (mask: number) => boolean;
/** The sheet piece for a path cell: its column and row in the path sheet. */
export declare const pathPiece: (isPath: (x: number, y: number) => boolean, x: number, y: number) => {
    col: number;
    row: number;
};
export declare const meadowTile: (x: number, y: number) => number;
