import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"
import { startWorld } from "../core/level.ts"
import { levels } from "../levels/index.ts"
import { GameScreen } from "./GameScreen.tsx"
import type { Player } from "./Timeline.tsx"

const idle = (): void => undefined

const player: Player = {
  time: 0,
  playing: false,
  rate: 1,
  play: idle,
  pause: idle,
  seek: idle,
  step: idle,
  setRate: idle,
  restart: idle
}

const screen = (): string => {
  const level = levels[0]
  if (level === undefined) throw new Error("no levels")
  return renderToStaticMarkup(
    createElement(GameScreen, {
      rootRef: null,
      className: "eb-root",
      level,
      start: startWorld(level),
      result: null,
      player,
      skin: "ninja",
      running: false,
      editing: true,
      full: false,
      xpTotal: 0,
      navigation: { onMap: idle, progress: undefined, onSkinChange: idle },
      editorTitle: "Блоки героя",
      onRun: idle,
      onReset: idle,
      onFull: idle,
      verdict: null,
      children: createElement("p", null, "editor")
    })
  )
}

describe("GameScreen", () => {
  test("has no landmarks, so two games on one page do not repeat them", () => {
    const html = screen()
    expect(html).not.toMatch(/<(section|aside|nav|main)[\s>]/)
    expect(html).not.toContain('role="region"')
  })

  test("names its parts as groups", () => {
    const html = screen()
    expect(html).toContain('role="group" aria-label="Поле"')
    expect(html).toContain('role="group" aria-label="Завдання"')
    expect(html).toContain('role="group" aria-label="Блоки героя"')
  })
})
