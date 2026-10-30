import type { ItemKind, NpcKind, Prop, PropKind, Scene } from "../core/level.ts";
import type { Decor, Obstacle } from "./scenery.ts";
import waterTile from "./sprites/water.png";
/** A bush that sways: a strip of 16×16 frames played in a loop. */
export interface Swaying {
    readonly href: string;
    readonly frames: number;
}
/** The pictures of one season. A decor without a picture is left out (no flowers in the snow). */
export interface Season {
    /** One ground tile, or a sheet of 7 meadow tiles (see `meadowTile`). */
    readonly grass: string;
    readonly meadow: string | null;
    /** The 11×6 sheet of path pieces (see terrain.ts). */
    readonly path: string;
    /** Snow falling over the whole field. */
    readonly snowfall: string | null;
    readonly tree: string;
    readonly obstacles: Readonly<Record<Obstacle, string>>;
    /** Obstacles drawn as swaying bushes instead of the still picture. */
    readonly swaying: Partial<Readonly<Record<Obstacle, Swaying>>>;
    readonly decor: Readonly<Record<Decor, string | null>>;
}
export declare const seasonOf: (scene: Scene) => Season;
export declare const FLOORS: Readonly<Record<NonNullable<Scene["ground"]>, string>>;
export { waterTile };
/** Items as 16×16 tiles; a campfire draws its flame on top once lit. */
export declare const ITEM_TILES: Readonly<Record<ItemKind, string>>;
export declare const PROPS: Readonly<Record<PropKind, {
    readonly href: string;
    readonly width: number;
    readonly height: number;
}>>;
/** Character sheets of the villagers: 64×112, a column per direction, as the hero sheets. */
export declare const NPCS: Readonly<Record<NpcKind, string>>;
/** The cells a prop covers, so the scenery leaves them free. */
export declare const propCells: (props: ReadonlyArray<Prop>) => ReadonlySet<string>;
