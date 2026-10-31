import { useEffect, useRef } from "react"
import { HEROES, heroOpen } from "../core/heroes.ts"
import { heroSheetOf, type Skin } from "./stage/draw.ts"

/** A hero walking towards the student: the first column of its sheet, four frames. */
export const HeroSprite = ({ skin, walking }: { readonly skin: Skin; readonly walking: boolean }) => (
  <span className={walking ? "eb-hero-sprite eb-hero-walk" : "eb-hero-sprite"} style={{ backgroundImage: `url(${heroSheetOf(skin)})` }} aria-hidden="true" />
)

/**
 * The choice of the hero, over the game: every hero with its look, name and a line about it. A hero that the hero
 * level has not opened yet shows as a shadow with the level it opens at.
 */
export const HeroPicker = ({
  skin,
  heroLevel,
  onPick,
  onClose
}: {
  readonly skin: Skin
  readonly heroLevel: number
  readonly onPick: (skin: Skin) => void
  readonly onClose: () => void
}) => {
  const chosenRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    chosenRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="eb-picker-layer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="eb-picker eb-frame eb-parchment" role="dialog" aria-modal="true" aria-labelledby="eb-picker-title">
        <div className="eb-picker-head">
          <h3 id="eb-picker-title">Обери героя</h3>
          <button type="button" className="eb-btn eb-btn-small" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>
        <ul className="eb-picker-list">
          {HEROES.map((hero) => {
            const open = heroOpen(hero, heroLevel)
            const chosen = hero.id === skin
            const state = chosen ? "eb-hero-card eb-hero-card-on" : open ? "eb-hero-card" : "eb-hero-card eb-hero-card-locked"
            return (
              <li key={hero.id}>
                <button
                  ref={chosen ? chosenRef : undefined}
                  type="button"
                  className={state}
                  disabled={!open}
                  aria-pressed={chosen}
                  onClick={() => {
                    onPick(hero.id)
                    onClose()
                  }}
                >
                  <span className="eb-hero-stage">
                    <HeroSprite skin={hero.id} walking={open} />
                  </span>
                  <span className="eb-hero-name">{hero.name}</span>
                  <span className="eb-hero-about">{hero.about}</span>
                  <span className="eb-hero-state">{chosen ? "Обрано" : open ? "Обрати" : `Відкриється на рівні ${hero.heroLevel}`}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
