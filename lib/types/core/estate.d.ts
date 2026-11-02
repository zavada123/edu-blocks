import type { BlockName, Level, Season } from "./level.ts";
import type { RunResult } from "./program.ts";
/**
 * Хутір: the hero's homestead. The student writes a morning routine once, and each new day checks whether it is
 * general enough: which apples are ripe, how far the yard is snowed in and whether the hens laid eggs change every
 * day. A day is an ordinary level made by `estateDay`, so the estate runs on the same judge, field and Python.
 *
 * The app keeps the estate (`EstateState`), the routine and the coins; the functions here are pure, the same for the
 * browser and a server. Days are earned by learning (`estateDays`), and upgrades bought with coins change the map so
 * that a routine learned by heart stops working (`ESTATE_UPGRADES`).
 */
export type EstateUpgradeId = "tree" | "carrots" | "coop" | "patches" | "flowers" | "dog" | "cat";
export interface EstateUpgrade {
    readonly id: EstateUpgradeId;
    readonly name: string;
    /** What it changes, for the shop. */
    readonly about: string;
    readonly price: number;
    /** How many times it can be bought. */
    readonly max: number;
    /** An upgrade the student must have first. */
    readonly needs?: EstateUpgradeId;
}
/** The trees every estate starts with, and how many more the student can plant. */
export declare const START_TREES = 3;
export declare const MAX_TREES = 8;
export declare const ESTATE_UPGRADES: ReadonlyArray<EstateUpgrade>;
/** How many times the student bought each upgrade. */
export type EstateUpgrades = Readonly<Partial<Record<EstateUpgradeId, number>>>;
/** What the app keeps of the estate. */
export interface EstateState {
    readonly upgrades: EstateUpgrades;
    /** The day being played, from 1. */
    readonly day: number;
}
/** The first day of a new estate. */
export declare const NEW_ESTATE: EstateState;
/** How many times an upgrade is bought, within its limit (stored data can be anything). */
export declare const upgradeCount: (upgrades: EstateUpgrades, id: EstateUpgradeId) => number;
/** Whether the student can buy one more of an upgrade now. */
export declare const canBuyUpgrade: (upgrade: EstateUpgrade, upgrades: EstateUpgrades, coins: number) => boolean;
/** The upgrades after one more purchase. */
export declare const buyUpgrade: (upgrades: EstateUpgrades, id: EstateUpgradeId) => EstateUpgrades;
/** The coins spent on the estate. */
export declare const upgradesCost: (upgrades: EstateUpgrades) => number;
/** The days a new student has before passing any level. */
export declare const ESTATE_START_DAYS = 3;
/** The days the student has opened: one for each passed level of the course and three to start with. */
export declare const estateDays: (passedLevels: number) => number;
/** Whether the student may start the day after `state.day`. No timers: days come only from learning. */
export declare const canStartDay: (state: EstateState, passedLevels: number) => boolean;
/** What grows or lies on the estate. */
export type Produce = "apple" | "carrot" | "egg";
/** Coins for each thing gathered, and for a day when the hero gathered everything and came home. */
export declare const PRODUCE_COINS: Readonly<Record<Produce, number>>;
export declare const FULL_DAY_COINS = 5;
export interface EstateDay {
    readonly day: number;
    /** The level of the day: give it to `EduBlocks` or `EduPython`. */
    readonly level: Level;
    /** What lies on each `c` cell of the map. */
    readonly produce: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
        readonly kind: Produce;
    }>;
}
/** The name of the custom block when the palette has «procedure». */
export declare const ESTATE_PROCEDURE = "\u043E\u0431\u0456\u0439\u0442\u0438 \u0440\u044F\u0434";
/** The season of a day: a week each, from autumn. */
export declare const estateSeason: (day: number) => Season;
/** The blocks of the estate: those of every level the student passed, and always the hero's walk and «взяти». */
export declare const estatePalette: (passed: ReadonlyArray<Level>) => ReadonlyArray<BlockName>;
/**
 * The level of a day. The yard is a ring of paths: from the door along the orchard, down the far end of the yard,
 * back along the carrot bed and up past the hen house to the door. The trees, the bed and the hen house come from
 * the upgrades; the ripe apples, carrots, eggs and the snowed-in end of the yard come from the day number.
 */
export declare const estateDay: (state: EstateState, blocks: ReadonlyArray<BlockName>) => EstateDay;
/** Whether a level is a day of the estate (its id), so the game shows it as one. */
export declare const isEstateLevel: (levelId: string) => boolean;
/** What a run of a day gathered and the coins it brings. */
export interface Harvest {
    readonly apple: number;
    readonly carrot: number;
    readonly egg: number;
    /** The hero gathered everything and came home. */
    readonly full: boolean;
    readonly coins: number;
}
/** The harvest of a run: what the hero took before the run ended, even when it failed, and the bonus of a full day. */
export declare const estateHarvest: (day: EstateDay, result: RunResult) => Harvest;
