import { type Direction, type MapRows, type World } from "./world.ts";
/** Blocks a level can put into the palette. Hero blocks and the Scratch blocks with the same meaning. */
export type BlockName = "move" | "turnLeft" | "turnRight" | "collect" | "wallAhead" | "onCrystal" | "atFinish" | "repeat" | "forever" | "repeatUntil" | "if" | "ifElse" | "not" | "and" | "or";
/** What the hero must achieve. All goals of a level are checked together. */
export type Goal = {
    readonly type: "crystals";
} | {
    readonly type: "finish";
};
export interface Level {
    readonly id: string;
    readonly grade: 3 | 4 | 5 | 6;
    readonly title: string;
    /** Task lines for the student. */
    readonly task: ReadonlyArray<string>;
    readonly map: MapRows;
    /** Where the hero looks at the start. Right by default. */
    readonly dir?: Direction;
    readonly blocks: ReadonlyArray<BlockName>;
    readonly goals: ReadonlyArray<Goal>;
    /** Most blocks (the start hat not counted) for three and for two stars. Without it any pass gets three. */
    readonly stars?: {
        readonly three: number;
        readonly two: number;
    };
    /** Shown after a failed run. */
    readonly hint?: string;
}
export declare const goalMet: (world: World, goal: Goal) => boolean;
export declare const allGoalsMet: (level: Level, world: World) => boolean;
export declare const describeGoal: (goal: Goal, world: World) => string;
export declare const starsFor: (level: Level, blocks: number) => 1 | 2 | 3;
