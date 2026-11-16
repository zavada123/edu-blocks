import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react"
import "./select.css"

// Site-styled replacement for the native `select` element (WAI-ARIA "select-only combobox" pattern),
// ported from EduProstir apps/web/src/components/ui/select.tsx without Tailwind. Focus stays on the
// trigger button; the open list shows the active option through `aria-activedescendant`.
// Keyboard: arrows, Home/End, Enter/Space, Escape, Tab and type-ahead. Touch: tap to open, tap to pick.
// Colors come from the `--edu-select-*` custom properties, which each trainer sets for its theme.

export interface SelectOption<V extends string> {
  readonly value: V
  readonly label: string
  readonly disabled?: boolean
}

const LIST_MAX_HEIGHT_PX = 288
const LIST_GAP_PX = 6
const TYPE_AHEAD_RESET_MS = 600

/** Where the open list stands, in viewport pixels. It opens upward when there is more room above. */
interface ListPlace {
  readonly left: number
  readonly width: number
  readonly top: number | null
  readonly bottom: number | null
}
const listPlace = (rect: DOMRect): ListPlace => {
  const below = window.innerHeight - rect.bottom
  const upward = below < LIST_MAX_HEIGHT_PX && rect.top > below
  return upward
    ? { left: rect.left, width: rect.width, top: null, bottom: window.innerHeight - rect.top + LIST_GAP_PX }
    : { left: rect.left, width: rect.width, top: rect.bottom + LIST_GAP_PX, bottom: null }
}

/** Next enabled option index from `from` in `direction`; stays inside the list. */
const stepEnabled = <V extends string>(options: ReadonlyArray<SelectOption<V>>, from: number, direction: 1 | -1): number => {
  for (let i = from + direction; i >= 0 && i < options.length; i += direction) {
    if (options[i]?.disabled !== true) return i
  }
  return from
}

export function Select<V extends string>(
  props: Readonly<{
    value: V
    options: ReadonlyArray<SelectOption<V>>
    onChange: (value: V) => void
    /** Accessible name when no `<label>` wraps the control. */
    ariaLabel?: string
    className?: string
  }>
) {
  const { options } = props
  const listId = `${useId()}-list`
  const selectedIndex = options.findIndex((o) => o.value === props.value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<ListPlace>({ left: 0, width: 0, top: 0, bottom: null })
  const rootRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: "", at: 0 })

  const openList = (index: number) => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect !== undefined) setPlace(listPlace(rect))
    setActive(index < 0 ? stepEnabled(options, -1, 1) : index)
    setOpen(true)
  }
  const pick = (index: number) => {
    const option = options[index]
    setOpen(false)
    if (option === undefined || option.disabled === true) return
    if (option.value !== props.value) props.onChange(option.value)
  }

  // Close on a press outside, on scroll of the page (the list is fixed to the viewport) and on resize.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) === true) return
      setOpen(false)
    }
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && listRef.current?.contains(event.target) === true) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [open])

  // Keep the active option visible in a long list.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [open, active])

  /** Type-ahead: the next enabled option whose label starts with the typed text. */
  const findTyped = (key: string, now: number): number => {
    const text = (now - typed.current.at > TYPE_AHEAD_RESET_MS ? key : typed.current.text + key).toLowerCase()
    typed.current = { text, at: now }
    const start = open ? active : Math.max(selectedIndex, 0)
    const ordered = [...options.keys()].map((i) => (start + 1 + i) % options.length)
    const found = ordered.find((i) => {
      const option = options[i]
      return option !== undefined && option.disabled !== true && option.label.toLowerCase().startsWith(text)
    })
    return found ?? -1
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event
    const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
    if (!open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        event.preventDefault()
        openList(selectedIndex)
      } else if (key === "Home" || key === "End") {
        event.preventDefault()
        openList(key === "Home" ? stepEnabled(options, -1, 1) : stepEnabled(options, options.length, -1))
      } else if (printable) {
        const found = findTyped(key, event.timeStamp)
        if (found >= 0) openList(found)
      }
      return
    }
    switch (key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault()
        if (event.altKey) return pick(active)
        return setActive(stepEnabled(options, active, key === "ArrowDown" ? 1 : -1))
      case "Home":
        event.preventDefault()
        return setActive(stepEnabled(options, -1, 1))
      case "End":
        event.preventDefault()
        return setActive(stepEnabled(options, options.length, -1))
      case "Enter":
      case " ":
        event.preventDefault()
        return pick(active)
      case "Escape":
        event.preventDefault()
        // Do not let a fullscreen trainer or a dialog take this Escape too.
        event.stopPropagation()
        return setOpen(false)
      case "Tab":
        return pick(active)
    }
    if (printable) {
      const found = findTyped(key, event.timeStamp)
      if (found >= 0) setActive(found)
    }
  }

  const shown = options[selectedIndex]
  return (
    <span ref={rootRef} className={["edu-select", props.className].filter(Boolean).join(" ")}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        className="edu-select-button"
        value={props.value}
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList(selectedIndex))}
        onKeyDown={onKeyDown}
      >
        {/* Every label in one grid cell: the button keeps the width of the longest option, as a native select. */}
        <span className="edu-select-labels">
          {options.map((o) => (
            <span key={o.value} aria-hidden className="edu-select-sizer">
              {o.label}
            </span>
          ))}
          <span className="edu-select-value">{shown?.label ?? ""}</span>
        </span>
        <svg className="edu-select-chevron" viewBox="0 0 24 24" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={props.ariaLabel}
        className="edu-select-list"
        hidden={!open}
        style={{
          left: place.left,
          minWidth: place.width,
          top: place.top ?? undefined,
          bottom: place.bottom ?? undefined
        }}
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${listId}-${i}`}
            data-index={i}
            data-value={o.value}
            role="option"
            aria-selected={i === selectedIndex}
            aria-disabled={o.disabled === true || undefined}
            className={["edu-select-option", i === active ? "is-active" : ""].filter(Boolean).join(" ")}
            // Keep focus on the button: a press on an option must not blur it.
            onPointerDown={(event) => event.preventDefault()}
            onPointerEnter={() => {
              if (o.disabled !== true) setActive(i)
            }}
            onClick={(event) => {
              // A wrapping <label> must not re-open the list by clicking the button.
              event.preventDefault()
              pick(i)
              buttonRef.current?.focus()
            }}
          >
            <span className="edu-select-text">{o.label}</span>
            {i === selectedIndex && (
              <svg className="edu-select-check" viewBox="0 0 24 24" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </span>
  )
}
