/**
 * The heroes a student can play: the look of the hero on the field. The first heroes open at a hero level, so new
 * looks come as the student earns XP. The others are sold for coins (`price`), some only from a hero level. The app
 * keeps which hero the student chose and which heroes they bought; the package draws them and offers the choice.
 */
export type HeroId = "ninja" | "robot" | "rover" | "bee" | "knight" | "eskimo" | "cavegirl" | "woman" | "samurai" | "knight-gold";
export interface Hero {
    readonly id: HeroId;
    readonly name: string;
    /** One line about the hero for the choice. */
    readonly about: string;
    /** The hero level at which the hero opens, or can be bought when it has a price. */
    readonly heroLevel: number;
    /** Coins the hero costs in the shop. A hero without a price opens by the hero level alone. */
    readonly price?: number;
}
export declare const HEROES: ReadonlyArray<Hero>;
/** Whether the student may play a hero: the hero level is reached, and a hero with a price is bought (`owned`). */
export declare const heroOpen: (hero: Hero, heroLevel: number, owned?: ReadonlyArray<HeroId>) => boolean;
/** Whether the shop sells a hero to the student now: it has a price, is not bought, the level is reached and the coins are enough. */
export declare const canBuyHero: (hero: Hero, heroLevel: number, owned: ReadonlyArray<HeroId>, coins: number) => boolean;
/** Coins spent on the bought heroes. Unknown ids and heroes without a price cost nothing. */
export declare const heroesCost: (owned: ReadonlyArray<HeroId>) => number;
