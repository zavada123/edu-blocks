import type { Prop, PropKind, Scene } from "../core/level.ts";
import { type Look } from "./art.ts";
import type { Decor } from "./scenery.ts";
/**
 * How a season changes the field. Tiny Swords has one summer: the other seasons lay a colour over the ground, turn
 * the trees with a filter and let something fall from the sky.
 */
/** What falls over the whole field, drawn by the stage itself. */
export type Weather = "snow" | "rain" | "leaves";
export interface Season {
    readonly weather: Weather | null;
    /** Traps are thin ice in this season, pits in the ground otherwise. */
    readonly icy: boolean;
    /** A colour laid over the ground: snow in winter, a warm haze in autumn. */
    readonly tint?: string;
    /** A canvas filter for trees and bushes, where the browser has one: bare in winter, yellow in autumn. */
    readonly plants?: string;
    /** The small things of the meadow; a decor without a look is left out (no mushrooms in the snow). */
    readonly decor: Readonly<Record<Decor, Look | null>>;
}
export declare const seasonOf: (scene: Scene) => Season;
/** The cells a prop takes on the map, from its top-left cell: what the level and the editor count with. */
export declare const PROPS: Readonly<Record<PropKind, {
    readonly width: number;
    readonly height: number;
}>>;
/** The cells a prop covers, so the scenery leaves them free. */
export declare const propCells: (props: ReadonlyArray<Prop>) => ReadonlySet<string>;
