import type { Lesson as LessonData } from "../core/level.ts";
/**
 * The lesson of a level over the code: what the new idea is, in a few short paragraphs, and an example to read.
 * It opens with the level and folds away on the first run, so the code gets the room; a tap opens it again.
 */
export declare const Lesson: ({ lesson, open, onToggle }: {
    readonly lesson: LessonData;
    readonly open: boolean;
    readonly onToggle: (open: boolean) => void;
}) => import("react").JSX.Element;
