import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Full screen for the game. The browser's full screen where it works; elsewhere (an iPhone) the game covers the
 * page. Esc or the button leaves it.
 */
export const useFullScreen = () => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)

  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement === null) setFull(false)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [full])

  const toggleFull = useCallback(() => {
    const root = rootRef.current
    if (full) {
      setFull(false)
      if (document.fullscreenElement !== null) void document.exitFullscreen().catch(() => undefined)
      return
    }
    setFull(true)
    if (root !== null && typeof root.requestFullscreen === "function") void root.requestFullscreen().catch(() => undefined)
  }, [full])

  return { rootRef, full, toggleFull }
}
