import VirtualMachine from "scratch-vm";
import { type Level } from "./level.ts";
import { type Action, type Outcome, type World } from "./world.ts";
/**
 * A program is the `blocks` object of the hero sprite in a Scratch 3 project (project.json):
 * block id → block. The browser sends it; the server runs it again with `runProgram` and trusts only that result.
 */
export type Program = Readonly<Record<string, unknown>>;
export declare const MAX_PROGRAM_BLOCKS = 300;
/** Hero actions in one run. A textbook level needs fewer than 100. */
export declare const MAX_ACTIONS = 1000;
/** VM frames in one run. A «завжди» loop without actions ends here. */
export declare const MAX_FRAMES = 2000;
export type FailReason = "badProgram" | "noStart" | "crashed" | "goalsNotMet" | "tooLong";
export interface Frame {
    readonly action: Action;
    readonly outcome: Outcome;
    /** The block that made the move, to highlight it in the editor. */
    readonly blockId: string | null;
    readonly world: World;
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
    readonly frames: ReadonlyArray<Frame>;
    readonly world: World;
}
/** Checks the program shape and palette before the VM sees it. Returns the error text or the block count. */
export declare const checkProgram: (level: Level, program: Program) => {
    readonly error: string;
} | {
    readonly blocks: number;
    readonly hasStart: boolean;
};
/** A project with the stage and one sprite whose blocks are the program. */
export declare const projectFor: (program: Program) => object;
/** What the hero blocks do in one run. */
interface Session {
    world: World;
    readonly frames: Array<Frame>;
    done: boolean;
    reason: FailReason | null;
}
export declare const withVmLock: <T>(work: () => Promise<T>) => Promise<T>;
/** Lets the VM finish registering extension blocks (it does this in a promise). */
export declare const settle: () => Promise<unknown>;
export declare const createVm: (level: Level | null, session: Session | null) => VirtualMachine;
/** Runs the program on the level from the start hat «коли натиснуто прапорець» and checks the goals. */
export declare const runProgram: (level: Level, program: Program) => Promise<RunResult>;
export {};
