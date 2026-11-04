import type { Level } from "../core/level.ts"
import type { MapRows } from "../core/world.ts"

/**
 * «Python: перші кроки», a chapter only for Python code, before the course: for students who have never written a
 * program in text. Each level opens with a short lesson (`lesson`) and brings one idea: a method of the hero, `print`,
 * a variable, a variable that changes, the types of data, `input()` with `int()`, two answers, `float`, arithmetic.
 * The ideas have no blocks, so `<EduBlocks>` and the block course skip these levels (`language: "python"`).
 * The levels that teach an idea pass only when the program uses it (`uses`, `prints`), and the levels with `input()`
 * have fields with other answers, so the number cannot be written into the program by hand.
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

export const pythonLevels: ReadonlyArray<Level> = [
  {
    id: "py-methods",
    language: "python",
    tier: "intro",
    title: "Команди з крапкою",
    task: ["Дрова лежать за 4 клітинки від хати. Дійди до них і візьми: hero.collect().", "Спробуй уміститися у два рядки."],
    lesson: {
      title: "Метод: що вміє герой",
      text: [
        "У програмі герой зветься hero. Усе, що він уміє, пишуть через крапку: hero.move() означає «герою, зроби крок».",
        "Дія після крапки називається методом. Дужки () обов'язкові: вони кажуть «виконай зараз».",
        "У дужки можна передати значення, воно зветься аргументом: hero.move(3) робить три кроки."
      ],
      example: "hero.move()        # один крок\nhero.move(3)       # три кроки: 3 — аргумент\nhero.turn_right()  # поворот праворуч\n"
    },
    starter: "# Кожна команда — з нового рядка.\nhero.move()\n",
    map: straight(4),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 2, two: 5 },
    hint: "Один рядок — hero.move(4), другий — hero.collect().",
    scene: { theme: "autumn", item: "wood", props: [HOME, { kind: "woodshed", x: 4, y: -1 }] }
  },
  {
    id: "py-print",
    language: "python",
    tier: "intro",
    title: "Герой говорить",
    task: ["Дід стоїть біля вказівника й погано бачить.", "Привітайся з ним: надрукуй Добрий день! і дійди до вказівника."],
    lesson: {
      title: "print(): програма говорить",
      text: [
        "print(…) друкує те, що в дужках, у віконці під кодом.",
        "Текст беруть у лапки: \"Привіт\". Без лапок Python шукатиме змінну з такою назвою й не знайде.",
        "Числа пишуть без лапок, і Python їх рахує: print(2 + 3) надрукує 5."
      ],
      example: "print(\"Привіт!\")      # Привіт!\nprint(2 + 3)          # 5\nprint(\"2 + 3\")        # 2 + 3 — це текст, він не рахується\nprint(\"ура\".upper())  # УРА: upper() — метод тексту\n"
    },
    starter: "# Спершу привітайся, потім іди.\n",
    map: straight(5, "F"),
    blocks: ["move"],
    goals: [{ type: "finish" }],
    uses: ["print"],
    prints: "Добрий день!",
    stars: { three: 2, two: 4 },
    hint: "print(\"Добрий день!\") — лапки, знак оклику й дужки мають бути саме такими. Потім hero.move(5).",
    scene: { theme: "autumn", props: [HOME], npcs: [{ who: "grandpa", x: 6, y: 2 }] }
  },
  {
    id: "py-variable",
    language: "python",
    tier: "intro",
    title: "Скринька з написом",
    task: [
      "Стежка до джерела — три однакові відрізки по 3 клітинки.",
      "Поклади довжину відрізка в змінну й пиши її замість числа. Якщо стежка зміниться, виправиш лише один рядок."
    ],
    lesson: {
      title: "Змінна — скринька з написом",
      text: [
        "Змінна — це скринька з назвою, у якій лежить значення. steps = 3 означає «поклади 3 у скриньку steps».",
        "Знак = у Python означає «поклади», а не «дорівнює». Зліва назва, справа те, що кладемо.",
        "Далі пиши назву замість значення: hero.move(steps). Python сам візьме зі скриньки 3.",
        "Назву вигадуєш сам: латинськими літерами, без пробілів, можна з _, наприклад steps чи my_steps."
      ],
      example: "apples = 5      # у скриньці apples лежить 5\nprint(apples)   # 5\napples = 7      # поклали нове значення, старе зникло\nprint(apples)   # 7\n"
    },
    starter: "steps = 3\n",
    map: ["##########", "#S...#####", "####.#####", "####.#####", "####...F##", "##########"],
    blocks: ["move", "turnLeft", "turnRight"],
    goals: [{ type: "finish" }],
    uses: ["variable"],
    stars: { three: 9, two: 12 },
    hint: "hero.move(steps), поворот праворуч, hero.move(steps), поворот ліворуч, hero.move(steps).",
    scene: { theme: "autumn", finish: "well", props: [HOME] }
  },
  {
    id: "py-count",
    language: "python",
    tier: "practice",
    title: "Рахуємо гриби",
    task: [
      "Бабуся просить порахувати гриби. Збери всі три, а після кожного додавай 1 до змінної.",
      "Наприкінці надрукуй Грибів: 3 — число візьми зі змінної."
    ],
    lesson: {
      title: "Змінна змінюється",
      text: [
        "Значення змінної можна міняти під час програми, тому вона й «змінна».",
        "mushrooms = mushrooms + 1 означає: візьми те, що лежить у скриньці, додай 1 і поклади назад. Коротше пишуть mushrooms += 1.",
        "print друкує кілька значень через кому, з пробілом між ними: print(\"Грибів:\", mushrooms)."
      ],
      example: "score = 0\nscore = score + 10    # тепер 10\nscore += 5            # тепер 15\nprint(\"Очки:\", score)  # Очки: 15\n"
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
    id: "py-types",
    language: "python",
    tier: "practice",
    title: "Число чи текст",
    task: [
      "Робот записав кількість кроків у лапках, і герой не рушає з місця.",
      "Запусти програму, прочитай помилку й виправ її. Що друкує type(steps) до і після?"
    ],
    lesson: {
      title: "Типи даних: число чи текст",
      text: [
        "Кожне значення має тип. 5 — ціле число (int), 2.5 — дробове число (float), \"5\" — текст (str), True і False — так чи ні (bool).",
        "Тип показує type(): print(type(5)) надрукує <class 'int'>.",
        "Тип важливий: 5 + 5 дає 10, а \"5\" + \"5\" дає 55, бо тексти просто склеюються.",
        "Текст із цифрами робить числом int(): int(\"5\") дає 5."
      ],
      example: "print(type(7))       # <class 'int'>\nprint(type(\"7\"))     # <class 'str'>\nprint(type(True))    # <class 'bool'>\nprint(\"5\" + \"5\")     # 55\nprint(5 + 5)         # 10\nprint(int(\"5\") + 1)  # 6\n"
    },
    starter: "steps = \"5\"\nprint(type(steps))\nhero.move(steps)\nhero.collect()\n",
    map: straight(5),
    blocks: ["move", "collect"],
    goals: [{ type: "crystals" }],
    stars: { three: 7, two: 9 },
    hint: "Прибери лапки: steps = 5. Або зроби з тексту число: hero.move(int(steps)).",
    scene: { theme: "autumn", item: "apple", props: [HOME] }
  },
  {
    id: "py-input",
    language: "python",
    tier: "practice",
    title: "Дід підкаже",
    task: [
      "Дід знає, скільки кроків до дров, але щоразу дрова лежать деінде. Спитай його через input() і зроби стільки кроків.",
      "Програма має пройти всі три поля: на кожному дід відповідає інше число."
    ],
    lesson: {
      title: "input(): програма питає",
      text: [
        "input(\"питання\") ставить питання й чекає відповіді. У справжньому Python відповідь вводиш ти, а тут відповідає дід, на кожному полі по-своєму.",
        "Відповідь зберігають у змінну: answer = input(\"Скільки кроків?\").",
        "Увага: input() завжди дає текст, навіть коли відповіли цифрами. \"3\" — це не 3. Тому відповідь загортають в int(): steps = int(input(\"Скільки кроків?\"))."
      ],
      example: "name = input(\"Як тебе звати?\")          # відповідь: Оля\nprint(\"Привіт,\", name)                  # Привіт, Оля\nage = int(input(\"Скільки тобі років?\"))  # \"12\" стало числом 12\nprint(age + 1)                          # 13\n"
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
    stars: { three: 6, two: 8 },
    hint: "steps = int(input(\"Скільки кроків?\")), потім hero.move(steps) і hero.collect().",
    scene: { theme: "autumn", item: "wood", props: [HOME], npcs: [{ who: "grandpa", x: 1, y: 2 }] }
  },
  {
    id: "py-two-answers",
    language: "python",
    tier: "practice",
    title: "Два питання",
    task: [
      "Мисливець підкаже дорогу до гарбуза: спершу скільки йти прямо, потім скільки після повороту праворуч.",
      "Спитай двічі й збережи кожну відповідь у свою змінну."
    ],
    lesson: {
      title: "Кілька питань",
      text: [
        "Питати можна скільки завгодно разів: кожен input() отримує наступну відповідь.",
        "Для кожної відповіді заведи свою змінну з назвою, яка каже, що в ній лежить: forward, down."
      ],
      example: "a = int(input(\"Перше число?\"))   # 4\nb = int(input(\"Друге число?\"))   # 6\nprint(\"Разом:\", a + b)           # Разом: 10\n"
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
    hint: "Дві змінні з int(input(…)), потім hero.move(перша), hero.turn_right(), hero.move(друга), hero.collect().",
    scene: { theme: "autumn", item: "carrot", props: [HOME], npcs: [{ who: "hunter", x: 1, y: 2 }] }
  },
  {
    id: "py-market",
    language: "python",
    tier: "practice",
    title: "На ярмарку",
    task: [
      "Бабуся послала по яблука: треба 3 кілограми. Дійди до ярмарку й спитай, скільки коштує кілограм.",
      "Порахуй, скільки заплатити, і надрукуй суму так: Разом: і число після пробілу. На другому полі ціна інша."
    ],
    lesson: {
      title: "Дробові числа: float",
      text: [
        "Не всі числа цілі: ціна буває 12.5 гривні. Такі числа звуться дробовими, їхній тип — float.",
        "Дробову частину відділяють крапкою, а не комою: 12.5, а не 12,5.",
        "int(\"12.5\") дасть помилку, бо це не ціле число. Дробове число з тексту робить float(\"12.5\").",
        "Ділення / дає float: 7 / 2 дорівнює 3.5. Якщо потрібне ціле, є ділення без остачі //: 7 // 2 дорівнює 3."
      ],
      example: "print(type(2.5))         # <class 'float'>\nprice = float(\"12.5\")    # 12.5\nprint(price * 3)         # 37.5\nprint(7 / 2)             # 3.5\nprint(7 // 2)            # 3\n"
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
      "Дід каже довжину сходинки. Стежка така: сходинка вправо, сходинка вниз, а останній відрізок до джерела вдвічі довший.",
      "Спитай один раз і порахуй довжину останнього відрізка в самій програмі."
    ],
    lesson: {
      title: "Рахуємо зі змінними",
      text: [
        "Зі змінними можна рахувати: + додати, - відняти, * помножити, / поділити.",
        "hero.move(n * 2) робить удвічі більше кроків, ніж лежить у n. Python спершу рахує, а потім передає результат героєві."
      ],
      example: "n = 4\nprint(n + 1)   # 5\nprint(n * 2)   # 8\nprint(n - 3)   # 1\n"
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

/** The reference solution of each level of `pythonLevels`, as Python code. Keys are level ids. */
export const pythonSolutions: Readonly<Record<string, string>> = {
  "py-methods": "hero.move(4)\nhero.collect()\n",
  "py-print": "print(\"Добрий день!\")\nhero.move(5)\n",
  "py-variable": "steps = 3\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.turn_left()\nhero.move(steps)\n",
  "py-count":
    "mushrooms = 0\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nhero.move()\nhero.collect()\nmushrooms = mushrooms + 1\nprint(\"Грибів:\", mushrooms)\n",
  "py-types": "steps = 5\nprint(type(steps))\nhero.move(steps)\nhero.collect()\n",
  "py-input": "steps = int(input(\"Скільки кроків?\"))\nhero.move(steps)\nhero.collect()\n",
  "py-two-answers":
    "forward = int(input(\"Скільки прямо?\"))\ndown = int(input(\"Скільки вниз?\"))\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
  "py-market":
    "hero.move(4)\nprice = float(input(\"Скільки коштує кілограм?\"))\ntotal = price * 3\nprint(\"Разом:\", total)\n",
  "py-stairs": "n = int(input(\"Яка довжина сходинки?\"))\nhero.move(n)\nhero.turn_right()\nhero.move(n)\nhero.turn_left()\nhero.move(n * 2)\n"
}
