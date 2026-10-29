/** Entry `edu-blocks/core`: levels, the game field and the run of a program in the VM. No React, so a server can use it. */
export * from "./core/blocks.ts"
export * from "./core/build.ts"
export * from "./core/level.ts"
export { checkProgram, MAX_ACTIONS, MAX_FRAMES, MAX_PROGRAM_BLOCKS, runProgram } from "./core/run.ts"
export type { FailReason, Frame, Program, RunResult } from "./core/run.ts"
export * from "./core/world.ts"
export { levels } from "./levels/index.ts"
export { solutions } from "./levels/solutions.ts"
