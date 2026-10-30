/** How hard a level is in its chapter: a new idea, the same idea in another form, or a level to think over. */
export type Tier = "intro" | "practice" | "challenge";
/** XP for any pass of a level of this tier. */
export declare const TIER_XP: Readonly<Record<Tier, number>>;
/** XP for each star: fewer blocks give more stars. */
export declare const STAR_XP = 5;
/** XP when the level passes and no run of it failed before. */
export declare const FIRST_TRY_XP = 10;
/** The most XP a level gives: three stars at the first try. */
export declare const maxXp: (tier: Tier) => number;
/** XP of one run of a level of this tier (`level.tier ?? "intro"`). A failed run gives none. */
export declare const xpFor: (tier: Tier, run: {
    readonly stars: number;
    readonly firstTry: boolean;
}) => number;
/** XP a run adds to the hero: only the part above the best earlier run of the level, so replays give nothing to farm. */
export declare const xpGain: (xp: number, bestBefore: number) => number;
/** Total XP at which each hero level starts. Level 1 starts at 0. */
export declare const HERO_LEVELS: ReadonlyArray<number>;
export interface HeroLevel {
    /** From 1. */
    readonly level: number;
    /** Total XP where this level starts. */
    readonly from: number;
    /** Total XP where the next level starts, or null at the last level. */
    readonly next: number | null;
}
export declare const heroLevelOf: (totalXp: number) => HeroLevel;
