import type { Level } from "./level.ts";
import { type Program, type RunResult } from "./program.ts";
/**
 * Runs a program without the VM: a small interpreter for the blocks a level can have. Synchronous and pure,
 * so the browser and the server get the same result, and a server does not need scratch-vm.
 *
 * It follows the Scratch 3 sequencer. Each «коли прапорець натиснуто» script is a thread with a stack of frames,
 * as in the VM. A pass steps every thread in turn; a thread runs until the end of a loop iteration (or a custom
 * block that calls itself), then gives the turn to the next thread.
 * The tests compare it with the VM (`run.ts`) on many programs.
 */
/** Passes before a run stops as too long: the VM limit (MAX_FRAMES frames of PASSES_PER_FRAME passes). */
export declare const MAX_PASSES: number;
/** Blocks executed in one run. A program can go over it only with a damaged `next` that makes a circle. */
export declare const MAX_STEPS = 200000;
/**
 * Custom blocks running inside each other. Only a block that calls itself goes deep; the VM has no limit, but
 * each level that acts takes one of MAX_ACTIONS, so a run ends there before this limit.
 */
export declare const MAX_CALL_DEPTH = 1000;
/**
 * Runs a program on one field: the map of `level` only, without its other `fields`. The rules of the game live
 * here; `judgeProgram` runs it on every field of a level.
 */
export declare const judgeField: (level: Level, program: Program) => RunResult;
/** Runs a program on every field of the level (`levelFields`): one result for each field, in order. */
export declare const judgeFields: (level: Level, program: Program) => ReadonlyArray<RunResult>;
/** Grades a program: it passes only when it passes every field of the level (see `combineFields`). */
export declare const judgeProgram: (level: Level, program: Program) => RunResult;
