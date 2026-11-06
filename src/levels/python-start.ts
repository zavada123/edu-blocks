import type { Level } from "../core/level.ts";
import type { MapRows } from "../core/world.ts";

/**
 * «Python: перші кроки», for students who have never written a program in text. It goes in six small chapters, in the
 * order of the school books (Ривкінд, 6 кл. § 7.1 and 7 кл. § 2.2): a variable as a box, what a box holds, the hero's
 * commands, `input()`, turning words into numbers and back, and counting. Each level brings one small idea in two or
 * three short sentences, and a new word comes only after the student has seen the thing it names. The first levels
 * have the hero's commands written already, so the student only changes what lies in a box.
 * The ideas have no blocks, so `<EduBlocks>` and the block course skip these levels (`language: "python"`).
 * The levels that teach an idea pass only when the program uses it (`uses`, `prints`), and the levels with `input()`
 * have fields with other answers, so the answer cannot be written into the program by hand.
 * The reference solutions are in `pythonSolutions`.
 */

/** The hero's house: its door opens onto the start cell (1, 1). */
const HOME = { kind: "house", x: -0.5, y: -2 } as const;

/** A straight path of `steps` cells from the start to an item: `#S...c#`. */
const straight = (steps: number, end: "c" | "F" = "c"): MapRows => {
  const wall = "#".repeat(steps + 3);
  return [wall, `#S${".".repeat(steps - 1)}${end}#`, wall];
};

/** A path `first` cells to the right, then `second` cells down after a right turn, to an item. */
const corner = (first: number, second: number): MapRows => {
  const width = first + 3;
  const turn = first + 1;
  const row = (cell: string) =>
    `${"#".repeat(turn)}${cell}${"#".repeat(width - turn - 1)}`;
  return [
    "#".repeat(width),
    `#S${".".repeat(first)}#`,
    ...Array.from({ length: second - 1 }, () => row(".")),
    row("c"),
    "#".repeat(width),
  ];
};

/** Stairs: `n` cells right, `n` down after a right turn, then `2n` right after a left turn, to the finish. */
const stairs = (n: number): MapRows => {
  const width = 3 * n + 3;
  const turn = n + 1;
  const row = (body: string) => `${body}${"#".repeat(width - body.length)}`;
  return [
    "#".repeat(width),
    row(`#S${".".repeat(n)}`),
    ...Array.from({ length: n - 1 }, () => row(`${"#".repeat(turn)}.`)),
    row(`${"#".repeat(turn)}${".".repeat(2 * n)}F`),
    "#".repeat(width),
  ];
};

/** A villager who waits for the hero, on the wall cell below the path at `x`. */
const below = (
  who: "grandpa" | "villager" | "hunter" | "girl" | "boy",
  x: number,
) => [{ who, x, y: 2 }] as const;

// 1. «Команди героя»: the hero moves from the first line; `print` is one more command, and the chapter ends with a robot's program with the three usual mistakes. «Метод» comes only there.
const heroLevels: ReadonlyArray<Level> = [
  {
    id: "py-methods",
    language: "python",
    tier: "intro",
    title: "Перші команди",
    task: [
      "Дрова лежать за 3 клітинки від хати.",
      "Зроби 3 кроки, по одному в рядку, а потім візьми дрова.",
    ],
    lesson: {
      title: "Як дати героєві команду",
      text: [
        "Герой у програмі зветься hero. Щоб він щось зробив, пиши hero, крапку і що зробити.",
        "hero.move() — один крок уперед. hero.collect() — взяти те, що лежить під ногами.",
        "Кожна команда пишеться з нового рядка. Дужки в кінці обов'язкові.",
      ],
      example: "hero.move()      # крок\nhero.collect()   # взяти\n",
    },
    starter: "hero.move()\n",
    map: straight(3),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "Три рядки hero.move() і один hero.collect().",
    hints: [
      "Скільки клітинок до дров? Стільки разів і треба зробити крок.",
      "Крок — hero.move(), взяти — hero.collect(). Кожна команда з нового рядка.",
      "hero.move()\nhero.move()\nhero.____()\nhero.________()",
    ],
    gift: { name: "Чоботи мандрівника", skill: "hero.move() і hero.collect(): герой ходить і бере речі." },
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME, { kind: "woodshed", x: 3, y: -1 }],
    },
  },
  {
    id: "py-move-number",
    language: "python",
    tier: "intro",
    title: "Число в дужках",
    task: [
      "Дрова далеко: за 6 клітинок.",
      "Дійди до них і візьми. Спробуй уміститися у два рядки.",
    ],
    lesson: {
      title: "Багато кроків одним рядком",
      text: [
        "У дужки можна написати число: hero.move(6) — це 6 кроків.",
        "Так коротше: один рядок замість шести.",
      ],
      example: "hero.move(2)   # 2 кроки\n",
    },
    starter: "# Дійди до дров і візьми їх.\n",
    map: straight(6),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 2, two: 4 },
    hint: "hero.move(6), а потім hero.collect().",
    hints: [
      "Скільки кроків до дров? Це число можна написати в дужках.",
      "hero.move(6) робить 6 кроків одним рядком. Потім візьми дрова.",
      "hero.move(_)\nhero.collect()",
    ],
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME, { kind: "woodshed", x: 6, y: -1 }],
    },
  },
  {
    id: "py-turns",
    language: "python",
    tier: "intro",
    title: "Поворот",
    task: [
      "Яблуко за рогом: 3 клітинки вправо, а потім 3 вниз.",
      "Дійди й візьми його.",
    ],
    lesson: {
      title: "Як повернути",
      text: [
        "hero.turn_right() — повернути праворуч. hero.turn_left() — повернути ліворуч.",
        "Герой повертається на місці, без кроку. Праворуч і ліворуч — це від героя, куди він дивиться.",
      ],
      example: "hero.turn_right()   # тепер герой дивиться вниз\n",
    },
    starter: "# Іди вправо, поверни, іди вниз.\n",
    map: corner(3, 3),
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "hero.move(3), hero.turn_right(), hero.move(3), hero.collect().",
    hints: [
      "Куди треба повернути, коли дійдеш до рогу: праворуч чи ліворуч?",
      "Іди вправо, поверни праворуч командою hero.turn_right(), іди вниз і візьми.",
      "hero.move(_)\nhero.turn_____()\nhero.move(_)\nhero.collect()",
    ],
    gift: { name: "Компас", skill: "hero.turn_right() і hero.turn_left(): герой повертає." },
    scene: { theme: "autumn", item: "apple", props: [HOME] },
  },
  {
    id: "py-print",
    language: "python",
    tier: "intro",
    title: "Герой говорить",
    task: [
      "Дід біля вказівника погано бачить. Привітайся з ним: Добрий день!",
      "Потім дійди до вказівника.",
    ],
    lesson: {
      title: "Як сказати вголос",
      text: [
        'print("…") — ще одна команда: герой каже вголос те, що в дужках.',
        'Слова пиши в лапках: print("Привіт!"). Сказане видно у віконці під кодом.',
      ],
      example: 'print("Привіт!")   # герой каже: Привіт!\n',
    },
    starter: "# Спершу привітайся, потім іди.\n",
    map: straight(5, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["print"],
    prints: "Добрий день!",
    stars: { three: 3, two: 5 },
    hint: 'print("Добрий день!"), а потім hero.move(5).',
    hints: [
      "Що треба зробити спершу: сказати чи піти?",
      "Тобі потрібні дві команди: print, щоб сказати, і hero.move, щоб піти.",
      'print("_____")\nhero.move(_)',
    ],
    gift: { name: "Горн", skill: "print(): герой говорить." },
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 6) },
  },
  {
    id: "py-fix",
    language: "python",
    tier: "intro",
    title: "Виправ робота",
    task: [
      "Робот написав програму, і в кожному рядку помилка.",
      "Запусти, прочитай, що каже Python, і виправ. Потім запусти знову, до наступної помилки.",
    ],
    lesson: {
      title: "Помилки — це нормально",
      text: [
        "Python каже, у якому рядку помилка і що не так. Читай і виправляй по одній.",
        "Часті помилки: забули дужки, написали Hero з великої літери, забули лапки навколо слів.",
        "Команди героя через крапку ще називають методами. Це просто «що вміє герой».",
      ],
      example: 'hero.move()    # дужки є\nprint("Ура")    # слова в лапках\n',
    },
    starter: "hero.move\nHero.move(2)\nprint(Привіт)\n",
    map: straight(3, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["print"],
    prints: "Привіт",
    stars: { three: 4, two: 6 },
    hint: 'hero.move(), hero.move(2), print("Привіт").',
    hints: [
      "Python показує номер рядка з помилкою. Почни з нього.",
      "Рядок 1 без дужок, у рядку 2 велика літера H, у рядку 3 слово без лапок.",
      'hero.____()\nhero.move(_)\nprint("______")',
    ],
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 4) },
  },
];

