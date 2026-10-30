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
  "g5-spirit": ["move", "attack", { repeat: 5, body: ["move"] }],
  "g5-glade": [
    "move", "turnRight", "move", "move", "collect",
    "turnLeft", "move", "attack", "move", "move", "move",
    "turnLeft", "move", "collect",
    "turnRight", "turnRight", "move", "move", "move", "collect"
  ],
  "g5-guards": [{ repeat: 9, body: [{ if: "enemyAhead", then: ["attack"], else: ["move"] }] }],
  "g6-nested": [{ repeat: 4, body: [{ repeat: 3, body: ["move"] }, "collect", "turnRight"] }],
  "g6-maze": [{ until: "atFinish", body: [{ if: "wallAhead", then: ["turnLeft"], else: ["move"] }] }],
  "g3-gate": ["move", "move", "turnLeft", "move", "move"],
  "g3-logs": ["move", "move", "collect", "move", "move", "move", "turnRight", "move", "move", "collect"],
  "g3-zigzag": ["move", "turnRight", "move", "turnLeft", "move", "turnRight", "move", "turnLeft", "move", "turnRight", "move", "turnLeft", "move"],
  "g4-road": [{ repeat: 11, body: ["move"] }],
  "g4-corner": [{ repeat: 6, body: ["move"] }, "turnRight", { repeat: 4, body: ["move"] }, "collect"],
  "g4-sled": [{ repeat: 5, body: ["move", "turnRight", "move", "turnLeft"] }, "move"],
  "g4-fence": [
    { repeat: 6, body: ["move", { if: "onCrystal", then: ["collect"] }] },
    "turnRight",
    { repeat: 4, body: ["move", { if: "onCrystal", then: ["collect"] }] }
  ],
  "g5-snake": [{ repeat: 14, body: [{ if: "wallAhead", then: ["turnRight"], else: ["move"] }] }],
  "g5-bridge": [{ until: "wallAhead", body: ["move"] }, "turnRight", { until: "wallAhead", body: ["move"] }, "collect"],
  "g5-way-home": [{ until: "atFinish", body: ["move", { if: "onCrystal", then: ["collect"] }] }],
  "g6-spiral": [{ until: "atFinish", body: [{ if: "wallAhead", then: ["turnRight"], else: ["move"] }] }],
  "g6-bear": [
    { until: "enemyAhead", body: ["move"] },
    { repeat: 3, body: ["attack"] },
    { until: "atFinish", body: [{ if: "wallAhead", then: ["turnRight"], else: ["move"] }] }
  ]
}
