import { useEffect, useState } from "react"
import { type AssetPack, assetRef, type FrameRect, type SpriteAsset } from "../../core/assets.ts"
import type { Level } from "../../core/level.ts"
import { parseTerrainRef, terrainRef } from "../../core/terrain.ts"
import { loadPack } from "../../ui/stage/packs.ts"
import { frameStyle } from "./AssetBrowser.tsx"
import { type Brush, groundUnderPath, setBaseGround } from "./edit.ts"

/** The packs whose tilesets describe grounds by edges. */
const GROUND_PACKS: ReadonlyArray<string> = ["ninja-adventure"]
const SWATCH = 28

/** A ground of a tileset the editor offers: its reference, name and the tile that shows it whole. */
export interface GroundChoice {
  readonly ref: string
  readonly name: string
  readonly pack: string
  readonly sprite: SpriteAsset
  readonly tile: number
  /** Painted by cells with edges (a path, water) or only lying under everything (grass). */
  readonly paints: boolean
}

/** The grounds the tilesets of a pack describe, painted ones first. */
export const groundsOf = (pack: AssetPack): ReadonlyArray<GroundChoice> =>
  pack.sprites
    .flatMap((sprite) => {
      const tiles = sprite.tiles ?? []
      const names = [...new Set(tiles.filter((t) => t.role === "fill").map((t) => t.terrain))]
      return names.flatMap((terrain) => {
        const whole = tiles.find((t) => t.terrain === terrain && t.role === "fill" && (t.mask ?? 0) === 0 && (t.cornerMask ?? 0) === 0)
        if (whole === undefined) return []
        const choice: GroundChoice = {
          ref: terrainRef(assetRef(pack.id, sprite.id), terrain),
          name: whole.about,
          pack: pack.id,
          sprite,
          tile: whole.index,
          paints: tiles.some((t) => t.terrain === terrain && t.role === "edge")
        }
        return [choice]
      })
    })
    .sort((a, b) => Number(b.paints) - Number(a.paints))

const Swatch = ({ choice }: { readonly choice: GroundChoice }) => {
  const [w, h] = choice.sprite.frame ?? [16, 16]
  const columns = Math.floor(choice.sprite.size[0] / w)
  const i = choice.tile - 1
  const rect: FrameRect = { file: choice.sprite.file, sx: (i % columns) * w, sy: Math.floor(i / columns) * h, w, h, flip: false }
  return (
    <span className="ed-thumb" style={{ width: SWATCH, height: SWATCH }} aria-hidden="true">
      <span style={frameStyle(choice.pack, choice.sprite, rect, SWATCH)} />
    </span>
  )
}

const useGrounds = (): ReadonlyArray<GroundChoice> => {
  const [grounds, setGrounds] = useState<ReadonlyArray<GroundChoice>>([])
  useEffect(() => {
    let live = true
    void Promise.all(GROUND_PACKS.map((id) => loadPack(id))).then((packs) => {
      if (live) setGrounds(packs.flatMap((p) => (p === null ? [] : groundsOf(p))))
    })
    return () => {
      live = false
    }
  }, [])
  return grounds
}

export interface GroundCardProps {
  readonly level: Level
  readonly brush: Brush
  readonly onBrush: (brush: Brush) => void
  readonly onChange: (change: (level: Level) => Level) => void
}

/**
 * Ground painted by cells, as LDtk and Tiled paint terrain: pick a path or water and drag over the map, the edges and
 * corners come by themselves. The base lies under the whole field.
 */
export const GroundCard = ({ level, brush, onBrush, onChange }: GroundCardProps) => {
  const grounds = useGrounds()
  const base = level.scene?.terrain?.base
  const painted = grounds.filter((g) => g.paints)
  const bases = grounds.filter((g) => !g.paints)
  const path = painted.find((g) => parseTerrainRef(g.ref)?.terrain === "path")
  const grass = bases.find((g) => parseTerrainRef(g.ref)?.terrain === "grass")
  if (grounds.length === 0) return null
  return (
    <section className="ed-card">
      <h2>Земля</h2>
      <div className="ed-tools" role="toolbar" aria-label="Чим малювати землю">
        {painted.map((g) => {
          const on = brush.kind === "ground" && brush.ground === g.ref
          return (
            <button
              key={g.ref}
              type="button"
              className={on ? "ed-tool ed-tool-on" : "ed-tool"}
              aria-pressed={on}
              onClick={() => onBrush({ kind: "ground", ground: g.ref })}
            >
              <Swatch choice={g} />
              {g.name}
            </button>
          )
        })}
      </div>
      <label>
        Основа під усім полем
        <select value={base ?? ""} onChange={(e) => onChange((l) => setBaseGround(l, e.target.value === "" ? null : e.target.value))}>
          <option value="">трава поля (Tiny Swords)</option>
          {bases.map((g) => (
            <option key={g.ref} value={g.ref}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {path !== undefined && grass !== undefined && (
        <p>
          <button type="button" className="ed-tool" onClick={() => onChange((l) => groundUnderPath(l, path.ref, grass.ref))}>
            Стежка під усім маршрутом
          </button>
        </p>
      )}
      <p className="ed-note">
        Веди мишею по мапі й лугу: краї та кути підбираються самі. Права кнопка стирає землю. Земля лише малюнок: куди може йти
        герой, і далі каже мапа.
      </p>
    </section>
  )
}
