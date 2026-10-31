import { useState } from "react"
import { levelSource } from "../../core/kit.ts"
import { type Level, startWorld } from "../../core/level.ts"
import { BOSS_HP, DEFAULT_HEARTS, DEFAULT_SIGHT, type EnemyKind, type EnemySpec, type EnemyWalk, parseMap } from "../../core/world.ts"
import { ENEMIES } from "../../ui/look.ts"
import { Thumb } from "./AssetBrowser.tsx"
import { findSprite, useLevelPacks } from "./SpritesCard.tsx"

/** The cards of the editor about enemies and about getting the level out of it. */

export const MONSTERS: ReadonlyArray<{ readonly id: EnemyKind; readonly name: string }> = [
  { id: "slime", name: "Слиз" },
  { id: "spirit", name: "Сніговий дух" },
  { id: "goblin", name: "Гоблін" },
  { id: "skull", name: "Череп" },
  { id: "flame", name: "Вогник" },
  { id: "bear", name: "Ведмідь" },
  { id: "toad", name: "Жаба" }
]

export const WALKS: ReadonlyArray<{ readonly id: EnemyWalk; readonly name: string }> = [
  { id: "stand", name: "стоїть" },
  { id: "across", name: "ходить ліворуч-праворуч" },
  { id: "updown", name: "ходить вгору-вниз" }
]

/** The most hit points and sight the editor offers. */
const MAX_HP = 9
const MAX_SIGHT = 12

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))

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
  return <span className="ed-icon ed-icon-sheet" style={{ backgroundImage: `url(${ENEMIES[spec.kind]})`, backgroundSize: "96px 96px" }} />
}

export const Enemies = ({ level, onChange }: { readonly level: Level; readonly onChange: (patch: Partial<Level>) => void }) => {
  const enemies = level.enemies ?? []
  const packs = useLevelPacks(level)
  const set = (i: number, patch: Partial<EnemySpec>) =>
    onChange({ enemies: enemies.map((e, j) => (j === i ? { ...e, ...patch } : e)) })
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
            <div className="ed-row">
              <EnemyIcon spec={e} packs={packs} />
              <strong>
                ({e.x}, {e.y})
              </strong>
              <select aria-label="Хто" value={e.kind} onChange={(ev) => set(i, { kind: ev.target.value as EnemyKind })}>
                {MONSTERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onChange({ enemies: enemies.filter((_, j) => j !== i) })}>
                Прибрати
              </button>
              {e.look !== undefined && (
                <button
                  type="button"
                  title="Повернути звичайний вигляд ворога"
                  onClick={() => onChange({ enemies: enemies.map((x, j) => (j === i ? (({ look: _, ...rest }) => rest)(x) : x)) })}
                >
                  Без картинки
                </button>
              )}
            </div>
            <div className="ed-row">
              <label>
                Поки героя не бачить
                <select value={e.walk ?? "stand"} onChange={(ev) => set(i, { walk: ev.target.value as EnemyWalk })}>
                  {WALKS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label title="За скільки клітинок ворог помічає героя й іде до нього. 0 — не йде, б'є лише впритул.">
                Бачить за X клітинок
                <input
                  type="number"
                  min={0}
                  max={MAX_SIGHT}
                  value={e.sight ?? DEFAULT_SIGHT}
                  onChange={(ev) => set(i, { sight: clamp(Number(ev.target.value), 0, MAX_SIGHT) })}
                />
              </label>
              <label>
                Ударів витримує
                <input
                  type="number"
                  min={1}
                  max={MAX_HP}
                  value={e.hp ?? (e.boss === true ? BOSS_HP : 1)}
                  onChange={(ev) => set(i, { hp: clamp(Number(ev.target.value), 1, MAX_HP) })}
                />
              </label>
              <label className="ed-check">
                <input type="checkbox" checked={e.boss === true} onChange={(ev) => set(i, { boss: ev.target.checked })} /> Бос
              </label>
            </div>
          </li>
        ))}
      </ol>
      <p className="ed-note">
        Ворог ходить після кожної дії героя. Коли герой ближче ніж X клітинок, ворог іде до нього, а впритул замахується і
        наступним ходом б'є: мінус сердечко. Бос більший, б'є навіть під ударами.
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

