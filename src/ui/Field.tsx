import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { Npc, Prop, Scene } from "../core/level.ts"
import { type Cell, cellKey, type Direction, type Enemy, isAlive, type World } from "../core/world.ts"
import { ENEMIES, FLOORS, ITEM_TILES, NPCS, PROPS, propCells, seasonOf, type Swaying, waterTile } from "./look.ts"
import { buildScenery, cellHash } from "./scenery.ts"
import { meadowTile, PATH_SHEET_COLUMNS, pathPiece } from "./terrain.ts"
import beeSheet from "./sprites/bee.png"
import fireStrip from "./sprites/fire.png"
import flagStrip from "./sprites/flag.png"
import grandmaSheet from "./sprites/grandma.png"
import heartSheet from "./sprites/heart.png"
import ninjaSheet from "./sprites/ninja.png"
import robotSheet from "./sprites/robot.png"
import roverSheet from "./sprites/rover.png"
import slashStrip from "./sprites/slash.png"
import smokeStrip from "./sprites/smoke.png"
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

const PATH_SHEET_ROWS = 6
const NPC_SHEET_HEIGHT = 112
const SEAM = 0.15
const MEADOW_TILES = 7
/** The snowfall picture (320×240) drawn at half size, so the flakes match the 16-pixel tiles. */
const SNOW_W = 160
const SNOW_H = 120

const ENEMY_SHEET_HEIGHT = 64
const BOSS_SCALE = 1.5
const FX = 32
const HEART = 9
/** Columns of heart.png: a full heart first, an empty one last. */
const HEART_FULL = 0
const HEART_EMPTY = 4

const WALK_FRAMES = 4
const FRAME_MS = 70

/** One 16×16 frame of a sheet, centred on the origin. */
const Frame = ({ href, height, col, row }: { readonly href: string; readonly height: number; readonly col: number; readonly row: number }) => (
  <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`${col * CELL} ${row * CELL} ${CELL} ${CELL}`}>
    <image href={href} width={CELL * 4} height={height} />
  </svg>
)

const Tile = ({ href }: { readonly href: string }) => <image href={href} x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} />

/** One 16×16 piece of a sheet, with its top-left corner at x, y. */
const Piece = (props: {
  readonly href: string
  readonly x: number
  readonly y: number
  readonly col: number
  readonly row: number
  readonly columns: number
  readonly rows: number
}) => (
  // A hair wider than the cell, so no thin seam shows between two pieces when the field is scaled.
  <svg
    x={props.x}
    y={props.y}
    width={CELL + SEAM}
    height={CELL + SEAM}
    viewBox={`${props.col * CELL} ${props.row * CELL} ${CELL} ${CELL}`}
    preserveAspectRatio="none"
  >
    <image href={props.href} width={props.columns * CELL} height={props.rows * CELL} />
  </svg>
)

/** Whether the viewer asked for less motion: then bushes stand still and no snow falls. */
const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

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
  readonly begin?: string
}) => (
  <svg x={props.x} y={props.y} width={props.width} height={props.height} viewBox={`0 0 ${props.width} ${props.height}`}>
    <image href={props.href} width={props.width * props.total} height={props.height}>
      <animate
        attributeName="x"
        values={props.frames.map((f) => -f * props.width).join(";")}
        dur={props.dur}
        calcMode="discrete"
        repeatCount="indefinite"
        begin={props.begin ?? "0s"}
      />
    </image>
  </svg>
)

/** A bush in the wind. Each bush starts at its own frame, so the meadow does not sway in step. */
const SwayingBush = ({ look, x, y, still }: { readonly look: Swaying; readonly x: number; readonly y: number; readonly still: boolean }) => {
  const frames = Array.from({ length: look.frames }, (_, i) => i)
  const begin = `-${(cellHash(x, y, 9) % 8) * 0.1}s`
  return still ? (
    <Piece href={look.href} x={-CELL / 2} y={-CELL / 2} col={0} row={0} columns={look.frames} rows={1} />
  ) : (
    <Strip href={look.href} x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} frames={frames} total={look.frames} dur="0.8s" begin={begin} />
  )
}

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
const NO_NPCS: ReadonlyArray<Npc> = []

/** A villager looking down and shifting from foot to foot, each at their own pace. */
const Villager = ({ npc, still }: { readonly npc: Npc; readonly still: boolean }) => {
  const look = (
    <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`0 0 ${CELL} ${CELL}`}>
      <image href={NPCS[npc.who]} width={CELL * 4} height={NPC_SHEET_HEIGHT}>
        {!still && (
          <animate
            attributeName="y"
            values={`0;0;0;${-CELL};0;0;${-2 * CELL};0`}
            dur="2.4s"
            calcMode="discrete"
            repeatCount="indefinite"
            begin={`-${(cellHash(npc.x, npc.y, 11) % 8) * 0.3}s`}
          />
        )}
      </image>
    </svg>
  )
  return (
    <>
      <ellipse cx={0} cy={7} rx={5} ry={1.5} className="eb-hero-shadow" />
      {look}
    </>
  )
}

