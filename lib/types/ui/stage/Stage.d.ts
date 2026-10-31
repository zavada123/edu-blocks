import type { Scene } from "../../core/level.ts";
import type { Frame } from "../../core/program.ts";
import { type World } from "../../core/world.ts";
import { type Skin } from "./draw.ts";
export type { Skin };
/** Whether the viewer asked for less motion: then nothing moves between two cells and nothing loops. */
export declare const useReducedMotion: () => boolean;
export interface StageProps {
    /** The world at the start of the run. */
    readonly start: World;
    /** The frames of the run; none before a run. */
    readonly frames?: ReadonlyArray<Frame> | undefined;
    /** Actions played so far: see `poseAt`. A fraction is the middle of an action. */
    readonly time?: number;
    readonly skin: Skin;
    readonly scene?: Scene | undefined;
}
/**
 * The game field on a canvas. The ground is drawn once; the hero, the enemies and the effects are drawn on every
 * animation frame from `poseAt(start, frames, time)`, so the timeline can stop or jump anywhere.
 */
export declare const Stage: ({ start, frames, time, skin, scene }: StageProps) => import("react").JSX.Element;
