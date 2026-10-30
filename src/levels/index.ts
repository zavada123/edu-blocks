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
    tier: "intro",
    title: "Холодна хата",
    task: ["Надворі мороз, а в хаті згасла піч.", "Вийди з хати, дійди до дровітні й візьми дрова."],
    map: ["#######", "#S...c#", "#######"],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 7 },
    hint: "Порахуй клітинки до дров: стільки разів потрібен блок «крок уперед».",
    scene: { theme: "winter", item: "wood", props: [HOME, { kind: "woodshed", x: 4, y: -1 }], npcs: [{ who: "kid", x: 3, y: 2 }] }
  },
  {
    id: "g3-turn",
    grade: 3,
    tier: "practice",
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
    tier: "practice",
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
    tier: "intro",
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
    tier: "practice",
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
    tier: "intro",
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
    tier: "practice",
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
    id: "g5-spirit",
    grade: 5,
    tier: "intro",
    title: "Сніговий дух",
    task: [
      "Дорогу до криниці стереже сніговий дух. Він стоїть, а коли ніндзя підходить на дві клітинки, біжить назустріч.",
      "Вдар духа і дійди до криниці."
    ],
    map: ["#########", "#S.....F#", "#########"],
    blocks: ["move", "attack", "repeat"],
    goals: [{ type: "finish" }],
    enemies: [{ kind: "spirit", x: 4, y: 1 }],
    stars: { three: 4, two: 7 },
    hint: "Зроби крок — дух підбіжить упритул. Тоді «вдарити», а далі йди до криниці.",
    scene: { theme: "winter", finish: "well" }
  },
  {
    id: "g5-glade",
    grade: 5,
    tier: "practice",
    title: "Дрова на галявині",
    task: [
      "На галявині лежать дрова, а по ній туди-сюди повзає слиз.",
      "Галявина велика: обери свій шлях. Збери всі дрова, а слиз обійди або вдар."
    ],
    map: ["#########", "#S......#", "#..#..c.#", "#.c.....#", "#....#..#", "#.....c.#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "attack", "repeat"],
    goals: [{ type: "crystals" }],
    enemies: [{ kind: "slime", x: 4, y: 3, walk: "across", sight: 1 }],
    stars: { three: 20, two: 28 },
    hint: "Слиз помічає ніндзю лише впритул. Якщо він на шляху — «вдарити», інакше обійди його.",
    scene: { theme: "winter", item: "wood", npcs: [{ who: "hunter", x: 3, y: 2 }] }
  },
  {
    id: "g5-guards",
    grade: 5,
    tier: "challenge",
    title: "Варта біля комори",
    task: ["Біля комори вештаються гобліни. Прожени всіх.", "Питай «попереду ворог?»: якщо так — бий, а ні — іди далі."],
    map: ["##########", "#S.......#", "##########"],
    blocks: ["move", "attack", "repeat", "repeatUntil", "if", "ifElse", "enemyAhead", "wallAhead"],
    goals: [{ type: "enemies" }],
    enemies: [
      { kind: "goblin", x: 4, y: 1, walk: "across", sight: 2 },
      { kind: "goblin", x: 7, y: 1, walk: "across", sight: 2 }
    ],
    hearts: 3,
    stars: { three: 5, two: 8 },
    hint: "Повторюй: якщо попереду ворог, то вдарити, інакше крок.",
    scene: { theme: "winter", props: [{ kind: "woodshed", x: 7, y: -1 }] }
  },
  {
    id: "g6-nested",
    grade: 6,
    tier: "practice",
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
    tier: "challenge",
    title: "Заметіль",
    task: ["Почалася заметіль, нічого не видно.", "Програма має сама вирішувати, коли повертати, і привести ніндзю додому."],
    map: ["#######", "#F...##", "####.##", "#S...##", "#######"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "atFinish", "ifElse", "wallAhead", "not"],
    goals: [{ type: "finish" }],
    stars: { three: 6, two: 9 },
    hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то поверни, інакше зроби крок.",
    scene: { theme: "winter", finish: "home", props: [HOME] }
  },
  {
    id: "g6-bear",
    grade: 6,
    tier: "challenge",
    title: "Ведмідь-шатун",
    task: [
      "Узимку прокинувся ведмідь-шатун і не пускає ніндзю до бабусі.",
      "Він витримує три удари і б'є у відповідь. Підійди, коли він поруч, і бий, доки не впаде."
    ],
    map: ["#########", "#S......#", "#######.#", "#F......#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "attack", "repeat", "repeatUntil", "enemyAhead", "wallAhead", "atFinish", "if", "ifElse"],
    goals: [{ type: "enemies" }, { type: "finish" }],
    enemies: [{ kind: "bear", x: 6, y: 1, boss: true, sight: 2 }],
    hearts: 3,
    stars: { three: 11, two: 16 },
    hint: "Іди, доки попереду не з'явиться ведмідь, тоді вдар тричі. Далі шлях до бабусі вільний.",
    scene: { theme: "winter", finish: "grandma" }
  }
]
