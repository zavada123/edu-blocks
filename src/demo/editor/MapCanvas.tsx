import { useMemo, useRef, useState } from "react"
import { type Level, startWorld } from "../../core/level.ts"
import { buildScenery } from "../../ui/scenery.ts"
import { Stage } from "../../ui/stage/Stage.tsx"
import { type Brush, describeCell, dragPaints } from "./edit.ts"

type Cell = { readonly x: number; readonly y: number }

export interface MapCanvasProps {
  readonly level: Level
  readonly brush: Brush
  /** A press starts a stroke: one step to undo however far the mouse goes. */
  readonly onStroke: () => void
  /** Paints (`erase` false) or erases one cell inside the stroke. */
  readonly onCell: (x: number, y: number, erase: boolean) => void
}

/**
 * The real field with a layer on top that takes the mouse: the left button paints with the brush, the right button
 * erases, and the browser menu of the right button never opens over the map. The meadow around the level takes
 * pictures, houses and people too.
 */
export const MapCanvas = ({ level, brush, onStroke, onCell }: MapCanvasProps) => {
  const world = useMemo(() => startWorld(level), [level])
  const { view } = useMemo(() => buildScenery(world), [world])
  const stroke = useRef<{ readonly erase: boolean; readonly drag: boolean; last: string } | null>(null)
  const [hover, setHover] = useState<Cell | null>(null)

  const cellOf = (e: React.PointerEvent<HTMLDivElement>): Cell => {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: view.x + Math.min(view.width - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * view.width))),
      y: view.y + Math.min(view.height - 1, Math.max(0, Math.floor(((e.clientY - box.top) / box.height) * view.height)))
    }
  }
  const pct = (n: number, of: number) => `${(n / of) * 100}%`
  const footprint = brush.kind === "sprite" && brush.tiles !== undefined ? [brush.tiles[2], brush.tiles[3]] : [1, 1]

  return (
    <div className="ed-map" style={{ aspectRatio: `${view.width} / ${view.height}` }}>
      <Stage start={world} skin="ninja" scene={level.scene} />
      <div
        className={`ed-grid ed-brush-${brush.kind}`}
        role="application"
        aria-label="Мапа рівня: ліва кнопка малює, права прибирає"
        title={hover === null ? undefined : describeCell(level, hover.x, hover.y)}
        style={{
          backgroundSize: `${pct(1, view.width)} ${pct(1, view.height)}`,
          ["--ed-level-x" as string]: pct(-view.x, view.width),
          ["--ed-level-y" as string]: pct(-view.y, view.height),
          ["--ed-level-w" as string]: pct(world.width, view.width),
          ["--ed-level-h" as string]: pct(world.height, view.height)
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0 && e.button !== 2) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          const erase = e.button === 2 || brush.kind === "erase"
          const cell = cellOf(e)
          stroke.current = { erase, drag: erase || dragPaints(brush), last: `${cell.x},${cell.y}` }
          onStroke()
          onCell(cell.x, cell.y, erase)
        }}
        onPointerMove={(e) => {
          const cell = cellOf(e)
          setHover((h) => (h !== null && h.x === cell.x && h.y === cell.y ? h : cell))
          const s = stroke.current
          if (s === null || !s.drag) return
          const key = `${cell.x},${cell.y}`
          if (key === s.last) return
          s.last = key
          onCell(cell.x, cell.y, s.erase)
        }}
        onPointerUp={() => {
          stroke.current = null
        }}
        onPointerCancel={() => {
          stroke.current = null
        }}
        onPointerLeave={() => setHover(null)}
      >
        <span className="ed-level-edge" aria-hidden="true" />
        {hover !== null && (
          <span
            className={brush.kind === "erase" ? "ed-hover ed-hover-erase" : "ed-hover"}
            aria-hidden="true"
            style={{
              left: pct(hover.x - view.x, view.width),
              top: pct(hover.y - view.y, view.height),
              width: pct(footprint[0] ?? 1, view.width),
              height: pct(footprint[1] ?? 1, view.height)
            }}
          />
        )}
      </div>
    </div>
  )
}
