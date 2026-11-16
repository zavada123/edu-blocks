import type { BlockName, Lesson } from "./level.ts";
/**
 * The first days of the farm open the commands one by one, so a student who comes to the farm sees a short palette
 * and one goal, not every loop and question at once. Each step is a day: its new commands, the goal of the day in
 * the task, and a lesson over the Python code. From the last step on, the farm adds what the course taught.
 */
export interface FarmStep {
    readonly day: number;
    /** The commands this day adds. */
    readonly blocks: ReadonlyArray<BlockName>;
    /** The goal of the day, the first line of the task. */
    readonly goal: string;
    readonly lesson: Lesson;
    /** Every tree of the forest has a log in the morning, so the example of the lesson fits the field. */
    readonly fullWood?: boolean;
}
export declare const FARM_LADDER: ReadonlyArray<FarmStep>;
/** The day from which the farm has every command of the ladder and what the course taught. */
export declare const LADDER_DONE: number;
/** The commands the ladder has opened by this day. */
export declare const ladderBlocks: (day: number) => ReadonlyArray<BlockName>;
/** The step that opens on this day, if any. */
export declare const ladderStep: (day: number) => FarmStep | undefined;
/** Every tree has a log on this day of the ladder. */
export declare const ladderFullWood: (day: number) => boolean;
