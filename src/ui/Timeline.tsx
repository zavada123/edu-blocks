import { useCallback, useEffect, useRef, useState } from "react"

/** Speeds of the playback, as a share of the normal pace. */
export const RATES: ReadonlyArray<number> = [0.5, 1, 2, 4]

export interface Player {
  /** Actions played so far, fractions included: see `poseAt`. */
  readonly time: number
  readonly playing: boolean
  readonly rate: number
  readonly play: () => void
  readonly pause: () => void
  /** Jumps to a moment; the playback pauses. */
  readonly seek: (time: number) => void
  /** One whole action forward or back; the playback pauses. */
  readonly step: (by: 1 | -1) => void
  readonly setRate: (rate: number) => void
  /** Back to the start of a new run of `length` actions, playing. */
  readonly restart: (length: number) => void
}

/**
 * Plays a run: moves the time on each animation frame while playing. `onEnd` runs the first time a run reaches
 * its last action; a later jump to the end does not run it again.
 */
export const usePlayer = (msPerAction: number, onEnd: () => void): Player => {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const length = useRef(0)
  const ended = useRef(true)
  const timeRef = useRef(0)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const moveTo = useCallback((t: number) => {
    const next = Math.min(length.current, Math.max(0, t))
    timeRef.current = next
    setTime(next)
    if (next >= length.current && !ended.current) {
      ended.current = true
      setPlaying(false)
      onEndRef.current()
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      moveTo(timeRef.current + (dt * rate) / msPerAction)
      if (timeRef.current < length.current) frame = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, rate, msPerAction, moveTo])

  const play = useCallback(() => {
    if (timeRef.current >= length.current) moveTo(0)
    setPlaying(true)
  }, [moveTo])
  const pause = useCallback(() => setPlaying(false), [])
  const seek = useCallback(
    (t: number) => {
      setPlaying(false)
      moveTo(t)
    },
    [moveTo]
  )
  const step = useCallback(
    (by: 1 | -1) => {
      setPlaying(false)
      const t = timeRef.current
      moveTo(by === 1 ? Math.floor(t) + 1 : Math.ceil(t) - 1)
    },
    [moveTo]
  )
  const restart = useCallback(
    (n: number) => {
      length.current = n
      ended.current = false
      // A run without actions ends at once.
      moveTo(0)
      setPlaying(n > 0)
    },
    [moveTo]
  )
  return { time, playing, rate, play, pause, seek, step, setRate, restart }
}

/** The controls under the field: play or pause, a step back and forward, the time slider and the speed. */
export const Timeline = ({ player, length }: { readonly player: Player; readonly length: number }) => {
  const { time, playing } = player
  const done = Math.min(length, Math.floor(time + 1e-6))
  return (
    <div className="eb-timeline">
      <button type="button" className="eb-btn" onClick={() => player.step(-1)} disabled={time <= 0} aria-label="Крок назад" title="Крок назад">
        <span aria-hidden="true">⏮</span>
      </button>
      <button
        type="button"
        className="eb-btn eb-btn-gold"
        onClick={playing ? player.pause : player.play}
        aria-label={playing ? "Пауза" : "Грати"}
        title={playing ? "Пауза" : "Грати"}
      >
        <span aria-hidden="true">{playing ? "⏸" : "▶"}</span>
      </button>
      <button type="button" className="eb-btn" onClick={() => player.step(1)} disabled={time >= length} aria-label="Крок уперед" title="Крок уперед">
        <span aria-hidden="true">⏭</span>
      </button>
      <input
        type="range"
        className="eb-timeline-slider"
        min={0}
        max={Math.max(1, length)}
        step={0.01}
        value={time}
        onChange={(e) => player.seek(Number(e.target.value))}
        aria-label="Час програми"
        aria-valuetext={`Дія ${done} з ${length}`}
      />
      <span className="eb-timeline-count" aria-hidden="true">
        {done}/{length}
      </span>
      <select className="eb-timeline-rate" value={player.rate} onChange={(e) => player.setRate(Number(e.target.value))} aria-label="Швидкість">
        {RATES.map((r) => (
          <option key={r} value={r}>
            ×{r}
          </option>
        ))}
      </select>
    </div>
  )
}
