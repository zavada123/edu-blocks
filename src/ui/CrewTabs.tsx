/** Whose program the editor holds on a farm day with a helper: the worker's or the helper's. */
export type CrewTab = "worker" | "helper"

export interface CrewTabsProps {
  readonly tab: CrewTab
  /** The helper's name: «Тарас». */
  readonly helper: string
  readonly disabled: boolean
  readonly onPick: (tab: CrewTab) => void
}

/**
 * Two programs over the editor: «Робітник · Тарас». Each worker runs its own program; a turn of the day goes to the
 * worker first, then to the helper.
 */
export const CrewTabs = ({ tab, helper, disabled, onPick }: CrewTabsProps) => (
  <div className="eb-crew">
    <div className="eb-crew-tabs" role="tablist" aria-label="Чия програма в редакторі">
      {(["worker", "helper"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          className="eb-btn eb-btn-small eb-crew-tab"
          aria-selected={t === tab}
          disabled={disabled}
          onClick={() => onPick(t)}
        >
          {t === "worker" ? "Робітник" : helper}
        </button>
      ))}
    </div>
    <span className="eb-crew-note">Щоходу спершу робітник, потім {helper}. Кожен робить свою програму.</span>
  </div>
)
