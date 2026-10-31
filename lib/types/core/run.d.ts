import VirtualMachine from "scratch-vm";
import type { Level } from "./level.ts";
import { type Program, type RunResult, type Session } from "./program.ts";
/** A project with the stage and one sprite whose blocks are the program. */
export declare const projectFor: (program: Program) => object;
export declare const withVmLock: <T>(work: () => Promise<T>) => Promise<T>;
/** Lets the VM finish registering extension blocks (it does this in a promise). */
export declare const settle: () => Promise<unknown>;
export declare const createVm: (level: Level | null, session: Session | null) => VirtualMachine;
/** Runs the program on the level from the start hat «коли натиснуто прапорець» and checks the goals. */
export declare const runProgram: (level: Level, program: Program) => Promise<RunResult>;
