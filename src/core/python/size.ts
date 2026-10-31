import type { Body, Expr, Stmt } from "./ast.ts"

/**
 * The size of a Python program for the stars of a level, counted like the blocks of the same program in Scratch:
 * a statement is one block, and so are a call, a variable read, `and`, `or`, `not` and an operator in an
 * expression. Numbers and texts are free, as the number fields of blocks are. `while not …:` counts as one
 * «повторити до», and `range(…)` in a `for` as part of «повторити».
 */
export const programSize = (body: Body): number => body.reduce((n, s) => n + statementSize(s), 0)

const statementSize = (s: Stmt): number => {
  switch (s.k) {
    case "expr":
      // A call on its own line is the one block of the statement.
      return s.expr.k === "call" ? callArgsSize(s.expr) + 1 : 1 + exprSize(s.expr)
    case "assign":
    case "augassign":
      return 1 + targetSize(s.target) + exprSize(s.value)
    case "if":
      return 1 + exprSize(s.test) + programSize(s.body) + programSize(s.orelse)
    case "while":
      return 1 + exprSize(s.test.k === "unary" && s.test.op === "not" ? s.test.arg : s.test) + programSize(s.body)
    case "for":
      return 1 + iterableSize(s.iter) + programSize(s.body)
    case "def":
      return 1 + programSize(s.body)
    case "return":
      return 1 + (s.value === null ? 0 : exprSize(s.value))
    case "global":
    case "pass":
      return 0
    case "break":
    case "continue":
      return 1
  }
}

const targetSize = (t: Extract<Expr, { readonly k: "name" } | { readonly k: "index" }>): number =>
  t.k === "name" ? 0 : exprSize(t.object) + exprSize(t.index)

const isRange = (e: Expr): e is Extract<Expr, { readonly k: "call" }> => e.k === "call" && e.fn.k === "name" && e.fn.id === "range"

const iterableSize = (e: Expr): number => (isRange(e) ? callArgsSize(e) : exprSize(e))

const callArgsSize = (e: Extract<Expr, { readonly k: "call" }>): number =>
  e.args.reduce((n, a) => n + exprSize(a), e.fn.k === "attribute" ? exprSize(e.fn.object) - 1 : 0)

const exprSize = (e: Expr): number => {
  switch (e.k) {
    case "number":
    case "string":
    case "constant":
      return 0
    case "name":
      return 1
    case "list":
      return 1 + e.items.reduce((n, x) => n + exprSize(x), 0)
    case "attribute":
      return exprSize(e.object)
    case "index":
      return 1 + exprSize(e.object) + exprSize(e.index)
    case "call":
      return 1 + callArgsSize(e)
    case "unary":
      return (e.op === "-" && e.arg.k === "number" ? 0 : 1) + exprSize(e.arg)
    case "binary":
    case "bool":
      return 1 + exprSize(e.left) + exprSize(e.right)
    case "compare":
      return e.ops.length + e.operands.reduce((n, x) => n + exprSize(x), 0)
  }
}
