import { type Direction, type MapRows, type World } from "./world.ts";
import type { Tier } from "./xp.ts";
/** Blocks a level can put into the palette. Hero blocks and the Scratch blocks with the same meaning. */
export type BlockName = "move" | "turnLeft" | "turnRight" | "collect" | "wallAhead" | "onCrystal" | "atFinish" | "repeat" | "forever" | "repeatUntil" | "if" | "ifElse" | "not" | "and" | "or";
/** What the hero must achieve. All goals of a level are checked together. */
export type Goal = {
    readonly type: "crystals";
} | {
    readonly type: "finish";
};
/** What lies on the `c` cells and what `collect` takes. A campfire is not taken but lit. */
export type ItemKind = "crystal" | "wood" | "apple" | "fish" | "key" | "campfire";
/** What stands on the `F` cell. With «home» a house with its door above the cell stands nearby (a prop). */
export type FinishKind = "flag" | "well" | "grandma" | "home";
/** Pictures that stand on wall or meadow cells. Only looks: they never change where the hero can go. */
export type PropKind = "house" | "woodshed";
export interface Prop {
    readonly kind: PropKind;
    /** Top-left corner in cells. Halves are fine, and so are cells outside the map: the meadow lies there. */
    readonly x: number;
    readonly y: number;
}
/** How the level looks: the season, the floor, the things on the map. The rules of the game stay the same. */
export interface Scene {
    readonly theme?: "summer" | "winter";
    /** The cells the hero walks on: a path, the ice of a pond or the planks of a bridge over water. */
    readonly ground?: "path" | "ice" | "bridge";
    readonly item?: ItemKind;
    readonly finish?: FinishKind;
    readonly props?: ReadonlyArray<Prop>;
}
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
    /** Summer, crystals and a flag when left out. */
    readonly scene?: Scene;
    /** Sets the XP of the level. An intro level when left out. */
    readonly tier?: Tier;
}
export declare const goalMet: (world: World, goal: Goal) => boolean;
export declare const allGoalsMet: (level: Level, world: World) => boolean;
export declare const describeGoal: (goal: Goal, world: World, scene?: Scene) => string;
export declare const starsFor: (level: Level, blocks: number) => 1 | 2 | 3;
