/** How hard a level is in its chapter: a new idea, the same idea in another form, or a level to think over. */
export type Tier = "intro" | "practice" | "challenge"

/** XP for any pass of a level of this tier. */
export const TIER_XP: Readonly<Record<Tier, number>> = { intro: 10, practice: 20, challenge: 35 }
/** XP for each star: fewer blocks give more stars. */
export const STAR_XP = 5
/** XP when the level passes and no run of it failed before. */
export const FIRST_TRY_XP = 10

/** The most XP a level gives: three stars at the first try. */
export const maxXp = (tier: Tier): number => TIER_XP[tier] + 3 * STAR_XP + FIRST_TRY_XP

/** XP of one run of a level of this tier (`level.tier ?? "intro"`). A failed run gives none. */
export const xpFor = (tier: Tier, run: { readonly stars: number; readonly firstTry: boolean }): number =>
  run.stars <= 0 ? 0 : TIER_XP[tier] + Math.min(run.stars, 3) * STAR_XP + (run.firstTry ? FIRST_TRY_XP : 0)

/** XP a run adds to the hero: only the part above the best earlier run of the level, so replays give nothing to farm. */
export const xpGain = (xp: number, bestBefore: number): number => Math.max(0, xp - bestBefore)

/** Total XP at which each hero level starts. Level 1 starts at 0. */
export const HERO_LEVELS: ReadonlyArray<number> = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]

export interface HeroLevel {
  /** From 1. */
  readonly level: number
  /** Total XP where this level starts. */
  readonly from: number
  /** Total XP where the next level starts, or null at the last level. */
  readonly next: number | null
}

export const heroLevelOf = (totalXp: number): HeroLevel => {
  const index = HERO_LEVELS.reduce((found, start, i) => (totalXp >= start ? i : found), 0)
  return { level: index + 1, from: HERO_LEVELS[index] ?? 0, next: HERO_LEVELS[index + 1] ?? null }
}
