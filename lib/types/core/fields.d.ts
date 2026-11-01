import type { Level } from "./level.ts";
import type { RunResult } from "./program.ts";
/**
 * Levels with more than one field. The same program runs on each field, and the level passes only when every field
 * passes: a student who learned the steps of one map by heart has to think in loops and questions instead.
 */
/** Fields a level can have, its own map included. More would make a run long to watch. */
export declare const MAX_FIELDS = 4;
/** The fields of a level as levels, its own map first. A level without `fields` has one field: itself. */
export declare const levelFields: (level: Level) => ReadonlyArray<Level>;
/** How many fields a level has, its own map included. */
export declare const fieldCount: (level: Level) => number;
/**
 * One grade from the runs of every field, in field order. The program passes when every field passes; the frames are
 * those of the first field that failed, or of the first field when all passed. With more than one field the result
 * names the field its frames are from (`field`) and which fields passed (`fields`). One field gives its run as it is.
 */
export declare const combineFields: (results: ReadonlyArray<RunResult>) => RunResult;
