import type { Level } from "../core/level.ts"
import type { MapRows } from "../core/world.ts"

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
const HOME = { kind: "house", x: -0.5, y: -2 } as const

/** A straight path of `steps` cells from the start to an item: `#S...c#`. */
const straight = (steps: number, end: "c" | "F" = "c"): MapRows => {
  const wall = "#".repeat(steps + 3)
  return [wall, `#S${".".repeat(steps - 1)}${end}#`, wall]
}

/** A path `first` cells to the right, then `second` cells down after a right turn, to an item. */
const corner = (first: number, second: number): MapRows => {
  const width = first + 3
  const turn = first + 1
  const row = (cell: string) => `${"#".repeat(turn)}${cell}${"#".repeat(width - turn - 1)}`
  return [
    "#".repeat(width),
    `#S${".".repeat(first)}#`,
    ...Array.from({ length: second - 1 }, () => row(".")),
    row("c"),
    "#".repeat(width)
  ]
}

/** Stairs: `n` cells right, `n` down after a right turn, then `2n` right after a left turn, to the finish. */
const stairs = (n: number): MapRows => {
  const width = 3 * n + 3
  const turn = n + 1
  const row = (body: string) => `${body}${"#".repeat(width - body.length)}`
  return [
    "#".repeat(width),
    row(`#S${".".repeat(n)}`),
    ...Array.from({ length: n - 1 }, () => row(`${"#".repeat(turn)}.`)),
    row(`${"#".repeat(turn)}${".".repeat(2 * n)}F`),
    "#".repeat(width)
  ]
}

/** A villager who waits for the hero, on the wall cell below the path at `x`. */
const below = (who: "grandpa" | "villager" | "hunter" | "girl" | "boy", x: number) => [{ who, x, y: 2 }] as const

