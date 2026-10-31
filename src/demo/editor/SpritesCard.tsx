import { useEffect, useState } from "react"
import { type AssetPack, packsOf, parseAssetRef, type SpriteAsset } from "../../core/assets.ts"
import type { Level, PlacedSprite } from "../../core/level.ts"
import type { Direction } from "../../core/world.ts"
import { loadPack } from "../../ui/stage/packs.ts"
import { Thumb } from "./AssetBrowser.tsx"

/** The packs a level uses, loaded: the cards show their pictures and clips. */
export const useLevelPacks = (level: Level): ReadonlyMap<string, AssetPack> => {
  const [packs, setPacks] = useState<ReadonlyMap<string, AssetPack>>(new Map())
  const wanted = packsOf(level).join(",")
  useEffect(() => {
    let live = true
    const ids = wanted === "" ? [] : wanted.split(",")
    void Promise.all(ids.map((id) => loadPack(id))).then((loaded) => {
      if (!live) return
      setPacks(new Map(loaded.flatMap((p) => (p === null ? [] : [[p.id, p] as const]))))
    })
    return () => {
      live = false
    }
  }, [wanted])
  return packs
}

export const findSprite = (packs: ReadonlyMap<string, AssetPack>, ref: string): { readonly pack: string; readonly sprite: SpriteAsset } | null => {
  const parsed = parseAssetRef(ref)
  const sprite = parsed === null ? undefined : packs.get(parsed.pack)?.sprites.find((s) => s.id === parsed.id)
  return parsed === null || sprite === undefined ? null : { pack: parsed.pack, sprite }
}

const DIRS: ReadonlyArray<{ readonly id: Direction; readonly name: string }> = [
  { id: "down", name: "вниз" },
  { id: "up", name: "вгору" },
  { id: "left", name: "ліворуч" },
  { id: "right", name: "праворуч" }
]

const STEP = 0.5

/** The pictures on the map, each with its animation, layer, direction and place. */
export const SpritesCard = ({ level, onChange }: { readonly level: Level; readonly onChange: (change: (level: Level) => Level) => void }) => {
  const packs = useLevelPacks(level)
  const sprites = level.scene?.sprites ?? []
  /** A patch; a field set to undefined is taken off the sprite. */
  const set = (i: number, patch: { readonly [K in keyof PlacedSprite]?: PlacedSprite[K] | undefined } | null) =>
    onChange((l) => {
      const list = l.scene?.sprites ?? []
      const apply = (s: PlacedSprite): PlacedSprite =>
        Object.fromEntries(Object.entries({ ...s, ...patch }).filter(([, v]) => v !== undefined)) as unknown as PlacedSprite
      const next = patch === null ? list.filter((_, j) => j !== i) : list.map((s, j) => (j === i ? apply(s) : s))
      return { ...l, scene: { ...l.scene, sprites: next } }
    })
  const move = (i: number, by: -1 | 1) =>
    onChange((l) => {
      const list = [...(l.scene?.sprites ?? [])]
      const j = i + by
      const a = list[i]
      const b = list[j]
      if (a === undefined || b === undefined) return l
      list[i] = b
      list[j] = a
      return { ...l, scene: { ...l.scene, sprites: list } }
    })
  return (
    <section className="ed-card">
      <h2>Картинки на мапі ({sprites.length})</h2>
      {sprites.length === 0 && <p className="ed-note">Вибери картинку в «Ассетах з паків» і клацни по мапі. Права кнопка прибирає.</p>}
      <ol className="ed-sprites">
        {sprites.map((s, i) => {
          const found = findSprite(packs, s.asset)
          const clips = Object.keys(found?.sprite.clips ?? {})
          const directional = found?.sprite.layout === "directions"
          return (
            <li key={`${i}-${s.asset}-${s.x}-${s.y}`}>
              <div className="ed-row">
                {found !== null && <Thumb pack={found.pack} sprite={found.sprite} box={28} />}
                <strong title={s.asset}>{found?.sprite.name ?? s.asset}</strong>
                <span>
                  ({s.x}, {s.y}){s.tiles !== undefined && ` ${s.tiles[2]}×${s.tiles[3]}`}
                </span>
                <span className="ed-nudge">
                  <button type="button" aria-label="Лівіше" onClick={() => set(i, { x: s.x - STEP })}>
                    ←
                  </button>
                  <button type="button" aria-label="Вище" onClick={() => set(i, { y: s.y - STEP })}>
                    ↑
                  </button>
                  <button type="button" aria-label="Нижче" onClick={() => set(i, { y: s.y + STEP })}>
                    ↓
                  </button>
                  <button type="button" aria-label="Правіше" onClick={() => set(i, { x: s.x + STEP })}>
                    →
                  </button>
                </span>
              </div>
              <div className="ed-row">
                {clips.length > 0 && (
                  <label>
                    Анімація
                    <select value={s.clip ?? ""} onChange={(e) => set(i, { clip: e.target.value === "" ? undefined : e.target.value })}>
                      <option value="">звичайна</option>
                      {clips.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {directional && (
                  <label>
                    Дивиться
                    <select value={s.dir ?? "down"} onChange={(e) => set(i, { dir: e.target.value as Direction })}>
                      {DIRS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Шар
                  <select
                    value={s.layer ?? ""}
                    onChange={(e) => set(i, { layer: e.target.value === "" ? undefined : (e.target.value as "ground" | "object") })}
                  >
                    <option value="">сам вибере</option>
                    <option value="ground">земля (під усім)</option>
                    <option value="object">предмет (стоїть)</option>
                  </select>
                </label>
                <label className="ed-check">
                  <input type="checkbox" checked={s.flip === true} onChange={(e) => set(i, { flip: e.target.checked || undefined })} /> Дзеркально
                </label>
                <button type="button" aria-label="Намалювати раніше" disabled={i === 0} onClick={() => move(i, -1)}>
                  ▲
                </button>
                <button type="button" aria-label="Намалювати пізніше" disabled={i === sprites.length - 1} onClick={() => move(i, 1)}>
                  ▼
                </button>
                <button type="button" onClick={() => set(i, null)}>
                  Прибрати
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      {sprites.length > 0 && (
        <p className="ed-note">
          Картинки лише для вигляду: крізь будинок чи паркан герой не пройде, тільки якщо під ними стіна. Порядок у списку: що нижче, те
          малюється зверху.
        </p>
      )}
    </section>
  )
}
