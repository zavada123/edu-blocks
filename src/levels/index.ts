import type { Level } from "../core/level.ts"

/**
 * The course in the order a student plays it, chapter by chapter (see `chapters.ts`): steps and turns, loops,
 * branches, the loop with a condition, traps and few steps, and enemies. In each chapter a new idea comes first,
 * then practice, then a challenge. The ids keep their old grade prefix: saved progress refers to them.
 * Together they tell one story, «Рік у селі», from autumn through winter and spring to summer: each level gives the
 * hero a reason to go somewhere.
 * The reference solution of each level is in `solutions.ts`.
 */

/** The hero's house: its door opens onto the start cell (1, 1) of a level. */
const HOME = { kind: "house", x: -0.5, y: -2 } as const

export const levels: ReadonlyArray<Level> = [
  {
    id: "g3-steps",
    tier: "intro",
    title: "Холодна хата",
    task: ["Надворі осінній холод, а в хаті згасла піч.", "Вийди з хати, дійди до дровітні й візьми дрова."],
    map: ["#######", "#S...c#", "#######"],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 5, two: 7 },
    hint: "Порахуй клітинки до дров: стільки разів потрібен блок «крок уперед».",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 4, y: -1 }], npcs: [{ who: "kid", x: 3, y: 2 }] }
  },
  {
    id: "g3-turn",
    tier: "practice",
    title: "Дровітня за рогом",
    task: ["Дров замало, піч ледь жевріє.", "Решта дров лежить за рогом. Поверни в потрібний бік і принеси їх."],
    map: ["#####", "#S..#", "###.#", "###c#", "#####"],
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 6, two: 8 },
    hint: "Ніндзя повертається на місці. Після повороту він іде туди, куди дивиться.",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 4, y: 2 }] }
  },
  {
    id: "g3-gate",
    tier: "practice",
    title: "Хвіртка",
    task: ["Надворі вже темніє, пора додому.", "Хата за рогом: дійди до повороту, поверни ліворуч і йди до дверей."],
    map: ["#####", "###F#", "###.#", "#S..#", "#####"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    stars: { three: 5, two: 7 },
    hint: "Спершу два кроки, потім поворот ліворуч і ще два кроки.",
    scene: { theme: "autumn", finish: "home", props: [{ kind: "house", x: 1.5, y: -2 }] }
  },
  {
    id: "g3-logs",
    tier: "practice",
    title: "Два поліна",
    task: ["Вітер розкидав дрова біля дровітні.", "Одне поліно лежить на стежці, друге за рогом. Збери обидва."],
    map: ["########", "#S.c...#", "######.#", "######c#", "########"],
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 10, two: 13 },
    hint: "Візьми перше поліно, дійди до кінця стежки, поверни праворуч і йди до другого.",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 6, y: -1 }] }
  },
  {
    id: "g3-finish",
    tier: "practice",
    title: "До криниці",
    task: ["Піч розгорілась, у хаті тепло.", "Тепер треба води на чай. Дійди до криниці."],
    map: ["#######", "#S.####", "##.####", "##...F#", "#######"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    stars: { three: 8, two: 10 },
    hint: "Перед кожним поворотом подумай, куди дивиться ніндзя: праворуч для нього — це його права рука.",
    scene: { theme: "autumn", finish: "well", props: [HOME] }
  },
  {
    id: "g3-zigzag",
    tier: "challenge",
    title: "Звивиста стежка",
    task: ["Друзі кличуть стрибати в купі листя.", "Стежка петляє між кущами: то вниз, то вправо. Не зійди зі стежки."],
    map: ["#######", "#S.####", "##..###", "###..##", "####.F#", "#######"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    stars: { three: 13, two: 16 },
    hint: "Крок, праворуч, крок, ліворуч — і так знову. Помічаєш, що дії повторюються?",
    scene: { theme: "autumn", npcs: [{ who: "girl", x: 6, y: 3 }] }
  },
  {
    id: "g4-road",
    tier: "intro",
    title: "Дорога до лісу",
    task: ["Дідусь чекає в лісі з возом дров і позначив місце прапорцем.", "Дорога пряма, але довга. Скільки кроків? Поклади «крок уперед» у «повторити»."],
    map: ["##############", "#S..........F#", "##############"],
    blocks: ["move", "repeat"],
    goals: [{ type: "finish" }],
    stars: { three: 2, two: 4 },
    hint: "Порахуй клітинки до прапорця і впиши це число в «повторити».",
    scene: { theme: "autumn", npcs: [{ who: "grandpa", x: 12, y: 2 }] }
  },
  {
    id: "g4-repeat",
    tier: "intro",
    title: "Яблука для пирога",
    task: ["Бабуся пече пиріг. З воза на дорогу висипались п'ять яблук — збери їх.", "Спробуй блок «повторити»: так програма буде коротшою."],
    map: ["#############", "#S.c.c.c.c.c#", "#############"],
    blocks: ["move", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 10 },
    hint: "Знайди дії, які повторюються: «крок, крок, взяти». Поклади їх у «повторити».",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  },
  {
    id: "g4-corner",
    tier: "practice",
    title: "Хата лісника",
    task: ["Лісник залишив дрова біля своєї хати.", "Іди вздовж лісу, поверни праворуч і спустись до дров. Тут знадобиться два «повторити»."],
    map: ["#########", "#S......#", "#######.#", "#######.#", "#######.#", "#######c#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    stars: { three: 6, two: 9 },
    hint: "Один «повторити» для кроків праворуч, поворот, і другий «повторити» для кроків униз.",
    scene: { theme: "autumn", item: "wood", props: [{ kind: "house", x: 3, y: 2 }], npcs: [{ who: "hunter", x: 6, y: 5 }] }
  },
  {
    id: "g4-stairs",
    tier: "practice",
    title: "Пиріг для бабусі",
    task: ["Пиріг готовий! Віднеси його бабусі.", "Її хата на пагорбі, і стежка до неї йде сходинками."],
    map: ["#######", "#####F#", "####..#", "###..##", "##..###", "#S.####", "#######"],
    blocks: ["move", "turnLeft", "turnRight", "repeat"],
    goals: [{ type: "finish" }],
    stars: { three: 5, two: 9 },
    hint: "Одна сходинка — це «крок, ліворуч, крок, праворуч». Скільки сходинок?",
    scene: { theme: "autumn", finish: "grandma", props: [{ kind: "house", x: 3.5, y: -2 }] }
  },
  {
    id: "g4-sled",
    tier: "practice",
    title: "Гірка для санчат",
    task: ["Друзі позначили прапорцем велику гірку, а до неї веде довга стежка між кучугурами.", "Знайди, що повторюється, і зроби програму короткою."],
    map: ["#########", "#S.######", "##..#####", "###..####", "####..###", "#####..##", "######.F#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "repeat"],
    goals: [{ type: "finish" }],
    stars: { three: 6, two: 9 },
    hint: "Одна сходинка — «крок, праворуч, крок, ліворуч». Скільки їх до гірки?",
    scene: { theme: "winter", npcs: [{ who: "boy", x: 8, y: 5 }] }
  },
  {
    id: "g6-nested",
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
    id: "g4-if",
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
    id: "g4-fence",
    tier: "practice",
    title: "Дрова біля дровітні",
    task: ["Дрова попадали з воза на стежку біля дровітні, але не всюди.", "Іди стежкою й бери поліно лише там, де воно є."],
    map: ["#########", "#S.cc..c#", "#######.#", "#######c#", "#######.#", "#######c#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat", "if", "onCrystal"],
    goals: [{ type: "crystals" }],
    stars: { three: 11, two: 15 },
    hint: "У кожному «повторити»: крок, а потім «якщо тут щось є? то взяти».",
    scene: { theme: "winter", item: "wood", props: [{ kind: "woodshed", x: 3, y: -1 }] }
  },
  {
    id: "g5-snake",
    tier: "intro",
    title: "Навколо гаю",
    task: ["Гай замело снігом, тож додому треба йти стежкою навколо нього.", "Повторюй: якщо попереду стіна — поверни праворуч, інакше зроби крок."],
    map: ["########", "#.....F#", "#.######", "#.....S#", "########"],
    dir: "left",
    blocks: ["move", "turnLeft", "turnRight", "repeat", "ifElse", "wallAhead"],
    goals: [{ type: "finish" }],
    stars: { three: 5, two: 8 },
    hint: "Блок «якщо… то… інакше» сам вирішує, що робити: повернути чи йти. Залишилось порахувати, скільки разів повторити.",
    scene: { theme: "winter", finish: "home", props: [{ kind: "house", x: 4.5, y: -2 }] }
  },
  {
    id: "g4-until",
    tier: "practice",
    title: "Довгий міст",
    task: ["Комора зачинена, а ключ лежить на тому боці довгого мосту.", "Іди мостом, доки попереду не скінчиться міст, і візьми ключ."],
    map: ["############", "#S........c#", "############"],
    blocks: ["move", "collect", "repeatUntil", "wallAhead"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "Блок «повторити до попереду стіна?» сам зупиниться в кінці мосту.",
    scene: { theme: "winter", ground: "bridge", item: "key" }
  },
  {
    id: "g5-bridge",
    tier: "practice",
    title: "Міст із поворотом",
    task: ["Другий ключ від комори лежить за мостом, що повертає.", "Іди, доки попереду не стіна, поверни — і знову іди до кінця."],
    map: ["##########", "#S.......#", "########.#", "########.#", "########c#", "##########"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeatUntil", "wallAhead"],
    goals: [{ type: "crystals" }],
    stars: { three: 8, two: 11 },
    hint: "Два блоки «повторити до попереду стіна?», а між ними поворот праворуч.",
    scene: { theme: "winter", ground: "bridge", item: "key" }
  },
  {
    id: "g5-way-home",
    tier: "practice",
    title: "Дрова на дорозі додому",
    task: ["Віз розгубив дрова по дорозі додому.", "Іди, доки не дійдеш до хати, і підбирай дрова там, де вони лежать."],
    map: ["#############", "#S.c..c.c..F#", "#############"],
    blocks: ["move", "collect", "repeatUntil", "atFinish", "if", "onCrystal"],
    goals: [{ type: "crystals" }, { type: "finish" }],
    stars: { three: 6, two: 9 },
    hint: "«Повторити до на меті?», а всередині: крок і «якщо тут щось є? то взяти».",
    scene: { theme: "winter", item: "wood", finish: "home", props: [{ kind: "house", x: 9.5, y: -2 }] }
  },
  {
    id: "g6-spiral",
    tier: "practice",
    title: "Сніжний равлик",
    task: ["Діти протоптали в снігу стежку-равлика, а в її серці сховали прапорець.", "Стежка закручується праворуч. Склади правило, яке приведе до центру."],
    map: ["#########", "#S......#", "#######.#", "#.....#.#", "#.###.#.#", "#.#F..#.#", "#.#####.#", "#.......#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "atFinish", "ifElse", "wallAhead", "not"],
    goals: [{ type: "finish" }],
    stars: { three: 6, two: 9 },
    hint: "Повторюй, доки не на меті: якщо попереду стіна — праворуч, інакше крок.",
    scene: { theme: "winter" }
  },
  {
    id: "g6-maze",
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
    id: "p-thin-ice",
    tier: "intro",
    title: "Тонкий лід",
    task: ["Дорога додому йде через замерзлий ставок.", "Посередині лід тонкий: там пастка. Обійди її знизу й дійди до хати."],
    map: ["#######", "#S.x.F#", "##...##", "#######"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    stars: { three: 10, two: 12 },
    hint: "Пастку не можна переступити: зійди на нижній ряд, пройди повз неї й повернись на стежку.",
    scene: { theme: "winter", ground: "ice", finish: "home", props: [{ kind: "house", x: 3.5, y: -2 }] }
  },
  {
    id: "p-field",
    tier: "practice",
    title: "Ополонки",
    task: ["Рибалки надовбали на ставку ополонок, а мороз такий, що сил вистачить лише на 7 кроків.", "Знайди шлях до криниці без пасток і без зайвих кроків."],
    map: ["########", "#S.....#", "#.x.xx.#", "#.x.x..#", "#.x.x.x#", "#.x.F..#", "########"],
    blocks: ["move", "turnLeft", "turnRight", "repeat"],
    goals: [{ type: "finish" }],
    maxSteps: 7,
    stars: { three: 7, two: 9 },
    hint: "Порахуй кроки кожним шляхом. Обхід уздовж краю забере всі сили, а лівий шлях закінчується пасткою.",
    scene: { theme: "winter", ground: "ice", finish: "well" }
  },
  {
    id: "p-cold",
    tier: "practice",
    title: "Три поліна",
    task: ["Мороз міцнішає: на холоді вистачить сил лише на 11 кроків.", "Збери три поліна. Подумай, з якого почати."],
    map: ["############", "##c..S.c..c#", "############"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    maxSteps: 11,
    stars: { three: 13, two: 16 },
    hint: "Якщо спершу взяти ближні поліна, по самотнє доведеться довго вертатися. Почни з того, що лежить окремо.",
    scene: { theme: "winter", item: "wood" }
  },
  {
    id: "p-fires",
    tier: "challenge",
    title: "Три вогнища",
    task: ["Вечоріє: у кутах галявини треба розпалити три вогнища.", "Сил вистачить на 15 кроків, а на галявині є замерзлі калюжі з тонким льодом. Вибери, з якого вогнища почати."],
    map: ["#########", "#c.....c#", "#.x.x.x.#", "#...S...#", "#.x.x.x.#", "#......c#", "#########"],
    dir: "up",
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat"],
    goals: [{ type: "crystals" }],
    maxSteps: 15,
    stars: { three: 18, two: 22 },
    hint: "Почни з вогнища, від якого до двох інших можна пройти без повернень назад.",
    scene: { theme: "winter", item: "campfire" }
  },
  {
    id: "p-stairs",
    tier: "intro",
    title: "Сходинки на кризі",
    task: ["Річка замерзла сходинками, і в кінці кожної сходинки лід тонкий.", "Іди вперед, а побачиш пастку — піднімись на сходинку вище. Бабуся чекає нагорі."],
    map: ["###########", "######...F#", "###....x###", "#S..x######", "###########"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "ifElse", "trapAhead", "atFinish"],
    goals: [{ type: "finish" }],
    stars: { three: 8, two: 11 },
    hint: "Повторюй, доки не дійдеш до мети: якщо попереду пастка, то поверни ліворуч, крок і праворуч, інакше крок.",
    scene: { theme: "winter", ground: "ice", finish: "grandma" }
  },
  {
    id: "p-river",
    tier: "practice",
    title: "Обхід ополонок",
    task: ["Рибалки зробили на річці дві ополонки.", "Обхід біля кожної однаковий: напиши його один раз у «якщо попереду пастка»."],
    map: ["###############", "###...##...####", "#S..x....x...F#", "###############"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "ifElse", "trapAhead", "atFinish"],
    goals: [{ type: "finish" }],
    stars: { three: 13, two: 17 },
    hint: "Якщо попереду пастка: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Інакше просто крок.",
    scene: { theme: "winter", ground: "ice", finish: "home", props: [{ kind: "house", x: 11.5, y: -1 }] }
  },
  {
    id: "p-fork",
    tier: "challenge",
    title: "Розвилка",
    task: ["Стежка розходиться: одна гілка веде в глухий кут, друга — до криниці.", "Сил вистачить лише на 9 кроків. Склади правило: у який бік повертати біля стіни?"],
    map: ["#########", "#####...#", "#####.#.#", "#S....#.#", "#####.#.#", "##F...#.#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "repeatUntil", "ifElse", "wallAhead", "atFinish"],
    goals: [{ type: "finish" }],
    maxSteps: 9,
    stars: { three: 6, two: 8 },
    hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то поверни, інакше крок. Спробуй обидва повороти й порахуй кроки.",
    scene: { theme: "winter", finish: "well" }
  },
  {
    id: "g5-spirit",
    tier: "intro",
    title: "Сніговий дух",
    task: [
      "Сніг тане, та сніговий дух ще стереже дорогу до криниці. Він стоїть, а коли ніндзя підходить на дві клітинки, біжить назустріч.",
      "Вдар духа і дійди до криниці."
    ],
    map: ["#########", "#S.....F#", "#########"],
    blocks: ["move", "attack", "repeat"],
    goals: [{ type: "finish" }],
    enemies: [{ kind: "spirit", x: 4, y: 1 }],
    stars: { three: 4, two: 7 },
    hint: "Зроби крок — дух підбіжить упритул. Тоді «вдарити», а далі йди до криниці.",
    scene: { theme: "spring", finish: "well" }
  },
  {
    id: "g5-glade",
    tier: "practice",
    title: "Дрова на галявині",
    task: [
      "Після весняного дощу на галявині лежать дрова, а по ній туди-сюди повзає слиз.",
      "Галявина велика: обери свій шлях. Збери всі дрова, а слиз обійди або вдар."
    ],
    map: ["#########", "#S......#", "#..#..c.#", "#.c.....#", "#....#..#", "#.....c.#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "attack", "repeat"],
    goals: [{ type: "crystals" }],
    enemies: [{ kind: "slime", x: 4, y: 3, walk: "across", sight: 1 }],
    stars: { three: 20, two: 28 },
    hint: "Слиз помічає ніндзю лише впритул. Якщо він на шляху — «вдарити», інакше обійди його.",
    scene: { theme: "spring", item: "wood", npcs: [{ who: "hunter", x: 3, y: 2 }] }
  },
  {
    id: "g5-guards",
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
    scene: { theme: "summer", props: [{ kind: "woodshed", x: 7, y: -1 }] }
  },
  {
    id: "g6-bear",
    tier: "challenge",
    title: "Ведмідь по мед",
    task: [
      "Ведмідь вийшов з лісу по мед і не пускає ніндзю до бабусі.",
      "Він витримує три удари і б'є у відповідь. Підійди, коли він поруч, і бий, доки не впаде."
    ],
    map: ["#########", "#S......#", "#######.#", "#F......#", "#########"],
    blocks: ["move", "turnLeft", "turnRight", "attack", "repeat", "repeatUntil", "enemyAhead", "wallAhead", "atFinish", "if", "ifElse"],
    goals: [{ type: "enemies" }, { type: "finish" }],
    enemies: [{ kind: "bear", x: 6, y: 1, boss: true, sight: 2 }],
    hearts: 3,
    stars: { three: 11, two: 16 },
    hint: "Іди, доки попереду не з'явиться ведмідь, тоді вдар тричі. Далі шлях до бабусі вільний.",
    scene: { theme: "summer", finish: "grandma" }
  },
  {
    id: "c-apples",
    tier: "practice",
    title: "Яблука все далі",
    task: [
      "Наприкінці літа ніндзя збирає яблука вздовж стежки: кожне наступне лежить на крок далі за попереднє.",
      "Нехай лічильник пам'ятає, скільки кроків іти: щоразу додавай до нього 1."
    ],
    map: ["#############", "#Sc.c..c...c#", "#############"],
    blocks: ["move", "collect", "repeat", "counter"],
    goals: [{ type: "crystals" }],
    stars: { three: 7, two: 11 },
    hint: "Задай лічильник 1. Потім чотири рази: повтори (лічильник) кроків, візьми яблуко і зміни лічильник на 1.",
    scene: { theme: "summer", item: "apple" }
  },
  {
    id: "c-spiral",
    tier: "practice",
    title: "Равлик у траві",
    task: [
      "Влітку діти викосили в траві стежку-равлика, а прапорець поставили на її кінці.",
      "Кожен відрізок стежки на крок довший за попередній. Нехай лічильник рахує довжину."
    ],
    map: ["#########", "##.....F#", "##.######", "##.#S.###", "##.##.###", "##....###", "#########"],
    blocks: ["move", "turnRight", "repeat", "counter"],
    goals: [{ type: "finish" }],
    stars: { three: 7, two: 12 },
    hint: "Задай лічильник 1. П'ять разів: повтори (лічильник) кроків, поверни праворуч і зміни лічильник на 1.",
    scene: { theme: "summer" }
  },
  {
    id: "c-stones",
    tier: "practice",
    title: "Завали на стежці",
    task: [
      "Стежку до прапорця завалило: то пеньок, то кущ. Обійти завал — це вісім команд.",
      "Склади їх один раз у блоці «обійти», а далі просто клич його, коли попереду завал."
    ],
    map: ["##############", "##...#......##", "#S.#...#..#.F#", "##############"],
    blocks: ["move", "turnLeft", "turnRight", "procedure"],
    procedure: "обійти",
    goals: [{ type: "finish" }],
    stars: { three: 17, two: 23 },
    hint: "Під «визначити обійти»: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Головна програма: крок, обійти, два кроки, обійти, крок, обійти, крок.",
    scene: { theme: "summer" }
  },
  {
    id: "c-rocks",
    tier: "challenge",
    title: "Гірська стежка",
    task: [
      "Остання прогулянка літа: між завалами все більше кроків, а за кожним завалом лежить кристал.",
      "Поєднай лічильник і свій блок «обійти», щоб програма вийшла короткою."
    ],
    map: ["###############", "##...#...##...#", "#S.#c..#c...#c#", "###############"],
    blocks: ["move", "turnLeft", "turnRight", "collect", "repeat", "counter", "procedure"],
    procedure: "обійти",
    goals: [{ type: "crystals" }],
    stars: { three: 17, two: 20 },
    hint: "Три рази: повтори (лічильник) кроків, обійти, взяти, зміни лічильник на 1. А на початку задай лічильник 1.",
    scene: { theme: "summer" }
  }
]
