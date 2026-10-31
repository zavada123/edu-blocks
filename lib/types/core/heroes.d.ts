/**
 * The heroes a student can play: the look of the hero on the field. A hero opens at a hero level, so new looks come
 * as the student earns XP. The app keeps which hero the student chose; the package draws it and offers the choice.
 */
export type HeroId = "ninja" | "robot" | "rover" | "bee";
export interface Hero {
    readonly id: HeroId;
    readonly name: string;
    /** One line about the hero for the choice. */
    readonly about: string;
    /** The hero level at which the hero opens. */
    readonly heroLevel: number;
}
export declare const HEROES: ReadonlyArray<Hero>;
/** Whether a hero is open at this hero level. */
export declare const heroOpen: (hero: Hero, heroLevel: number) => boolean;
