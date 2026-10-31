/**
 * The heroes a student can play: the look of the hero on the field. A hero opens at a hero level, so new looks come
 * as the student earns XP. The app keeps which hero the student chose; the package draws it and offers the choice.
 */

export type HeroId = "ninja" | "robot" | "rover" | "bee"

export interface Hero {
  readonly id: HeroId
  readonly name: string
  /** One line about the hero for the choice. */
  readonly about: string
  /** The hero level at which the hero opens. */
  readonly heroLevel: number
}

export const HEROES: ReadonlyArray<Hero> = [
  { id: "ninja", name: "Ніндзя", about: "Тихий мандрівник у синьому. З ним починається пригода.", heroLevel: 1 },
  { id: "robot", name: "Робот", about: "Залізний помічник із ріжками. Не знає втоми.", heroLevel: 2 },
  { id: "rover", name: "Ровер", about: "Розвідник у фіолетовому шоломі. Перший на нових стежках.", heroLevel: 3 },
  { id: "bee", name: "Бджілка", about: "Маленька і спритна. Гуде на всю долину.", heroLevel: 4 }
]

/** Whether a hero is open at this hero level. */
export const heroOpen = (hero: Hero, heroLevel: number): boolean => heroLevel >= hero.heroLevel
