/** What the screen needs to show the fields of a level: see `FieldTabs`. */
export interface FieldChoice {
  /** Fields of the level, its own map included. */
  readonly count: number
  /** The field on the screen, from 0. */
  readonly index: number
  /** Whether the last run passed each field, or null before the first run. */
  readonly passed: ReadonlyArray<boolean> | null
  /** While the first run plays, the student watches it to the end. */
  readonly disabled: boolean
  readonly onPick: (index: number) => void
}

const mark = (passed: boolean | undefined): string => (passed === undefined ? "" : passed ? " ✓" : " ✗")

/**
 * The fields of a level over the field: «Поле 1 · Поле 2 · Поле 3». Before a run a tab shows its map; after a run
 * each tab has a mark, and a tab plays the run on its field.
 */
export const FieldTabs = ({ count, index, passed, disabled, onPick }: FieldChoice) => (
  <div className="eb-fields" role="group" aria-label="Поля рівня: одна програма має пройти всі">
    <span className="eb-fields-note">Одна програма — {count} поля:</span>
    {Array.from({ length: count }, (_, i) => {
      const ok = passed?.[i]
      const state = ok === undefined ? "" : ok ? " eb-field-tab-ok" : " eb-field-tab-fail"
      const said = ok === undefined ? "" : ok ? ", пройдено" : ", не пройдено"
      return (
        <button
          key={i}
          type="button"
          className={`eb-btn eb-btn-small eb-field-tab${state}`}
          aria-pressed={i === index}
          aria-label={`Поле ${i + 1}${said}`}
          disabled={disabled}
          onClick={() => onPick(i)}
        >
          Поле {i + 1}
          {mark(ok)}
        </button>
      )
    })}
  </div>
)
