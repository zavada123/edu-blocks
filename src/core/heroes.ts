/**
 * The heroes a student can play: the look of the hero on the field. The first heroes open at a hero level, so new
 * looks come as the student earns XP. The others are sold for coins (`price`), some only from a hero level. The app
 * keeps which hero the student chose and which heroes they bought; the package draws them and offers the choice.
 */

export type HeroId = "ninja" | "robot" | "rover" | "bee" | "knight" | "eskimo" | "cavegirl" | "woman" | "samurai" | "knight-gold"

export interface Hero {
  readonly id: HeroId
  readonly name: string
  /** One line about the hero for the choice. */
  readonly about: string
  /** The hero level at which the hero opens, or can be bought when it has a price. */
  readonly heroLevel: number
  /** Coins the hero costs in the shop. A hero without a price opens by the hero level alone. */
  readonly price?: number
}

export const HEROES: ReadonlyArray<Hero> = [
  { id: "ninja", name: "Ніндзя", about: "Тихий мандрівник у синьому. З ним починається пригода.", heroLevel: 1 },
  { id: "robot", name: "Робот", about: "Залізний помічник із ріжками. Не знає втоми.", heroLevel: 2 },
  { id: "rover", name: "Ровер", about: "Розвідник у фіолетовому шоломі. Перший на нових стежках.", heroLevel: 3 },
  { id: "bee", name: "Бджілка", about: "Маленька і спритна. Гуде на всю долину.", heroLevel: 4 },
  { id: "knight", name: "Лицар", about: "У залізному шоломі. Стежку не звертає.", heroLevel: 1, price: 60 },
  { id: "eskimo", name: "Ескімос", about: "У теплій шубі з хутром. Зима йому не страшна.", heroLevel: 1, price: 80 },
  { id: "cavegirl", name: "Лісовичка", about: "Знає кожну стежку в лісі й кожен кущ на ній.", heroLevel: 2, price: 100 },
  { id: "woman", name: "Мандрівниця", about: "У синьому каптурі. Уже обійшла пів світу.", heroLevel: 2, price: 120 },
  { id: "samurai", name: "Самурай", about: "Спокійний і точний. Кожен крок у нього продуманий.", heroLevel: 3, price: 150 },
  { id: "knight-gold", name: "Золотий лицар", about: "Обладунки сяють, як сонце. Для справжніх майстрів.", heroLevel: 5, price: 250 }
]

/** Whether the student may play a hero: the hero level is reached, and a hero with a price is bought (`owned`). */
export const heroOpen = (hero: Hero, heroLevel: number, owned: ReadonlyArray<HeroId> = []): boolean =>
  heroLevel >= hero.heroLevel && (hero.price === undefined || owned.includes(hero.id))

/** Whether the shop sells a hero to the student now: it has a price, is not bought, the level is reached and the coins are enough. */
export const canBuyHero = (hero: Hero, heroLevel: number, owned: ReadonlyArray<HeroId>, coins: number): boolean =>
  hero.price !== undefined && !owned.includes(hero.id) && heroLevel >= hero.heroLevel && coins >= hero.price

/** Coins spent on the bought heroes. Unknown ids and heroes without a price cost nothing. */
export const heroesCost = (owned: ReadonlyArray<HeroId>): number =>
  HEROES.reduce((sum, h) => sum + (h.price !== undefined && owned.includes(h.id) ? h.price : 0), 0)
