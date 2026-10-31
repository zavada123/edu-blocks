import type { ItemKind, NpcKind, Prop, PropKind, Scene } from "../core/level.ts";
import { type EnemyKind } from "../core/world.ts";
import type { Decor, Obstacle } from "./scenery.ts";
import waterTile from "./sprites/water.png";
/** A bush that sways: a strip of 16×16 frames played in a loop. */
export interface Swaying {
    readonly href: string;
    readonly frames: number;
}
/** Weather over the whole field: a picture (320×240, drawn at half size) that drifts down in a loop. */
export interface Weather {
    readonly href: string;
    /** How far the picture drifts sideways in one loop, as a share of its width. */
    readonly drift: number;
    /** Seconds for one loop. */
    readonly seconds: number;
}
/** The pictures of one season. A decor without a picture is left out (no flowers in the snow). */
export interface Season {
    /** One ground tile, or a sheet of 7 meadow tiles (see `meadowTile`). */
    readonly grass: string;
    readonly meadow: string | null;
    /** The 11×6 sheet of path pieces (see terrain.ts). */
    readonly path: string;
    /** Snow, rain or leaves falling over the whole field. */
    readonly weather: Weather | null;
    /** Traps are thin ice in this season, pits in the ground otherwise. */
    readonly icy: boolean;
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
/** Monster sheets: 64×64, a column per direction and a row per frame. */
export declare const ENEMIES: Readonly<Record<EnemyKind, string>>;
/** The cells a prop covers, so the scenery leaves them free. */
export declare const propCells: (props: ReadonlyArray<Prop>) => ReadonlySet<string>;
