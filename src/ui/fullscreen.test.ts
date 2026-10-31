import { describe, expect, test } from "vitest"
import { FULL_SCREEN_HANDOFF_MS, handOffFullScreen, takeFullScreen } from "./fullscreen.ts"

describe("full screen handoff", () => {
  test("a game that closes in full screen gives it to the next game", () => {
    handOffFullScreen(true, 1000)
    expect(takeFullScreen(1500)).toBe(true)
  })

  test("the handoff is taken once", () => {
    handOffFullScreen(true, 1000)
    takeFullScreen(1100)
    expect(takeFullScreen(1200)).toBe(false)
  })

  test("a game that closes outside full screen gives nothing", () => {
    handOffFullScreen(true, 1000)
    handOffFullScreen(false, 1100)
    expect(takeFullScreen(1200)).toBe(false)
  })

  test("a game that opens later does not take it", () => {
    handOffFullScreen(true, 1000)
    expect(takeFullScreen(1000 + FULL_SCREEN_HANDOFF_MS)).toBe(false)
  })
})
