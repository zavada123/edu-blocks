import { type PyBuiltin } from "./values.ts";
export declare const makeBuiltins: (print: (text: string) => void) => ReadonlyMap<string, PyBuiltin>;