// 1. «Скринька для числа»: what a variable is. The hero's commands are already written in the starter, the student
// only puts the right number into a box and watches the hero walk.
const boxLevels: ReadonlyArray<Level> = [
  {
    id: "py-box-first",
    language: "python",
    tier: "intro",
    title: "Скринька з числом",
    task: ["Дрова лежать за 3 клітинки від хати.", "У скриньці steps зараз 0, тому герой стоїть. Поклади в неї 3."],
    lesson: {
      title: "Що таке скринька",
      text: [
        "Рядок steps = 0 — це скринька. Зліва її назва steps, а справа те, що в ній лежить.",
        "Герой іде стільки кроків, скільки лежить у скриньці steps. Нижні рядки вже готові, їх не чіпай.",
        "Заміни 0 на інше число й натисни «Запустити»."
      ],
      example: "steps = 5   # у скриньці steps лежить 5\n"
    },
    starter: "steps = 0\n# Нижче все готово: герой іде steps кроків і бере дрова.\nhero.move(steps)\nhero.collect()\n",
    map: straight(3),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 4, two: 6 },
    hint: "Перший рядок має бути steps = 3.",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 3, y: -1 }] }
  },
  {
    id: "py-box-twice",
    language: "python",
    tier: "intro",
    title: "Одна скринька, два рази",
    task: ["Стежка йде вправо, а потім униз. Обидві частини однакові: по 4 клітинки.", "Поклади в скриньку steps одне число, і герой пройде обидві частини."],
    lesson: {
      title: "Одну скриньку можна брати багато разів",
      text: [
        "Герой бере число зі скриньки steps двічі: коли йде вправо і коли йде вниз.",
        "Тому число міняєш лише в одному місці, у рядку steps = …"
      ],
      example: "steps = 2\n# герой іде 2 кроки, повертає, і ще 2 кроки\n"
    },
    starter: "steps = 0\n# Нижче все готово.\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.collect()\n",
    map: corner(4, 4),
    blocks: ["move", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 7, two: 10 },
    hint: "Перший рядок має бути steps = 4.",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  },
  {
    id: "py-box-new",
    language: "python",
    tier: "intro",
    title: "Нове число в скриньці",
    task: ["Тепер частини різні: вправо 2 клітинки, а вниз 4.", "Перед другою частиною поклади в скриньку steps нове число."],
    lesson: {
      title: "Нове число замінює старе",
      text: [
        "У скриньці лежить лише одне число. Коли кладеш нове, старе зникає.",
        "Python читає програму згори вниз. Тому герой бере те число, яке лежить у скриньці саме в цю мить."
      ],
      example: "apples = 5   # у скриньці 5\napples = 7   # тепер у скриньці 7, а 5 зникло\n"
    },
    starter: "steps = 2\nhero.move(steps)\nhero.turn_right()\nsteps = 2\nhero.move(steps)\nhero.collect()\n",
    map: corner(2, 4),
    blocks: ["move", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 8, two: 11 },
    hint: "Другий рядок steps = … стоїть перед поворотом униз. Поклади туди 4.",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  },
  {
    id: "py-box-two",
    language: "python",
    tier: "intro",
    title: "Дві скриньки",
    task: ["До гарбуза 5 клітинок управо і 2 вниз.", "Поклади ці числа у дві скриньки: forward і down."],
    lesson: {
      title: "У кожної скриньки своя назва",
      text: [
        "Скриньок може бути скільки завгодно. Їх розрізняють за назвою.",
        "Назва підказує, що лежить усередині: forward — скільки вперед, down — скільки вниз.",
        "Назву пишуть латинськими літерами, без пробілів."
      ],
      example: "forward = 1\ndown = 6\n"
    },
    starter: "forward = 0\ndown = 0\n# Нижче все готово.\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
    map: corner(5, 2),
    blocks: ["move", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 8, two: 11 },
    hint: "forward = 5 і down = 2.",
    scene: { theme: "autumn", item: "carrot", props: [HOME] }
  },
  {
    id: "py-box-make",
    language: "python",
    tier: "intro",
    title: "Зроби скриньку сам",
    task: ["Тепер скриньки немає. Зроби її сам: назва steps, а в ній 6.", "Пиши її в першому рядку, над командами героя."],
    lesson: {
      title: "Як зробити скриньку",
      text: [
        "Пишеш назву, знак = і число: steps = 6. Так ти робиш скриньку й кладеш у неї 6.",
        "Знак = тут означає «поклади». Зліва завжди назва, справа те, що кладеш.",
        "Таку скриньку в програмі називають змінною: число в ній можна змінити."
      ],
      example: "coins = 10   # нова скринька coins, у ній 10\n"
    },
    starter: "# Зроби тут скриньку steps.\n\nhero.move(steps)\nhero.collect()\n",
    map: straight(6),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 4, two: 6 },
    hint: "Перед hero.move(steps) додай рядок steps = 6.",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 6, y: -1 }] }
  },
  {
    id: "py-box-case",
    language: "python",
    tier: "practice",
    title: "Велика чи мала літера",
    task: ["Робот зробив скриньку, але герой не йде. Запусти програму й прочитай, що каже Python.", "Знайди помилку й виправ її."],
    lesson: {
      title: "Steps і steps — різні скриньки",
      text: [
        "Для Python велика й мала літери різні. Steps і steps — дві різні назви.",
        "Тому назву скриньки пиши щоразу однаково, літера в літеру."
      ],
      example: "score = 1\nScore = 5    # це вже інша скринька\nprint(score)  # 1\n"
    },
    starter: "Steps = 4\nhero.move(steps)\nhero.collect()\n",
    map: straight(4),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 4, two: 6 },
    hint: "У першому рядку Steps з великої літери, а нижче steps з малої. Зроби обидві однаковими.",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  }
]

