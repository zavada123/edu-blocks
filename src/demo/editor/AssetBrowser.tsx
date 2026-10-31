import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { type AssetCategory, type AssetPack, assetRef, type FrameRect, iconFrame, type Size, type SpriteAsset } from "../../core/assets.ts"
import type { Level } from "../../core/level.ts"
import { loadPack, loadPackList, type PackInfo, packFile } from "../../ui/stage/packs.ts"
import type { Brush } from "./edit.ts"

/**
 * The asset library of the editor: every pack the build serves, its pictures by kind, a search, and a tileset picker
 * that cuts a rectangle of tiles. A picture becomes the brush; an item or a goal picture can also become the look of
 * the level's items or goal.
 */

/** The kinds of pictures the editor offers, in this order, with their Ukrainian names. */
const CATEGORIES: ReadonlyArray<{ readonly id: AssetCategory; readonly name: string }> = [
  { id: "tileset", name: "Тайли: земля, будинки" },
  { id: "prop", name: "Великі предмети" },
  { id: "decor", name: "Декор" },
  { id: "terrain", name: "Жива земля" },
  { id: "character", name: "Люди" },
  { id: "animal", name: "Тварини" },
  { id: "enemy", name: "Вороги" },
  { id: "boss", name: "Боси" },
  { id: "item", name: "Предмети" },
  { id: "crop", name: "Рослини" },
  { id: "weapon", name: "Зброя" },
  { id: "effect", name: "Ефекти" },
  { id: "particle", name: "Частинки" }
]

/** How a picture is put on the map. */
export type Placement = "decor" | "npc" | "enemy"

const PLACEMENTS: ReadonlyArray<{ readonly id: Placement; readonly name: string }> = [
  { id: "decor", name: "картинка (лише вигляд)" },
  { id: "npc", name: "людина / тварина, що стоїть" },
  { id: "enemy", name: "ворог з цим виглядом" }
]

/** What a picture of this kind becomes by default. */
const defaultPlacement = (category: AssetCategory): Placement =>
  category === "enemy" || category === "boss" ? "enemy" : category === "character" ? "npc" : "decor"

/** How many pictures show at first; more on request. */
const PAGE = 120
const THUMB = 40
/** Screen pixels per tile in the tileset picker. */
const TILE_PX = 24

/** The size of the picture a frame is cut from. */
const sheetOf = (sprite: SpriteAsset, file: string): Size =>
  file === sprite.file ? sprite.size : (Object.values(sprite.clips ?? {}).find((c) => c.file === file)?.size ?? sprite.size)

/** CSS that shows one frame of a pack picture in a square of `box` pixels, pixel-sharp. */
export const frameStyle = (pack: string, sprite: SpriteAsset, rect: FrameRect, box: number): CSSProperties => {
  const k = Math.min(box / rect.w, box / rect.h)
  const [sw, sh] = sheetOf(sprite, rect.file)
  return {
    width: rect.w * k,
    height: rect.h * k,
    backgroundImage: `url("${packFile(pack, rect.file)}")`,
    backgroundSize: `${sw * k}px ${sh * k}px`,
    backgroundPosition: `${-rect.sx * k}px ${-rect.sy * k}px`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
    transform: rect.flip ? "scaleX(-1)" : undefined
  }
}

export const Thumb = ({ pack, sprite, box = THUMB }: { readonly pack: string; readonly sprite: SpriteAsset; readonly box?: number }) => (
  <span className="ed-thumb" style={{ width: box, height: box }}>
    <span style={frameStyle(pack, sprite, iconFrame(sprite), box)} />
  </span>
)

type Rect = readonly [col: number, row: number, width: number, height: number]

const rectOf = (a: readonly [number, number], b: readonly [number, number]): Rect => [
  Math.min(a[0], b[0]),
  Math.min(a[1], b[1]),
  Math.abs(a[0] - b[0]) + 1,
  Math.abs(a[1] - b[1]) + 1
]

