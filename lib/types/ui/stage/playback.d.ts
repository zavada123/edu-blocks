import type { Frame } from "../../core/program.ts";
import { type Cell, type Direction, type Enemy, type World } from "../../core/world.ts";
/**
 * What the field shows at a moment of a run. Pure: the same run and the same moment always give the same picture,
 * so the timeline can jump anywhere, play backwards or stop between two actions.
 *
 * Time `t` counts actions: at a whole `t = k` the world is as after `k` actions (0 is the start); between `k` and
 * `k + 1` frame `k` plays. In a frame the hero acts first (`HERO_PART`), then the enemies (`ENEMY_PART`); the two
 * overlap a little so the run flows.
 */
export declare const HERO_PART: readonly [number, number];
export declare const ENEMY_PART: readonly [number, number];
/** What the hero is doing: picks the sheet row and the effects. */
export type HeroAct = "idle" | "walk" | "attack" | "bump" | "fall" | "take" | "hurt";
export interface HeroPose {
    readonly x: number;
    readonly y: number;
    readonly dir: Direction;
    readonly act: HeroAct;
    /** Progress of the act, 0…1: the walking frame, the fall, the flash. */
    readonly progress: number;
    /** The hero walked into something and stays stunned: drawn with a red glow. */
    readonly crashed: boolean;
    /** Fell into a trap: drawn small and faint. */
    readonly fallen: number;
}
export interface EnemyPose {
    readonly id: number;
    readonly enemy: Enemy;
    readonly x: number;
    readonly y: number;
    readonly face: Direction;
    /** 1 while it is up; fades to 0 as it is beaten. */
    readonly opacity: number;
    /** Just struck: drawn bright for a moment. */
    readonly flash: number;
    /** Lunges toward the hero when it hits: 0…1. */
    readonly lunge: number;
}
export type EffectKind = "slash" | "smoke" | "lift" | "question" | "tired";
export interface Effect {
    readonly kind: EffectKind;
    readonly x: number;
    readonly y: number;
    /** 0…1 through the effect. */
    readonly progress: number;
}
export interface StagePose {
    /** The world for the things that only switch: items, hearts, steps, broken ice. */
    readonly world: World;
    readonly hero: HeroPose;
    readonly enemies: ReadonlyArray<EnemyPose>;
    readonly effects: ReadonlyArray<Effect>;
    /** The frame being played or the last one played, or null at the start. */
    readonly frame: Frame | null;
}
/** Where an enemy looks: at the hero when it comes for them, along its way when it walks. */
export declare const faceOf: (enemy: Enemy, hero: Cell) => Direction;
/** The picture of a run at time `t` (see the top of the file). */
export declare const poseAt: (start: World, frames: ReadonlyArray<Frame>, t: number) => StagePose;
/** The frame whose block lights up at time `t`: the one playing, or the last one played. */
export declare const frameIndexAt: (frames: ReadonlyArray<Frame>, t: number) => number;
