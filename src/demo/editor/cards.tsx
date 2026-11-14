import { useState } from "react"
import { levelSource } from "../../core/kit.ts"
import { type Level, startWorld } from "../../core/level.ts"
import { DEFAULT_HEARTS, type EnemySpec, parseMap } from "../../core/world.ts"
import { clamp, MAX_HP, MONSTERS } from "./fields.ts"
import { ArtIcon } from "../../ui/ArtIcon.tsx"
import { ENEMY_ART } from "../../ui/art.ts"
import { Thumb } from "./AssetBrowser.tsx"
import { findSprite, useLevelPacks } from "./SpritesCard.tsx"

/** The cards of the editor about enemies and about getting the level out of it. */

export { clamp, MONSTERS } from "./fields.ts"

/** Optional fields left empty are dropped, so the code reads as the levels in the library. */
const tidy = (level: Level): Level => {
  const { hint, enemies, hearts, ...rest } = level
  return {
    ...rest,
    ...(hint === undefined || hint.trim() === "" ? {} : { hint }),
    ...(enemies === undefined || enemies.length === 0 ? {} : { enemies }),
    ...(hearts === undefined || enemies === undefined || enemies.length === 0 ? {} : { hearts })
  }
}

const EnemyIcon = ({ spec, packs }: { readonly spec: EnemySpec; readonly packs: ReturnType<typeof useLevelPacks> }) => {
  const found = spec.look === undefined ? null : findSprite(packs, spec.look)
  if (found !== null) return <Thumb pack={found.pack} sprite={found.sprite} box={24} />
  return <ArtIcon id={ENEMY_ART[spec.kind]} className="ed-icon" size={24} />
}

/** The enemies on the map: the hero's hearts and a list; each one is set up in the inspector. */
export const Enemies = ({
  level,
  onChange,
  onSelect
}: {
  readonly level: Level
  readonly onChange: (patch: Partial<Level>) => void
  readonly onSelect: (index: number) => void
}) => {
  const enemies = level.enemies ?? []
  const packs = useLevelPacks(level)
  return (
    <section className="ed-card">
      <h2>Вороги</h2>
      <label>
        Сердечок у героя
        <input
          type="number"
          min={1}
          max={MAX_HP}
          value={level.hearts ?? DEFAULT_HEARTS}
          onChange={(e) => onChange({ hearts: clamp(Number(e.target.value), 1, MAX_HP) })}
        />
      </label>
      {enemies.length === 0 && <p className="ed-note">Вибери інструмент «Ворог» або ворога в «Ассетах з паків» і клацни по стежці. Права кнопка прибирає ворога.</p>}
      <ol className="ed-enemies">
        {enemies.map((e, i) => (
          <li key={`${e.x},${e.y}`}>
            <button type="button" className="ed-enemy-row" onClick={() => onSelect(i)}>
              <EnemyIcon spec={e} packs={packs} />
              <strong>
                ({e.x}, {e.y})
              </strong>
              {MONSTERS.find((m) => m.id === e.kind)?.name ?? e.kind}
              {e.boss === true && " · бос"}
              {e.walk === "patrol" && ` · маршрут ${(e.route ?? []).length}`}
            </button>
          </li>
        ))}
      </ol>
      <p className="ed-note">
        Клацни ворога в списку або інструментом «Вибір» на мапі: його властивості відкриються вгорі праворуч. Ворог ходить після
        кожної дії героя; коли герой ближче ніж X клітинок, іде до нього, а впритул замахується і наступним ходом б'є.
      </p>
    </section>
  )
}

export const Export = ({ level, onImport }: { readonly level: Level; readonly onImport: (level: Level) => void }) => {
  const [format, setFormat] = useState<"ts" | "json">("ts")
  const [copied, setCopied] = useState(false)
  const [paste, setPaste] = useState("")
  const [error, setError] = useState("")
  const text = format === "ts" ? `${levelSource(tidy(level))},` : JSON.stringify(tidy(level), null, 2)
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false)
    )
  }
  const importLevel = () => {
    try {
      const parsed = JSON.parse(paste) as Level
      parseMap(parsed.map, parsed.dir)
      startWorld(parsed)
      onImport(parsed)
      setError("")
      setPaste("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Це не рівень")
    }
  }
  return (
    <section className="ed-card">
      <h2>Експорт</h2>
      <div className="ed-row">
        <label>
          <input type="radio" checked={format === "ts"} onChange={() => setFormat("ts")} /> Код для levels/index.ts
        </label>
        <label>
          <input type="radio" checked={format === "json"} onChange={() => setFormat("json")} /> JSON
        </label>
        <button type="button" onClick={copy}>
          {copied ? "Скопійовано" : "Копіювати"}
        </button>
      </div>
      <textarea className="ed-code" readOnly value={text} rows={10} onFocus={(e) => e.currentTarget.select()} />
      <h2>Імпорт JSON</h2>
      <textarea
        className="ed-code"
        value={paste}
        rows={3}
        placeholder="Встав JSON рівня"
        onChange={(e) => setPaste(e.target.value)}
      />
      <div className="ed-row">
        <button type="button" onClick={importLevel} disabled={paste.trim() === ""}>
          Відкрити
        </button>
        {error !== "" && <span className="ed-error">{error}</span>}
      </div>
    </section>
  )
}