/** An effect played once when it appears: a slash on a hit enemy, smoke where an enemy was beaten. */
const Burst = ({ href, frames }: { readonly href: string; readonly frames: number }) => (
  <svg x={-FX / 2} y={-FX / 2} width={FX} height={FX} viewBox={`0 0 ${FX} ${FX}`} pointerEvents="none">
    <image
      href={href}
      width={FX * frames}
      height={FX}
      className="eb-burst"
      style={{ ["--eb-burst-to" as string]: `${-FX * frames}px`, animationTimingFunction: `steps(${frames})` }}
    />
  </svg>
)

/** Where an enemy looks: at the hero when it comes for them, along its way when it walks. */
const faceOf = (enemy: Enemy, hero: Cell): Direction => {
  const dx = hero.x - enemy.x
  const dy = hero.y - enemy.y
  const near = Math.abs(dx) + Math.abs(dy) <= Math.max(1, enemy.sight)
  if (near) return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up"
  if (enemy.walk === "across") return enemy.heading === 1 ? "right" : "left"
  if (enemy.walk === "updown") return enemy.heading === 1 ? "down" : "up"
  return "down"
}

/** Hit points over a boss or a strong enemy. */
const HpBar = ({ enemy, top }: { readonly enemy: Enemy; readonly top: number }) => {
  const w = Math.min(14, enemy.maxHp * 3 + 1)
  return (
    <g transform={`translate(${-w / 2} ${top})`}>
      <rect width={w} height={3} rx={1} className="eb-hp-back" />
      <rect x={0.5} y={0.5} width={((w - 1) * enemy.hp) / enemy.maxHp} height={2} rx={0.5} className="eb-hp" />
    </g>
  )
}

const EnemyFigure = ({ enemy, hero, still }: { readonly enemy: Enemy; readonly hero: Cell; readonly still: boolean }) => {
  const alive = isAlive(enemy)
  const scale = enemy.boss ? BOSS_SCALE : 1
  const look = (
    <svg x={-CELL / 2} y={-CELL / 2} width={CELL} height={CELL} viewBox={`${COLUMN[faceOf(enemy, hero)] * CELL} 0 ${CELL} ${CELL}`}>
      <image href={ENEMIES[enemy.kind]} width={CELL * 4} height={ENEMY_SHEET_HEIGHT}>
        {!still && (
          <animate
            attributeName="y"
            values={`0;${-CELL};${-2 * CELL};${-3 * CELL}`}
            dur={enemy.boss ? "0.9s" : "0.6s"}
            calcMode="discrete"
            repeatCount="indefinite"
            begin={`-${(enemy.id % 4) * 0.15}s`}
          />
        )}
      </image>
    </svg>
  )
  return (
    <g className="eb-enemy" style={{ transform: `translate(${enemy.x * CELL + CELL / 2}px, ${enemy.y * CELL + CELL / 2}px)` }}>
      {alive && (
        <>
          <ellipse cx={0} cy={7} rx={5 * scale} ry={1.5 * scale} className="eb-hero-shadow" />
          <g transform={`translate(0 ${(1 - scale) * 6}) scale(${scale})`}>
            <g className={enemy.swinging ? "eb-enemy-swing" : undefined}>{look}</g>
          </g>
          {(enemy.boss || enemy.maxHp > 1) && <HpBar enemy={enemy} top={-CELL / 2 - 4 - (scale - 1) * 12} />}
        </>
      )}
      {enemy.hp < enemy.maxHp && alive && <Burst key={`hit${enemy.hp}`} href={slashStrip} frames={4} />}
      {!alive && <Burst key="down" href={smokeStrip} frames={6} />}
    </g>
  )
}

/** The hero's hearts in the top-left corner of the field. */
const Hearts = ({ hearts, max, x, y }: { readonly hearts: number; readonly max: number; readonly x: number; readonly y: number }) => (
  <g transform={`translate(${x} ${y})`} aria-label={`Сердечок: ${hearts} з ${max}`}>
    <rect x={-1.5} y={-1.5} width={max * (HEART + 1) + 2} height={HEART + 3} rx={3} className="eb-hearts-back" />
    {Array.from({ length: max }, (_, i) => (
      <svg key={i} x={i * (HEART + 1)} y={0} width={HEART} height={HEART} viewBox={`${(i < hearts ? HEART_FULL : HEART_EMPTY) * CELL} 0 ${CELL} ${CELL}`}>
        <image href={heartSheet} width={CELL * 5} height={CELL} />
      </svg>
    ))}
  </g>
)

const at = (key: string) => {
  const [x, y] = key.split(",").map(Number)
  return { x: x ?? 0, y: y ?? 0 }
}

