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

const screen = (onLevel: ((levelId: string) => void) | undefined = undefined): string => {
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
      coinsTotal: undefined,
      navigation: { onMap: idle, onLevel, progress: undefined, onSkinChange: idle, ownedHeroes: undefined, onBuyHero: undefined },
      editorTitle: "Блоки героя",
      fields: null,
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

  test("the squares of the chapter are only a picture when the app cannot open a level", () => {
    const html = screen()
    expect(html).not.toContain("eb-hud-dot-go")
  })

  test("the other squares of the chapter are buttons when the app can open a level", () => {
    const html = screen(idle)
    const buttons = html.match(/<button[^>]*eb-hud-dot-go[^>]*>/g) ?? []
    const count = html.match(/<li[^>]*eb-hud-dot/g)?.length ?? 0
    expect(buttons.length).toBeGreaterThan(0)
    // The level on the screen stays a square, not a button.
    expect(count).toBe(1)
    expect(html).toContain('aria-current="step"')
  })
})
