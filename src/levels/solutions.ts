import type { Step } from "../core/build.ts"

/** The shortest known solution of each level, for tests and for checking new levels. Keys are level ids. */
export const solutions: Readonly<Record<string, ReadonlyArray<Step>>> = {
  "g3-steps": ["move", "move", "move", "move", "collect"],
  "g3-turn": ["move", "move", "turnRight", "move", "move", "collect"],
  "g3-finish": ["move", "turnRight", "move", "move", "turnLeft", "move", "move", "move"],
  "g4-repeat": [{ repeat: 5, body: ["move", "move", "collect"] }],
  "g4-stairs": [{ repeat: 4, body: ["move", "turnLeft", "move", "turnRight"] }],
  "g4-if": [{ repeat: 8, body: ["move", { if: "onCrystal", then: ["collect"] }] }],
  "g4-until": [{ until: "wallAhead", body: ["move"] }, "collect"],
  "g6-nested": [{ repeat: 4, body: [{ repeat: 3, body: ["move"] }, "collect", "turnRight"] }],
  "g6-maze": [{ until: "atFinish", body: [{ if: "wallAhead", then: ["turnRight"], else: ["move"] }] }]
}
