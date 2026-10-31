import type { Level } from "../core/level.ts"
import { heroLevelOf } from "../core/xp.ts"
import { chapterOf, chapters } from "../levels/chapters.ts"
import { HEROES } from "../core/heroes.ts"
import { heroSheetOf, type Skin } from "./stage/draw.ts"

/** Stars of the levels the student has passed, by level id. The app knows them; the bar shows the chapter's. */
export type Progress = Readonly<Record<string, number>>

/** The levels of the chapter as squares: passed, this one, still ahead. */
const ChapterLevels = ({ ids, current, progress }: { readonly ids: ReadonlyArray<string>; readonly current: string; readonly progress: Progress }) => {
  const place = ids.indexOf(current) + 1
  return (
    <ol className="eb-hud-levels" aria-label={`Рівень ${place} з ${ids.length}`}>
      {ids.map((id, i) => {
        const done = (progress[id] ?? 0) > 0
        const kind = id === current ? "eb-hud-dot eb-hud-dot-now" : done ? "eb-hud-dot eb-hud-dot-done" : "eb-hud-dot"
        return (
          <li key={id} className={kind} aria-hidden="true">
            {i + 1}
          </li>
        )
      })}
    </ol>
  )
}

/** The hero's portrait, level and XP to the next level. */
const HeroBadge = ({ skin, total, onPickHero }: { readonly skin: Skin; readonly total: number; readonly onPickHero: (() => void) | undefined }) => {
  const hero = heroLevelOf(total)
  const share = hero.next === null ? 1 : (total - hero.from) / (hero.next - hero.from)
  const name = HEROES.find((h) => h.id === skin)?.name ?? ""
  const portrait = (
    <span className="eb-avatar" aria-hidden="true">
      <span style={{ backgroundImage: `url(${heroSheetOf(skin)})` }} />
    </span>
  )
  return (
    <div className="eb-hud-hero">
      {onPickHero === undefined ? (
        portrait
      ) : (
        <button type="button" className="eb-hud-pick" onClick={onPickHero} aria-label={`Герой: ${name}. Змінити героя`} title="Змінити героя">
          {portrait}
          <span className="eb-hud-pick-label" aria-hidden="true">
            Змінити
          </span>
        </button>
      )}
      <div className="eb-hud-xp">
        <div className="eb-hud-xp-line">
          <span>
            {name} · рівень {hero.level}
          </span>
          <b>
            {total}
            {hero.next === null ? "" : ` / ${hero.next}`} XP
          </b>
        </div>
        <div className="eb-bar" role="img" aria-label={`Рівень героя ${hero.level}, ${total} XP${hero.next === null ? "" : ` з ${hero.next}`}`}>
          <span style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

/**
 * The bar over the game: the way back to the map, the chapter with its levels, and the hero with the XP. A level
 * outside the course (a teacher's task) shows its title instead of the chapter.
 */
export const Hud = ({
  level,
  skin,
  xpTotal,
  progress,
  onMap,
  onPickHero
}: {
  readonly level: Level
  readonly skin: Skin
  /** The hero's XP; without it the hero part is not shown. */
  readonly xpTotal: number | undefined
  readonly progress: Progress
  readonly onMap: (() => void) | undefined
  /** Opens the choice of the hero; without it the portrait is only a picture. */
  readonly onPickHero: (() => void) | undefined
}) => {
  const chapter = chapterOf(level.id)
  const number = chapter === undefined ? 0 : chapters.indexOf(chapter) + 1
  return (
    <header className="eb-hud">
      {onMap !== undefined && (
        <button type="button" className="eb-btn eb-btn-wood eb-btn-small" onClick={onMap}>
          ← Мапа
        </button>
      )}
      <div className="eb-hud-chapter">
        <p className="eb-hud-title">{chapter === undefined ? "Завдання" : `Глава ${number} · ${chapter.title}`}</p>
        {chapter !== undefined && <ChapterLevels ids={chapter.levels} current={level.id} progress={progress} />}
      </div>
      {xpTotal !== undefined && <HeroBadge skin={skin} total={xpTotal} onPickHero={onPickHero} />}
    </header>
  )
}
