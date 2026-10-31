import { type Level } from "./level.ts";
import type { Action, GameEvent, Outcome, World } from "./world.ts";
/**
 * A program is the `blocks` object of the hero sprite in a Scratch 3 project (project.json):
 * block id → block. The browser sends it; the server checks it again with `judgeProgram` and trusts only that result.
 */
export type Program = Readonly<Record<string, unknown>>;
export declare const MAX_PROGRAM_BLOCKS = 300;
/** Hero actions in one run. A textbook level needs fewer than 100. */
export declare const MAX_ACTIONS = 1000;
/** VM frames in one run. A «завжди» loop without actions ends here. */
export declare const MAX_FRAMES = 2000;
/**
 * Passes over the threads in one VM frame. The VM measures a frame in milliseconds; this package counts passes
 * instead, so a run gives the same result on a slow phone and on the server.
 */
export declare const PASSES_PER_FRAME = 20;
/** `defeated`: the enemies took all the hearts. `trapped`: the hero stepped on a trap. `tired`: no steps left. */
export type FailReason = "badProgram" | "noStart" | "crashed" | "trapped" | "tired" | "defeated" | "goalsNotMet" | "tooLong";
/** The reason a run stops after this outcome, or null when it goes on. */
export declare const fatalReason: (outcome: Outcome) => FailReason | null;
export interface Frame {
    readonly action: Action;
    readonly outcome: Outcome;
    /** The block that made the move, to highlight it in the editor. */
    readonly blockId: string | null;
    /** What happened during the action, in order: see `GameEvent`. */
    readonly events: ReadonlyArray<GameEvent>;
    /** Which goals of the level are met after the action, in the order of `level.goals`. */
    readonly goals: ReadonlyArray<boolean>;
    readonly world: World;
    /** The counter after the move, on a level with «лічильник». */
    readonly counter?: string;
    /** The line of the Python program that made the move, to highlight it in the code editor. */
    readonly line?: number;
}
export interface RunResult {
    readonly levelId: string;
    readonly passed: boolean;
    /** 0 when not passed. */
    readonly stars: 0 | 1 | 2 | 3;
    /** Blocks in the program, the start hat and number fields not counted. */
    readonly blocks: number;
    readonly collected: number;
    readonly totalCrystals: number;
    readonly reason: FailReason | null;
    /** For `badProgram`: what is wrong. */
    readonly detail?: string;
    /** For `badProgram` in a Python program: the line of the mistake. */
    readonly line?: number;
    /** What a Python program printed with `print`. */
    readonly output?: ReadonlyArray<string>;
    readonly frames: ReadonlyArray<Frame>;
    readonly world: World;
}
/** Checks the program shape and palette before it runs. Returns the error text or the block count. */
export declare const checkProgram: (level: Level, program: Program) => {
    readonly error: string;
} | {
    readonly blocks: number;
    readonly hasStart: boolean;
};
/** What the hero did in one run. */
export interface Session {
    world: World;
    readonly frames: Array<Frame>;
    done: boolean;
    reason: FailReason | null;
}
export declare const resultOf: (level: Level, session: Session, blocks: number, extra?: Partial<RunResult>) => RunResult;