/** A tileset at a readable size: drag over it to cut a rectangle of tiles. */
const TilesetPicker = ({
  pack,
  sprite,
  value,
  onPick
}: {
  readonly pack: AssetPack
  readonly sprite: SpriteAsset
  readonly value: Rect | null
  readonly onPick: (rect: Rect) => void
}) => {
  const [tw, th] = sprite.frame ?? [pack.cell, pack.cell]
  const cols = Math.floor(sprite.size[0] / tw)
  const rows = Math.floor(sprite.size[1] / th)
  const k = TILE_PX / tw
  const from = useRef<readonly [number, number] | null>(null)
  const [drag, setDrag] = useState<Rect | null>(null)
  const cellAt = (e: React.PointerEvent<HTMLDivElement>): readonly [number, number] => {
    const box = e.currentTarget.getBoundingClientRect()
    const col = Math.min(cols - 1, Math.max(0, Math.floor((e.clientX - box.left) / (tw * k))))
    const row = Math.min(rows - 1, Math.max(0, Math.floor((e.clientY - box.top) / (th * k))))
    return [col, row]
  }
  const shown = drag ?? value
  return (
    <div className="ed-tileset-box">
      <div
        className="ed-tileset"
        style={{
          width: sprite.size[0] * k,
          height: sprite.size[1] * k,
          backgroundImage: `url("${packFile(pack.id, sprite.file)}")`,
          backgroundSize: `${sprite.size[0] * k}px ${sprite.size[1] * k}px`,
          ["--ed-tile" as string]: `${TILE_PX}px`
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const cell = cellAt(e)
          from.current = cell
          setDrag(rectOf(cell, cell))
        }}
        onPointerMove={(e) => {
          if (from.current !== null) setDrag(rectOf(from.current, cellAt(e)))
        }}
        onPointerUp={(e) => {
          if (from.current === null) return
          const rect = rectOf(from.current, cellAt(e))
          from.current = null
          setDrag(null)
          onPick(rect)
        }}
      >
        {shown !== null && (
          <span
            className="ed-tileset-pick"
            style={{ left: shown[0] * tw * k, top: shown[1] * th * k, width: shown[2] * tw * k, height: shown[3] * th * k }}
          />
        )}
      </div>
    </div>
  )
}

export interface AssetBrowserProps {
  readonly level: Level
  readonly brush: Brush
  readonly onBrush: (brush: Brush) => void
  /** Changes the level: the look of its items or of its goal. */
  readonly onLevel: (change: (level: Level) => Level) => void
}

