import type { HeroId } from "../../core/heroes.ts";
import type { Scene } from "../../core/level.ts";
import { type World } from "../../core/world.ts";
import { type Season } from "../look.ts";
import { type Scenery } from "../scenery.ts";
import type { StagePose } from "./playback.ts";
/**
 * Drawing the field on a canvas, all from the Tiny Swords packs (see art.ts). One cell is 16 canvas units; a pack
 * picture is scaled so that one cell of the pack (64 pixels) is one cell of the field. The ground and the bushes do
 * not move, so they are drawn once (`drawGround`); everything else is drawn each animation frame (`drawActors`):
 * villagers, traps, the goal, items, trees, enemies and the hero by depth, effects, weather and the counters on top.
 */
export declare const CELL = 16;
/** Hero looks: the heroes of `HEROES`. */
export type Skin = HeroId;
type Ctx = CanvasRenderingContext2D;
export interface GroundInput {
    readonly world: World;
    readonly scene: Scene;
    readonly season: Season;
    readonly scenery: Scenery;
}
/** Grass, the ground or the ice under the path, flowers, bushes and stones; or the flat layers of a tile map. */
export declare const drawGround: (ctx: Ctx, { world, scene, season, scenery }: GroundInput) => void;
export interface ActorsInput {
    readonly pose: StagePose;
    readonly scene: Scene;
    readonly season: Season;
    readonly scenery: Scenery;
    readonly skin: Skin;
    /** Every item cell of the level, also the taken ones: a lit campfire stays where it was. */
    readonly items: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
    }>;
    /** Milliseconds, for the looping animations: flags, flames, trees in the wind, weather. */
    readonly now: number;
    /** The viewer asked for less motion: nothing loops and no weather falls. */
    readonly still: boolean;
    /** The counter of the program, when the level has one. */
    readonly counter?: string | undefined;
}
/** Everything that moves or changes, over the ground. */
export declare const drawActors: (ctx: Ctx, input: ActorsInput) => void;
export {};
