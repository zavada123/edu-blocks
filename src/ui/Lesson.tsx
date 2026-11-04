import type { Lesson as LessonData } from "../core/level.ts"

/**
 * The lesson of a level over the code: what the new idea is, in a few short paragraphs, and an example to read.
 * It opens with the level and folds away on the first run, so the code gets the room; a tap opens it again.
 */
export const Lesson = ({ lesson, open, onToggle }: { readonly lesson: LessonData; readonly open: boolean; readonly onToggle: (open: boolean) => void }) => (
  <details className="eb-lesson" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
    <summary>
      <span className="eb-lesson-mark" aria-hidden="true">
        ?
      </span>
      Урок: {lesson.title}
    </summary>
    <div className="eb-lesson-body">
      {lesson.text.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <pre className="eb-lesson-example" aria-label="Приклад коду">
        {lesson.example}
      </pre>
    </div>
  </details>
)
