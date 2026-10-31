import type { BinaryOp, CompareOp, Stmt } from "./ast.ts";
import type { PythonMethod } from "./api.ts";
/** Values of a running program, and the Python rules for them: truth, text, arithmetic and comparison. */
export interface PyList {
    readonly type: "list";
    /** Python lists change in place: `append` and `x[0] = …` change this array. */
    readonly items: Array<Value>;
}
export interface PyFunction {
    readonly type: "function";
    readonly def: Extract<Stmt, {
        readonly k: "def";
    }>;
}
export interface PyBuiltin {
    readonly type: "builtin";
    readonly name: string;
    readonly call: (args: ReadonlyArray<Value>, line: number) => Value;
}
export interface PyHero {
    readonly type: "hero";
}
export interface PyHeroMethod {
    readonly type: "heroMethod";
    readonly method: PythonMethod;
}
export interface PyListMethod {
    readonly type: "listMethod";
    readonly name: "append" | "pop";
    readonly list: PyList;
}
export type Value = number | string | boolean | null | PyList | PyFunction | PyBuiltin | PyHero | PyHeroMethod | PyListMethod;
/** Items one list or text may hold, so a program cannot fill the memory. */
export declare const MAX_ITEMS = 10000;
export declare const list: (items: Array<Value>) => PyList;
export declare const isList: (v: Value) => v is PyList;
export declare const isCallable: (v: Value) => boolean;
/** What a value is, in the words of the messages. */
export declare const typeName: (v: Value) => string;
export declare const truthy: (v: Value) => boolean;
/** `str(v)`, as `print` shows it. */
export declare const str: (v: Value) => string;
/** `repr(v)`: a text in quotes, as it shows inside a list. */
export declare const repr: (v: Value) => string;
export declare const toInt: (v: Value, what: string, line: number) => number;
export declare const binary: (op: BinaryOp, a: Value, b: Value, line: number) => Value;
export declare const equal: (a: Value, b: Value) => boolean;
export declare const compare: (op: CompareOp, a: Value, b: Value, line: number) => boolean;
