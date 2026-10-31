/**
 * Entry `edu-blocks/core`: levels, the game field and the check of a program. No React and no VM,
 * so a server can use it without scratch-vm.
 */
export * from "./core/blocks.ts"
export * from "./core/build.ts"
export { judgeProgram, MAX_PASSES, MAX_STEPS } from "./core/judge.ts"
export * from "./core/level.ts"
export { checkProgram, MAX_ACTIONS, MAX_FRAMES, MAX_PROGRAM_BLOCKS } from "./core/program.ts"
export type { FailReason, Frame, Program, RunResult } from "./core/program.ts"
export * from "./core/world.ts"
export { levels } from "./levels/index.ts"
export * from "./levels/chapters.ts"
export { solutions } from "./levels/solutions.ts"
export * from "./core/xp.ts"
export { adviseRun, MAX_ADVICE } from "./core/advice.ts"
export * from "./core/kit.ts"