// 2. «Що лежить у скриньці»: a number, a text, a number with a dot, True or False. `print` is already in the starter.
const typeLevels: ReadonlyArray<Level> = [
  {
    id: "py-print",
    language: "python",
    tier: "intro",
    title: "Скринька зі словами",
    task: ["Дід біля вказівника хоче почути: Добрий день!", "Поклади ці слова в скриньку greeting. Герой скаже їх і піде до вказівника."],
    lesson: {
      title: "У скриньку можна покласти слова",
      text: [
        "У скриньці може лежати не лише число, а й слова. Слова завжди беруть у лапки: \"Привіт\".",
        "Рядок print(greeting) уже готовий. Герой каже вголос те, що лежить у скриньці, і це видно у віконці під кодом."
      ],
      example: "word = \"Привіт!\"\nprint(word)   # Привіт!\n"
    },
    starter: "greeting = \"...\"\n# Нижче все готово.\nprint(greeting)\nhero.move(5)\n",
    map: straight(5, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Добрий день!",
    stars: { three: 4, two: 6 },
    hint: "greeting = \"Добрий день!\" — з лапками і знаком оклику.",
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 6) }
  },
  {
    id: "py-text-number",
    language: "python",
    tier: "intro",
    title: "Слова і число",
    task: ["Бабуся записує, хто скільки приніс. Героя звати Тарас, і він приніс 3 яблука.", "Поклади ім'я в скриньку name, а число в скриньку apples."],
    lesson: {
      title: "Слова в лапках, число без лапок",
      text: [
        "Слова кладуть у скриньку в лапках: name = \"Оля\".",
        "Число пишуть без лапок: apples = 5.",
        "print може сказати кілька речей одразу. Їх пишуть через кому, а Python ставить між ними пробіл."
      ],
      example: "name = \"Оля\"\napples = 5\nprint(name, \"має\", apples)   # Оля має 5\n"
    },
    starter: "name = \"?\"\napples = 0\n# Нижче все готово.\nprint(name, \"приніс яблук:\", apples)\nhero.move(4)\n",
    map: straight(4, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Тарас приніс яблук: 3",
    stars: { three: 6, two: 9 },
    hint: "name = \"Тарас\" і apples = 3.",
    scene: { theme: "autumn", finish: "grandma", props: [HOME] }
  },
  {
    id: "py-types",
    language: "python",
    tier: "intro",
    title: "5 чи \"5\"",
    task: ["Робот поклав кроки в лапках: \"5\". Герой не рушає з місця.", "Запусти програму, прочитай, що каже Python, і виправ."],
    lesson: {
      title: "Число чи слова",
      text: [
        "5 без лапок — це число. Герой може пройти 5 кроків.",
        "\"5\" у лапках — це вже слова, як напис на табличці. Ходити написом герой не вміє.",
        "Що лежить у скриньці, показує type(). int означає ціле число, а str — слова в лапках."
      ],
      example: "print(5 + 5)       # 10: числа додаються\nprint(\"5\" + \"5\")   # 55: слова склеюються\nprint(type(5))     # <class 'int'>\nprint(type(\"5\"))   # <class 'str'>\n"
    },
    starter: "steps = \"5\"\nprint(type(steps))\nhero.move(steps)\nhero.collect()\n",
    map: straight(5),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 7, two: 10 },
    hint: "Прибери лапки: steps = 5.",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  },
  {
    id: "py-float-box",
    language: "python",
    tier: "intro",
    title: "Число з крапкою",
    task: ["Кошик моркви важить два з половиною кілограми.", "Поклади вагу в скриньку weight, щоб герой сказав: Кошик важить 2.5 кг."],
    lesson: {
      title: "Не всі числа цілі",
      text: [
        "Два з половиною в Python пишуть так: 2.5. Між цілою частиною і дробовою ставлять крапку, а не кому.",
        "Таке число теж кладуть без лапок. Його тип — float, дробове число."
      ],
      example: "price = 12.5\nprint(type(price))   # <class 'float'>\n"
    },
    starter: "weight = 0\n# Нижче все готово.\nprint(\"Кошик важить\", weight, \"кг\")\nhero.move(3)\nhero.collect()\n",
    map: straight(3),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable", "print"],
    prints: "Кошик важить 2.5 кг",
    stars: { three: 5, two: 7 },
    hint: "weight = 2.5 — з крапкою, без лапок.",
    scene: { theme: "autumn", item: "carrot", props: [HOME] }
  },
  {
    id: "py-bool",
    language: "python",
    tier: "intro",
    title: "Так чи ні",
    task: ["Хвіртка біля хати зачинена. Відчини її: поклади в скриньку door_open слово True.", "Герой скаже: Хвіртка відчинена: True."],
    lesson: {
      title: "True і False",
      text: [
        "Буває, що треба зберегти лише «так» чи «ні». Для цього в Python є True і False.",
        "True означає «так», False означає «ні». Пишуть їх з великої літери і без лапок.",
        "Тепер ти знаєш чотири речі, які лежать у скриньці: ціле число, число з крапкою, слова і True або False."
      ],
      example: "is_raining = False\nprint(type(is_raining))   # <class 'bool'>\n"
    },
    starter: "door_open = False\n# Нижче все готово.\nprint(\"Хвіртка відчинена:\", door_open)\nhero.move(4)\n",
    map: straight(4, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["variable", "print"],
    prints: "Хвіртка відчинена: True",
    stars: { three: 4, two: 6 },
    hint: "door_open = True — з великої літери, без лапок.",
    scene: { theme: "autumn", finish: "home", props: [HOME] }
  }
]

