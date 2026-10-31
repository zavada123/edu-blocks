/**
 * Entry `edu-blocks/python`: the game with Python code instead of blocks. It does not load scratch-blocks or the VM.
 * Its styles are in `edu-blocks/style.css`; the check of a program is `judgePython` in `edu-blocks/core`.
 */
export { EduPython, starterSource } from "./ui/EduPython.tsx";
export type { EduPythonProps, PythonReport } from "./ui/EduPython.tsx";
export type { HeroXp } from "./ui/Verdict.tsx";
export type { Skin } from "./ui/stage/Stage.tsx";
