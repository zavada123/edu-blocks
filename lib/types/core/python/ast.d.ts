/** The tree of a Python program, as the parser builds it. Every node keeps its line for messages and highlighting. */
export type BinaryOp = "+" | "-" | "*" | "/" | "//" | "%" | "**";
export type CompareOp = "==" | "!=" | "<" | ">" | "<=" | ">=" | "in" | "not in";
export type Expr = {
    readonly k: "number";
    readonly value: number;
    readonly line: number;
} | {
    readonly k: "string";
    readonly value: string;
    readonly line: number;
} | {
    readonly k: "constant";
    readonly value: boolean | null;
    readonly line: number;
} | {
    readonly k: "name";
    readonly id: string;
    readonly line: number;
} | {
    readonly k: "list";
    readonly items: ReadonlyArray<Expr>;
    readonly line: number;
} | {
    readonly k: "attribute";
    readonly object: Expr;
    readonly name: string;
    readonly line: number;
} | {
    readonly k: "index";
    readonly object: Expr;
    readonly index: Expr;
    readonly line: number;
} | {
    readonly k: "call";
    readonly fn: Expr;
    readonly args: ReadonlyArray<Expr>;
    readonly line: number;
} | {
    readonly k: "unary";
    readonly op: "-" | "+" | "not";
    readonly arg: Expr;
    readonly line: number;
} | {
    readonly k: "binary";
    readonly op: BinaryOp;
    readonly left: Expr;
    readonly right: Expr;
    readonly line: number;
} | {
    readonly k: "bool";
    readonly op: "and" | "or";
    readonly left: Expr;
    readonly right: Expr;
    readonly line: number;
} | {
    readonly k: "compare";
    readonly ops: ReadonlyArray<CompareOp>;
    readonly operands: ReadonlyArray<Expr>;
    readonly line: number;
};
/** What an assignment can change: a variable or an item of a list. */
export type Target = Extract<Expr, {
    readonly k: "name";
} | {
    readonly k: "index";
}>;
export type Body = ReadonlyArray<Stmt>;
export type Stmt = {
    readonly k: "expr";
    readonly expr: Expr;
    readonly line: number;
} | {
    readonly k: "assign";
    readonly target: Target;
    readonly value: Expr;
    readonly line: number;
} | {
    readonly k: "augassign";
    readonly target: Target;
    readonly op: BinaryOp;
    readonly value: Expr;
    readonly line: number;
} | {
    readonly k: "if";
    readonly test: Expr;
    readonly body: Body;
    readonly orelse: Body;
    readonly line: number;
} | {
    readonly k: "while";
    readonly test: Expr;
    readonly body: Body;
    readonly line: number;
} | {
    readonly k: "for";
    readonly target: string;
    readonly iter: Expr;
    readonly body: Body;
    readonly line: number;
} | {
    readonly k: "def";
    readonly name: string;
    readonly params: ReadonlyArray<string>;
    readonly body: Body;
    /** Names the function assigns and does not declare `global`: they are its own, as in Python. */
    readonly locals: ReadonlySet<string>;
    readonly line: number;
} | {
    readonly k: "return";
    readonly value: Expr | null;
    readonly line: number;
} | {
    readonly k: "global";
    readonly names: ReadonlyArray<string>;
    readonly line: number;
} | {
    readonly k: "pass" | "break" | "continue";
    readonly line: number;
};
