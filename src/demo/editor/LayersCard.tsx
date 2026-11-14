import type { Level } from "../../core/level.ts"
import type { Brush } from "./edit.ts"
import { LAYERS, type LayerId, layerOfBrush, type LayerState, toggled } from "./layers.ts"

/** The layer panel: an eye to hide a layer, a lock to keep it, and the map signs over the field. */
export const LayersCard = ({
  level,
  brush,
  state,
  onChange
}: {
  readonly level: Level
  readonly brush: Brush
  readonly state: LayerState
  readonly onChange: (state: LayerState) => void
}) => {
  const active = layerOfBrush(brush)
  const hasAbove = (level.scene?.tilemap?.layers ?? []).some((l) => l.kind === "above")
  const shown = LAYERS.filter((l) => l.id !== "above" || hasAbove)
  const lock = (id: LayerId) => onChange({ ...state, locked: toggled(state.locked, id) })
  const hide = (id: LayerId) => onChange({ ...state, hidden: toggled(state.hidden, id) })
  return (
    <section className="ed-card ed-layers" aria-label="Шари">
      <h2>Шари</h2>
      <ul>
        {shown.map((l) => {
          const hidden = l.id === "logic" ? !state.logicOnTop : state.hidden.has(l.id)
          const locked = state.locked.has(l.id)
          return (
            <li key={l.id} className={active === l.id ? "ed-layer ed-layer-on" : "ed-layer"} title={l.hint}>
              <button
                type="button"
                className="ed-layer-eye"
                aria-pressed={!hidden}
                aria-label={l.id === "logic" ? "Знаки мапи поверх поля" : hidden ? `Показати шар «${l.name}»` : `Сховати шар «${l.name}»`}
                onClick={() => (l.id === "logic" ? onChange({ ...state, logicOnTop: !state.logicOnTop }) : hide(l.id))}
              >
                {l.id === "logic" ? "#" : hidden ? "◌" : "👁"}
              </button>
              <button
                type="button"
                className="ed-layer-lock"
                aria-pressed={locked}
                aria-label={locked ? `Відімкнути шар «${l.name}»` : `Замкнути шар «${l.name}»`}
                disabled={l.id === "above"}
                onClick={() => lock(l.id)}
              >
                {locked ? "🔒" : "🔓"}
              </button>
              <span className="ed-layer-name">{l.name}</span>
              {active === l.id && <span className="ed-layer-tag">пензель тут</span>}
            </li>
          )
        })}
      </ul>
      <p className="ed-note">
        Око ховає шар лише в редакторі, у грі він є. Замок не дає пензлям, гумці й «Вибору» чіпати шар. «#» у «Логіці»
        показує знаки мапи поверх поля: де герой справді може йти.
      </p>
    </section>
  )
}
