import { type BlockName, type Level } from "./level.ts";
import type { Program, RunResult } from "./program.ts";
/**
 * Хутір 2.0: a farm the student automates (analysis/hutir/plan.md). The farm stays from day to day: what was built,
 * what lies in the barn and which orders are done. A working day is a run of a fixed number of turns: the worker
 * does the student's program, wood grows again on the trees and pumpkins ripen on the beds, and what the worker puts
 * in the barn is the yield of the day. New things open by orders that ask for a yield in one day, so a better
 * algorithm, not more days, moves the farm on.
 *
 * Everything here is pure and the same in the browser and on a server, as the rest of the core.
 */
/** What the farm makes and keeps in the barn. */
export type Resource = "wood" | "pumpkin";
export declare const RESOURCES: ReadonlyArray<Resource>;
export declare const RESOURCE_NAMES: Readonly<Record<Resource, string>>;
export type Amounts = Readonly<Record<Resource, number>>;
export declare const NO_AMOUNTS: Amounts;
/** What an order opens: a building or a tool that changes how the farm works. */
export type FarmUnlock = "beds" | "basket" | "longDay" | "cart";
export interface FarmUnlockInfo {
    readonly id: FarmUnlock;
    readonly name: string;
    readonly about: string;
}
export declare const FARM_UNLOCKS: ReadonlyArray<FarmUnlockInfo>;
/** What the student keeps of the farm. */
export interface FarmState {
    /** The next working day, from 1: it decides which trees have wood and which pumpkins are ripe in the morning. */
    readonly day: number;
    /** Trees in the forest row; with «Грядки» each tree has a bed under it. */
    readonly trees: number;
    readonly unlocked: ReadonlyArray<FarmUnlock>;
    /** What lies in the barn now. */
    readonly stock: Amounts;
    /** The best grade of each order by its id: 1 done, 2 efficient, 3 universal. */
    readonly orders: Readonly<Record<string, number>>;
}
export declare const NEW_FARM: FarmState;
/** The turns of a working day, and of a day with «Ліхтар». */
export declare const DAY_TURNS = 120;
export declare const LONG_DAY_TURNS = 160;
/** What the worker carries at once: with bare hands, a basket and a cart. */
export declare const HANDS = 3;
export declare const BASKET = 5;
export declare const CART = 8;
/** Turns until a tree has wood again after it was cut, and until a sown pumpkin is ripe. */
export declare const WOOD_REGROW = 16;
export declare const PUMPKIN_GROW = 24;
export declare const has: (state: FarmState, unlock: FarmUnlock) => boolean;
export declare const farmTurns: (state: FarmState) => number;
export declare const farmCapacity: (state: FarmState) => number;
/**
 * The blocks of the farm: what the student learned in the course, the worker's walk, «взяти» and the barn, and
 * the beds once they are built.
 */
export declare const farmPalette: (state: FarmState, learned: ReadonlyArray<BlockName>) => ReadonlyArray<BlockName>;
/**
 * The level of a working day. The farm is a ring of paths: the barn in the farmhouse at the top-left corner, the
 * worker next to it, the forest along the top path and the beds along the bottom path. The day number decides which
 * trees have wood and which pumpkins are ripe in the morning; a tree without wood grows it during the day.
 */
