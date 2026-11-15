import type { BlockName } from "./level.ts";
/**
 * Ремесла of the farm (analysis/hutir/plan.md, 5.1 and 5.2). A craft grows from what the student's programs put in
 * the barn, never from work by hand: each level gives something the program can use. Level 2 gives a question, level
 * 3 makes the farm grow faster, level 4 gives a tool with a new block and level 5 a title.
 *
 * Pure, as the rest of the core: the farm keeps only the yield of its programs (`FarmState.produced`).
 */
export type CraftId = "woodcutter" | "gardener";
/** What a craft counts: logs or pumpkins the programs put in the barn. */
export type CraftResource = "wood" | "pumpkin";
export interface CraftStep {
    /** The yield from which this level is reached. */
    readonly from: number;
    /** What the level gives, in the words of the craft card. */
    readonly gives: string;
    /** The block the level brings into the palette. */
    readonly block?: BlockName;
    /** The tool the level gives. */
    readonly tool?: string;
}
export interface Craft {
    readonly id: CraftId;
    readonly name: string;
    readonly resource: CraftResource;
    /** The title of the last level. */
    readonly title: string;
    /** Levels 1 to 5: the first from the start. */
    readonly steps: ReadonlyArray<CraftStep>;
}
export declare const MAX_CRAFT_LEVEL = 5;
/** The level from which a craft makes the farm grow faster, and the one that gives its tool. */
export declare const FASTER_LEVEL = 3;
export declare const TOOL_LEVEL = 4;
export declare const CRAFTS: ReadonlyArray<Craft>;
/** The level a yield gives, from 1 to 5. */
export declare const craftLevel: (craft: Craft, made: number) => number;
export interface CraftProgress {
    readonly craft: Craft;
    readonly level: number;
    /** What the programs made of the craft's resource so far. */
    readonly made: number;
    /** The yield of the next level, or null at the last one. */
    readonly next: number | null;
}
export declare const craftProgress: (craft: Craft, made: number) => CraftProgress;
/** The blocks the crafts gave by this yield. */
export declare const craftBlocks: (made: Readonly<Record<CraftResource, number>>) => ReadonlyArray<BlockName>;
/** A craft that reached a new level: for the message after the day. */
export interface CraftUp {
    readonly craft: Craft;
    readonly level: number;
    readonly step: CraftStep;
}
/** The levels the crafts reached between two yields, lowest first. */
export declare const craftUps: (before: Readonly<Record<CraftResource, number>>, after: Readonly<Record<CraftResource, number>>) => ReadonlyArray<CraftUp>;
