import { useCallback, useEffect, useRef, useState } from "react"

/**
 * How long a game that closes in full screen keeps it for the next game. «Далі» makes the app open the next level as
 * a new game; the new game opens in full screen when it comes within this time.
 */
export const FULL_SCREEN_HANDOFF_MS = 4000

/** Until when a closed game hands its full screen to the next game that opens (0: it does not). */
let handoffUntil = 0

/** A game closes: in full screen, it hands it to the next game. */
export const handOffFullScreen = (full: boolean, now: number): void => {
  handoffUntil = full ? now + FULL_SCREEN_HANDOFF_MS : 0
}

/** A handoff waits for the next game. */
const handoffPending = (): boolean => handoffUntil !== 0

/** A game opens: true when it takes the full screen of the game before it. A handoff is taken once. */
export const takeFullScreen = (now: number): boolean => {
  const taken = now < handoffUntil
  handoffUntil = 0
  return taken
}

/**
 * What goes into the browser's full screen: the element around the game. The app keeps it when it opens the next
 * level as a new game, so the browser stays in full screen; the game covers it (`.eb-full`).
 */
const targetOf = (root: HTMLElement): HTMLElement => root.parentElement ?? root

/**
 * Full screen for the game. The browser's full screen where it works; elsewhere (an iPhone) the game covers the
 * page. Esc or the button leaves it. The next level opens in full screen too (`handOffFullScreen`).
 */
export const useFullScreen = () => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [full, setFullState] = useState(false)
  // The same as `full`, but at once: a game that closes right after it asked for full screen still hands it on.
  const fullRef = useRef(false)
  const setFull = useCallback((on: boolean) => {
    fullRef.current = on
    setFullState(on)
  }, [])
  // The browser's full screen is this game's: only its end closes the game's full screen. A refused request (the
  // game then covers the page) does not.
  const owns = useRef(false)

  const enter = useCallback(() => {
    setFull(true)
    const root = rootRef.current
    if (root === null) return
    const target = targetOf(root)
    if (document.fullscreenElement === target) {
      owns.current = true
      return
    }
    if (typeof target.requestFullscreen === "function") void target.requestFullscreen().catch(() => undefined)
  }, [setFull])

  useEffect(() => {
    if (takeFullScreen(Date.now())) enter()
    return () => {
      const root = rootRef.current
      handOffFullScreen(fullRef.current, Date.now())
      if (!owns.current || root === null) return
      // No next game came: the element around the game leaves the browser's full screen.
      const target = targetOf(root)
      setTimeout(() => {
        if (handoffPending() && document.fullscreenElement === target) void document.exitFullscreen().catch(() => undefined)
      }, FULL_SCREEN_HANDOFF_MS)
    }
  }, [enter])

  useEffect(() => {
    const onChange = () => {
      const root = rootRef.current
      if (root !== null && document.fullscreenElement === targetOf(root)) owns.current = true
      else if (owns.current) {
        owns.current = false
        setFull(false)
      }
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [setFull])

  const leave = useCallback(() => {
    setFull(false)
    owns.current = false
    if (document.fullscreenElement !== null) void document.exitFullscreen().catch(() => undefined)
  }, [setFull])

  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [full, leave])

  const toggleFull = useCallback(() => (full ? leave() : enter()), [full, enter, leave])

  return { rootRef, full, toggleFull }
}