export const AssetBrowser = ({ level, brush, onBrush, onLevel }: AssetBrowserProps) => {
  const [list, setList] = useState<ReadonlyArray<PackInfo> | null>(null)
  const [packId, setPackId] = useState("")
  const [pack, setPack] = useState<AssetPack | null>(null)
  const [category, setCategory] = useState<AssetCategory>("prop")
  const [query, setQuery] = useState("")
  const [shown, setShown] = useState(PAGE)
  const [picked, setPicked] = useState<SpriteAsset | null>(null)
  const [placement, setPlacement] = useState<Placement>("decor")
  const [tiles, setTiles] = useState<Rect | null>(null)

  useEffect(() => {
    let live = true
    void loadPackList().then((packs) => {
      if (!live) return
      setList(packs)
      setPackId((id) => (id === "" ? (packs.find((p) => p.id === "ninja-adventure")?.id ?? packs[0]?.id ?? "") : id))
    })
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (packId === "") return
    let live = true
    setPack(null)
    void loadPack(packId).then((p) => {
      if (live) setPack(p)
    })
    return () => {
      live = false
    }
  }, [packId])

  const counts = useMemo(() => {
    const c = new Map<AssetCategory, number>()
    for (const s of pack?.sprites ?? []) c.set(s.category, (c.get(s.category) ?? 0) + 1)
    return c
  }, [pack])
  const found = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (pack?.sprites ?? []).filter(
      (s) => s.category === category && (q === "" || s.name.toLowerCase().includes(q) || s.id.includes(q) || (s.group ?? "").includes(q))
    )
  }, [pack, category, query])
  useEffect(() => setShown(PAGE), [packId, category, query])
  // A category the pack lacks: show the first it has.
  useEffect(() => {
    if (pack === null || (counts.get(category) ?? 0) > 0) return
    const first = CATEGORIES.find((c) => (counts.get(c.id) ?? 0) > 0)
    if (first !== undefined) setCategory(first.id)
  }, [pack, counts, category])

  const info = list?.find((p) => p.id === packId)
  const brushOf = (sprite: SpriteAsset, how: Placement, rect: Rect | null): Brush => {
    const ref = assetRef(packId, sprite.id)
    if (sprite.category === "tileset") return rect === null ? { kind: "erase" } : { kind: "sprite", asset: ref, tiles: rect }
    if (how === "npc") return { kind: "npc", who: "villager", look: ref }
    if (how === "enemy") return { kind: "enemy", monster: "slime", look: ref }
    return { kind: "sprite", asset: ref }
  }
  const choose = (sprite: SpriteAsset) => {
    const how = defaultPlacement(sprite.category)
    setPicked(sprite)
    setPlacement(how)
    setTiles(null)
    if (sprite.category !== "tileset") onBrush(brushOf(sprite, how, null))
  }
  const ref = picked === null ? null : assetRef(packId, picked.id)
  const active =
    ref !== null &&
    ((brush.kind === "sprite" && brush.asset === ref) || ((brush.kind === "npc" || brush.kind === "enemy") && brush.look === ref))

  if (list !== null && list.length === 0)
    return (
      <section className="ed-card">
        <h2>Ассети</h2>
        <p className="ed-note">Паків не знайдено: сторінку зібрано без папки packs/.</p>
      </section>
    )

  return (
    <section className="ed-card ed-assets">
      <h2>Ассети з паків</h2>
      <div className="ed-row">
        <label>
          Пак
          <select value={packId} onChange={(e) => setPackId(e.target.value)}>
            {(list ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.private === true ? " (приватний)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Пошук
          <input type="search" value={query} placeholder="house, tree, cat…" onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {info !== undefined && (
        <p className="ed-note">
          {info.author} · <a href={info.license.url}>{info.license.name}</a>
          {info.license.redistribute !== "yes" && " · у грі можна, окремо файли поширювати не можна"}
        </p>
      )}
      <div className="ed-cats" role="tablist" aria-label="Що шукати">
        {CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0).map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            className={category === c.id ? "ed-cat ed-cat-on" : "ed-cat"}
            onClick={() => setCategory(c.id)}
          >
            {c.name} <small>{counts.get(c.id)}</small>
          </button>
        ))}
      </div>
      {pack === null ? (
        <p className="ed-note">Завантажую пак…</p>
      ) : (
        <div className="ed-asset-grid" onContextMenu={(e) => e.preventDefault()}>
          {found.slice(0, shown).map((s) => (
            <button
              key={s.id}
              type="button"
              title={`${s.name} (${s.id})`}
              className={picked?.id === s.id ? "ed-asset ed-asset-on" : "ed-asset"}
              onClick={() => choose(s)}
            >
              <Thumb pack={pack.id} sprite={s} />
              <span className="ed-asset-name">{s.name}</span>
            </button>
          ))}
          {found.length === 0 && <p className="ed-note">Нічого не знайдено.</p>}
          {found.length > shown && (
            <button type="button" className="ed-more" onClick={() => setShown((n) => n + PAGE)}>
              Ще {Math.min(PAGE, found.length - shown)} з {found.length - shown}
            </button>
          )}
        </div>
      )}
      {picked !== null && pack !== null && (
        <div className="ed-picked">
          <div className="ed-row">
            <Thumb pack={pack.id} sprite={picked} box={48} />
            <strong>{picked.name}</strong>
            {active && <span className="ed-badge">пензель</span>}
          </div>
          {picked.category === "tileset" ? (
            <>
              <p className="ed-note">Виділи мишею одну плитку або прямокутник (будинок, паркан, міст), а потім клацай по мапі.</p>
              <TilesetPicker
                pack={pack}
                sprite={picked}
                value={tiles}
                onPick={(rect) => {
                  setTiles(rect)
                  onBrush(brushOf(picked, "decor", rect))
                }}
              />
            </>
          ) : (
            <>
              <label>
                Як ставити
                <select
                  value={placement}
                  onChange={(e) => {
                    const how = e.target.value as Placement
                    setPlacement(how)
                    onBrush(brushOf(picked, how, null))
                  }}
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ed-row">
                <button type="button" onClick={() => onBrush(brushOf(picked, placement, null))} disabled={active}>
                  Малювати цим
                </button>
                <button
                  type="button"
                  title="Предмети на клітинках c виглядатимуть так. Назва в меті лишається з поля «Предмети»."
                  onClick={() => onLevel((l) => ({ ...l, scene: { ...l.scene, itemLook: assetRef(packId, picked.id) } }))}
                >
                  Вигляд предметів
                </button>
                <button
                  type="button"
                  title="Мета на клітинці F виглядатиме так: скриня, будинок, криниця…"
                  onClick={() => onLevel((l) => ({ ...l, scene: { ...l.scene, finishLook: assetRef(packId, picked.id) } }))}
                >
                  Вигляд мети
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {(level.scene?.itemLook !== undefined || level.scene?.finishLook !== undefined) && (
        <div className="ed-row">
          {level.scene?.itemLook !== undefined && (
            <button type="button" onClick={() => onLevel(({ scene: { itemLook: _, ...scene } = {}, ...l }) => ({ ...l, scene }))}>
              Прибрати вигляд предметів
            </button>
          )}
          {level.scene?.finishLook !== undefined && (
            <button type="button" onClick={() => onLevel(({ scene: { finishLook: _, ...scene } = {}, ...l }) => ({ ...l, scene }))}>
              Прибрати вигляд мети
            </button>
          )}
        </div>
      )}
    </section>
  )
}
