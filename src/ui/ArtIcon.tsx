import { useEffect, useRef } from "react"
import { frameAt, iconFrame, restClip, type SpriteAsset } from "../core/assets.ts"
import { type Art, art } from "./art.ts"
import { image, whenLoaded } from "./stage/images.ts"
import { packFile } from "./stage/packs.ts"

/**
 * A picture of the game's art outside the field: a hero in the choice and the HUD, a coin, an icon of the editor.
 * It shows the part of the frame where the figure is, not the empty room around it, and can play a clip.
 */

/** Kinds whose frames are wide stages for a swinging figure: they are cut around where it stands. */
const FIGURES = new Set(["character", "enemy", "animal", "boss"])
/** The part of a figure's frame shown, in its pixels: the body without the room for a swing. */
const FIGURE_BOX = 84

type Box = readonly [x: number, y: number, size: number]

/** The square of a frame to show. */
const boxOf = (sprite: SpriteAsset, w: number, h: number): Box => {
  const anchor = sprite.anchor ?? [w / 2, h]
  if (FIGURES.has(sprite.category)) {
    const size = Math.min(FIGURE_BOX, w, h)
    const y = Math.min(h - size, Math.max(0, anchor[1] + 6 - size))
    return [Math.min(w - size, Math.max(0, anchor[0] - size / 2)), y, size]
  }
  const [bx, by, bw, bh] = sprite.bounds ?? [0, 0, w, h]
  const size = Math.min(Math.max(bw, bh), Math.max(w, h))
  return [bx + bw / 2 - size / 2, by + bh / 2 - size / 2, size]
}

/** Draws a frame of the sprite into the whole canvas. False while its picture loads. */
const paint = (ctx: CanvasRenderingContext2D, found: Art, clip: string | null, now: number): boolean => {
  const { pack, sprite } = found
  const rect = (clip === null ? null : frameAt(sprite, clip, "down", now)) ?? iconFrame(sprite)
  const img = image(packFile(pack.id, rect.file))
  if (img === null) return false
  const [bx, by, size] = boxOf(sprite, rect.w, rect.h)
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  if (rect.flip) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(img, rect.sx + bx, rect.sy + by, size, size, 0, 0, width, height)
  ctx.restore()
  return true
}

export interface ArtIconProps {
  /** A sprite id of the art packs (see art.ts). */
  readonly id: string
  /** The clip to play; by default the sprite stands still in its rest clip. */
  readonly clip?: string
  readonly animate?: boolean
  readonly className?: string
  /** Size in CSS pixels; by default the CSS of `className` sizes it. */
  readonly size?: number
}

/** Canvas pixels per CSS pixel: sharp on a dense screen without a huge canvas. */
const DENSITY = 2

export const ArtIcon = ({ id, clip, animate = false, className, size = 64 }: ArtIconProps) => {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext("2d") ?? null
    if (ctx === null) return
    let frame = 0
    const draw = (now: number) => {
      const found = art(id)
      if (found !== null) paint(ctx, found, clip ?? restClip(found.sprite), animate ? now : 0)
      if (animate) frame = requestAnimationFrame(draw)
    }
    draw(0)
    const stop = whenLoaded(() => draw(performance.now()))
    return () => {
      cancelAnimationFrame(frame)
      stop()
    }
  }, [id, clip, animate])
  return <canvas ref={ref} className={className} width={size * DENSITY} height={size * DENSITY} aria-hidden="true" />
}