// 3. «Команди героя»: the student writes the hero's commands. The word «метод» comes only at the end.
const heroLevels: ReadonlyArray<Level> = [
  {
    id: "py-methods",
    language: "python",
    tier: "intro",
    title: "Перші команди",
    task: ["Тепер команди героя пишеш ти. Дрова за 3 клітинки.", "Зроби 3 кроки, по одному в рядку, а потім візьми дрова."],
    lesson: {
      title: "Як дати героєві команду",
      text: [
        "Герой у програмі зветься hero. Щоб він щось зробив, пиши hero, крапку і що зробити.",
        "hero.move() — один крок уперед. hero.collect() — взяти те, що лежить під ногами.",
        "Кожна команда пишеться з нового рядка. Дужки в кінці обов'язкові."
      ],
      example: "hero.move()      # крок\nhero.collect()   # взяти\n"
    },
    starter: "hero.move()\n",
    map: straight(3),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "Три рядки hero.move() і один hero.collect().",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 3, y: -1 }] }
  },
  {
    id: "py-move-number",
    language: "python",
    tier: "intro",
    title: "Число в дужках",
    task: ["Дрова далеко: за 6 клітинок.", "Дійди до них і візьми. Спробуй уміститися у два рядки."],
    lesson: {
      title: "Багато кроків одним рядком",
      text: [
        "У дужки можна написати число: hero.move(6) — це 6 кроків.",
        "Замість числа можна дати скриньку: hero.move(steps). Ти вже так робив."
      ],
      example: "hero.move(2)   # 2 кроки\n"
    },
    starter: "# Дійди до дров і візьми їх.\n",
    map: straight(6),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 2, two: 4 },
    hint: "hero.move(6), а потім hero.collect().",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 6, y: -1 }] }
  },
  {
    id: "py-turns",
    language: "python",
    tier: "intro",
    title: "Поворот",
    task: ["Яблуко за рогом: 3 клітинки вправо, а потім 3 вниз.", "Дійди й візьми його."],
    lesson: {
      title: "Як повернути",
      text: [
        "hero.turn_right() — повернути праворуч. hero.turn_left() — повернути ліворуч.",
        "Герой повертається на місці, без кроку. Праворуч і ліворуч — це від героя, куди він дивиться."
      ],
      example: "hero.turn_right()   # тепер герой дивиться вниз\n"
    },
    starter: "# Іди вправо, поверни, іди вниз.\n",
    map: corner(3, 3),
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 4, two: 6 },
    hint: "hero.move(3), hero.turn_right(), hero.move(3), hero.collect().",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  },
  {
    id: "py-variable",
    language: "python",
    tier: "practice",
    title: "Команди і скринька",
    task: [
      "Стежка до джерела — три шматки по 3 клітинки: вправо, вниз, знову вправо.",
      "Скринька steps уже є. Пиши steps замість 3 у кожному hero.move."
    ],
    lesson: {
      title: "Усе разом",
      text: [
        "Тепер ти пишеш і скриньку, і команди. hero.move(steps) бере число зі скриньки.",
        "Команди героя через крапку ще називають методами. Це просто «що вміє герой»."
      ],
      example: "steps = 2\nhero.move(steps)\nhero.turn_left()\n"
    },
    starter: "steps = 3\n",
    map: ["##########", "#S...#####", "####.#####", "####.#####", "####...F##", "##########"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    uses: ["variable"],
    stars: { three: 9, two: 12 },
    hint: "hero.move(steps), поворот праворуч, hero.move(steps), поворот ліворуч, hero.move(steps).",
    scene: { theme: "autumn", finish: "well", props: [HOME] }
  }
]