// 2. «Змінна»: what a variable is. The first levels have the hero's commands already written, so the student
// only puts the right number into a box; the last one writes it all.
const boxLevels: ReadonlyArray<Level> = [
  {
    id: "py-box-first",
    language: "python",
    tier: "intro",
    title: "Змінна з числом",
    task: [
      "Дрова лежать за 3 клітинки від хати.",
      "У змінній steps зараз 0, тому герой стоїть. Поклади в неї 3.",
    ],
    lesson: {
      title: "Що таке змінна",
      text: [
        "Рядок steps = 0 — це змінна. Вона як скринька з написом: зліва назва steps, справа те, що лежить усередині.",
        "hero.move(steps) — герой іде стільки кроків, скільки лежить у змінній steps. Нижні рядки вже готові.",
        "Заміни 0 на інше число й натисни «Запустити».",
      ],
      example: "steps = 5   # у змінній steps лежить 5\n",
    },
    starter:
      "steps = 0\n# Нижче все готово.\nhero.move(steps)\nhero.collect()\n",
    map: straight(3),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 4, two: 6 },
    hint: "Перший рядок має бути steps = 3.",
    hints: [
      "Скільки клітинок до дров?",
      "Герой іде стільки кроків, скільки лежить у змінній steps. Поклади туди це число.",
      "steps = _",
    ],
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME, { kind: "woodshed", x: 3, y: -1 }],
    },
  },
  {
    id: "py-box-twice",
    language: "python",
    tier: "intro",
    title: "Одна змінна, два рази",
    task: [
      "Стежка йде вправо, а потім униз. Обидві частини однакові: по 4 клітинки.",
      "Поклади в змінну steps одне число, і герой пройде обидві частини.",
    ],
    lesson: {
      title: "Одну змінну можна брати багато разів",
      text: [
        "Герой бере число зі змінної steps двічі: коли йде вправо і коли йде вниз.",
        "Тому число міняєш лише в одному місці, у рядку steps = …",
      ],
      example: "steps = 2\n# герой іде 2 кроки, повертає, і ще 2 кроки\n",
    },
    starter:
      "steps = 0\n# Нижче все готово.\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.collect()\n",
    map: corner(4, 4),
    blocks: ["move", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 7, two: 10 },
    hint: "Перший рядок має бути steps = 4.",
    hints: [
      "Скільки клітинок у кожній частині стежки?",
      "Обидві частини однакові, тому одне число в змінній підходить для обох.",
      "steps = _",
    ],
    scene: { theme: "autumn", item: "apple", props: [HOME] },
  },
  {
    id: "py-box-new",
    language: "python",
    tier: "intro",
    title: "Нове число в змінній",
    task: [
      "Тепер частини різні: вправо 2 клітинки, а вниз 4.",
      "Перед другою частиною поклади в змінну steps нове число.",
    ],
    lesson: {
      title: "Нове число замінює старе",
      text: [
        "У змінній лежить лише одне число. Коли кладеш нове, старе зникає.",
        "Python читає програму згори вниз. Тому герой бере те число, яке лежить у змінній саме в цю мить.",
      ],
      example:
        "apples = 5   # у змінній 5\napples = 7   # тепер у змінній 7, а 5 зникло\n",
    },
    starter:
      "steps = 2\nhero.move(steps)\nhero.turn_right()\nsteps = 2\nhero.move(steps)\nhero.collect()\n",
    map: corner(2, 4),
    blocks: ["move", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 8, two: 11 },
    hint: "Другий рядок steps = … стоїть перед поворотом униз. Поклади туди 4.",
    hints: [
      "Скільки клітинок униз після повороту?",
      "Друге steps = … стоїть перед другою частиною стежки. Поклади туди нове число.",
      "steps = 2\n...\nsteps = _",
    ],
    scene: { theme: "autumn", item: "apple", props: [HOME] },
  },
  {
    id: "py-box-two",
    language: "python",
    tier: "intro",
    title: "Дві змінні",
    task: [
      "До гарбуза 5 клітинок управо і 2 вниз.",
      "Поклади ці числа у дві змінні: forward і down.",
    ],
    lesson: {
      title: "У кожної змінної своя назва",
      text: [
        "Змінних може бути скільки завгодно. Їх розрізняють за назвою.",
        "Назва підказує, що лежить усередині: forward — скільки вперед, down — скільки вниз.",
        "Назву пишуть латинськими літерами, без пробілів.",
      ],
      example: "forward = 1\ndown = 6\n",
    },
    starter:
      "forward = 0\ndown = 0\n# Нижче все готово.\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
    map: corner(5, 2),
    blocks: ["move", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 8, two: 11 },
    hint: "forward = 5 і down = 2.",
    hints: [
      "Скільки клітинок управо? А скільки вниз?",
      "У forward поклади, скільки вправо, а в down — скільки вниз.",
      "forward = _\ndown = _",
    ],
    scene: { theme: "autumn", item: "carrot", props: [HOME] },
  },
  {
    id: "py-box-make",
    language: "python",
    tier: "intro",
    title: "Зроби змінну сам",
    task: [
      "Тепер змінної немає. Зроби її сам: назва steps, а в ній 6.",
      "Пиши її в першому рядку, над командами героя.",
    ],
    lesson: {
      title: "Як зробити змінну",
      text: [
        "Пишеш назву, знак = і число: steps = 6. Так ти робиш змінну й кладеш у неї 6.",
        "Знак = тут означає «поклади». Зліва завжди назва, справа те, що кладеш.",
        "Змінна так зветься, бо число в ній можна змінити.",
      ],
      example: "coins = 10   # нова змінна coins, у ній 10\n",
    },
    starter:
      "# Зроби тут змінну steps.\n\nhero.move(steps)\nhero.collect()\n",
    map: straight(6),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 4, two: 6 },
    hint: "Перед hero.move(steps) додай рядок steps = 6.",
    hints: [
      "Чого бракує Python у рядку hero.move(steps)?",
      "Змінної steps ще немає. Зроби її рядком над командами.",
      "steps = _\nhero.move(steps)\nhero.collect()",
    ],
    gift: { name: "Скринька", skill: "steps = 6: ти робиш змінні сам." },
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME, { kind: "woodshed", x: 6, y: -1 }],
    },
  },
  {
    id: "py-box-case",
    language: "python",
    tier: "practice",
    title: "Велика чи мала літера",
    task: [
      "Робот зробив змінну, але герой не йде. Запусти програму й прочитай, що каже Python.",
      "Знайди помилку й виправ її.",
    ],
    lesson: {
      title: "Steps і steps — різні змінні",
      text: [
        "Для Python велика й мала літери різні. Steps і steps — дві різні назви.",
        "Тому назву змінної пиши щоразу однаково, літера в літеру.",
      ],
      example:
        "score = 1\nScore = 5    # це вже інша змінна\nprint(score)  # 1\n",
    },
    starter: "Steps = 4\nhero.move(steps)\nhero.collect()\n",
    map: straight(4),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 4, two: 6 },
    hint: "У першому рядку Steps з великої літери, а нижче steps з малої. Зроби обидві однаковими.",
    hints: [
      "Порівняй назву змінної в першому і в другому рядку. Чи вони однакові?",
      "Steps і steps для Python різні. Зроби літери однаковими.",
      "_teps = 4\nhero.move(steps)",
    ],
    scene: { theme: "autumn", item: "apple", props: [HOME] },
  },
  {
    id: "py-variable",
    language: "python",
    tier: "practice",
    title: "Команди і змінна",
    task: [
      "Стежка до джерела — три шматки по 3 клітинки: вправо, вниз, знову вправо.",
      "Змінна steps уже є. Напиши всю програму сам і пиши steps замість 3 у кожному hero.move.",
    ],
    lesson: {
      title: "Усе разом",
      text: [
        "Тепер ти пишеш сам і змінну, і команди. hero.move(steps) бере число зі змінної.",
        "Поворот праворуч — hero.turn_right(), ліворуч — hero.turn_left().",
      ],
      example: "steps = 2\nhero.move(steps)\nhero.turn_left()\n",
    },
    starter: "steps = 3\n",
    map: [
      "##########",
      "#S...#####",
      "####.#####",
      "####.#####",
      "####...F##",
      "##########",
    ],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    uses: ["variable"],
    stars: { three: 9, two: 12 },
    hint: "hero.move(steps), поворот праворуч, hero.move(steps), поворот ліворуч, hero.move(steps).",
    hints: [
      "З яких частин складається стежка? Скільки в кожній клітинок?",
      "Три рази hero.move(steps), а між ними поворот праворуч і поворот ліворуч.",
      "hero.move(steps)\nhero.turn_right()\nhero.move(_____)\nhero.turn____()\nhero.move(steps)",
    ],
    scene: { theme: "autumn", finish: "well", props: [HOME] },
  },
];

