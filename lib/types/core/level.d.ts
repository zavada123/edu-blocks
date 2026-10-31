import { type Direction, type EnemySpec, type MapRows, type World } from "./world.ts";
import type { Tier } from "./xp.ts";
/** Blocks a level can put into the palette. Hero blocks and the Scratch blocks with the same meaning. */
export type BlockName = "move" | "turnLeft" | "turnRight" | "collect" | "attack" | "wallAhead" | "enemyAhead" | "trapAhead" | "onCrystal" | "atFinish" | "repeat" | "forever" | "repeatUntil" | "if" | "ifElse" | "not" | "and" | "or"
/** «задати / змінити лічильник» and the (лічильник) reporter: one variable, as «Змінні» in Scratch. */
 | "counter"
/** A custom block of the level: its «визначити» hat and the call, as «Мої блоки» in Scratch. */
 | "procedure";
/** What the hero must achieve. All goals of a level are checked together. */
export type Goal = {
    readonly type: "crystals";
} | {
    readonly type: "finish";
} | {
    readonly type: "enemies";
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
/** Villagers from the pack. They only stand and look around: the hero walks past them, they never block. */
export type NpcKind = "grandpa" | "boy" | "girl" | "villager" | "hunter" | "kid";
export interface Npc {
    readonly who: NpcKind;
    /** The cell the villager stands on. Best on a wall or meadow cell, so the hero does not walk through them. */
    readonly x: number;
    readonly y: number;
    /** A picture from an asset pack instead of the villager's own (`AssetRef`): any character or animal. */
    readonly look?: AssetRef;
}
/**
 * A picture from an asset pack: `"<pack>:<sprite id>"`, as `"ninja-adventure:animal/cat"`. See `assets/README.md`.
 * The pack is loaded by the field when a level needs it; until then the picture is not drawn.
 */
export type AssetRef = string;
/**
 * A picture from an asset pack placed on the field. Only looks: it never changes where the hero can go, so a house
 * or a fence the hero must not cross stands on wall cells (`#`).
 */
export interface PlacedSprite {
    readonly asset: AssetRef;
    /** The cell. Halves are fine, and so are cells outside the map: the meadow lies there. */
    readonly x: number;
    readonly y: number;
    /**
     * A part of a tileset, in its cells: column, row, width and height. It is drawn from the top-left corner of the
     * cell. Without it the sprite stands on the cell: the bottom middle of its frame on the bottom middle of the cell.
     */
    readonly tiles?: readonly [col: number, row: number, width: number, height: number];
    /** The animation to play; the sprite's `idle` or first clip when left out, a still picture when it has none. */
    readonly clip?: string;
    /** Which way a sprite with directions looks. Down by default. */
    readonly dir?: Direction;
    /** `ground` lies flat under everything (tiles, water, flowers); `object` stands up and hides what is behind it. */
    readonly layer?: "ground" | "object";
    /** Mirrored left to right. */
    readonly flip?: boolean;
}
export type Season = "spring" | "summer" | "autumn" | "winter";
/** How the level looks: the season, the floor, the things on the map. The rules of the game stay the same. */
export interface Scene {
    /** The season: summer when left out. Spring brings rain, autumn falling leaves, winter snow. */
    readonly theme?: Season;
    /** The cells the hero walks on: a path, the ice of a pond or the planks of a bridge over water. */
    readonly ground?: "path" | "ice" | "bridge";
    readonly item?: ItemKind;
    readonly finish?: FinishKind;
    readonly props?: ReadonlyArray<Prop>;
    readonly npcs?: ReadonlyArray<Npc>;
    /** Pictures from the asset packs: decor, buildings, animals, tiles. See `PlacedSprite`. */
    readonly sprites?: ReadonlyArray<PlacedSprite>;
    /** How the items on `c` cells look, from an asset pack; `item` still names them in the goal. */
    readonly itemLook?: AssetRef;
    /** How the goal on the `F` cell looks, from an asset pack; `finish` still names it in the goal. */
    readonly finishLook?: AssetRef;
}
export interface Level {
    readonly id: string;
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
    /** Enemies on floor cells. They act after each hero action: see `applyAction`. */
    readonly enemies?: ReadonlyArray<EnemySpec>;
    /** Hearts of the hero. 3 by default; they matter only where there are enemies. */
    readonly hearts?: number;
    /** Steps («крок уперед») the hero may take. No limit when left out. */
    readonly maxSteps?: number;
    /** The name of the custom block when the palette has «procedure». «мій блок» when left out. */
    readonly procedure?: string;
    /** Summer, crystals and a flag when left out. */
    readonly scene?: Scene;
    /** Sets the XP of the level. An intro level when left out. */
    readonly tier?: Tier;
}
/** The world at the start of a level: the map, the enemies and the hearts. */
export declare const startWorld: (level: Level) => World;
export declare const goalMet: (world: World, goal: Goal) => boolean;
export declare const allGoalsMet: (level: Level, world: World) => boolean;
/** Which goals of the level are met now, in the order of `level.goals`: the live goal list of the game. */
export declare const goalStatus: (level: Level, world: World) => ReadonlyArray<boolean>;
export declare const describeGoal: (goal: Goal, world: World, scene?: Scene) => string;
export declare const starsFor: (level: Level, blocks: number) => 1 | 2 | 3;
