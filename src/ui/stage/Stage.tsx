import { useEffect, useMemo, useRef, useState } from "react"
import type { Scene } from "../../core/level.ts"
import type { Frame } from "../../core/program.ts"
import { cellKey, type World } from "../../core/world.ts"
import { propCells, seasonOf } from "../look.ts"
import { buildScenery } from "../scenery.ts"
import { CELL, drawActors, drawGround, type Skin } from "./draw.ts"
import { cellAt, type Cell, drawHover } from "./hover.ts"
import { whenLoaded } from "./images.ts"
import { poseAt } from "./playback.ts"
import { placedCells } from "./sprites.ts"

export type { Skin }

/** The largest number of screen pixels per picture pixel: more only costs memory. */
const MAX_SCALE = 6

/** Whether the viewer asked for less motion: then nothing moves between two cells and nothing loops. */
export const useReducedMotion = (): boolean => {
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

const DIRECTION_NAMES = { up: "вгору", right: "праворуч", down: "вниз", left: "ліворуч" } as const

/** What a screen reader says about the field. */
const describe = (world: World): string => {
  const parts = [`Герой на клітинці ${world.hero.x}, ${world.hero.y}, дивиться ${DIRECTION_NAMES[world.hero.dir]}.`]
  if (world.totalCrystals > 0) parts.push(`Залишилось узяти: ${world.crystals.size}.`)
  if (world.enemies.length > 0) parts.push(`Сердечок: ${world.hearts} з ${world.maxHearts}.`)
  if (world.energy !== null) parts.push(`Кроків залишилось: ${world.energy}.`)
  return `Поле гри. ${parts.join(" ")}`
}

export interface StageProps {
  /** The world at the start of the run. */
  readonly start: World
  /** The frames of the run; none before a run. */
  readonly frames?: ReadonlyArray<Frame> | undefined
  /** Actions played so far: see `poseAt`. A fraction is the middle of an action. */
  readonly time?: number
  readonly skin: Skin
  readonly scene?: Scene | undefined
}

const NO_FRAMES: ReadonlyArray<Frame> = []
const NO_SCENE: Scene = {}

/** The value of the program's counter after a frame, on levels with the «лічильник» block. */
const counterOf = (frame: Frame | null): string | undefined => {
  const value = frame === null ? undefined : (frame as { readonly counter?: unknown }).counter
  return typeof value === "string" ? value : undefined
}

/**
 * The game field on a canvas. The ground is drawn once; the hero, the enemies and the effects are drawn on every
 * animation frame from `poseAt(start, frames, time)`, so the timeline can stop or jump anywhere.
 */
export const Stage = ({ start, frames = NO_FRAMES, time = 0, skin, scene = NO_SCENE }: StageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const still = useReducedMotion()
  const season = seasonOf(scene)
  const { width, height, walls, finish } = start
  const props = scene.props
  const npcs = scene.npcs
  const sprites = scene.sprites
  const ground = scene.ground ?? "path"
  const scenery = useMemo(() => {
    const reserved = new Set(propCells(props ?? []))
    for (const n of npcs ?? []) reserved.add(cellKey(n.x, n.y))
    for (const s of sprites ?? []) for (const key of placedCells(s)) reserved.add(key)
    return buildScenery({ width, height, walls, finish }, { reserved, bareWalls: ground === "bridge" })
  }, [width, height, walls, finish, props, npcs, sprites, ground])
  const items = useMemo(() => [...start.crystals].map((key) => {
    const [x = 0, y = 0] = key.split(",").map(Number)
    return { x, y }
  }), [start.crystals])

  // The latest props for the drawing loop, which runs outside React.
  const live = useRef({ start, frames, time, skin, scene, season, scenery, items, still })
  live.current = { start, frames, time, skin, scene, season, scenery, items, still }
  // The cell under the mouse: it is lit, so children can count the steps.
  const hover = useRef<Cell | null>(null)
  // The screen reader hears the field as it is after the action that plays.
  const settledTime = Math.ceil(time)
  const label = useMemo(() => describe(poseAt(start, frames, settledTime).world), [start, frames, settledTime])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d") ?? null
    if (canvas === null || ctx === null) return
    const { view } = scenery
    const viewW = view.width * CELL
    const viewH = view.height * CELL
    const groundCanvas = document.createElement("canvas")
    let scale = 0
    let groundReady = false

    const fit = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const next = Math.min(MAX_SCALE, Math.max(1, Math.ceil((box.width * dpr) / viewW)))
      if (next === scale) return
      scale = next
      canvas.width = viewW * scale
      canvas.height = viewH * scale
      groundCanvas.width = canvas.width
      groundCanvas.height = canvas.height
      groundReady = false
    }

    const paintGround = () => {
      const g = groundCanvas.getContext("2d")
      if (g === null) return
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, groundCanvas.width, groundCanvas.height)
      g.imageSmoothingEnabled = false
      g.setTransform(scale, 0, 0, scale, -view.x * CELL * scale, -view.y * CELL * scale)
      const s = live.current
      drawGround(g, { world: s.start, scene: s.scene, season: s.season, scenery: s.scenery })
      groundReady = true
    }

    let frame = 0
    // The ground is painted again when the scene or the map changes, as in the level editor.
    let paintedScene: Scene | null = null
    let paintedStart: World | null = null
    const paint = (now: number) => {
      fit()
      const s = live.current
      if (s.scene !== paintedScene || s.start !== paintedStart) groundReady = false
      if (!groundReady) {
        paintGround()
        paintedScene = s.scene
        paintedStart = s.start
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(groundCanvas, 0, 0)
      ctx.setTransform(scale, 0, 0, scale, -view.x * CELL * scale, -view.y * CELL * scale)
      if (hover.current !== null) drawHover(ctx, hover.current)
      const t = s.still && s.time % 1 !== 0 ? Math.ceil(s.time) : s.time
      const pose = poseAt(s.start, s.frames, t)
      drawActors(ctx, {
        pose,
        scene: s.scene,
        season: s.season,
        scenery: s.scenery,
        skin: s.skin,
        items: s.items,
        now,
        still: s.still,
        counter: counterOf(pose.frame)
      })
      frame = requestAnimationFrame(paint)
    }
    frame = requestAnimationFrame(paint)
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      const box = canvas.getBoundingClientRect()
      hover.current = cellAt(e.clientX - box.left, e.clientY - box.top, box, view, live.current.start)
    }
    const onLeave = () => {
      hover.current = null
    }
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerleave", onLeave)
    // A picture that arrives late is drawn into the ground too.
    const stop = whenLoaded(() => {
      groundReady = false
    })
    return () => {
      cancelAnimationFrame(frame)
      stop()
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerleave", onLeave)
    }
  }, [scenery])

  return <canvas ref={canvasRef} className="eb-field" role="img" aria-label={label} />
}
