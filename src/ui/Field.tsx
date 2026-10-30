import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { Prop, Scene } from "../core/level.ts"
import { cellKey, type Direction, type World } from "../core/world.ts"
import { FLOORS, ITEM_TILES, PROPS, propCells, seasonOf, waterTile } from "./look.ts"
import { buildScenery } from "./scenery.ts"
import beeSheet from "./sprites/bee.png"
import fireStrip from "./sprites/fire.png"
import flagStrip from "./sprites/flag.png"
import grandmaSheet from "./sprites/grandma.png"
import ninjaSheet from "./sprites/ninja.png"
import robotSheet from "./sprites/robot.png"
import roverSheet from "./sprites/rover.png"
import wellTile from "./sprites/well.png"

/** Hero looks. The app sells and picks them; the package only draws them. */
export type Skin = "ninja" | "robot" | "rover" | "bee"

/** Pixel art from the Ninja Adventure pack (CC0), see sprites/CREDITS.md. One cell is one 16×16 tile. */
const CELL = 16

/** A sheet has a column per direction and a row per walking frame. */
const SHEETS: Readonly<Record<Skin, { readonly href: string; readonly height: number }>> = {
  ninja: { href: ninjaSheet, height: 112 },
  robot: { href: robotSheet, height: 112 },
  rover: { href: roverSheet, height: 112 },
  bee: { href: beeSheet, height: 64 }
}

const COLUMN: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 }

const WALK_FRAMES = 4
const FRAME_MS = 70

/** One 16×16 frame of a sheet, centred on the origin. */
const Frame = ({ href, height, col, row }: { readonly href: string; readonly height: number; readonly col: number; readonly row: number }) => (
  <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`${col * CELL} ${row * CELL} ${CELL} ${CELL}`}>
    <image href={href} width={CELL * 4} height={height} />
  </svg>
)

const Tile = ({ href }: { readonly href: string }) => <image href={href} x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} />

/** A strip of frames played in a loop: the flag and the flame. */
const Strip = (props: {
  readonly href: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly frames: ReadonlyArray<number>
  readonly total: number
  readonly dur: string
}) => (
  <svg x={props.x} y={props.y} width={props.width} height={props.height} viewBox={`0 0 ${props.width} ${props.height}`}>
    <image href={props.href} width={props.width * props.total} height={props.height}>
      <animate
        attributeName="x"
        values={props.frames.map((f) => -f * props.width).join(";")}
        dur={props.dur}
        calcMode="discrete"
        repeatCount="indefinite"
      />
    </image>
  </svg>
)

const Flag = () => <Strip href={flagStrip} x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} frames={[0, 1, 2, 3]} total={4} dur="0.6s" />

const Flame = () => <Strip href={fireStrip} x={-4} y={-10} width={8} height={12} frames={[1, 2, 3, 4, 5, 6]} total={12} dur="0.6s" />

const Finish = ({ kind }: { readonly kind: NonNullable<Scene["finish"]> }) => {
  if (kind === "flag") return <Flag />
  if (kind === "well") return <Tile href={wellTile} />
  if (kind === "grandma") return <Frame href={grandmaSheet} height={32} col={0} row={0} />
  // At home the house above is the goal; a doormat marks the cell.
  return <rect x={-6} y={-4} width={12} height={8} rx={2} className="eb-doormat" />
}

const Item = ({ kind, lit }: { readonly kind: NonNullable<Scene["item"]>; readonly lit: boolean }) => (
  <>
    {kind === "fish" && <ellipse cx={0} cy={1} rx={7} ry={5} className="eb-ice-hole" />}
    {kind === "key" ? <image href={ITEM_TILES.key} x={-6} y={-4} width={12} height={8} /> : <Tile href={ITEM_TILES[kind]} />}
    {lit && <Flame />}
  </>
)

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

/** Every item cell of the level, also the taken ones: a lit campfire stays where it was. */
const useAllItems = (world: World): ReadonlySet<string> => {
  const seen = useRef<{ walls: World["walls"]; cells: Set<string> }>({ walls: world.walls, cells: new Set() })
  if (seen.current.walls !== world.walls) seen.current = { walls: world.walls, cells: new Set() }
  for (const key of world.crystals) seen.current.cells.add(key)
  return seen.current.cells
}

