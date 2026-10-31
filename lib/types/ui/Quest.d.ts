import { type Level } from "../core/level.ts";
import type { World } from "../core/world.ts";
/** The task of the level on parchment: what to do, the goals that tick as the hero meets them, and the star sizes. */
export declare const Quest: ({ level, start, world }: {
    readonly level: Level;
    readonly start: World;
    readonly world: World;
}) => import("react").JSX.Element;
