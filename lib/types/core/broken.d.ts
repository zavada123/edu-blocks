import type { Level } from "./level.ts";
import type { Program } from "./program.ts";
/** The blocks a «Зламаний робот» level opens with, or null for a level without a broken program. */
export declare const brokenProgram: (level: Level) => Program | null;
/** The broken program of a level as Python code, or null for a level without one. */
export declare const brokenSource: (level: Level) => string | null;
