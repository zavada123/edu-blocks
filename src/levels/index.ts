import type { Level } from "../core/level.ts"

/**
 * Sample levels from grade 3 to grade 6: steps, turns, loops, branches and the loop with a condition.
 * The reference solution of each level is in `solutions.ts`.
 */
export const levels: ReadonlyArray<Level> = [
  {
    id: "g3-steps",
    grade: 3,
    title: "Перші кроки",
    task: ["Доведи робота до кристала і збери його."],
    map: ["#######", "#S...c#", "#######"],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 7 },
    hint: "Порахуй клітинки до кристала: стільки разів потрібен блок «крок уперед»."
  },
  {
    id: "g3-turn",
    grade: 3,
    title: "За ріг",
    task: ["Кристал за рогом. Поверни робота в потрібний бік."],
    map: ["#####", "#S..#", "###.#", "###c#", "#####"],
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 6, two: 8 },
    hint: "Робот повертається на місці. Після повороту він іде туди, куди дивиться."
  },
  {
    id: "g3-finish",
    grade: 3,
    title: "До прапорця",
    task: ["Доведи робота до прапорця."],
    map: ["#######", "#S.####", "##.####", "##...F#", "#######"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    stars: { three: 8, two: 10 }
  },
  {
    id: "g4-repeat",
    grade: 4,
    title: "Повторення",
    task: ["Збери всі п'ять кристалів.", "Спробуй блок «повторити»: так програма буде коротшою."],
    map: ["#############", "#S.c.c.c.c.c#", "#############"],
    blocks: ["move", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 10 },
    hint: "Знайди дії, які повторюються: «крок, крок, зібрати». Поклади їх у «повторити»."
  },
  {
    id: "g4-stairs",
    grade: 4,
    title: "Сходинки",
    task: ["Підніми робота сходинками до прапорця."],
    map: ["#######", "#####F#", "####..#", "###..##", "##..###", "#S.####", "#######"],
    blocks: ["move", "turnLeft", "turnRight", "repeat"],
    goals: [{ type: "finish" }],
    stars: { three: 5, two: 9 },
    hint: "Одна сходинка — це «крок, ліворуч, крок, праворуч». Скільки сходинок?"
  },
  {
    id: "g4-if",
    grade: 4,
    title: "Якщо тут кристал",
    task: ["Пройди коридор і збери всі кристали.", "Збирай лише там, де кристал є."],
    map: ["###########", "#S.cc.c..c#", "###########"],
    blocks: ["move", "collect", "repeat", "if", "onCrystal"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 9 },
    hint: "У «повторити» зроби крок, а потім перевір: «якщо тут кристал? то зібрати кристал»."
  },
  {
    id: "g4-until",
    grade: 4,
    title: "До самої стіни",
    task: ["Кристал у кінці довгого коридору.", "Іди, доки попереду не буде стіни, і збери кристал."],
    map: ["############", "#S........c#", "############"],
    blocks: ["move", "collect", "repeatUntil", "wallAhead"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "Блок «повторити до попереду стіна?» сам зупиниться біля стіни."
  },
  {
    id: "g6-nested",
    grade: 6,
    title: "Кімната з кутами",
    task: ["Обійди кімнату і збери кристали в кутах.", "Використай цикл у циклі."],
    map: ["######", "#S..c#", "#.##.#", "#.##.#", "#c..c#", "######"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 9 },
    hint: "Одна сторона — це три кроки, «зібрати» і поворот. Повтори сторону кілька разів."
  },
  {
    id: "g6-maze",
    grade: 6,
    title: "Лабіринт",
    task: ["Доведи робота до прапорця.", "Програма має сама вирішувати, коли повертати."],
    map: ["#######", "#S...##", "####.##", "#F...##", "#######"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "atFinish", "ifElse", "wallAhead", "not"],
    goals: [{ type: "finish" }],
    stars: { three: 6, two: 9 },
    hint: "Повторюй, доки не дійдеш до прапорця: якщо попереду стіна, то поверни, інакше зроби крок."
  }
]