// 3. «Рахуємо»: + - * with boxes, a result into a box, and a counter.
const mathLevels: ReadonlyArray<Level> = [
  {
    id: "py-plus",
    language: "python",
    tier: "practice",
    title: "Два шматки стежки",
    task: [
      "Стежка до дров — два шматки: first і second. Вони вже лежать у змінних.",
      "Не рахуй сам. Нехай Python додасть їх просто в дужках hero.move.",
    ],
    lesson: {
      title: "Python уміє рахувати",
      text: [
        "Зі змінними можна рахувати: + додати, - відняти, * помножити.",
        "hero.move(first + second): Python спершу додає, а потім герой іде стільки кроків.",
      ],
      example:
        "a = 2\nb = 5\nprint(a + b)   # 7\nprint(b - a)   # 3\nprint(a * b)   # 10\n",
    },
    starter: "first = 3\nsecond = 4\n",
    map: straight(7),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 7, two: 10 },
    hint: "hero.move(first + second), а потім hero.collect().",
    hints: [
      "Скільки разом клітинок у двох шматках?",
      "Python може додати сам: first + second прямо в дужках.",
      "hero.move(first + ______)\nhero.collect()",
    ],
    gift: { name: "Рахівниця", skill: "+, - і *: Python рахує за тебе." },
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME, { kind: "woodshed", x: 7, y: -1 }],
    },
  },
  {
    id: "py-double",
    language: "python",
    tier: "practice",
    title: "Удвічі далі",
    task: [
      "У змінній n лежить 3, а дрова вдвічі далі: за n * 2 клітинок.",
      "Не рахуй сам. Напиши n * 2 просто в дужках hero.move.",
    ],
    lesson: {
      title: "Множимо",
      text: [
        "Зірочка * означає «помножити»: n * 2 — удвічі більше, ніж у змінній n.",
        "Якщо n = 3, то n * 2 дає 6.",
      ],
      example: "n = 5\nhero.move(n * 2)   # 10 кроків\n",
    },
    starter: "n = 3\n",
    map: straight(6),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 5, two: 7 },
    hint: "hero.move(n * 2), а потім hero.collect().",
    hints: [
      "Скільки це — удвічі більше, ніж 3?",
      "У дужках hero.move можна рахувати: n * 2.",
      "hero.move(n * _)\nhero.collect()",
    ],
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME, { kind: "woodshed", x: 6, y: -1 }],
    },
  },
  {
    id: "py-total",
    language: "python",
    tier: "practice",
    title: "Решта в змінній",
    task: [
      "У героя 20 гривень, а хліб коштує 7. Порахуй решту в змінну change.",
      "Потім скажи: Решта: і число зі змінної. І дійди до продавчині.",
    ],
    lesson: {
      title: "Результат — у змінну",
      text: [
        "Що порахував, можна покласти в змінну: change = money - price.",
        "Python спершу рахує праву частину, а потім кладе результат у змінну зліва.",
        'print може сказати слова і число разом. Пиши їх через кому: print("Решта:", change).',
      ],
      example:
        'apples = 4\npears = 3\ntotal = apples + pears\nprint("Разом:", total)   # Разом: 7\n',
    },
    starter: "money = 20\nprice = 7\n",
    map: straight(4, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Решта: 13",
    stars: { three: 9, two: 12 },
    hint: 'change = money - price, потім print("Решта:", change) і hero.move(4).',
    hints: [
      "Решта — це скільки було грошей мінус ціна.",
      "Зроби змінну change, поклади в неї money - price і скажи її через print.",
      'change = money - _____\nprint("Решта:", ______)\nhero.move(4)',
    ],
    scene: { theme: "autumn", props: [HOME], npcs: below("girl", 5) },
  },
  {
    id: "py-count",
    language: "python",
    tier: "practice",
    title: "Рахуємо гриби",
    task: [
      "Бабуся просить порахувати гриби. Збери всі три, а після кожного додавай 1 у змінну mushrooms.",
      "Наприкінці скажи: Грибів: 3. Число візьми зі змінної.",
    ],
    lesson: {
      title: "Змінна-лічильник",
      text: [
        "mushrooms = mushrooms + 1 — це не задачка з математики. Це команда.",
        "Вона означає: візьми число зі змінної, додай 1 і поклади назад. Було 0, стало 1.",
      ],
      example:
        'score = 0\nscore = score + 1   # тепер 1\nscore = score + 1   # тепер 2\nprint("Очки:", score)   # Очки: 2\n',
    },
    starter: "mushrooms = 0\n",
    map: ["######", "#Sccc#", "######"],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable", "print"],
    prints: "Грибів: 3",
    stars: { three: 18, two: 22 },
    hint: 'Тричі: hero.move(), hero.collect(), mushrooms = mushrooms + 1. Потім print("Грибів:", mushrooms).',
    hints: [
      "Що треба зробити біля кожного гриба, крім того, щоб узяти його?",
      "Після кожного hero.collect() додай 1 у змінну: mushrooms = mushrooms + 1.",
      'hero.move()\nhero.collect()\nmushrooms = mushrooms + _\n...\nprint("Грибів:", _________)',
    ],
    scene: {
      theme: "autumn",
      item: "apple",
      props: [HOME],
      npcs: [{ who: "villager", x: 5, y: 2 }],
    },
  },
];