// 4. «Питаємо»: input() with answers in words, so nothing has to become a number yet.
const askLevels: ReadonlyArray<Level> = [
  {
    id: "py-ask",
    language: "python",
    tier: "practice",
    title: "Як вас звати?",
    task: ["Підійди до діда і спитай, як його звати. Потім привітайся: Добрий день, і його ім'я.", "Тут три поля, і на кожному інший дід."],
    lesson: {
      title: "Як спитати",
      text: [
        "input(\"Як вас звати?\") ставить питання й чекає відповіді. Тут відповідає дід.",
        "Відповідь кладуть у скриньку: name = input(\"Як вас звати?\").",
        "Ти не знаєш наперед, що скаже дід. Але скринька name запам'ятає відповідь."
      ],
      example: "pet = input(\"Як звати кота?\")   # відповідь: Мурчик\nprint(\"Привіт,\", pet)           # Привіт, Мурчик\n"
    },
    starter: "hero.move(3)\n# Спитай діда, як його звати.\n",
    map: straight(3, "F"),
    inputs: ["Іван"],
    prints: "Добрий день, Іван",
    fields: [
      { map: straight(3, "F"), inputs: ["Петро"], prints: "Добрий день, Петро" },
      { map: straight(3, "F"), inputs: ["Остап"], prints: "Добрий день, Остап" }
    ],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "variable", "print"],
    stars: { three: 5, two: 7 },
    hint: "name = input(\"Як вас звати?\"), а потім print(\"Добрий день,\", name).",
    scene: { theme: "autumn", props: [HOME], npcs: below("grandpa", 4) }
  },
  {
    id: "py-ask-two",
    language: "python",
    tier: "practice",
    title: "Звідки ти?",
    task: ["Мисливець скаже два слова: своє ім'я і своє село.", "Спитай двічі, а потім скажи обидві відповіді: спершу ім'я, потім село."],
    lesson: {
      title: "Два питання — дві скриньки",
      text: [
        "Питати можна кілька разів. Перший input() отримує першу відповідь, другий — другу.",
        "Кожну відповідь клади в окрему скриньку з назвою, яка підказує, що там."
      ],
      example: "food = input(\"Що їси?\")     # каша\ndrink = input(\"Що п'єш?\")   # чай\nprint(food, drink)          # каша чай\n"
    },
    starter: "hero.move(2)\n# Спитай ім'я, потім село.\n",
    map: straight(2, "F"),
    inputs: ["Богдан", "Липівка"],
    prints: "Богдан Липівка",
    fields: [{ map: straight(2, "F"), inputs: ["Степан", "Гаї"], prints: "Степан Гаї" }],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "variable", "print"],
    stars: { three: 8, two: 11 },
    hint: "name = input(\"Як тебе звати?\"), village = input(\"Звідки ти?\"), print(name, village).",
    scene: { theme: "autumn", props: [HOME], npcs: below("hunter", 3) }
  }
]

