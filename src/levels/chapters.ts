import type { Level } from "../core/level.ts"
import { levels } from "./index.ts"
import { pythonLevelGroups, pythonLevels } from "./python-start.ts"

/**
 * The course in chapters by what a student learns, not by school grade: each chapter brings one new idea and
 * ends with a level that makes the student think. A student of any age starts with the first chapter.
 */
export type ChapterId = keyof typeof pythonLevelGroups | "sequence" | "loops" | "conditions" | "while" | "logic" | "store" | "gates" | "pick" | "puzzles" | "enemies" | "guards" | "counter" | "functions"

export interface Chapter {
  readonly id: ChapterId
  readonly title: string
  /** What the student learns, for the course page. */
  readonly skill: string
  /** Level ids in the order they are played. */
  readonly levels: ReadonlyArray<string>
}

export const chapters: ReadonlyArray<Chapter> = [
  {
    id: "sequence",
    title: "Послідовність",
    skill: "Скласти план із кроків і поворотів та виконати його по черзі.",
    levels: ["g3-steps", "g3-turn", "g3-gate", "g3-logs", "g3-finish", "g3-zigzag"]
  },
  {
    id: "loops",
    title: "Цикли",
    skill: "Побачити, що повторюється, і загорнути це в «повторити».",
    levels: ["g4-road", "g4-repeat", "g4-corner", "g4-stairs", "g4-sled", "b-loop", "g6-nested"]
  },
  {
    id: "conditions",
    title: "Умови",
    skill: "Спитати «якщо…» і зробити різне в різних випадках.",
    levels: ["g4-if", "g4-fence", "g5-snake", "b-branch"]
  },
  {
    id: "while",
    title: "Цикл «поки»",
    skill: "Повторювати, доки не справдиться умова, навіть не знаючи, скільки разів.",
    levels: ["g4-until", "b-until", "g5-bridge", "g5-way-home", "g6-spiral", "g6-maze"]
  },
  {
    id: "logic",
    title: "Правда чи ні",
    skill: "Скласти умову з частин: «і», «або», «не». Умова буває правдою або неправдою.",
    levels: ["l-mill", "l-fish", "l-drift"]
  },
  {
    id: "store",
    title: "Склад і ходки",
    skill: "Носити не більше, ніж уміщається в руки: рахувати ходки й вертатися на склад, коли руки повні.",
    levels: ["s-woodshed", "s-two-hands", "s-trips", "s-last-trip"]
  },
  {
    id: "gates",
    title: "Важелі й ворота",
    skill: "Перевірити стан, перш ніж діяти: тягнути лише вимкнений важіль, склавши умову з «і» та «не».",
    levels: ["w-lever", "w-careful", "w-row", "w-yard"]
  },
  {
    id: "pick",
    title: "Що тут лежить?",
    skill: "Спитати, що саме лежить під ногами, і взяти лише потрібне: питання з вибором у самому блоці.",
    levels: ["k-carrots", "k-eggs", "k-garden"]
  },
  {
    id: "puzzles",
    title: "Пастки й сили",
    skill: "Обійти пастки й знайти найкоротший шлях, коли сил мало: подумати, перш ніж іти.",
    levels: ["p-thin-ice", "p-field", "p-cold", "p-fires", "p-stairs", "p-river", "p-fork"]
  },
  {
    id: "enemies",
    title: "Вороги",
    skill: "Стежити за ворогом: вдарити вчасно і не підставити спину.",
    levels: ["g5-spirit", "g5-glade", "g5-guards", "g6-bear"]
  },
  {
    id: "guards",
    title: "Вартові й патрулі",
    skill: "Вороги ходять і помічають героя: чекати слушної миті, реагувати на ворога й не трапитися йому на очі.",
    levels: ["v-ambush", "v-unseen", "v-patrol"]
  },
  {
    id: "counter",
    title: "Лічильник",
    skill: "Рахувати змінною, що змінюється в циклі: щоразу на крок більше.",
    levels: ["c-apples", "c-spiral"]
  },
  {
    id: "functions",
    title: "Власні блоки (функції)",
    skill: "Скласти свій блок із команд, що повторюються, і кликати його, де треба: у програмі, у циклі, в «якщо».",
    levels: ["f-stairs", "b-define", "f-apples", "c-stones", "f-bushes", "c-rocks"]
  }
]

/** What each chapter of «Python: перші кроки» is called and teaches. */
const pythonStartTitles: Readonly<Record<keyof typeof pythonLevelGroups, { readonly title: string; readonly skill: string }>> = {
  pyHero: { title: "Команди героя", skill: "Писати героєві команди: крок, кілька кроків, поворот, взяти, сказати. І читати помилки." },
  pyBoxes: { title: "Скринька для числа", skill: "Зрозуміти, що змінна — це скринька з назвою, і класти в неї числа." },
  pyMath: { title: "Рахуємо", skill: "Додавати, віднімати й множити числа зі скриньок і класти результат у скриньку." },
  pyTypes: { title: "Що лежить у скриньці", skill: "Класти в скриньку ціле число, число з крапкою, слова в лапках і True або False." },
  pyAsk: { title: "Питаємо", skill: "Спитати через input() і покласти відповідь у скриньку." },
  pyConvert: { title: "Слова чи число", skill: "Робити зі слів число через int() і float(), а з числа слова через str(), і розв'язувати задачки." }
}

/**
 * «Python: перші кроки»: six small chapters only for Python, before the course, for students who meet variables,
 * `print` and `input()` for the first time. They are not in `chapters`, the course of blocks and Python alike; see
 * `courseChapters`.
 */
export const pythonStartChapters: ReadonlyArray<Chapter> = (Object.keys(pythonLevelGroups) as Array<keyof typeof pythonLevelGroups>).map((id) => ({
  id,
  ...pythonStartTitles[id],
  levels: pythonLevelGroups[id].map((l) => l.id)
}))

/** Whether a chapter is one of «Python: перші кроки», the chapters before the course. */
export const isPythonStartChapter = (chapter: Chapter): boolean => pythonStartChapters.includes(chapter)

/** The words before a chapter's title: «Вступ 1»…«Вступ 6» for «Python: перші кроки», «Глава N» for the course. */
export const chapterLabel = (chapter: Chapter): string =>
  isPythonStartChapter(chapter) ? `Вступ ${pythonStartChapters.indexOf(chapter) + 1}` : `Глава ${chapters.indexOf(chapter) + 1}`

/** The chapters a student sees: the Python course starts with the chapters of «Python: перші кроки». */
export const courseChapters = (language: "blocks" | "python"): ReadonlyArray<Chapter> =>
  language === "python" ? [...pythonStartChapters, ...chapters] : chapters

/** Every level of the course and of «Python: перші кроки». */
const allLevels: ReadonlyArray<Level> = [...pythonLevels, ...levels]

/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
export const chapterOf = (levelId: string): Chapter | undefined => courseChapters("python").find((c) => c.levels.includes(levelId))

/** The levels of a chapter, in order. */
export const chapterLevels = (chapter: Chapter): ReadonlyArray<Level> =>
  chapter.levels.flatMap((id) => allLevels.find((l) => l.id === id) ?? [])

/** The first chapter has bigger blocks and a bigger field for the youngest. */
export const isFirstChapter = (levelId: string): boolean => chapters[0]?.levels.includes(levelId) === true
