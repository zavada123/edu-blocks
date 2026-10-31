import type { BinaryOp, Body, CompareOp, Expr, Stmt, Target } from "./ast.ts"
import { PyError } from "./errors.ts"
import { KEYWORDS, type Token, tokenize, UNSUPPORTED } from "./lexer.ts"

/**
 * Builds the tree of a program from its tokens: the part of Python this course uses. Variables, numbers, texts,
 * lists, `if/elif/else`, `while`, `for … in`, functions with `def` and `return`, `and/or/not`, comparisons.
 */

const AUGMENTED: Readonly<Record<string, BinaryOp>> = { "+=": "+", "-=": "-", "*=": "*", "/=": "/", "//=": "//", "%=": "%" }
const COMPARE: ReadonlySet<string> = new Set(["==", "!=", "<", ">", "<=", ">="])

export const parse = (source: string): Body => new Parser(tokenize(source)).program()

class Parser {
  private pos = 0
  /** Loops and functions around the statement being read: `break` needs a loop, `return` a function. */
  private loops = 0
  private functions = 0

  constructor(private readonly tokens: ReadonlyArray<Token>) {}

  program(): Body {
    const body: Array<Stmt> = []
    while (this.peek().kind !== "eof") body.push(...this.statement())
    return body
  }

  // Tokens

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)] as Token
  }

  private next(): Token {
    const token = this.peek()
    if (this.pos < this.tokens.length - 1) this.pos++
    return token
  }

  private is(value: string, kind?: Token["kind"]): boolean {
    const token = this.peek()
    return token.value === value && (kind === undefined ? token.kind === "op" || token.kind === "keyword" : token.kind === kind)
  }

  private accept(value: string): boolean {
    if (!this.is(value)) return false
    this.next()
    return true
  }

  private expect(value: string, message: string): Token {
    if (!this.is(value)) throw new PyError(message, this.peek().line)
    return this.next()
  }

  private name(message: string): string {
    const token = this.peek()
    if (token.kind !== "name") throw new PyError(message, token.line)
    this.next()
    return token.value
  }

  // Statements

  private statement(): ReadonlyArray<Stmt> {
    const token = this.peek()
    if (token.kind === "indent") throw new PyError("Зайвий відступ: цей рядок зсунутий, хоча не стоїть усередині if, while, for чи def", token.line)
    if (token.kind === "keyword") {
      switch (token.value) {
        case "if":
          return [this.ifStatement()]
        case "while":
          return [this.whileStatement()]
        case "for":
          return [this.forStatement()]
        case "def":
          return [this.defStatement()]
        case "elif":
        case "else":
          throw new PyError(`«${token.value}» стоїть без «if» над ним: перевір відступи`, token.line)
      }
    }
    return this.simpleLine()
  }

  /** Simple statements up to the end of the line. */
  private simpleLine(): ReadonlyArray<Stmt> {
    const statements = [this.simple()]
    while (this.accept(";")) if (this.peek().kind !== "newline") statements.push(this.simple())
    this.endOfLine(statements.at(-1))
    return statements
  }

  private endOfLine(last: Stmt | undefined) {
    const token = this.peek()
    if (token.kind === "newline") {
      this.next()
      return
    }
    if (token.kind === "eof" || token.kind === "dedent") return
    if (last?.k === "expr" && last.expr.k === "name" && KEYWORDS.has(last.expr.id.toLowerCase())) {
      throw new PyError(`Python розрізняє великі й малі літери: пиши «${last.expr.id.toLowerCase()}»`, token.line)
    }
    if (token.value === "=") throw new PyError("Ліворуч від «=» має бути ім'я змінної", token.line)
    throw new PyError(`Незрозуміло, що тут робить «${token.value}»: може, бракує дужки чи коми?`, token.line)
  }

  private simple(): Stmt {
    const token = this.peek()
    const line = token.line
    if (token.kind === "keyword") {
      switch (token.value) {
        case "pass":
          this.next()
          return { k: "pass", line }
        case "break":
        case "continue":
          if (this.loops === 0) throw new PyError(`«${token.value}» працює тільки всередині циклу while або for`, line)
          this.next()
          return { k: token.value, line }
        case "return": {
          if (this.functions === 0) throw new PyError("«return» працює тільки всередині функції (def)", line)
          this.next()
          const ends = this.peek().kind === "newline" || this.peek().kind === "eof" || this.is(";")
          return { k: "return", value: ends ? null : this.expression(), line }
        }
        case "global": {
          this.next()
          const names = [this.name("Після global напиши ім'я змінної")]
          while (this.accept(",")) names.push(this.name("Після коми напиши ім'я змінної"))
          return { k: "global", names, line }
        }
      }
    }
    const expr = this.expression()
    if (this.is("=")) {
      this.next()
      return { k: "assign", target: this.target(expr), value: this.expression(), line }
    }
    const augmented = AUGMENTED[this.peek().value]
    if (augmented !== undefined && this.peek().kind === "op") {
      this.next()
      return { k: "augassign", target: this.target(expr), op: augmented, value: this.expression(), line }
    }
    return { k: "expr", expr, line }
  }

  private target(expr: Expr): Target {
    if (expr.k === "name" || expr.k === "index") return expr
    if (expr.k === "call") throw new PyError("Виклику не можна нічого присвоїти: ліворуч від «=» має бути ім'я змінної", expr.line)
    throw new PyError("Ліворуч від «=» має бути ім'я змінної", expr.line)
  }

  /** The `:` and the indented lines after a header, or simple statements on the same line. */
  private block(header: string): Body {
    const colon = this.peek()
    if (colon.value === "=" && colon.kind === "op") throw new PyError("Для порівняння пиши «==», а не «=»", colon.line)
    if (!this.accept(":")) throw new PyError(`Після «${header}» потрібна двокрапка «:» в кінці рядка`, colon.line)
    if (this.peek().kind !== "newline") return this.simpleLine()
    const line = this.next().line
    if (this.peek().kind !== "indent") {
      throw new PyError(`Після «${header} …:» рядки всередині треба зсунути вправо на 4 пробіли`, this.peek().kind === "eof" ? line : this.peek().line)
    }
    this.next()
    const body: Array<Stmt> = []
    while (this.peek().kind !== "dedent" && this.peek().kind !== "eof") body.push(...this.statement())
    if (this.peek().kind === "dedent") this.next()
    return body
  }

  private loopBlock(header: string): Body {
    this.loops++
    const body = this.block(header)
    this.loops--
    return body
  }

  private ifStatement(): Stmt {
    const line = this.next().line
    const test = this.condition("if")
    const body = this.block("if")
    return { k: "if", test, body, orelse: this.elseBranch(), line }
  }

  private elseBranch(): Body {
    if (this.is("elif")) {
      const line = this.next().line
      const test = this.condition("elif")
      const body = this.block("elif")
      return [{ k: "if", test, body, orelse: this.elseBranch(), line }]
    }
    if (!this.is("else")) return []
    this.next()
    if (this.is("if")) throw new PyError("Пиши «elif» замість «else if»", this.peek().line)
    return this.block("else")
  }

  private condition(header: string): Expr {
    if (this.is(":")) throw new PyError(`Після «${header}» напиши умову, а потім двокрапку`, this.peek().line)
    return this.expression()
  }

  private whileStatement(): Stmt {
    const line = this.next().line
    const test = this.condition("while")
    return { k: "while", test, body: this.loopBlock("while"), line }
  }

  private forStatement(): Stmt {
    const line = this.next().line
    const target = this.name("Після for напиши ім'я змінної: for i in range(5):")
    this.expect("in", "У циклі for після змінної потрібне слово «in»: for i in range(5):")
    const iter = this.condition("in")
    return { k: "for", target, iter, body: this.loopBlock("for"), line }
  }

  private defStatement(): Stmt {
    const line = this.next().line
    const name = this.name("Після def напиши ім'я функції: def обійти():")
    this.expect("(", `Після імені функції потрібні дужки: def ${name}():`)
    const params: Array<string> = []
    if (!this.is(")")) {
      do params.push(this.name("У дужках функції пишуть імена параметрів через кому"))
      while (this.accept(","))
    }
    this.expect(")", "Закрий дужку після параметрів функції")
    const loops = this.loops
    this.loops = 0
    this.functions++
    const body = this.block("def")
    this.functions--
    this.loops = loops
    return { k: "def", name, params, body, locals: localsOf(body, params), line }
  }

  // Expressions

  expression(): Expr {
    return this.or()
  }

  private or(): Expr {
    let left = this.and()
    while (this.is("or")) {
      const line = this.next().line
      left = { k: "bool", op: "or", left, right: this.and(), line }
    }
    return left
  }

  private and(): Expr {
    let left = this.not()
    while (this.is("and")) {
      const line = this.next().line
      left = { k: "bool", op: "and", left, right: this.not(), line }
    }
    return left
  }

  private not(): Expr {
    if (!this.is("not")) return this.comparison()
    const line = this.next().line
    return { k: "unary", op: "not", arg: this.not(), line }
  }

  private comparison(): Expr {
    const first = this.sum()
    const ops: Array<CompareOp> = []
    const operands: Array<Expr> = [first]
    for (;;) {
      const token = this.peek()
      if (token.kind === "op" && COMPARE.has(token.value)) ops.push(this.next().value as CompareOp)
      else if (this.is("in")) {
        this.next()
        ops.push("in")
      }
      else if (this.is("not") && this.peek(1).value === "in") {
        this.next()
        this.next()
        ops.push("not in")
      } else break
      operands.push(this.sum())
    }
    return ops.length === 0 ? first : { k: "compare", ops, operands, line: first.line }
  }

  private sum(): Expr {
    let left = this.term()
    while (this.is("+") || this.is("-")) {
      const token = this.next()
      left = { k: "binary", op: token.value as BinaryOp, left, right: this.term(), line: token.line }
    }
    return left
  }

  private term(): Expr {
    let left = this.factor()
    while (this.is("*") || this.is("/") || this.is("//") || this.is("%")) {
      const token = this.next()
      left = { k: "binary", op: token.value as BinaryOp, left, right: this.factor(), line: token.line }
    }
    return left
  }

  private factor(): Expr {
    if (this.is("-") || this.is("+")) {
      const token = this.next()
      return { k: "unary", op: token.value as "-" | "+", arg: this.factor(), line: token.line }
    }
    const base = this.primary()
    if (!this.is("**")) return base
    const line = this.next().line
    return { k: "binary", op: "**", left: base, right: this.factor(), line }
  }

  private primary(): Expr {
    let expr = this.atom()
    for (;;) {
      const line = this.peek().line
      if (this.accept("(")) expr = { k: "call", fn: expr, args: this.items(")", "Закрий дужку виклику: «)»"), line }
      else if (this.accept(".")) expr = { k: "attribute", object: expr, name: this.name("Після крапки напиши ім'я методу: hero.move()"), line }
      else if (this.accept("[")) {
        const index = this.expression()
        this.expect("]", "Закрий квадратну дужку: «]»")
        expr = { k: "index", object: expr, index, line }
      } else return expr
    }
  }

  /** Expressions separated by commas up to the closing bracket, which is taken too. */
  private items(close: string, message: string): ReadonlyArray<Expr> {
    const items: Array<Expr> = []
    while (!this.is(close)) {
      items.push(this.expression())
      if (!this.accept(",")) break
    }
    this.expect(close, message)
    return items
  }

  private atom(): Expr {
    const token = this.peek()
    const line = token.line
    switch (token.kind) {
      case "number":
        this.next()
        return { k: "number", value: Number(token.value), line }
      case "string":
        this.next()
        return { k: "string", value: token.value, line }
      case "name":
        if (UNSUPPORTED.has(token.value)) throw new PyError(`Слово «${token.value}» у цьому курсі ще не знадобиться`, line)
        this.next()
        return { k: "name", id: token.value, line }
      case "keyword":
        if (token.value === "True" || token.value === "False" || token.value === "None") {
          this.next()
          return { k: "constant", value: token.value === "None" ? null : token.value === "True", line }
        }
        throw new PyError(`Тут очікувалося значення, а стоїть «${token.value}»`, line)
      case "op":
        return this.bracketed(token)
      default:
        throw new PyError("Рядок обірвався: після цього знака має щось бути", line)
    }
  }

  private bracketed(token: Token): Expr {
    if (token.value === "(") {
      this.next()
      const inner = this.expression()
      this.expect(")", "Закрий дужку: «)»")
      return inner
    }
    if (token.value === "[") {
      this.next()
      return { k: "list", items: this.items("]", "Закрий список дужкою «]»"), line: token.line }
    }
    throw new PyError(`Тут очікувалося значення, а стоїть «${token.value}»`, token.line)
  }
}

/** The names a function assigns, as Python finds them: they belong to the function unless declared `global`. */
const localsOf = (body: Body, params: ReadonlyArray<string>): ReadonlySet<string> => {
  const assigned = new Set<string>(params)
  const globals = new Set<string>()
  const walk = (statements: Body) => {
    for (const s of statements) {
      if ((s.k === "assign" || s.k === "augassign") && s.target.k === "name") assigned.add(s.target.id)
      else if (s.k === "for") {
        assigned.add(s.target)
        walk(s.body)
      } else if (s.k === "def") assigned.add(s.name)
      else if (s.k === "global") for (const n of s.names) globals.add(n)
      else if (s.k === "if") {
        walk(s.body)
        walk(s.orelse)
      } else if (s.k === "while") walk(s.body)
    }
  }
  walk(body)
  for (const g of globals) assigned.delete(g)
  return assigned
}