// 4. «Що лежить у змінній»: words, whole numbers, numbers with a dot, True or False. `print` is already in the starter.
const typeLevels: ReadonlyArray<Level> = [
  {
    id: "py-text-box",
    language: "python",
    tier: "intro",
    title: "Змінна зі словами",
    task: [
      "Дід біля вказівника хоче почути: Добрий день!",
      "Поклади ці слова в змінну greeting. Герой скаже їх і піде до вказівника.",
    ],
    lesson: {
      title: "У змінну можна покласти слова",
      text: [
        'У змінній може лежати не лише число, а й слова. Слова, як і в print, беруть у лапки: "Привіт".',
        "print(greeting) без лапок каже не слово greeting, а те, що лежить у змінній.",
      ],
      example: 'word = "Привіт!"\nprint(word)   # Привіт!\n',
    },
    starter:
      'greeting = "..."\n# Нижче все готово.\nprint(greeting)\nhero.move(5)\n',
    map: straight(5, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Добрий день!",
    stars: { three: 4, two: 6 },
    hint: 'greeting = "Добрий день!" — з лапками і знаком оклику.',
    hints: [
      "Що хоче почути дід?",
      "Поклади в змінну greeting саме ці слова, у лапках.",
      'greeting = "_____ ____!"',
    ],
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 6) },
  },
  {
    id: "py-text-number",
    language: "python",
    tier: "intro",
    title: "Слова і число",
    task: [
      "Бабуся записує, хто скільки приніс. Героя звати Тарас, і він приніс 3 яблука.",
      "Поклади ім'я в змінну name, а число в змінну apples.",
    ],
    lesson: {
      title: "Слова в лапках, число без лапок",
      text: [
        'Слова кладуть у змінну в лапках: name = "Оля".',
        "Число пишуть без лапок: apples = 5.",
        "print може сказати кілька речей одразу. Їх пишуть через кому, а Python ставить між ними пробіл.",
      ],
      example:
        'name = "Оля"\napples = 5\nprint(name, "має", apples)   # Оля має 5\n',
    },
    starter:
      'name = "?"\napples = 0\n# Нижче все готово.\nprint(name, "приніс яблук:", apples)\nhero.move(4)\n',
    map: straight(4, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Тарас приніс яблук: 3",
    stars: { three: 6, two: 9 },
    hint: 'name = "Тарас" і apples = 3.',
    hints: [
      "Як звати героя? Скільки яблук він приніс?",
      "Ім'я — слова, тому в лапках. Число — без лапок.",
      'name = "_____"\napples = _',
    ],
    scene: { theme: "autumn", finish: "grandma", props: [HOME] },
  },
  {
    id: "py-types",
    language: "python",
    tier: "intro",
    title: '5 чи "5"',
    task: [
      'Робот поклав кроки в лапках: "5". Герой не рушає з місця.',
      "Запусти програму, прочитай, що каже Python, і виправ.",
    ],
    lesson: {
      title: "Число чи слова",
      text: [
        "5 без лапок — це число. Герой може пройти 5 кроків.",
        '"5" у лапках — це вже слова, як напис на табличці. Ходити написом герой не вміє.',
        "Подивись на змінну steps під кодом: там видно, що в ній лежить, число чи слова.",
      ],
      example:
        'print(5 + 5)       # 10: числа додаються\nprint("5" + "5")   # 55: слова склеюються\n',
    },
    starter:
      'steps = "5"\nhero.move(steps)\nhero.collect()\n',
    map: straight(5),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 7, two: 10 },
    hint: "Прибери лапки: steps = 5.",
    hints: [
      "Подивись на перший рядок. Що в ньому не так з числом 5?",
      '"5" у лапках — це слова. Герой ходить числом без лапок.',
      "steps = _",
    ],
    gift: { name: "Лупа", skill: "Тепер ти відрізняєш число від слів." },
    scene: { theme: "autumn", item: "apple", props: [HOME] },
  },
  {
    id: "py-float-box",
    language: "python",
    tier: "intro",
    title: "Число з крапкою",
    task: [
      "Кошик моркви важить два з половиною кілограми.",
      "Поклади вагу в змінну weight, щоб герой сказав: Кошик важить 2.5 кг.",
    ],
    lesson: {
      title: "Не всі числа цілі",
      text: [
        "Два з половиною в Python пишуть так: 2.5. Між цілою частиною і дробовою ставлять крапку, а не кому.",
        "Таке число теж кладуть без лапок. Його звуть дробовим."
      ],
      example: "price = 12.5   # дванадцять з половиною\n",
    },
    starter:
      'weight = 0\n# Нижче все готово.\nprint("Кошик важить", weight, "кг")\nhero.move(3)\nhero.collect()\n',
    map: straight(3),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable", "print"],
    prints: "Кошик важить 2.5 кг",
    stars: { three: 5, two: 7 },
    hint: "weight = 2.5 — з крапкою, без лапок.",
    hints: [
      "Як записати два з половиною в Python?",
      "Дробову частину відділяють крапкою, і число пишуть без лапок.",
      "weight = _._",
    ],
    scene: { theme: "autumn", item: "carrot", props: [HOME] },
  },
  {
    id: "py-bool",
    language: "python",
    tier: "intro",
    title: "Так чи ні",
    task: [
      "Хвіртка біля хати зачинена. Відчини її: поклади в змінну door_open слово True.",
      "Герой скаже: Хвіртка відчинена: True.",
    ],
    lesson: {
      title: "True і False",
      text: [
        "Буває, що треба зберегти лише «так» чи «ні». Для цього в Python є True і False.",
        "True означає «так», False означає «ні». Пишуть їх з великої літери і без лапок.",
        "Тепер ти знаєш чотири речі, які лежать у змінній: ціле число, число з крапкою, слова і True або False.",
      ],
      example:
        "is_raining = False   # дощу немає\n",
    },
    starter:
      'door_open = False\n# Нижче все готово.\nprint("Хвіртка відчинена:", door_open)\nhero.move(4)\n',
    map: straight(4, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Хвіртка відчинена: True",
    stars: { three: 4, two: 6 },
    hint: "door_open = True — з великої літери, без лапок.",
    hints: [
      "Яке слово означає «так» у Python?",
      "True пишуть з великої літери і без лапок.",
      "door_open = ____",
    ],
    scene: { theme: "autumn", finish: "home", props: [HOME] },
  },
];