const NO_PROPS: ReadonlyArray<Prop> = []

const at = (key: string) => {
  const [x, y] = key.split(",").map(Number)
  return { x: x ?? 0, y: y ?? 0 }
}

export const Field = ({ world, skin, scene = {} }: { readonly world: World; readonly skin: Skin; readonly scene?: Scene | undefined }) => {
  const grassId = `eb-grass-${useId().replace(/:/g, "")}`
  const frame = useWalkFrame(world.hero.x, world.hero.y)
  const allItems = useAllItems(world)
  const sheet = SHEETS[skin]
  const season = seasonOf(scene)
  const ground = scene.ground ?? "path"
  const item = scene.item ?? "crystal"
  const props = scene.props ?? NO_PROPS
  const { width, height, walls, finish } = world
  const scenery = useMemo(
    () => buildScenery({ width, height, walls, finish }, { reserved: propCells(props), bareWalls: ground === "bridge" }),
    [width, height, walls, finish, props, ground]
  )
  const center = (x: number, y: number) => `translate(${x * CELL + CELL / 2} ${y * CELL + CELL / 2})`
  const { view } = scenery
  return (
    <svg
      className="eb-field"
      viewBox={`${view.x * CELL} ${view.y * CELL} ${view.width * CELL} ${view.height * CELL}`}
      role="img"
      aria-label="Поле гри"
    >
      <defs>
        <pattern id={grassId} width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <image href={season.grass} width={CELL} height={CELL} />
        </pattern>
      </defs>
      {/* The hero walks on the floor; walls are trees, bushes and rocks (or water under a bridge), and a meadow lies around. */}
      <rect x={view.x * CELL} y={view.y * CELL} width={view.width * CELL} height={view.height * CELL} fill={`url(#${grassId})`} />
      {Array.from({ length: width * height }, (_, i) => {
        const x = i % width
        const y = Math.floor(i / width)
        const wall = walls.has(cellKey(x, y))
        if (wall && ground !== "bridge") return null
        return (
          <g key={cellKey(x, y)} transform={center(x, y)}>
            <Tile href={wall ? waterTile : FLOORS[ground]} />
          </g>
        )
      })}
      {scenery.decor.map(({ x, y, kind }) => {
        const href = ground === "path" || x < 0 || y < 0 || x >= width || y >= height ? season.decor[kind] : null
        return href === null ? null : (
          <g key={`d${cellKey(x, y)}`} transform={center(x, y)}>
            <Tile href={href} />
          </g>
        )
      })}
      {scenery.obstacles.map(({ x, y, kind }) => (
        <g key={`o${cellKey(x, y)}`} transform={center(x, y)}>
          <Tile href={season.obstacles[kind]} />
        </g>
      ))}
      {scenery.trees.map(({ x, y }) => (
        <image key={`t${cellKey(x, y)}`} href={season.tree} x={x * CELL} y={y * CELL} width={CELL * 2} height={CELL * 2} />
      ))}
      {props.map((p) => {
        const look = PROPS[p.kind]
        return (
          <image
            key={`p${p.kind}${p.x},${p.y}`}
            href={look.href}
            x={p.x * CELL}
            y={p.y * CELL}
            width={look.width * CELL}
            height={look.height * CELL}
          />
        )
      })}
      {finish !== null && (
        <g transform={center(finish.x, finish.y)}>
          <Finish kind={scene.finish ?? "flag"} />
        </g>
      )}
      {[...allItems].map((key) => {
        const taken = !world.crystals.has(key)
        if (taken && item !== "campfire") return null
        const { x, y } = at(key)
        return (
          <g key={key} transform={center(x, y)}>
            <g className={item === "crystal" ? "eb-crystal" : undefined}>
              <Item kind={item} lit={taken} />
            </g>
          </g>
        )
      })}
      <g className="eb-hero" style={{ transform: `translate(${world.hero.x * CELL + CELL / 2}px, ${world.hero.y * CELL + CELL / 2}px)` }}>
        <ellipse cx={0} cy={7} rx={5} ry={1.5} className="eb-hero-shadow" />
        <g className={world.crashed ? "eb-hero-crashed" : undefined}>
          <Frame href={sheet.href} height={sheet.height} col={COLUMN[world.hero.dir]} row={frame} />
        </g>
      </g>
    </svg>
  )
}
