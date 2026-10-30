import { useEffect, useId, useState } from "react"
import { cellKey, type Direction, type World } from "../core/world.ts"
import beeSheet from "./sprites/bee.png"
import bushTile from "./sprites/bush.png"
import crystalTile from "./sprites/crystal.png"
import flagStrip from "./sprites/flag.png"
import grassTile from "./sprites/grass.png"
import pathTile from "./sprites/path.png"
import robotSheet from "./sprites/robot.png"
import roverSheet from "./sprites/rover.png"

/** Hero looks. The app sells and picks them; the package only draws them. */
export type Skin = "robot" | "rover" | "bee"

/** Pixel art from the Ninja Adventure pack (CC0), see sprites/CREDITS.md. One cell is one 16×16 tile. */
const CELL = 16

/** A sheet has a column per direction and a row per walking frame. */
const SHEETS: Readonly<Record<Skin, { readonly href: string; readonly height: number }>> = {
  robot: { href: robotSheet, height: 112 },
  rover: { href: roverSheet, height: 112 },
  bee: { href: beeSheet, height: 64 }
}

const COLUMN: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 }

const WALK_FRAMES = 4
const FRAME_MS = 70

/** One 16×16 frame of a sheet, centred on the origin. */
const Frame = ({ href, width, height, col, row }: { readonly href: string; readonly width: number; readonly height: number; readonly col: number; readonly row: number }) => (
  <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`${col * CELL} ${row * CELL} ${CELL} ${CELL}`}>
    <image href={href} width={width} height={height} />
  </svg>
)

const Tile = ({ href }: { readonly href: string }) => <image href={href} x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} />

const Flag = () => (
  <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`0 0 ${CELL} ${CELL}`}>
    <image href={flagStrip} width={CELL * 4} height={CELL}>
      <animate attributeName="x" values={`0;-${CELL};-${CELL * 2};-${CELL * 3}`} dur="0.6s" calcMode="discrete" repeatCount="indefinite" />
    </image>
  </svg>
)

const cells = (world: World) =>
  Array.from({ length: world.width * world.height }, (_, i) => {
    const x = i % world.width
    const y = Math.floor(i / world.width)
    const key = cellKey(x, y)
    return { key, x, y, wall: world.walls.has(key) }
  })

/** Steps through the walking frames once each time the hero moves to another cell. */
const useWalkFrame = (x: number, y: number): number => {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    let step = 0
    const timer = setInterval(() => {
      step += 1
      setFrame(step % WALK_FRAMES)
      if (step >= WALK_FRAMES) clearInterval(timer)
    }, FRAME_MS)
    return () => clearInterval(timer)
  }, [x, y])
  return frame
}

export const Field = ({ world, skin }: { readonly world: World; readonly skin: Skin }) => {
  const grassId = `eb-grass-${useId().replace(/:/g, "")}`
  const frame = useWalkFrame(world.hero.x, world.hero.y)
  const sheet = SHEETS[skin]
  const center = (x: number, y: number) => `translate(${x * CELL + CELL / 2} ${y * CELL + CELL / 2})`
  return (
    <svg className="eb-field" viewBox={`0 0 ${world.width * CELL} ${world.height * CELL}`} role="img" aria-label="Поле гри">
      <defs>
        <pattern id={grassId} width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <image href={grassTile} width={CELL} height={CELL} />
        </pattern>
      </defs>
      {/* Walls are bushes on the grass; the hero walks on a sandy path. */}
      <rect width={world.width * CELL} height={world.height * CELL} fill={`url(#${grassId})`} />
      {cells(world).map(({ key, x, y, wall }) => (
        <g key={key} transform={center(x, y)}>
          <Tile href={wall ? bushTile : pathTile} />
        </g>
      ))}
      {world.finish !== null && (
        <g transform={center(world.finish.x, world.finish.y)}>
          <Flag />
        </g>
      )}
      {[...world.crystals].map((key) => {
        const [x, y] = key.split(",").map(Number)
        return (
          <g key={key} transform={center(x ?? 0, y ?? 0)}>
            <g className="eb-crystal">
              <Tile href={crystalTile} />
            </g>
          </g>
        )
      })}
      <g className="eb-hero" style={{ transform: `translate(${world.hero.x * CELL + CELL / 2}px, ${world.hero.y * CELL + CELL / 2}px)` }}>
        <ellipse cx={0} cy={7} rx={5} ry={1.5} className="eb-hero-shadow" />
        <g className={world.crashed ? "eb-hero-crashed" : undefined}>
          <Frame href={sheet.href} width={CELL * 4} height={sheet.height} col={COLUMN[world.hero.dir]} row={frame} />
        </g>
      </g>
    </svg>
  )
}
