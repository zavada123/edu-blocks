import { type Amounts, type FarmCode, type FarmProgram, type FarmReport, type FarmState } from "./farm.ts";
import type { BlockName, Level } from "./level.ts";
/**
 * «Журнал господарства»: a record of each working day the student ended. With each day it keeps a print of the
 * program, so the journal knows when the program was rewritten and can compare the days of each program.
 */
export interface JournalEntry {
    readonly day: number;
    /** What lay in the barn after the day. */
    readonly stored: Amounts;
    readonly used: number;
    readonly turns: number;
    readonly idle: number;
    readonly trips: number;
    readonly goblins: number;
    readonly beaten: number;
    /** The turn by which the barn had 10 logs, or null when it never had. */
    readonly tenWoodAt: number | null;
    readonly language: FarmProgram["language"];
    /** A short print of the program: the same print is the same program, whatever the places of its blocks. */
    readonly print: string;
    /** Blocks of the program, or lines of the Python code without comments and empty lines. */
    readonly size: number;
    /** The student's own blocks or functions, by their words. */
    readonly own: ReadonlyArray<string>;
    /** The blocks or functions of «Книга команд» it called and did not define itself. */
    readonly book: ReadonlyArray<string>;
    /** On a farm with a helper: what the helper put in the barn, a part of `stored`. */
    readonly helper?: Amounts;
}
/** The days the journal keeps: older days leave it. */
export declare const JOURNAL_DAYS = 60;
/** The logs of «Найшвидше 10 колод». */
export declare const TEN_WOOD = 10;
/** The print, size and own blocks of a program. `level` is the day it ran, `book` the words of the pages of the book. */
export declare const programPrint: (level: Level, code: FarmProgram, book: ReadonlyArray<string>) => Pick<JournalEntry, "language" | "print" | "size" | "own" | "book">;
/** The record of a day for the journal. */
export declare const journalEntry: (report: FarmReport, program: Pick<JournalEntry, "language" | "print" | "size" | "own" | "book">) => JournalEntry;
/**
 * The record of a day the student ended on the farm `state`, with the program that ran: the page calls it at «Завершити
 * день», before the day changes.
 */
export declare const dayRecord: (state: FarmState, report: FarmReport, code: FarmCode, blocks: ReadonlyArray<BlockName>) => JournalEntry;
/** The journal with the day: a day already there is written over, and only the last `JOURNAL_DAYS` stay. */
export declare const writeDay: (journal: ReadonlyArray<JournalEntry>, entry: JournalEntry) => ReadonlyArray<JournalEntry>;
/** All that a day put in the barn. */
export declare const harvestOf: (entry: Pick<JournalEntry, "stored">) => number;
/** One program in the journal: the days in a row it ran, and what they brought on average. */
export interface ProgramRun {
    /** 1 for the first program of the journal. */
    readonly number: number;
    readonly days: ReadonlyArray<number>;
    readonly language: JournalEntry["language"];
    readonly size: number;
    readonly own: ReadonlyArray<string>;
    readonly book: ReadonlyArray<string>;
    readonly harvest: number;
    readonly idle: number;
    readonly trips: number;
}
/** The programs of the journal, in order. A program the student came back to after another counts again. */
export declare const programRuns: (journal: ReadonlyArray<JournalEntry>) => ReadonlyArray<ProgramRun>;
/** A record of the journal: its value and the days that reached it. */
export interface JournalRecord {
    readonly value: number;
    readonly days: ReadonlyArray<number>;
}
export interface JournalRecords {
    readonly harvest: JournalRecord | null;
    readonly tenWood: JournalRecord | null;
    readonly idle: JournalRecord | null;
    readonly trips: JournalRecord | null;
}
/** «Рекорди»: the most in the barn, the fastest 10 logs, the fewest idle turns in a whole working day, the most trips. */
export declare const journalRecords: (journal: ReadonlyArray<JournalEntry>) => JournalRecords;
/** The records the newest day set, for «Рекорд!» in the report of the day: those it reached alone. */
export declare const newRecords: (journal: ReadonlyArray<JournalEntry>) => ReadonlyArray<keyof JournalRecords>;
