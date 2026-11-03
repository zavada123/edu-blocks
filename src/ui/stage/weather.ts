import type { Weather } from "../look.ts"

/**
 * Snow, rain and leaves over the field, drawn as small shapes: the art packs have no weather. Each drop has a fixed
 * place in a tile of the sky that falls and drifts in a loop, so the weather is the same at the same moment.
 */

type Ctx = CanvasRenderingContext2D

interface View {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Kind {
  /** Drops per cell of the field. */
  readonly density: number
  /** Seconds for a drop to fall one tile of the sky. */
  readonly seconds: number
  /** How far it drifts sideways while it falls one tile, as a share of the tile. */
  readonly drift: number
}

const KINDS: Readonly<Record<Weather, Kind>> = {
  snow: { density: 0.35, seconds: 9, drift: 0.25 },
  rain: { density: 0.3, seconds: 1.4, drift: 0.12 },
  leaves: { density: 0.06, seconds: 12, drift: 0.5 }
}

const LEAF_COLOURS = ["#e8a33a", "#d9692c", "#c9452b", "#f0c24a"]

/** A number from 0 to 1, the same for the same drop. */
const rand = (i: number, salt: number): number => {
  let h = Math.imul(i + 1, 2654435761) ^ Math.imul(salt + 7, 40503)
  h = Math.imul(h ^ (h >>> 15), 2246822519)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

const wrap = (v: number, size: number) => ((v % size) + size) % size

export const drawWeather = (ctx: Ctx, weather: Weather, view: View, cell: number, now: number) => {
  const kind = KINDS[weather]
  const w = view.width * cell
  const h = view.height * cell
  const left = view.x * cell
  const top = view.y * cell
  const count = Math.round(view.width * view.height * kind.density)
  const t = now / 1000 / kind.seconds
  ctx.save()
  for (let i = 0; i < count; i++) {
    const speed = 0.7 + 0.6 * rand(i, 3)
    const fall = (t * speed + rand(i, 1)) * h
    const x = left + wrap(rand(i, 2) * w + fall * kind.drift + Math.sin(t * 6 + i) * (weather === "rain" ? 0 : 2), w)
    const y = top + wrap(fall, h)
    if (weather === "snow") {
      ctx.globalAlpha = 0.85
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(x, y, 0.5 + 0.6 * rand(i, 4), 0, Math.PI * 2)
      ctx.fill()
    } else if (weather === "rain") {
      ctx.globalAlpha = 0.45
      ctx.strokeStyle = "#cfe6ff"
      ctx.lineWidth = 0.4
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 0.8, y + 4)
      ctx.stroke()
    } else {
      ctx.globalAlpha = 0.9
      ctx.fillStyle = LEAF_COLOURS[i % LEAF_COLOURS.length] ?? "#e8a33a"
      ctx.beginPath()
      ctx.ellipse(x, y, 1.4, 0.7, t * 8 + i, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
