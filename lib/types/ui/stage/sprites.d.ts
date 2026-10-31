import { type AssetPack, type SpriteAsset } from "../../core/assets.ts";
import type { PlacedSprite } from "../../core/level.ts";
import { type Direction } from "../../core/world.ts";
type Ctx = CanvasRenderingContext2D;
export interface Resolved {
    readonly pack: AssetPack;
    readonly sprite: SpriteAsset;
}
export interface FigureOptions {
    /** The middle of the bottom edge, where the figure stands. */
    readonly cx: number;
    readonly bottom: number;
    readonly clip?: string | null | undefined;
    readonly dir?: Direction;
    readonly now: number;
    /** Mirrored left to right, on top of the clip's own mirroring. */
    readonly flip?: boolean;
    /** Grows the figure, as a boss. */
    readonly scale?: number;
}
/** A figure standing at (`cx`, `bottom`). Returns the top edge it was drawn to, or null when not drawn yet. */
export declare const drawFigure: (ctx: Ctx, found: Resolved, o: FigureOptions) => number | null;
/** A sprite looks this way unless it says otherwise: tiles and animated ground lie flat, the rest stands up. */
export declare const layerOf: (placed: PlacedSprite, found: Resolved | null) => "ground" | "object";
/** Whether the placed sprite plays an animation of more than one frame: then it is drawn every animation frame. */
export declare const isAnimated: (placed: PlacedSprite, found: Resolved) => boolean;
/** A placed sprite. Tiles lie from the cell's top-left corner; anything else stands on the cell. */
export declare const drawPlaced: (ctx: Ctx, placed: PlacedSprite, now: number) => void;
/** The cells a placed sprite covers on the field, so no bush or tree grows under it. */
export declare const placedCells: (placed: PlacedSprite) => ReadonlyArray<string>;
/** Where the bottom edge of a placed sprite is, to draw what stands lower later. */
export declare const placedDepth: (placed: PlacedSprite) => number;
export {};
