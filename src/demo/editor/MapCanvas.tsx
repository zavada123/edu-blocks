import { useMemo, useRef, useState } from "react"
import { type Level, type Scene, startWorld } from "../../core/level.ts"
import { tilemapView } from "../../core/tilemap.ts"
import type { Cell } from "../../core/world.ts"
import { buildScenery } from "../../ui/scenery.ts"
import { Stage } from "../../ui/stage/Stage.tsx"
import { type Brush, describeCell } from "./edit.ts"

/** A box of cells, both corners inside. */
export interface CellBox {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** What the editor draws over the field: routes, links of gates and levers, the selected thing, a box being drawn. */
export interface Marks {
  readonly routes?: ReadonlyArray<{ readonly from: Cell; readonly points: ReadonlyArray<Cell>; readonly active: boolean }>
  readonly links?: ReadonlyArray<{ readonly gate: Cell; readonly lever: Cell; readonly active: boolean }>
  readonly selected?: Cell | null
  readonly box?: CellBox | null
  /** The map signs over the field («Логіка поверх»): where the hero can really go. */
  readonly logic?: Level["map"] | null
}

export interface PointerInfo {
  /** The right button, or the eraser brush. */
  readonly erase: boolean
  /** Alt (or Option) held: the eyedropper. */
  readonly alt: boolean
}

export interface MapCanvasProps {
  readonly level: Level
  readonly brush: Brush
  /** The scene the field shows: the level's own, or with hidden layers left out. */
  readonly scene?: Scene
  /** Leave the enemies off the field (their layer is hidden). */
  readonly hideEnemies?: boolean
  readonly marks?: Marks
  /** A press on a cell. */
  readonly onDown: (cell: Cell, info: PointerInfo) => void
  /** The pointer went on to another cell while pressed. */
  readonly onDrag: (cell: Cell, info: PointerInfo) => void
  /** The press ended over this cell. */
  readonly onUp: (cell: Cell, info: PointerInfo) => void
}

const SIGN_COLOR: Readonly<Record<string, string>> = {
  "#": "rgba(40, 30, 20, 0.55)",
  S: "#2e7d32",
  F: "#c62828",
  c: "#f9a825",
  x: "#6d4c41",
  H: "#5d4037",
  L: "#1565c0",
  l: "#1565c0",
  G: "#6a1b9a"
}

/**
 * The real field with a layer on top that takes the mouse and shows the marks of the editor. What a press does is
 * the editor's business: the canvas only tells which cell, which button and whether Alt is held. The browser menu
 * of the right button never opens over the map, and the meadow around the level takes clicks too.
 */
export const MapCanvas = ({ level, brush, scene, hideEnemies, marks, onDown, onDrag, onUp }: MapCanvasProps) => {
  const shown: Level = useMemo(
    () => ({ ...level, ...(hideEnemies === true ? { enemies: [] } : {}), ...(scene === undefined ? {} : { scene }) }),
    [level, scene, hideEnemies]
  )
  const world = useMemo(() => startWorld(shown), [shown])
  const tilemap = shown.scene?.tilemap
  // The field shows a hand-drawn map as it is, so the grid follows the map's cells.
  const view = useMemo(() => (tilemap === undefined ? buildScenery(world).view : tilemapView(tilemap)), [world, tilemap])
  const stroke = useRef<{ readonly info: PointerInfo; last: string } | null>(null)
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
  const mid = (c: Cell) => ({ x: c.x + 0.5, y: c.y + 0.5 })

  return (
    <div className="ed-map" style={{ aspectRatio: `${view.width} / ${view.height}` }}>
      <Stage start={world} skin="ninja" scene={shown.scene} />
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
          const info: PointerInfo = { erase: e.button === 2 || brush.kind === "erase", alt: e.altKey }
          const cell = cellOf(e)
          stroke.current = { info, last: `${cell.x},${cell.y}` }
          onDown(cell, info)
        }}
        onPointerMove={(e) => {
          const cell = cellOf(e)
          setHover((h) => (h !== null && h.x === cell.x && h.y === cell.y ? h : cell))
          const s = stroke.current
          if (s === null) return
          const key = `${cell.x},${cell.y}`
          if (key === s.last) return
          s.last = key
          onDrag(cell, s.info)
        }}
        onPointerUp={(e) => {
          const s = stroke.current
          stroke.current = null
          if (s !== null) onUp(cellOf(e), s.info)
        }}
        onPointerCancel={() => {
          stroke.current = null
        }}
        onPointerLeave={() => setHover(null)}
      >
        <span className="ed-level-edge" aria-hidden="true" />
        <svg className="ed-marks" viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} preserveAspectRatio="none" aria-hidden="true">
          {marks?.logic?.map((row, y) =>
            [...row].map((sign, x) =>
              sign === "." ? null : sign === "#" ? (
                <rect key={`l${x},${y}`} x={x} y={y} width={1} height={1} fill={SIGN_COLOR["#"]} />
              ) : (
                <text key={`l${x},${y}`} x={x + 0.5} y={y + 0.72} className="ed-sign" fill={SIGN_COLOR[sign] ?? "#000"}>
                  {sign}
                </text>
              )
            )
          )}
          {marks?.links?.map((l) => (
            <line
              key={`k${l.gate.x},${l.gate.y}-${l.lever.x},${l.lever.y}`}
              className={l.active ? "ed-wire ed-wire-on" : "ed-wire"}
              x1={mid(l.gate).x}
              y1={mid(l.gate).y}
              x2={mid(l.lever).x}
              y2={mid(l.lever).y}
            />
          ))}
          {marks?.routes?.map((r, i) => {
            const points = [r.from, ...r.points, ...(r.points.length > 1 ? [r.points[0] ?? r.from] : [])].map(mid)
            return (
              <g key={`r${i}`} className={r.active ? "ed-route-mark ed-route-on" : "ed-route-mark"}>
                <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} />
                {r.active &&
                  r.points.map((p, j) => (
                    <g key={`p${j}`}>
                      <circle cx={p.x + 0.5} cy={p.y + 0.5} r={0.28} />
                      <text x={p.x + 0.5} y={p.y + 0.62}>
                        {j + 1}
                      </text>
                    </g>
                  ))}
              </g>
            )
          })}
          {marks?.selected != null && (
            <rect className="ed-selected" x={marks.selected.x + 0.04} y={marks.selected.y + 0.04} width={0.92} height={0.92} />
          )}
          {marks?.box != null && (
            <rect
              className="ed-box"
              x={Math.min(marks.box.x0, marks.box.x1)}
              y={Math.min(marks.box.y0, marks.box.y1)}
              width={Math.abs(marks.box.x1 - marks.box.x0) + 1}
              height={Math.abs(marks.box.y1 - marks.box.y0) + 1}
            />
          )}
        </svg>
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
