import type { Level } from "../core/level.ts"

/**
 * Sample levels from grade 3 to grade 6: steps, turns, loops, branches and the loop with a condition.
 * Together they tell one story, «Зима в селі»: each level gives the hero a reason to go somewhere.
 * The reference solution of each level is in `solutions.ts`.
 */

/** The hero's house: its door opens onto the start cell (1, 1) of a level. */
const HOME = { kind: "house", x: -0.5, y: -2 } as const

export const levels: ReadonlyArray<Level> = [
  {
    id: "g3-steps",
    grade: 3,
    title: "Холодна хата",
    task: ["Надворі мороз, а в хаті згасла піч.", "Вийди з хати, дійди до дровітні й візьми дрова."],
    map: ["#######", "#S...c#", "#######"],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 7 },
    hint: "Порахуй клітинки до дров: стільки разів потрібен блок «крок уперед».",
    scene: { theme: "winter", item: "wood", props: [HOME, { kind: "woodshed", x: 4, y: -1 }] }
  },
  {
    id: "g3-turn",
    grade: 3,
    title: "Дровітня за рогом",
    task: ["Дров замало, піч ледь жевріє.", "Решта дров лежить за рогом. Поверни в потрібний бік і принеси їх."],
    map: ["#####", "#S..#", "###.#", "###c#", "#####"],
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 6, two: 8 },
    hint: "Ніндзя повертається на місці. Після повороту він іде туди, куди дивиться.",
    scene: { theme: "winter", item: "wood", props: [HOME, { kind: "woodshed", x: 4, y: 2 }] }
  },
  {
    id: "g3-finish",
    grade: 3,
    title: "До криниці",
    task: ["Піч розгорілась, у хаті тепло.", "Тепер треба води на чай. Дійди до криниці."],
    map: ["#######", "#S.####", "##.####", "##...F#", "#######"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    stars: { three: 8, two: 10 },
    scene: { theme: "winter", finish: "well", props: [HOME] }
  },
  {
    id: "g4-repeat",
    grade: 4,
    title: "Яблука для пирога",
    task: ["Бабуся пече пиріг. З воза на дорогу висипались п'ять яблук — збери їх.", "Спробуй блок «повторити»: так програма буде коротшою."],
    map: ["#############", "#S.c.c.c.c.c#", "#############"],
    blocks: ["move", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 10 },
    hint: "Знайди дії, які повторюються: «крок, крок, взяти». Поклади їх у «повторити».",
    scene: { theme: "winter", item: "apple", props: [HOME] }
  },
  {
    id: "g4-stairs",
    grade: 4,
    title: "Пиріг для бабусі",
    task: ["Пиріг готовий! Віднеси його бабусі.", "Її хата на пагорбі, і стежка до неї йде сходинками."],
    map: ["#######", "#####F#", "####..#", "###..##", "##..###", "#S.####", "#######"],
    blocks: ["move", "turnLeft", "turnRight", "repeat"],
    goals: [{ type: "finish" }],
    stars: { three: 5, two: 9 },
    hint: "Одна сходинка — це «крок, ліворуч, крок, праворуч». Скільки сходинок?",
    scene: { theme: "winter", finish: "grandma", props: [{ kind: "house", x: 3.5, y: -2 }] }
  },
  {
    id: "g4-if",
    grade: 4,
    title: "Риба в ополонках",
    task: ["Бабуся просить рибу на юшку. На ставку є ополонки, та риба клює не в кожній.", "Пройди ставком і лови лише там, де є риба."],
    map: ["###########", "#S.cc.c..c#", "###########"],
    blocks: ["move", "collect", "repeat", "if", "onCrystal"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 9 },
    hint: "У «повторити» зроби крок, а потім перевір: «якщо тут щось є? то взяти».",
    scene: { theme: "winter", ground: "ice", item: "fish" }
  },
  {
    id: "g4-until",
    grade: 4,
    title: "Довгий міст",
    task: ["Комора зачинена, а ключ — у скрині на тому боці довгого мосту.", "Іди мостом, доки попереду не скінчиться міст, і візьми ключ."],
    map: ["############", "#S........c#", "############"],
    blocks: ["move", "collect", "repeatUntil", "wallAhead"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "Блок «повторити до попереду стіна?» сам зупиниться в кінці мосту.",
    scene: { theme: "winter", ground: "bridge", item: "key" }
  },
  {
    id: "g6-nested",
    grade: 6,
    title: "Вогнища на ніч",
    task: ["Сутеніє, у лісі виють вовки.", "Розпали вогнища в кутах двору. Використай цикл у циклі."],
    map: ["######", "#S..c#", "#.##.#", "#.##.#", "#c..c#", "######"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 9 },
    hint: "Одна сторона двору — це три кроки, «взяти» і поворот. Повтори сторону кілька разів.",
    scene: { theme: "winter", item: "campfire", props: [HOME] }
  },
  {
    id: "g6-maze",
    grade: 6,
    title: "Заметіль",
    task: ["Почалася заметіль, нічого не видно.", "Програма має сама вирішувати, коли повертати, і привести ніндзю додому."],
    map: ["#######", "#F...##", "####.##", "#S...##", "#######"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "atFinish", "ifElse", "wallAhead", "not"],
    goals: [{ type: "finish" }],
    stars: { three: 6, two: 9 },
    hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то поверни, інакше зроби крок.",
    scene: { theme: "winter", finish: "home", props: [HOME] }
  }
]
