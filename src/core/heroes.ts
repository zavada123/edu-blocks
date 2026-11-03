/**
 * The heroes a student can play: the look of the hero on the field (Tiny Swords units, see `HERO_ART` in ui/art.ts). The
 * ids are those the app keeps, from the first looks; the names are the new ones. The first heroes open at a hero level, so new
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
  { id: "ninja", name: "Воїн", about: "Меч, щит і синій плащ. З ним починається пригода.", heroLevel: 1 },
  { id: "robot", name: "Трудяга", about: "Селянин у синьому. Рубає, носить і нікуди не поспішає.", heroLevel: 2 },
  { id: "rover", name: "Лучник", about: "Стріляє здалеку. Перший на нових стежках.", heroLevel: 3 },
  { id: "bee", name: "Фіолетовий воїн", about: "Спритний і швидкий. Шолом із пером видно здалеку.", heroLevel: 4 },
  { id: "knight", name: "Червоний лицар", about: "У червоних обладунках. Стежку не звертає.", heroLevel: 1, price: 60 },
  { id: "eskimo", name: "Фіолетовий лучник", about: "Тятива напнута, око пильне. Зима йому не страшна.", heroLevel: 1, price: 80 },
  { id: "cavegirl", name: "Лісоруб", about: "З сокирою в руках. Знає кожен кущ на стежці.", heroLevel: 2, price: 100 },
  { id: "woman", name: "Червоний лучник", about: "Уже обійшов пів світу і не схибив жодного разу.", heroLevel: 2, price: 120 },
  { id: "samurai", name: "Золотий лучник", about: "Спокійний і точний. Кожен постріл у нього продуманий.", heroLevel: 3, price: 150 },
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
