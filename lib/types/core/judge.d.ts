import { type ProgramSteps, type Stage } from "./hero.ts";
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
 * Custom blocks running inside each other. Only blocks that call themselves or each other go deep; the VM has no
 * limit. With own blocks («Створити блок») a cycle can make several calls for one action, so the limit leaves room
 * for that many: a run that acts ends at MAX_ACTIONS before this limit.
 */
export declare const MAX_CALL_DEPTH: number;
/** Scratch `Cast.compare`: numbers as numbers, anything else as text without case. Below 0, 0 or above 0. */
export declare const scratchCompare: (a: unknown, b: unknown) => number;
/**
 * Runs a program on one field: the map of `level` only, without its other `fields`. The rules of the game live
 * here; `judgeProgram` runs it on every field of a level.
 */
export declare const judgeField: (level: Level, own: Program) => RunResult;
/**
 * The run of a block program on a stage: alone on a level, or one worker of a crew. It gives the turn away after
 * each action (`ProgramSteps`).
 */
export declare function blocksRun(level: Level, own: Program, stage: Stage): ProgramSteps;
/** Runs a program on every field of the level (`levelFields`): one result for each field, in order. */
export declare const judgeFields: (level: Level, program: Program) => ReadonlyArray<RunResult>;
/** Grades a program: it passes only when it passes every field of the level (see `combineFields`). */
export declare const judgeProgram: (level: Level, program: Program) => RunResult;
