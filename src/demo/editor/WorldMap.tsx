import { useEffect, useMemo, useRef, useState } from "react"
import type { Level } from "../../core/level.ts"
import { type Chapter, chapters } from "../../levels/chapters.ts"
import { levels } from "../../levels/index.ts"
import { levelHealth, moveLevel, orderSource, sameOrder, type Spot } from "./world.ts"

/** Pixels of one map cell in a level's picture. */
const CELL_PX = 6

const SIGN_COLORS: Readonly<Record<string, string>> = {
  "#": "#3f6b35",
  ".": "#e7d3a6",
  S: "#2e7d32",
  F: "#c62828",
  c: "#f9a825",
  x: "#6d4c41",
  H: "#8d6e63",
  L: "#1565c0",
  l: "#42a5f5",
  G: "#6a1b9a"
}

/** A level's map in little squares: walls, path, start, goal, items. */
const MiniMap = ({ level }: { readonly level: Level }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const width = Math.max(...level.map.map((r) => r.length))
  const height = level.map.length
  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (ctx === null || ctx === undefined) return
    level.map.forEach((row, y) =>
      [...row].forEach((sign, x) => {
        ctx.fillStyle = SIGN_COLORS[sign] ?? SIGN_COLORS["."] ?? "#fff"
        ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX)
      })
    )
    for (const e of level.enemies ?? []) {
      ctx.fillStyle = "#d81b60"
      ctx.beginPath()
      ctx.arc((e.x + 0.5) * CELL_PX, (e.y + 0.5) * CELL_PX, CELL_PX / 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [level])
  return <canvas ref={ref} className="ed-world-mini" width={width * CELL_PX} height={height * CELL_PX} aria-hidden="true" />
}

export interface WorldMapProps {
  /** The level open in the editor, outlined on the map. */
  readonly current: string
  /** A click on a level opens a copy of it in the editor. */
  readonly onOpen: (level: Level) => void
}

/**
 * Every chapter of the course with its levels on one screen, as the world view of LDtk: drag a level to another place
 * or chapter, click to open it. The new order is given as code for `src/levels/chapters.ts`.
 */
export const WorldMap = ({ current, onOpen }: WorldMapProps) => {
  const [order, setOrder] = useState<ReadonlyArray<Chapter>>(chapters)
  const [dragged, setDragged] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const byId = useMemo(() => new Map(levels.map((l) => [l.id, l])), [])
  const changed = !sameOrder(order, chapters)
  const source = changed ? orderSource(order, chapters) : ""

  const drop = (to: Spot) => {
    if (dragged !== null) setOrder((o) => moveLevel(o, dragged, to))
    setDragged(null)
    setCopied(false)
  }
  const dropProps = (to: Spot) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      drop(to)
    }
  })

  return (
    <section className="ed-world" aria-label="Мапа світу">
      <p className="ed-note">
        Усі розділи курсу на одній мапі. Клацни рівень, щоб відкрити його копію в редакторі. Перетягни рівень на інше місце чи
        в інший розділ: новий порядок з'явиться нижче кодом для <code>src/levels/chapters.ts</code>.
      </p>
      {changed && (
        <div className="ed-world-order">
          <strong>Новий порядок</strong>
          <pre>{source}</pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(source).then(() => setCopied(true))
            }}
          >
            {copied ? "Скопійовано" : "Скопіювати"}
          </button>{" "}
          <button type="button" onClick={() => setOrder(chapters)}>
            Повернути як було
          </button>
        </div>
      )}
      <div className="ed-world-chapters">
        {order.map((chapter, ci) => (
          <section key={chapter.id} className="ed-world-chapter" aria-label={chapter.title}>
            <h3>
              {ci + 1}. {chapter.title}
            </h3>
            <ol>
              {chapter.levels.map((id, i) => {
                const level = byId.get(id)
                if (level === undefined) return null
                const health = levelHealth(level)
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => setDragged(id)}
                    onDragEnd={() => setDragged(null)}
                    className={[id === current || id === current.replace(/-copy$/, "") ? "ed-world-level ed-world-current" : "ed-world-level", dragged === id ? "ed-world-dragged" : ""].join(" ")}
                    {...dropProps({ chapter: chapter.id, index: i })}
                  >
                    <button type="button" onClick={() => onOpen({ ...level, id: `${level.id}-copy` })} title={`${level.title} (${level.id})`}>
                      <MiniMap level={level} />
                      <span className="ed-world-title">{level.title}</span>
                      {health.errors > 0 && <span className="ed-error">помилок: {health.errors}</span>}
                      {health.errors === 0 && health.warnings > 0 && <span className="ed-warning">порад: {health.warnings}</span>}
                    </button>
                  </li>
                )
              })}
              <li className="ed-world-end" {...dropProps({ chapter: chapter.id, index: chapter.levels.length })}>
                {dragged !== null ? "сюди, у кінець розділу" : ""}
              </li>
            </ol>
          </section>
        ))}
      </div>
    </section>
  )
}
