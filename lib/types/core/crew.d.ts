import { type ProgramSteps, type Stage } from "./hero.ts";
import { type Level } from "./level.ts";
import { type RunResult } from "./program.ts";
/**
 * A crew: the hero and the helpers of the level (`Level.helpers`), each with its own program, on one map. A turn of
 * the day asks every worker for one action, the hero first, then the enemies, the towers and the crops take their
 * turn once. The programs run side by side as `ProgramSteps`: each gives the turn away after its action.
 *
 * The workers do not stand in each other's way. A worker who walks into a fence stops for the rest of the day and
 * the others go on; the day ends when its turns are spent, when every program has stopped, or when the enemies took
 * the hero's hearts.
 */
/** A worker's program on its stage, ready to run: `blocksRun` or `pythonRun` with the program given. */
export type CrewProgram = (stage: Stage) => ProgramSteps;
/**
 * Runs the day of a crew: `programs[0]` is the hero's, the next ones the helpers', in the order of `level.helpers`.
 * The result is the hero's run with a frame for each turn (`Frame.crew` has the helpers' actions) and every
 * worker's own run in `workers`.
 */
export declare const runCrew: (level: Level, programs: ReadonlyArray<CrewProgram>) => RunResult;
