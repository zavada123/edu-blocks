import { useCallback, useEffect, useRef, useState } from "react"

/** The most steps back the editor keeps. */
const MAX_UNDO = 100

export interface History<T> {
  readonly value: T
  /** A new state that can be undone. */
  readonly set: (next: T | ((current: T) => T)) => void
  /**
   * Starts a stroke: the state before it is kept once, and `amend` changes the state without a new step. A drag over
   * the map is one step to undo.
   */
  readonly begin: () => void
  readonly amend: (next: (current: T) => T) => void
  readonly undo: () => void
  readonly redo: () => void
  readonly canUndo: boolean
  readonly canRedo: boolean
}

/** A state with undo and redo, and Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y outside text fields. */
export const useHistory = <T,>(initial: () => T): History<T> => {
  const [state, setState] = useState(() => ({ past: [] as ReadonlyArray<T>, value: initial(), future: [] as ReadonlyArray<T> }))
  const set = useCallback((next: T | ((current: T) => T)) => {
    setState((s) => {
      const value = typeof next === "function" ? (next as (current: T) => T)(s.value) : next
      return value === s.value ? s : { past: [...s.past, s.value].slice(-MAX_UNDO), value, future: [] }
    })
  }, [])
  const begin = useCallback(() => {
    setState((s) => ({ past: [...s.past, s.value].slice(-MAX_UNDO), value: s.value, future: [] }))
  }, [])
  const amend = useCallback((next: (current: T) => T) => {
    setState((s) => ({ ...s, value: next(s.value) }))
  }, [])
  const undo = useCallback(() => {
    setState((s) => {
      // A stroke that changed nothing leaves the same state behind: skip it.
      const past = [...s.past]
      let previous = past.pop()
      while (previous === s.value && past.length > 0) previous = past.pop()
      return previous === undefined || previous === s.value ? s : { past, value: previous, future: [s.value, ...s.future] }
    })
  }, [])
  const redo = useCallback(() => {
    setState((s) => {
      const [next, ...future] = s.future
      return next === undefined ? s : { past: [...s.past, s.value], value: next, future }
    })
  }, [])

  const keys = useRef({ undo, redo })
  keys.current = { undo, redo }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) keys.current.undo()
      else if ((key === "z" && e.shiftKey) || key === "y") keys.current.redo()
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return {
    value: state.value,
    set,
    begin,
    amend,
    undo,
    redo,
    canUndo: state.past.some((p) => p !== state.value),
    canRedo: state.future.length > 0
  }
}
