import type { ItemKind, Prop, PropKind, Scene } from "../core/level.ts";
import type { Decor, Obstacle } from "./scenery.ts";
import waterTile from "./sprites/water.png";
/** The pictures of one season. A decor without a picture is left out (no flowers in the snow). */
export interface Season {
    readonly grass: string;
    readonly tree: string;
    readonly obstacles: Readonly<Record<Obstacle, string>>;
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
/** The cells a prop covers, so the scenery leaves them free. */
export declare const propCells: (props: ReadonlyArray<Prop>) => ReadonlySet<string>;
