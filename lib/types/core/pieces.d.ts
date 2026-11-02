import type { Level } from "./level.ts";
import type { Program, RunResult } from "./program.ts";
/**
 * «Продовжити звідси»: a run that ended before the goals lets the student go on from where the hero stopped, with a
 * new piece of program, instead of starting over. The pieces are never run apart. Each run joins all the pieces into
 * one program (`joinPrograms`, `joinSources`) and judges it from the start, and the screen plays only the frames
 * after the earlier pieces (`continuedResult`). So the result is always the result of one program, and the server
 * checks the same program the browser sent.
 *
 * This works because the judge is deterministic: a piece that ran to its end (`goalsNotMet`) gives the same frames as
 * the start of any program that goes on after it.
 */
/** Pieces in one try of a level. A student who needs more should start over and write a loop. */
export declare const MAX_PIECES = 8;
/** Most stars when the program was written in more than one piece: three stars ask for one program. */
export declare const PIECES_STAR_CAP = 2;
/**
 * Can the student go on from where this run stopped? Only when the program simply ended before the goals: after a
 * crash, a trap, the steps or hearts running out, or a run too long, the student starts over, so that obstacles keep
 * their meaning. A level with several fields needs one program for every field, and a «Зламаний робот» level is about
 * fixing the program it gives. In blocks, a level with a custom block or the counter keeps one program too.
 */
export declare const canContinue: (level: Level, result: RunResult, language: "blocks" | "python", pieces: number) => boolean;
/** The stars of a program written in `pieces` pieces. The first chapter (`large`) keeps its stars: there finishing matters most. */
export declare const piecesStars: (stars: RunResult["stars"], pieces: number, large: boolean) => RunResult["stars"];
/** How many scripts a program has: one for each top-level start hat. */
export declare const scriptCount: (program: Program) => number;
/** Can this piece be joined: exactly one script, under one start hat. Two scripts would run side by side. */
export declare const isPiece: (program: Program) => boolean;
/**
 * One program from the pieces, in order: the script of the first piece, then the blocks under the hat of each next
 * piece, joined to the end of the stack. Blocks outside the script do nothing in a run and are left out. Null when a
 * piece is not one script (`isPiece`).
 */
export declare const joinPrograms: (pieces: ReadonlyArray<Program>) => Program | null;
/** The id in the editor of a block of the joined program, when it is a block of piece `n`; null for another piece. */
export declare const pieceBlockId: (blockId: string | null, n: number) => string | null;
/** One Python program from the pieces, in order. Each piece starts on a new line. */
export declare const joinSources: (pieces: ReadonlyArray<string>) => string;
/** Lines of the earlier pieces: a line of the new piece is this many lines down in the joined program. */
export declare const linesBefore: (pieces: ReadonlyArray<string>) => number;
/**
 * The run of the joined program as the screen plays it: only the frames after the earlier pieces, which the student
 * has seen already. `done` is the number of frames of the earlier pieces. The grade is the grade of the whole program.
 */
export declare const continuedResult: (result: RunResult, done: number) => RunResult;
