import type { Level } from "../core/level.ts";
/**
 * The course in chapters by what a student learns, not by school grade: each chapter brings one new idea and
 * ends with a level that makes the student think. A student of any age starts with the first chapter.
 */
export type ChapterId = "sequence" | "loops" | "conditions" | "while" | "puzzles" | "enemies" | "counter" | "functions";
export interface Chapter {
    readonly id: ChapterId;
    readonly title: string;
    /** What the student learns, for the course page. */
    readonly skill: string;
    /** Level ids in the order they are played. */
    readonly levels: ReadonlyArray<string>;
}
export declare const chapters: ReadonlyArray<Chapter>;
/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
export declare const chapterOf: (levelId: string) => Chapter | undefined;
/** The levels of a chapter, in order. */
export declare const chapterLevels: (chapter: Chapter) => ReadonlyArray<Level>;
/** The first chapter has bigger blocks and a bigger field for the youngest. */
export declare const isFirstChapter: (levelId: string) => boolean;
