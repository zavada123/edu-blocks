import { type ProgramSteps, type Stage } from "../hero.ts";
import { type Level } from "../level.ts";
import { type RunResult } from "../program.ts";
/**
 * Runs a Python program on a level and grades it, as `judgeProgram` does for blocks. Pure and synchronous:
 * the browser plays the frames, and the server runs the same text again and trusts only its own result.
 */
/** Lines of `print` kept for the student. */
export declare const MAX_OUTPUT_LINES = 200;
/** Runs a Python program on one field: the map of `level` only, without its other `fields`. */
export declare const judgePythonField: (level: Level, source: string) => RunResult;
/**
 * The run of a Python program on a stage: alone on a level, or one worker of a crew. It gives the turn away after
 * each action (`ProgramSteps`).
 */
export declare function pythonRun(level: Level, source: string, stage: Stage): ProgramSteps;
/** Runs a Python program on every field of the level: one result for each field, in order. */
export declare const judgePythonFields: (level: Level, source: string) => ReadonlyArray<RunResult>;
/** Grades a Python program: it passes only when it passes every field of the level (see `combineFields`). */
export declare const judgePython: (level: Level, source: string) => RunResult;