// 5. «Питаємо»: input() with answers in words, so nothing has to become a number yet.
const askLevels: ReadonlyArray<Level> = [
  {
    id: "py-ask",
    language: "python",
    tier: "practice",
    title: "Як вас звати?",
    task: [
      "Підійди до діда і спитай, як його звати. Потім привітайся: Добрий день, і його ім'я.",
      "Тут три поля, і на кожному інший дід.",
    ],
    lesson: {
      title: "Як спитати",
      text: [
        'input("Як вас звати?") ставить питання й чекає відповіді. Тут відповідає дід.',
        'Відповідь кладуть у змінну: name = input("Як вас звати?").',
        "Ти не знаєш наперед, що скаже дід. Але змінна name запам'ятає відповідь.",
      ],
      example:
        'pet = input("Як звати кота?")   # відповідь: Мурчик\nprint("Привіт,", pet)           # Привіт, Мурчик\n',
    },
    starter: "hero.move(3)\n# Спитай діда, як його звати.\n",
    map: straight(3, "F"),
    inputs: ["Іван"],
    prints: "Добрий день, Іван",
    fields: [
      {
        map: straight(3, "F"),
        inputs: ["Петро"],
        prints: "Добрий день, Петро",
      },
      {
        map: straight(3, "F"),
        inputs: ["Остап"],
        prints: "Добрий день, Остап",
      },
    ],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "variable", "print"],
    stars: { three: 5, two: 7 },
    hint: 'name = input("Як вас звати?"), а потім print("Добрий день,", name).',
    hints: [
      "Що треба дізнатися в діда? Куди покласти відповідь?",
      'name = input("Як вас звати?") питає й кладе відповідь у змінну. Потім скажи її через print.',
      'name = input("___ ___ ______?")\nprint("Добрий день,", ____)',
    ],
    gift: { name: "Сурма", skill: "input(): герой питає." },
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 4) },
  },
  {
    id: "py-ask-two",
    language: "python",
    tier: "practice",
    title: "Звідки ти?",
    task: [
      "Мисливець скаже два слова: своє ім'я і своє село.",
      "Спитай двічі, а потім скажи обидві відповіді: спершу ім'я, потім село.",
    ],
    lesson: {
      title: "Два питання — дві змінні",
      text: [
        "Питати можна кілька разів. Перший input() отримує першу відповідь, другий — другу.",
        "Кожну відповідь клади в окрему змінну з назвою, яка підказує, що там.",
      ],
      example:
        'food = input("Що їси?")     # каша\ndrink = input("Що п\'єш?")   # чай\nprint(food, drink)          # каша чай\n',
    },
    starter: "hero.move(2)\n# Спитай ім'я, потім село.\n",
    map: straight(2, "F"),
    inputs: ["Богдан", "Липівка"],
    prints: "Богдан Липівка",
    fields: [
      {
        map: straight(2, "F"),
        inputs: ["Степан", "Гаї"],
        prints: "Степан Гаї",
      },
    ],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "variable", "print"],
    stars: { three: 8, two: 11 },
    hint: 'name = input("Як тебе звати?"), village = input("Звідки ти?"), print(name, village).',
    hints: [
      "Скільки питань треба поставити?",
      "Два input(), кожен у свою змінну. Потім print з обома змінними через кому.",
      'name = input("Як тебе звати?")\nvillage = _____("Звідки ти?")\nprint(____, _______)',
    ],
    scene: { theme: "autumn", props: [HOME], npcs: below("hunter", 3) },
  },
];

