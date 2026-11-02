import type { Level } from "./level.ts"
import type { Tier } from "./xp.ts"

/**
 * Coins: what the student earns by passing levels and spends in the shop (heroes, later the estate). Like XP, the
 * coins of a level come from its best run, so replaying a level gives only the coins of new stars. All of it is pure
 * functions, the same in the browser and on a server.
 */

/** Coins for any pass of a level of this tier. */
export const TIER_COINS: Readonly<Record<Tier, number>> = { intro: 10, practice: 15, challenge: 25 }
/** Coins for each star. */
export const STAR_COINS = 5

/** Coins of one run of a level of this tier. A failed run gives none. */
export const coinsFor = (tier: Tier, stars: number): number => (stars <= 0 ? 0 : TIER_COINS[tier] + Math.min(stars, 3) * STAR_COINS)

/** Coins a run adds: only the part above the best earlier run of the level. */
export const coinGain = (coins: number, bestBefore: number): number => Math.max(0, coins - bestBefore)

/** Coins of the best run of each level, from the stars of the best runs by level id. Other ids give nothing. */
export const levelCoins = (levels: ReadonlyArray<Level>, bestStars: Readonly<Record<string, number>>): number =>
  levels.reduce((sum, l) => sum + coinsFor(l.tier ?? "intro", Object.hasOwn(bestStars, l.id) ? (bestStars[l.id] ?? 0) : 0), 0)

/** The coins the student has now: earned by levels, plus other income (the estate), less what they spent. */
export const walletOf = (wallet: { readonly earned: number; readonly income?: number; readonly spent: number }): number =>
  Math.max(0, wallet.earned + (wallet.income ?? 0) - wallet.spent)
