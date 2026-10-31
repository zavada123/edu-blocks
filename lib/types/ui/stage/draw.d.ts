import type { Scene } from "../../core/level.ts";
import { type World } from "../../core/world.ts";
import { type Season } from "../look.ts";
import { type Scenery } from "../scenery.ts";
import type { StagePose } from "./playback.ts";
import type { HeroId } from "../../core/heroes.ts";
/**
 * Drawing the field on a canvas. Pixel art from the Ninja Adventure pack (CC0), see sprites/CREDITS.md.
 * One cell is one 16×16 tile; the canvas is scaled so that a picture pixel is a whole number of screen pixels.
 * The ground, trees and props do not move, so they are drawn once (`drawGround`); everything else is drawn
 * each animation frame (`drawActors`) in layers: villagers, traps, the goal, items, enemies, the hero, effects,
 * weather and the counters on top.
 */
export declare const CELL = 16;
/** Hero looks: the heroes of `HEROES`. */
export type Skin = HeroId;
/** The sheet of a hero look: its first frame is the hero facing down, for a portrait. */
export declare const heroSheetOf: (skin: Skin) => string;
type Ctx = CanvasRenderingContext2D;
export interface GroundInput {
    readonly world: World;
    readonly scene: Scene;
    readonly season: Season;
    readonly scenery: Scenery;
}
/** Grass, meadow, the path or the ice, flowers, bushes that do not sway, trees and props. */
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
    /** Milliseconds, for the looping animations: flags, flames, bushes in the wind, weather. */
    readonly now: number;
    /** The viewer asked for less motion: nothing loops and no weather falls. */
    readonly still: boolean;
    /** The counter of the program, when the level has one. */
    readonly counter?: string | undefined;
}
/** Everything that moves or changes, over the ground. */
export declare const drawActors: (ctx: Ctx, input: ActorsInput) => void;
export {};
