import type { Level } from "../core/level.ts"
import { levels } from "./index.ts"

/**
 * The course in chapters by what a student learns, not by school grade: each chapter brings one new idea and
 * ends with a level that makes the student think. A student of any age starts with the first chapter.
 */
export type ChapterId = "sequence" | "loops" | "conditions" | "while" | "puzzles" | "enemies"

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
    levels: ["g4-road", "g4-repeat", "g4-corner", "g4-stairs", "g4-sled", "g6-nested"]
  },
  {
    id: "conditions",
    title: "Умови",
    skill: "Спитати «якщо…» і зробити різне в різних випадках.",
    levels: ["g4-if", "g4-fence", "g5-snake"]
  },
  {
    id: "while",
    title: "Цикл «поки»",
    skill: "Повторювати, доки не справдиться умова, навіть не знаючи, скільки разів.",
    levels: ["g4-until", "g5-bridge", "g5-way-home", "g6-spiral", "g6-maze"]
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
  }
]

/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
export const chapterOf = (levelId: string): Chapter | undefined => chapters.find((c) => c.levels.includes(levelId))

/** The levels of a chapter, in order. */
export const chapterLevels = (chapter: Chapter): ReadonlyArray<Level> =>
  chapter.levels.flatMap((id) => levels.find((l) => l.id === id) ?? [])

/** The first chapter has bigger blocks and a bigger field for the youngest. */
export const isFirstChapter = (levelId: string): boolean => chapters[0]?.levels.includes(levelId) === true