// 6. «Слова чи число»: an answer of input() is always words; int(), float() and str() turn one into the other, then
// small problems from life.
const convertLevels: ReadonlyArray<Level> = [
  {
    id: "py-sum-bug",
    language: "python",
    tier: "practice",
    title: "3 + 4 = 34?",
    task: [
      "Робот питає два числа й додає їх. Дід каже 3 і 4, а робот каже: Разом: 34.",
      "Запусти, подивись і виправ, щоб вийшло Разом: 7. На другому полі числа інші.",
    ],
    lesson: {
      title: "input() дає слова",
      text: [
        'Що б не сказав дід, input() дає слова. "3" + "4" склеюються в "34", як два написи.',
        'Зробити з напису число вміє int(): int("3") дає 3. Тоді 3 + 4 дасть 7.',
      ],
      example:
        'print("3" + "4")             # 34\nprint(int("3") + int("4"))   # 7\n',
    },
    starter:
      'a = input("Перше число?")\nb = input("Друге число?")\nprint("Разом:", a + b)\nhero.move(2)\n',
    map: straight(2, "F"),
    inputs: ["3", "4"],
    prints: "Разом: 7",
    fields: [{ map: straight(2, "F"), inputs: ["5", "1"], prints: "Разом: 6" }],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "int", "print"],
    stars: { three: 11, two: 14 },
    hint: 'a = int(input("Перше число?")) і так само b.',
    hints: [
      "Чому вийшло 34, а не 7? Що дає input(): число чи слова?",
      "Загорни кожен input() в int(), щоб відповідь стала числом.",
      'a = int(input("Перше число?"))\nb = ___(input("Друге число?"))',
    ],
    gift: { name: "Перетворювач", skill: "int(): зі слів виходить число." },
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 3) },
  },
  {
    id: "py-input",
    language: "python",
    tier: "practice",
    title: "Дід підкаже кроки",
    task: [
      "Дрова щоразу лежать деінде, а дід знає, скільки до них кроків.",
      "Спитай діда, зроби стільки кроків і візьми дрова. Тут три поля.",
    ],
    lesson: {
      title: "Відповідь — це слова",
      text: [
        'Що б не сказав дід, input() дає слова. Навіть "3" для Python — це напис, а не число.',
        'Зробити з напису число вміє int(): int("3") дає 3.',
        'Тому відповідь загортають в int(): steps = int(input("Скільки кроків?")).',
      ],
      example:
        'age = int(input("Скільки тобі років?"))   # "11" стало числом 11\nprint(age + 1)                           # 12\n',
    },
    starter: "# Спитай діда, скільки кроків.\n",
    map: straight(3),
    inputs: ["3"],
    fields: [
      { map: straight(5), inputs: ["5"] },
      { map: straight(7), inputs: ["7"] },
    ],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["input"],
    stars: { three: 6, two: 9 },
    hint: 'steps = int(input("Скільки кроків?")), потім hero.move(steps) і hero.collect().',
    hints: [
      "Що дає input(): число чи слова? А чим ходить герой?",
      "Загорни відповідь в int(), поклади в змінну і йди стільки кроків.",
      'steps = ___(input("Скільки кроків?"))\nhero.move(_____)\nhero.collect()',
    ],
    scene: {
      theme: "autumn",
      item: "wood",
      props: [HOME],
      npcs: [{ who: "grandpa", x: 1, y: 2 }],
    },
  },
  {
    id: "py-two-answers",
    language: "python",
    tier: "practice",
    title: "Два числа",
    task: [
      "Мисливець підкаже дорогу до гарбуза: скільки йти прямо і скільки вниз після повороту праворуч.",
      "Спитай двічі. Кожну відповідь зроби числом і поклади в свою змінну.",
    ],
    lesson: {
      title: "Два числа від мисливця",
      text: [
        "Тут усе як раніше: два питання, дві змінні.",
        "Тільки кожну відповідь загортаєш в int(), бо герой ходить числами, а не словами.",
      ],
      example:
        'a = int(input("Перше число?"))   # 4\nb = int(input("Друге число?"))   # 6\n',
    },
    starter: "# Спитай, скільки йти прямо, а потім скільки вниз.\n",
    map: corner(3, 2),
    inputs: ["3", "2"],
    fields: [
      { map: corner(5, 3), inputs: ["5", "3"] },
      { map: corner(2, 4), inputs: ["2", "4"] },
    ],
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["input", "variable"],
    stars: { three: 12, two: 15 },
    hint: "Дві змінні з int(input(…)), потім hero.move(перша), hero.turn_right(), hero.move(друга), hero.collect().",
    hints: [
      "Скільки питань треба поставити мисливцю?",
      "Дві змінні, кожна з int(input(…)). Потім вправо, поворот праворуч, униз.",
      'forward = int(input("Скільки прямо?"))\ndown = ___(_____("Скільки вниз?"))\nhero.move(forward)\nhero.turn_right()\nhero.move(____)\nhero.collect()',
    ],
    scene: {
      theme: "autumn",
      item: "carrot",
      props: [HOME],
      npcs: [{ who: "hunter", x: 1, y: 2 }],
    },
  },
  {
    id: "py-float-input",
    language: "python",
    tier: "practice",
    title: "Скільки важить?",
    task: [
      "Бабуся зважила кошик і скаже вагу. Вага буває з крапкою: 2.5.",
      "Спитай вагу, зроби з неї число і скажи: Кошик важить, число і кг.",
    ],
    lesson: {
      title: "Слова в число з крапкою",
      text: [
        'int() робить лише цілі числа. Напис "2.5" він не зрозуміє.',
        'Для чисел з крапкою є float(): float("2.5") дає 2.5.',
      ],
      example: 'price = float(input("Скільки коштує?"))   # "7.5" стало 7.5\n',
    },
    starter: "hero.move(3)\n# Спитай вагу кошика.\n",
    map: straight(3, "F"),
    inputs: ["2.5"],
    prints: "Кошик важить 2.5 кг",
    fields: [
      { map: straight(3, "F"), inputs: ["3.5"], prints: "Кошик важить 3.5 кг" },
    ],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "float", "print"],
    stars: { three: 6, two: 9 },
    hint: 'weight = float(input("Скільки важить?")), потім print("Кошик важить", weight, "кг").',
    hints: [
      "Вага з крапкою. Чи впорається з нею int()?",
      "Для чисел з крапкою є float(). Загорни в нього input().",
      'weight = _____(input("Скільки важить?"))\nprint("Кошик важить", ______, "кг")',
    ],
    scene: { theme: "autumn", finish: "grandma", props: [HOME] },
  },
  {
    id: "py-to-text",
    language: "python",
    tier: "practice",
    title: "Число в слова",
    task: [
      "Робот хотів сказати: Яблук: 3. Але Python сварить на другий рядок.",
      "Запусти, прочитай, що каже Python, і виправ.",
    ],
    lesson: {
      title: "Слова і число не склеюються",
      text: [
        'Знак + склеює слова зі словами: "Добрий" + " день". А слова з числом не склеює.',
        'str() робить із числа слова: str(3) дає "3". Тепер їх можна склеїти.',
      ],
      example: 'coins = 5\nprint("Монет: " + str(coins))   # Монет: 5\n',
    },
    starter: 'apples = 3\nprint("Яблук: " + apples)\nhero.move(2)\n',
    map: straight(2, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["str", "print"],
    prints: "Яблук: 3",
    stars: { three: 6, two: 9 },
    hint: 'print("Яблук: " + str(apples)).',
    hints: [
      "Python каже, що не може додати слова і число. Що з них треба змінити?",
      "str(apples) робить із числа слова, і тоді їх можна склеїти.",
      'print("Яблук: " + ___(apples))',
    ],
    gift: { name: "Перо", skill: "str(): із числа виходять слова." },
    scene: { theme: "autumn", finish: "grandma", props: [HOME] },
  },
  {
    id: "py-change",
    language: "python",
    tier: "practice",
    title: "Решта",
    task: [
      "У героя 20 гривень. Дійди до продавчині й спитай, скільки коштує хліб.",
      "Порахуй решту і скажи: Решта: і число. На другому полі ціна інша.",
    ],
    lesson: {
      title: "Віднімаємо",
      text: [
        "Решта — це скільки грошей було мінус ціна. У Python це 20 - price.",
        "Ціну дає input(), тому не забудь загорнути її в int().",
      ],
      example:
        'money = 50\nprice = 30\nprint("Залишилось:", money - price)   # Залишилось: 20\n',
    },
    starter: "hero.move(4)\n# Спитай ціну хліба.\n",
    map: straight(4, "F"),
    inputs: ["12"],
    prints: "Решта: 8",
    fields: [{ map: straight(4, "F"), inputs: ["15"], prints: "Решта: 5" }],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "int", "print"],
    stars: { three: 7, two: 10 },
    hint: 'price = int(input("Скільки коштує хліб?")), потім print("Решта:", 20 - price).',
    hints: [
      "Решта — це скільки було мінус ціна. А ціну дізнаєшся в продавчині.",
      "Спитай ціну через int(input(…)), а потім скажи 20 - price.",
      'price = int(input("Скільки коштує хліб?"))\nprint("Решта:", __ - _____)',
    ],
    scene: { theme: "autumn", props: [HOME], npcs: below("girl", 5) },
  },
  {
    id: "py-market",
    language: "python",
    tier: "practice",
    title: "На ярмарку",
    task: [
      "Бабуся послала по яблука: треба 3 кілограми. Дійди до ярмарку й спитай, скільки коштує кілограм.",
      "Порахуй, скільки заплатити, і скажи: Разом: і суму. На другому полі ціна інша.",
    ],
    lesson: {
      title: "Множимо",
      text: [
        "Ціна буває з копійками: 12.5. Тому відповідь загортай у float().",
        "Три кілограми коштують утричі більше: price * 3. Зірочка * — це «помножити».",
      ],
      example: 'price = float("2.5")\nprint(price * 3)   # 7.5\n',
    },
    starter: "# Дійди до ярмарку, спитай ціну й порахуй суму.\n",
    map: straight(4, "F"),
    inputs: ["12.5"],
    prints: "Разом: 37.5",
    fields: [{ map: straight(4, "F"), inputs: ["8.5"], prints: "Разом: 25.5" }],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "float", "print"],
    stars: { three: 9, two: 12 },
    hint: 'price = float(input("Скільки коштує кілограм?")), потім total = price * 3 і print("Разом:", total).',
    hints: [
      "Ціна з копійками. Яким перетворенням зробити з неї число?",
      "float(input(…)) дає ціну, а price * 3 — ціну трьох кілограмів.",
      'price = float(input("Скільки коштує кілограм?"))\ntotal = price * _\nprint("Разом:", _____)',
    ],
    scene: {
      theme: "autumn",
      props: [HOME],
      npcs: [{ who: "villager", x: 5, y: 2 }],
    },
  },
  {
    id: "py-stairs",
    language: "python",
    tier: "challenge",
    title: "Сходинки до джерела",
    task: [
      "Дід каже довжину сходинки. Іди так: сходинка вправо, сходинка вниз, а останній шматок до джерела вдвічі довший.",
      "Спитай лише раз, а довжину останнього шматка порахуй у програмі.",
    ],
    lesson: {
      title: "Рахуємо в дужках",
      text: [
        "hero.move(n * 2) — удвічі більше кроків, ніж лежить у змінній n.",
        "Якщо n = 3, герой пройде 6 кроків.",
      ],
      example: "n = 4\nprint(n * 2)   # 8\n",
    },
    starter: "# Спитай довжину сходинки.\n",
    map: stairs(2),
    inputs: ["2"],
    fields: [{ map: stairs(3), inputs: ["3"] }],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    uses: ["input", "variable"],
    stars: { three: 12, two: 15 },
    hint: "n = int(input(…)); вправо n, поворот праворуч, вниз n, поворот ліворуч, і hero.move(n * 2).",
    hints: [
      "Скільки разів треба спитати діда?",
      "Один int(input(…)) у змінну n. Перші два шматки — n, останній — n * 2.",
      'n = int(input("Яка довжина сходинки?"))\nhero.move(n)\nhero.turn_right()\nhero.move(_)\nhero.turn_left()\nhero.move(n * _)',
    ],
    scene: {
      theme: "autumn",
      finish: "well",
      props: [HOME],
      npcs: [{ who: "grandpa", x: 1, y: 2 }],
    },
  },
];