// 5. «Текст чи число»: an answer of input() is always words; int(), float() and str() turn one into the other.
const convertLevels: ReadonlyArray<Level> = [
  {
    id: "py-input",
    language: "python",
    tier: "practice",
    title: "Дід підкаже кроки",
    task: ["Дрова щоразу лежать деінде, а дід знає, скільки до них кроків.", "Спитай діда, зроби стільки кроків і візьми дрова. Тут три поля."],
    lesson: {
      title: "Відповідь — це слова",
      text: [
        "Що б не сказав дід, input() дає слова. Навіть \"3\" для Python — це напис, а не число.",
        "Зробити з напису число вміє int(): int(\"3\") дає 3.",
        "Тому відповідь загортають в int(): steps = int(input(\"Скільки кроків?\"))."
      ],
      example: "age = int(input(\"Скільки тобі років?\"))   # \"11\" стало числом 11\nprint(age + 1)                           # 12\n"
    },
    starter: "# Спитай діда, скільки кроків.\n",
    map: straight(3),
    inputs: ["3"],
    fields: [
      { map: straight(5), inputs: ["5"] },
      { map: straight(7), inputs: ["7"] }
    ],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["input"],
    stars: { three: 6, two: 9 },
    hint: "steps = int(input(\"Скільки кроків?\")), потім hero.move(steps) і hero.collect().",
    scene: { theme: "autumn", item: "wood", props: [HOME], npcs: [{ who: "grandpa", x: 1, y: 2 }] }
  },
  {
    id: "py-two-answers",
    language: "python",
    tier: "practice",
    title: "Два числа",
    task: ["Мисливець підкаже дорогу до гарбуза: скільки йти прямо і скільки вниз після повороту праворуч.", "Спитай двічі. Кожну відповідь зроби числом і поклади в свою скриньку."],
    lesson: {
      title: "Два числа від мисливця",
      text: [
        "Тут усе як раніше: два питання, дві скриньки.",
        "Тільки кожну відповідь загортаєш в int(), бо герой ходить числами, а не словами."
      ],
      example: "a = int(input(\"Перше число?\"))   # 4\nb = int(input(\"Друге число?\"))   # 6\n"
    },
    starter: "# Спитай, скільки йти прямо, а потім скільки вниз.\n",
    map: corner(3, 2),
    inputs: ["3", "2"],
    fields: [
      { map: corner(5, 3), inputs: ["5", "3"] },
      { map: corner(2, 4), inputs: ["2", "4"] }
    ],
    blocks: ["move", "turnLeft", "turnRight", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["input", "variable"],
    stars: { three: 12, two: 15 },
    hint: "Дві скриньки з int(input(…)), потім hero.move(перша), hero.turn_right(), hero.move(друга), hero.collect().",
    scene: { theme: "autumn", item: "carrot", props: [HOME], npcs: [{ who: "hunter", x: 1, y: 2 }] }
  },
  {
    id: "py-float-input",
    language: "python",
    tier: "practice",
    title: "Скільки важить?",
    task: ["Бабуся зважила кошик і скаже вагу. Вага буває з крапкою: 2.5.", "Спитай вагу, зроби з неї число і скажи: Кошик важить, число і кг."],
    lesson: {
      title: "Слова в число з крапкою",
      text: [
        "int() робить лише цілі числа. Напис \"2.5\" він не зрозуміє.",
        "Для чисел з крапкою є float(): float(\"2.5\") дає 2.5."
      ],
      example: "price = float(input(\"Скільки коштує?\"))   # \"7.5\" стало 7.5\n"
    },
    starter: "hero.move(3)\n# Спитай вагу кошика.\n",
    map: straight(3, "F"),
    inputs: ["2.5"],
    prints: "Кошик важить 2.5 кг",
    fields: [{ map: straight(3, "F"), inputs: ["3.5"], prints: "Кошик важить 3.5 кг" }],
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["input", "float", "print"],
    stars: { three: 6, two: 9 },
    hint: "weight = float(input(\"Скільки важить?\")), потім print(\"Кошик важить\", weight, \"кг\").",
    scene: { theme: "autumn", finish: "grandma", props: [HOME] }
  },
  {
    id: "py-to-text",
    language: "python",
    tier: "practice",
    title: "Число в слова",
    task: ["Робот хотів сказати: Яблук: 3. Але Python сварить на другий рядок.", "Запусти, прочитай, що каже Python, і виправ."],
    lesson: {
      title: "Слова і число не склеюються",
      text: [
        "Знак + склеює слова зі словами: \"Добрий\" + \" день\". А слова з числом не склеює.",
        "str() робить із числа слова: str(3) дає \"3\". Тепер їх можна склеїти."
      ],
      example: "coins = 5\nprint(\"Монет: \" + str(coins))   # Монет: 5\n"
    },
    starter: "apples = 3\nprint(\"Яблук: \" + apples)\nhero.move(2)\n",
    map: straight(2, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["str", "print"],
    prints: "Яблук: 3",
    stars: { three: 6, two: 9 },
    hint: "print(\"Яблук: \" + str(apples)).",
    scene: { theme: "autumn", finish: "grandma", props: [HOME] }
  }
]

// 6. «Рахуємо»: arithmetic with boxes, a counter, then small problems from life.
const mathLevels: ReadonlyArray<Level> = [
  {
    id: "py-plus",
    language: "python",
    tier: "practice",
    title: "Два шматки стежки",
    task: ["Стежка до дров — два шматки: first і second. Вони вже лежать у скриньках.", "Не рахуй сам. Нехай Python додасть їх просто в дужках hero.move."],
    lesson: {
      title: "Python уміє рахувати",
      text: [
        "Зі скриньками можна рахувати: + додати, - відняти, * помножити.",
        "hero.move(first + second): Python спершу додає, а потім герой іде стільки кроків."
      ],
      example: "a = 2\nb = 5\nprint(a + b)   # 7\nprint(b - a)   # 3\nprint(a * b)   # 10\n"
    },
    starter: "first = 3\nsecond = 4\n",
    map: straight(7),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable"],
    stars: { three: 7, two: 10 },
    hint: "hero.move(first + second), а потім hero.collect().",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 7, y: -1 }] }
  },
  {
    id: "py-count",
    language: "python",
    tier: "practice",
    title: "Рахуємо гриби",
    task: [
      "Бабуся просить порахувати гриби. Збери всі три, а після кожного додавай 1 у скриньку mushrooms.",
      "Наприкінці скажи: Грибів: 3. Число візьми зі скриньки."
    ],
    lesson: {
      title: "Скринька-лічильник",
      text: [
        "mushrooms = mushrooms + 1 — це не задачка з математики. Це команда.",
        "Вона означає: візьми число зі скриньки, додай 1 і поклади назад. Було 0, стало 1."
      ],
      example: "score = 0\nscore = score + 1   # тепер 1\nscore = score + 1   # тепер 2\nprint(\"Очки:\", score)   # Очки: 2\n"
    },
    starter: "mushrooms = 0\n",
    map: ["######", "#Sccc#", "######"],
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    uses: ["variable", "print"],
    prints: "Грибів: 3",
    stars: { three: 18, two: 22 },
    hint: "Тричі: hero.move(), hero.collect(), mushrooms = mushrooms + 1. Потім print(\"Грибів:\", mushrooms).",
    scene: { theme: "autumn", item: "apple", props: [HOME], npcs: [{ who: "villager", x: 5, y: 2 }] }
  },
  {
    id: "py-change",
    language: "python",
    tier: "practice",
    title: "Решта",
    task: ["У героя 20 гривень. Дійди до продавчині й спитай, скільки коштує хліб.", "Порахуй решту і скажи: Решта: і число. На другому полі ціна інша."],
    lesson: {
      title: "Віднімаємо",
      text: [
        "Решта — це скільки грошей було мінус ціна. У Python це 20 - price.",
        "Ціну дає input(), тому не забудь загорнути її в int()."
      ],
      example: "money = 50\nprice = 30\nprint(\"Залишилось:\", money - price)   # Залишилось: 20\n"
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
    hint: "price = int(input(\"Скільки коштує хліб?\")), потім print(\"Решта:\", 20 - price).",
    scene: { theme: "autumn", props: [HOME], npcs: below("girl", 5) }
  },
  {
    id: "py-market",
    language: "python",
    tier: "practice",
    title: "На ярмарку",
    task: [
      "Бабуся послала по яблука: треба 3 кілограми. Дійди до ярмарку й спитай, скільки коштує кілограм.",
      "Порахуй, скільки заплатити, і скажи: Разом: і суму. На другому полі ціна інша."
    ],
    lesson: {
      title: "Множимо",
      text: [
        "Ціна буває з копійками: 12.5. Тому відповідь загортай у float().",
        "Три кілограми коштують утричі більше: price * 3. Зірочка * — це «помножити»."
      ],
      example: "price = float(\"2.5\")\nprint(price * 3)   # 7.5\n"
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
    hint: "price = float(input(\"Скільки коштує кілограм?\")), потім total = price * 3 і print(\"Разом:\", total).",
    scene: { theme: "autumn", props: [HOME], npcs: [{ who: "villager", x: 5, y: 2 }] }
  },
  {
    id: "py-stairs",
    language: "python",
    tier: "challenge",
    title: "Сходинки до джерела",
    task: [
      "Дід каже довжину сходинки. Іди так: сходинка вправо, сходинка вниз, а останній шматок до джерела вдвічі довший.",
      "Спитай лише раз, а довжину останнього шматка порахуй у програмі."
    ],
    lesson: {
      title: "Рахуємо в дужках",
      text: ["hero.move(n * 2) — удвічі більше кроків, ніж лежить у скриньці n.", "Якщо n = 3, герой пройде 6 кроків."],
      example: "n = 4\nprint(n * 2)   # 8\n"
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
    scene: { theme: "autumn", finish: "well", props: [HOME], npcs: [{ who: "grandpa", x: 1, y: 2 }] }
  }
]

/** The levels of «Python: перші кроки» in six small chapters, in the order of play. See `pythonStartChapters`. */
export const pythonLevelGroups = {
  pyBoxes: boxLevels,
  pyTypes: typeLevels,
  pyHero: heroLevels,
  pyAsk: askLevels,
  pyConvert: convertLevels,
  pyMath: mathLevels
} as const

export const pythonLevels: ReadonlyArray<Level> = [...boxLevels, ...typeLevels, ...heroLevels, ...askLevels, ...convertLevels, ...mathLevels]

/** The reference solution of each level of `pythonLevels`, as Python code. Keys are level ids. */
export const pythonSolutions: Readonly<Record<string, string>> = {
  "py-box-first": "steps = 3\nhero.move(steps)\nhero.collect()\n",
  "py-box-twice": "steps = 4\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.collect()\n",
  "py-box-new": "steps = 2\nhero.move(steps)\nhero.turn_right()\nsteps = 4\nhero.move(steps)\nhero.collect()\n",
  "py-box-two": "forward = 5\ndown = 2\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
  "py-box-make": "steps = 6\nhero.move(steps)\nhero.collect()\n",
  "py-box-case": "steps = 4\nhero.move(steps)\nhero.collect()\n",
  "py-print": "greeting = \"Добрий день!\"\nprint(greeting)\nhero.move(5)\n",
  "py-text-number": "name = \"Тарас\"\napples = 3\nprint(name, \"приніс яблук:\", apples)\nhero.move(4)\n",
  "py-types": "steps = 5\nprint(type(steps))\nhero.move(steps)\nhero.collect()\n",
  "py-float-box": "weight = 2.5\nprint(\"Кошик важить\", weight, \"кг\")\nhero.move(3)\nhero.collect()\n",
  "py-bool": "door_open = True\nprint(\"Хвіртка відчинена:\", door_open)\nhero.move(4)\n",
  "py-methods": "hero.move()\nhero.move()\nhero.move()\nhero.collect()\n",
  "py-move-number": "hero.move(6)\nhero.collect()\n",
  "py-turns": "hero.move(3)\nhero.turn_right()\nhero.move(3)\nhero.collect()\n",
  "py-variable": "steps = 3\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.turn_left()\nhero.move(steps)\n",
  "py-ask": "hero.move(3)\nname = input(\"Як вас звати?\")\nprint(\"Добрий день,\", name)\n",
  "py-ask-two": "hero.move(2)\nname = input(\"Як тебе звати?\")\nvillage = input(\"Звідки ти?\")\nprint(name, village)\n",
  "py-input": "steps = int(input(\"Скільки кроків?\"))\nhero.move(steps)\nhero.collect()\n",
  "py-two-answers":
    "forward = int(input(\"Скільки прямо?\"))\ndown = int(input(\"Скільки вниз?\"))\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
  "py-float-input": "hero.move(3)\nweight = float(input(\"Скільки важить?\"))\nprint(\"Кошик важить\", weight, \"кг\")\n",
  "py-to-text": "apples = 3\nprint(\"Яблук: \" + str(apples))\nhero.move(2)\n",
  "py-plus": "first = 3\nsecond = 4\nhero.move(first + second)\nhero.collect()\n",
  "py-count":
    "mushrooms = 0\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nprint(\"Грибів:\", mushrooms)\n",
  "py-change": "hero.move(4)\nprice = int(input(\"Скільки коштує хліб?\"))\nprint(\"Решта:\", 20 - price)\n",
  "py-market":
    "hero.move(4)\nprice = float(input(\"Скільки коштує кілограм?\"))\ntotal = price * 3\nprint(\"Разом:\", total)\n",
  "py-stairs": "n = int(input(\"Яка довжина сходинки?\"))\nhero.move(n)\nhero.turn_right()\nhero.move(n)\nhero.turn_left()\nhero.move(n * 2)\n"
}
