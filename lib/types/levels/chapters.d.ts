import type { Level } from "../core/level.ts";
import { pythonLevelGroups } from "./python-start.ts";
/**
 * The course in chapters by what a student learns, not by school grade: each chapter brings one new idea and
 * ends with a level that makes the student think. A student of any age starts with the first chapter.
 */
export type ChapterId = keyof typeof pythonLevelGroups | "sequence" | "loops" | "conditions" | "while" | "logic" | "store" | "gates" | "pick" | "puzzles" | "enemies" | "guards" | "counter" | "functions";
export interface Chapter {
    readonly id: ChapterId;
    readonly title: string;
    /** What the student learns, for the course page. */
    readonly skill: string;
    /** Level ids in the order they are played. */
    readonly levels: ReadonlyArray<string>;
}
export declare const chapters: ReadonlyArray<Chapter>;
/**
 * «Python: перші кроки»: six small chapters only for Python, before the course, for students who meet variables,
 * `print` and `input()` for the first time. They are not in `chapters`, the course of blocks and Python alike; see
 * `courseChapters`.
 */
export declare const pythonStartChapters: ReadonlyArray<Chapter>;
/** Whether a chapter is one of «Python: перші кроки», the chapters before the course. */
export declare const isPythonStartChapter: (chapter: Chapter) => boolean;
/** The words before a chapter's title: «Вступ 1»…«Вступ 6» for «Python: перші кроки», «Глава N» for the course. */
export declare const chapterLabel: (chapter: Chapter) => string;
/** The chapters a student sees: the Python course starts with the chapters of «Python: перші кроки». */
export declare const courseChapters: (language: "blocks" | "python") => ReadonlyArray<Chapter>;
/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
export declare const chapterOf: (levelId: string) => Chapter | undefined;
/** The levels of a chapter, in order. */
export declare const chapterLevels: (chapter: Chapter) => ReadonlyArray<Level>;
/** The first chapter has bigger blocks and a bigger field for the youngest. */
export declare const isFirstChapter: (levelId: string) => boolean;