/** The levels of «Python: перші кроки» in six small chapters, in the order of play. See `pythonStartChapters`. */
export const pythonLevelGroups = {
  pyHero: heroLevels,
  pyBoxes: boxLevels,
  pyMath: mathLevels,
  pyTypes: typeLevels,
  pyAsk: askLevels,
  pyConvert: convertLevels,
} as const;

export const pythonLevels: ReadonlyArray<Level> =
  Object.values(pythonLevelGroups).flat();

/** The reference solution of each level of `pythonLevels`, as Python code. Keys are level ids. */
export const pythonSolutions: Readonly<Record<string, string>> = {
  "py-print": 'print("Добрий день!")\nhero.move(5)\n',
  "py-fix": 'hero.move()\nhero.move(2)\nprint("Привіт")\n',
  "py-double": "n = 3\nhero.move(n * 2)\nhero.collect()\n",
  "py-total":
    'money = 20\nprice = 7\nchange = money - price\nprint("Решта:", change)\nhero.move(4)\n',
  "py-sum-bug":
    'a = int(input("Перше число?"))\nb = int(input("Друге число?"))\nprint("Разом:", a + b)\nhero.move(2)\n',
  "py-box-first": "steps = 3\nhero.move(steps)\nhero.collect()\n",
  "py-box-twice":
    "steps = 4\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.collect()\n",
  "py-box-new":
    "steps = 2\nhero.move(steps)\nhero.turn_right()\nsteps = 4\nhero.move(steps)\nhero.collect()\n",
  "py-box-two":
    "forward = 5\ndown = 2\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
  "py-box-make": "steps = 6\nhero.move(steps)\nhero.collect()\n",
  "py-box-case": "steps = 4\nhero.move(steps)\nhero.collect()\n",
  "py-text-box": 'greeting = "Добрий день!"\nprint(greeting)\nhero.move(5)\n',
  "py-text-number":
    'name = "Тарас"\napples = 3\nprint(name, "приніс яблук:", apples)\nhero.move(4)\n',
  "py-types":
    "steps = 5\nhero.move(steps)\nhero.collect()\n",
  "py-float-box":
    'weight = 2.5\nprint("Кошик важить", weight, "кг")\nhero.move(3)\nhero.collect()\n',
  "py-bool":
    'door_open = True\nprint("Хвіртка відчинена:", door_open)\nhero.move(4)\n',
  "py-methods": "hero.move()\nhero.move()\nhero.move()\nhero.collect()\n",
  "py-move-number": "hero.move(6)\nhero.collect()\n",
  "py-turns": "hero.move(3)\nhero.turn_right()\nhero.move(3)\nhero.collect()\n",
  "py-variable":
    "steps = 3\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.turn_left()\nhero.move(steps)\n",
  "py-ask":
    'hero.move(3)\nname = input("Як вас звати?")\nprint("Добрий день,", name)\n',
  "py-ask-two":
    'hero.move(2)\nname = input("Як тебе звати?")\nvillage = input("Звідки ти?")\nprint(name, village)\n',
  "py-input":
    'steps = int(input("Скільки кроків?"))\nhero.move(steps)\nhero.collect()\n',
  "py-two-answers":
    'forward = int(input("Скільки прямо?"))\ndown = int(input("Скільки вниз?"))\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n',
  "py-float-input":
    'hero.move(3)\nweight = float(input("Скільки важить?"))\nprint("Кошик важить", weight, "кг")\n',
  "py-to-text": 'apples = 3\nprint("Яблук: " + str(apples))\nhero.move(2)\n',
  "py-plus":
    "first = 3\nsecond = 4\nhero.move(first + second)\nhero.collect()\n",
  "py-count":
    'mushrooms = 0\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nprint("Грибів:", mushrooms)\n',
  "py-change":
    'hero.move(4)\nprice = int(input("Скільки коштує хліб?"))\nprint("Решта:", 20 - price)\n',
  "py-market":
    'hero.move(4)\nprice = float(input("Скільки коштує кілограм?"))\ntotal = price * 3\nprint("Разом:", total)\n',
  "py-stairs":
    'n = int(input("Яка довжина сходинки?"))\nhero.move(n)\nhero.turn_right()\nhero.move(n)\nhero.turn_left()\nhero.move(n * 2)\n',
};