export declare const farmDay: (state: FarmState, blocks: ReadonlyArray<BlockName>, day?: number) => Level;
/** The student's program for the worker, in blocks or in Python. */
export type FarmProgram = {
    readonly language: "blocks";
    readonly program: Program;
} | {
    readonly language: "python";
    readonly source: string;
};
/** What a working day brought, for the report under the field and for the orders. */
export interface FarmReport {
    readonly day: number;
    /** What the worker put in the barn. */
    readonly stored: Amounts;
    /** What the worker still carried when the day ended: it is lost. */
    readonly carried: Amounts;
    /** The turn by which the barn had each amount: `byTurn[n]` is the yield after n + 1 turns. */
    readonly byTurn: ReadonlyArray<Amounts>;
    /** Turns spent on actions that did nothing: «взяти» on an empty cell, «посіяти» off an empty bed and the like. */
    readonly idle: number;
    /** Turns the program used; fewer than the day when it stopped early. */
    readonly used: number;
    readonly turns: number;
    /** Why the day ended before its turns: the worker walked into a fence, or the program has a mistake. */
    readonly stopped: RunResult["reason"];
    /** The explanation of a mistake in the program, as the judge gives it. */
    readonly detail?: string;
    readonly line?: number;
}
/** Reads the yield of a day from the frames: what each «взяти» took, and what each «віднести на склад» put down. */
export declare const farmReport: (level: Level, result: RunResult, day: number) => FarmReport;
/** Runs the worker's program through one day of the farm. */
export declare const runFarmDay: (state: FarmState, code: FarmProgram, blocks: ReadonlyArray<BlockName>, day?: number) => {
    readonly level: Level;
    readonly result: RunResult;
    readonly report: FarmReport;
};
/** The farm after a working day: the yield goes to the barn and the next day comes. A trial run changes nothing. */
export declare const finishDay: (state: FarmState, report: FarmReport) => FarmState;
/** An order of the village: a yield in one working day. */
export interface FarmOrder {
    readonly id: string;
    readonly title: string;
    /** Who asks and why, in one or two sentences. */
    readonly text: string;
    readonly needs: Partial<Amounts>;
    /** The turns within which the yield must be in the barn for «Ефективно». */
    readonly fast: number;
    /** The order that must be done first. */
    readonly after?: string;
    readonly unlocks?: FarmUnlock;
}
export declare const FARM_ORDERS: ReadonlyArray<FarmOrder>;
/** The orders the student can take now: not done yet, and the one before them is done. */
export declare const openOrders: (state: FarmState) => ReadonlyArray<FarmOrder>;
/** The turn after which the barn first held what the order needs, or null when it never did that day. */
export declare const metAt: (report: FarmReport, needs: Partial<Amounts>) => number | null;
/** Days an order is checked on, and on how many more for «Універсально». */
export declare const ORDER_DAYS = 3;
export declare const UNIVERSAL_DAYS = 5;
export declare const ORDER_GRADES: readonly ["Не виконано", "Виконано", "Ефективно", "Універсально"];
export interface OrderCheck {
    /** 0 not done, 1 done on every checked day, 2 also within `fast` turns, 3 also on a bigger farm on more days. */
    readonly grade: 0 | 1 | 2 | 3;
    /** The reports of the days the order was checked on. */
    readonly reports: ReadonlyArray<FarmReport>;
}
/**
 * Checks an order with the student's program: it must bring the yield on three different days, from the next working
 * day on, so a program that remembers one morning does not pass. «Ефективно» asks for it within `fast` turns, and
 * «Універсально» asks the same on five days of a farm with one more tree.
 */
export declare const checkOrder: (state: FarmState, order: FarmOrder, code: FarmProgram, blocks: ReadonlyArray<BlockName>) => OrderCheck;
/** The farm after an order was checked: its best grade, and what it opens. */
export declare const recordOrder: (state: FarmState, order: FarmOrder, grade: number) => FarmState;
/** What one more tree costs: the price grows with the forest, so a better program pays more than more days. */
export declare const treePrice: (state: FarmState) => Amounts;
export declare const canPlantTree: (state: FarmState) => boolean;
/** One more tree, and one more bed under it, paid from the barn. */
export declare const plantTree: (state: FarmState) => FarmState;
/** Whether a level is a day of the farm (its id). */
export declare const isFarmLevel: (levelId: string) => boolean;
/** All the barn held after a day, both resources together: the height of a bar in the chart of the report. */
export declare const totalOf: (amounts: Amounts) => number;
/**
 * What to improve after a working day, in the words of the report: the turns spent for nothing, what was left in the
 * hands, a program that stopped before the evening. At most three tips, the most useful first.
 */
export declare const farmTips: (report: FarmReport, capacity: number, language?: "blocks" | "python") => ReadonlyArray<string>;
