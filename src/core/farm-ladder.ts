import type { BlockName, Lesson } from "./level.ts"

/**
 * The first days of the farm open the commands one by one, so a student who comes to the farm sees a short palette
 * and one goal, not every loop and question at once. Each step is a day: its new commands, the goal of the day in
 * the task, and a lesson over the Python code. From the last step on, the farm adds what the course taught.
 */
export interface FarmStep {
  readonly day: number
  /** The commands this day adds. */
  readonly blocks: ReadonlyArray<BlockName>
  /** The goal of the day, the first line of the task. */
  readonly goal: string
  readonly lesson: Lesson
}

export const FARM_LADDER: ReadonlyArray<FarmStep> = [
  {
    day: 1,
    blocks: ["move", "turnLeft", "turnRight", "collect", "store"],
    goal: "Мета першого дня: візьми колоди на стежці праворуч і віднеси їх у комору. Сьогодні є лише крок, повороти, «взяти» й «віднести на склад».",
    lesson: {
      title: "перший робочий день",
      text: [
        "Робітник стоїть біля хати, а праворуч на стежці лежать колоди. Хата і є комора.",
        "Дійди до колоди й візьми її. У руки влазить 3 колоди.",
        "Потім розвернись, дійди до хати й віднеси колоди в комору."
      ],
      example: [
        "hero.move()        # крок уперед",
        "hero.move()",
        "hero.collect()     # узяти колоду",
        "hero.turn_left()   # два повороти: тепер обличчям до хати",
        "hero.turn_left()",
        "hero.move()",
        "hero.move()",
        "hero.move()        # стоїмо на хаті",
        "hero.store()       # віднести в комору"
      ].join("\n")
    }
  },
  {
    day: 2,
    blocks: ["repeat"],
    goal: "Нова команда: «повторити». Мета дня: те саме, що вчора, але кроки, які повторюються, загорни в цикл.",
    lesson: {
      title: "повторити",
      text: ["Замість трьох однакових рядків напиши цикл.", "Усе, що зсунуто під for, робітник повторить стільки разів, скільки в range()."],
      example: ["for i in range(3):", "    hero.move()    # три кроки вперед", "hero.collect()"].join("\n")
    }
  },
  {
    day: 3,
    blocks: ["if", "ifElse", "onCrystal", "handsFull"],
    goal: "Нові команди: «якщо», «інакше» і питання «тут річ?», «руки повні?». Мета дня: бери колоду лише там, де вона лежить.",
    lesson: {
      title: "якщо",
      text: ["Колоди щодня лежать по-різному. Програма питає, а не вгадує.", "Під if пишуть те, що робити, коли відповідь True."],
      example: ["for i in range(4):", "    hero.move()", "    if hero.item_here():   # тут колода?", "        hero.collect()"].join("\n")
    }
  },
  {
    day: 4,
    blocks: ["forever", "wallAhead", "atStorehouse"],
    goal: "Нові команди: «завжди» і питання «попереду стіна?», «тут склад?». Мета дня: одна програма на весь день: обходь хутір колом і розвантажуйся в коморі.",
    lesson: {
      title: "завжди",
      text: ["while True повторює без кінця, аж поки скінчаться ходи дня.", "Усередині програма щоразу питає, що робити далі."],
      example: [
        "while True:",
        "    if hero.item_here() and not hero.hands_full():",
        "        hero.collect()",
        "    if hero.at_storehouse():",
        "        hero.store()",
        "    if hero.wall_ahead():",
        "        hero.turn_right()",
        "    else:",
        "        hero.move()"
      ].join("\n")
    }
  },
  {
    day: 5,
    blocks: ["repeatUntil", "not", "and", "or"],
    goal: "Нові команди: «повторювати, поки не», «не», «і», «або». Відтепер на хуторі є й усе, що ти пройшов у курсі.",
    lesson: {
      title: "поки не",
      text: ["while not повторює, поки умова не стане правдою.", "and і or складають одне питання з двох."],
      example: ["while not hero.wall_ahead():", "    hero.move()", "    if hero.item_here() and not hero.hands_full():", "        hero.collect()"].join("\n")
    }
  }
]

/** The day from which the farm has every command of the ladder and what the course taught. */
export const LADDER_DONE = FARM_LADDER.reduce((last, s) => Math.max(last, s.day), 1)

/** The commands the ladder has opened by this day. */
export const ladderBlocks = (day: number): ReadonlyArray<BlockName> => FARM_LADDER.filter((s) => s.day <= day).flatMap((s) => s.blocks)

/** The step that opens on this day, if any. */
export const ladderStep = (day: number): FarmStep | undefined => FARM_LADDER.find((s) => s.day === day)