export const Field = ({ world, skin, scene = {} }: { readonly world: World; readonly skin: Skin; readonly scene?: Scene | undefined }) => {
  const uid = useId().replace(/:/g, "")
  const grassId = `eb-grass-${uid}`
  const snowId = `eb-snow-${uid}`
  const still = useReducedMotion()
  const frame = useWalkFrame(world.hero.x, world.hero.y)
  const allItems = useAllItems(world)
  const sheet = SHEETS[skin]
  const season = seasonOf(scene)
  const ground = scene.ground ?? "path"
  const item = scene.item ?? "crystal"
  const props = scene.props ?? NO_PROPS
  const npcs = scene.npcs ?? NO_NPCS
  const { width, height, walls, finish } = world
  const scenery = useMemo(
    () => {
      const reserved = new Set(propCells(props))
      for (const n of npcs) reserved.add(cellKey(n.x, n.y))
      return buildScenery({ width, height, walls, finish }, { reserved, bareWalls: ground === "bridge" })
    },
    [width, height, walls, finish, props, npcs, ground]
  )
  const center = (x: number, y: number) => `translate(${x * CELL + CELL / 2} ${y * CELL + CELL / 2})`
  const { view } = scenery
  const isPath = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && !walls.has(cellKey(x, y))
  const meadow = season.meadow
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
        {season.snowfall !== null && (
          <pattern id={snowId} width={SNOW_W} height={SNOW_H} patternUnits="userSpaceOnUse">
            <image href={season.snowfall} width={SNOW_W} height={SNOW_H} />
            {!still && (
              <animateTransform
                attributeName="patternTransform"
                type="translate"
                from="0 0"
                to={`${SNOW_W / 4} ${SNOW_H}`}
                dur="9s"
                repeatCount="indefinite"
              />
            )}
          </pattern>
        )}
      </defs>
      {/* The hero walks on the floor; walls are trees, bushes and rocks (or water under a bridge), and a meadow lies around. */}
      <rect x={view.x * CELL} y={view.y * CELL} width={view.width * CELL} height={view.height * CELL} fill={`url(#${grassId})`} />
      {meadow !== null &&
        Array.from({ length: view.width * view.height }, (_, i) => {
          const x = view.x + (i % view.width)
          const y = view.y + Math.floor(i / view.width)
          const look = meadowTile(x, y)
          return look === 0 ? null : (
            <Piece key={`m${cellKey(x, y)}`} href={meadow} x={x * CELL} y={y * CELL} col={look} row={0} columns={MEADOW_TILES} rows={1} />
          )
        })}
      {Array.from({ length: width * height }, (_, i) => {
        const x = i % width
        const y = Math.floor(i / width)
        const wall = walls.has(cellKey(x, y))
        if (wall && ground !== "bridge") return null
        if (ground === "path") {
          const { col, row } = pathPiece(isPath, x, y)
          return (
            <Piece
              key={cellKey(x, y)}
              href={season.path}
              x={x * CELL}
              y={y * CELL}
              col={col}
              row={row}
              columns={PATH_SHEET_COLUMNS}
              rows={PATH_SHEET_ROWS}
            />
          )
        }
        return (
          <g key={cellKey(x, y)} transform={center(x, y)}>
            <Tile href={wall ? waterTile : FLOORS[ground]} />
          </g>
        )
      })}
      {scenery.decor.map(({ x, y, kind }) => {
        // The path has its own texture now: flowers and grass grow only in the meadow.
        const href = x < 0 || y < 0 || x >= width || y >= height ? season.decor[kind] : null
        return href === null ? null : (
          <g key={`d${cellKey(x, y)}`} transform={center(x, y)}>
            <Tile href={href} />
          </g>
        )
      })}
      {scenery.obstacles.map(({ x, y, kind }) => {
        const swaying = season.swaying[kind]
        return (
          <g key={`o${cellKey(x, y)}`} transform={center(x, y)}>
            {swaying === undefined ? <Tile href={season.obstacles[kind]} /> : <SwayingBush look={swaying} x={x} y={y} still={still} />}
          </g>
        )
      })}
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
      {npcs.map((n) => (
        <g key={`n${n.who}${n.x},${n.y}`} transform={center(n.x, n.y)}>
          <Villager npc={n} still={still} />
        </g>
      ))}
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
      {world.enemies.map((e) => (
        <EnemyFigure key={`e${e.id}`} enemy={e} hero={world.hero} still={still} />
      ))}
      <g className="eb-hero" style={{ transform: `translate(${world.hero.x * CELL + CELL / 2}px, ${world.hero.y * CELL + CELL / 2}px)` }}>
        <ellipse cx={0} cy={7} rx={5} ry={1.5} className="eb-hero-shadow" />
        <g key={`h${world.hearts}`} className={world.crashed ? "eb-hero-crashed" : world.hearts < world.maxHearts ? "eb-hero-hurt" : undefined}>
          <Frame href={sheet.href} height={sheet.height} col={COLUMN[world.hero.dir]} row={frame} />
        </g>
      </g>
      {season.snowfall !== null && (
        <rect
          x={view.x * CELL}
          y={view.y * CELL}
          width={view.width * CELL}
          height={view.height * CELL}
          fill={`url(#${snowId})`}
          className="eb-snowfall"
          pointerEvents="none"
        />
      )}
      {world.enemies.length > 0 && <Hearts hearts={world.hearts} max={world.maxHearts} x={view.x * CELL + 3} y={view.y * CELL + 3} />}
    </svg>
  )
}
