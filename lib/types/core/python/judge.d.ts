import type { Level } from "../level.ts";
import { type RunResult } from "../program.ts";
/**
 * Runs a Python program on a level and grades it, as `judgeProgram` does for blocks. Pure and synchronous:
 * the browser plays the frames, and the server runs the same text again and trusts only its own result.
 */
/** Lines of `print` kept for the student. */
export declare const MAX_OUTPUT_LINES = 200;
export declare const judgePython: (level: Level, source: string) => RunResult;
