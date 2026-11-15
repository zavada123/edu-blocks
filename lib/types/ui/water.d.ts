import type { FinishKind, WaterPaint } from "../core/level.ts";
import { type Cell, type World } from "../core/world.ts";
/**
 * Water on the field, as on the islands of Tiny Swords: water lies lowest, white foam laps at every shore, and the
 * grass or the sand of the path ends in a soft edge over it. Water only ever lies on cells the hero cannot enter, so
 * it changes how a level looks and never how it plays.
 *
 * A level paints its own ponds and rivers with `scene.water`. A level whose goal is a spring gets a pond of its own
 * next to the goal, so the hero comes out of the path onto its shore.
 */
type Shape = Pick<World, "width" | "height" | "walls" | "finish">;
/** What of the scene says where water lies. */
export interface WaterScene {
    readonly water?: WaterPaint | undefined;
    readonly finish?: FinishKind | undefined;
    readonly finishLook?: string | undefined;
    readonly tilemap?: unknown;
}
/** The letter of a water cell in `scene.water.rows`. */
export declare const WATER_LETTER = "~";
/**
 * The pond of a spring: the biggest block of cells next to the goal that are not the path, the house or a villager,
 * and the one that lies most straight ahead of the hero who comes to the goal along the path. Null when the goal
 * stands in a corner with no room.
 */
export declare const springPond: (world: Shape, reserved?: ReadonlySet<string>) => ReadonlyArray<Cell> | null;
/** Every water cell of the field, as keys: what the level paints, and the pond of a spring. */
export declare const waterCells: (world: Shape, scene: WaterScene, reserved?: ReadonlySet<string>) => ReadonlySet<string>;
export {};
