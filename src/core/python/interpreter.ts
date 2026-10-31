import type { Sensor } from "../hero.ts"
import type { Action } from "../world.ts"
import { HERO_NAME, MAX_MOVE_STEPS, PYTHON_METHODS, type PythonMethod } from "./api.ts"
import type { Body, Expr, Stmt, Target } from "./ast.ts"
import { makeBuiltins } from "./builtins.ts"
import { closest, PyError } from "./errors.ts"
import { KEYWORDS } from "./lexer.ts"
import {
  binary,
  compare,
  isCallable,
  isList,
  list,
  MAX_ITEMS,
  type PyFunction,
  type PyList,
  repr,
  toInt,
  truthy,
  typeName,
  type Value
} from "./values.ts"

/**
 * Runs the tree of a program. Synchronous and pure apart from the host, so the browser and the server get the same
 * run. Every statement and expression is a step; a program that takes too many stops, so an endless loop cannot
 * hang a tab or the server.
 */

/** Steps of the interpreter in one run. A course program needs a few thousand. */
export const MAX_PY_STEPS = 200_000
/** Functions running inside each other. */
export const MAX_PY_DEPTH = 100

/** What the program can reach outside itself: the hero, and the output of `print`. */
export interface PyHost {
  /** The hero acts. Throws `Halt` when the run is over. `globals` are the program's variables at this moment. */
  readonly act: (action: Action, line: number, globals: ReadonlyMap<string, Value>) => void
  readonly sense: (sensor: Sensor) => boolean
  /** Whether the level opens this method. */
  readonly allows: (method: PythonMethod) => boolean
  readonly print: (text: string) => void
}

/** The run stops with no error: the hero is done, or the program ran too long. */
export class Halt {
  constructor(readonly tooLong: boolean) {}
}

class BreakSignal {}
class ContinueSignal {}
class ReturnSignal {
  constructor(readonly value: Value) {}
}

interface Scope {
  readonly vars: Map<string, Value>
  readonly own: ReadonlySet<string>
}

const HERO: Value = { type: "hero" }
const METHOD_NAMES = PYTHON_METHODS.map((m) => m.name)

export const execute = (program: Body, host: PyHost): void => new Interpreter(host).run(program)

class Interpreter {
  private steps = 0
  private depth = 0
  private readonly globals = new Map<string, Value>([[HERO_NAME, HERO]])
  private readonly builtins: ReadonlyMap<string, Value>
  private scope: Scope | null = null

  constructor(private readonly host: PyHost) {
    this.builtins = makeBuiltins(host.print)
  }

  run(program: Body) {
    try {
      this.block(program)
    } catch (signal) {
      if (signal instanceof BreakSignal || signal instanceof ContinueSignal) throw new PyError("break і continue працюють тільки всередині циклу", 1)
      if (signal instanceof ReturnSignal) throw new PyError("return працює тільки всередині функції", 1)
      throw signal
    }
  }

  private tick() {
    if (++this.steps > MAX_PY_STEPS) throw new Halt(true)
  }

  // Statements

  private block(body: Body) {
    for (const s of body) this.statement(s)
  }

  private statement(s: Stmt) {
    this.tick()
    switch (s.k) {
      case "expr":
        return this.expressionStatement(s.expr)
      case "assign":
        return this.assign(s.target, this.eval(s.value))
      case "augassign":
        return this.assign(s.target, binary(s.op, this.eval(s.target), this.eval(s.value), s.line))
      case "if":
        return this.block(truthy(this.eval(s.test)) ? s.body : s.orelse)
      case "while":
        return this.whileLoop(s)
      case "for":
        return this.forLoop(s)
      case "def":
        return this.assign({ k: "name", id: s.name, line: s.line }, { type: "function", def: s })
      case "return":
        if (this.scope === null) throw new PyError("return працює тільки всередині функції", s.line)
        throw new ReturnSignal(s.value === null ? null : this.eval(s.value))
      case "break":
        throw new BreakSignal()
      case "continue":
        throw new ContinueSignal()
      case "global":
        if (this.scope === null) throw new PyError("global пишуть тільки всередині функції", s.line)
        return
      case "pass":
        return
    }
  }

  private expressionStatement(expr: Expr) {
    const value = this.eval(expr)
    if (expr.k !== "call" && isCallable(value)) {
      const shown = expr.k === "attribute" ? `${HERO_NAME}.${expr.name}` : expr.k === "name" ? expr.id : "функцію"
      throw new PyError(`Щоб виконати ${shown}, додай дужки: ${shown}()`, expr.line)
    }
  }

  /** Runs a loop body. False when the loop must stop (`break`). */
  private loopBody(body: Body): boolean {
    try {
      this.block(body)
    } catch (signal) {
      if (signal instanceof BreakSignal) return false
      if (!(signal instanceof ContinueSignal)) throw signal
    }
    return true
  }

  private whileLoop(s: Extract<Stmt, { readonly k: "while" }>) {
    while (truthy(this.eval(s.test))) {
      this.tick()
      if (!this.loopBody(s.body)) return
    }
  }

  private forLoop(s: Extract<Stmt, { readonly k: "for" }>) {
    const iterable = this.eval(s.iter)
    const items = typeof iterable === "string" ? [...iterable] : isList(iterable) ? [...iterable.items] : null
    if (items === null) throw new PyError(`for проходить по списку, тексту чи range(…), а тут ${typeName(iterable)}: може, range(${repr(iterable)})?`, s.line)
    for (const item of items) {
      this.tick()
      this.assign({ k: "name", id: s.target, line: s.line }, item)
      if (!this.loopBody(s.body)) return
    }
  }

  private assign(target: Target, value: Value) {
    if (target.k === "index") {
      const [items, index] = this.item(target)
      items.items[index] = value
      return
    }
    if (target.id === HERO_NAME) throw new PyError(`Ім'я ${HERO_NAME} зайняте героєм: візьми для змінної інше`, target.line)
    if (this.scope !== null && this.scope.own.has(target.id)) this.scope.vars.set(target.id, value)
    else this.globals.set(target.id, value)
  }

  // Expressions

  private eval(e: Expr): Value {
    this.tick()
    switch (e.k) {
      case "number":
      case "string":
      case "constant":
        return e.value
      case "name":
        return this.lookup(e.id, e.line)
      case "list":
        return list(e.items.map((x) => this.eval(x)))
      case "attribute":
        return this.attribute(this.eval(e.object), e.name, e.line)
      case "index": {
        const [items, index] = this.item(e)
        return items.items[index] ?? null
      }
      case "call":
        return this.call(this.eval(e.fn), e.args.map((a) => this.eval(a)), e.line)
      case "unary":
        return this.unary(e.op, this.eval(e.arg), e.line)
      case "binary":
        return binary(e.op, this.eval(e.left), this.eval(e.right), e.line)
      case "bool": {
        const left = this.eval(e.left)
        return (e.op === "and" ? truthy(left) : !truthy(left)) ? this.eval(e.right) : left
      }
      case "compare":
        return this.chain(e)
    }
  }

  private unary(op: "-" | "+" | "not", v: Value, line: number): Value {
    if (op === "not") return !truthy(v)
    if (typeof v !== "number" && typeof v !== "boolean") throw new PyError(`Знак «${op}» ставлять перед числом, а тут ${typeName(v)}`, line)
    return op === "-" ? -Number(v) : Number(v)
  }

  private chain(e: Extract<Expr, { readonly k: "compare" }>): Value {
    let left = this.eval(e.operands[0] as Expr)
    for (let i = 0; i < e.ops.length; i++) {
      const right = this.eval(e.operands[i + 1] as Expr)
      if (!compare(e.ops[i] ?? "==", left, right, e.line)) return false
      left = right
    }
    return true
  }

  /** The list and the index of `x[i]`; a negative index counts from the end, as in Python. */
  private item(e: Extract<Expr, { readonly k: "index" }>): [PyList, number] {
    const container = this.eval(e.object)
    if (!isList(container)) throw new PyError(`Квадратні дужки [ ] беруть елемент списку, а тут ${typeName(container)}`, e.line)
    const raw = toInt(this.eval(e.index), "Номер елемента", e.line)
    const index = raw < 0 ? container.items.length + raw : raw
    if (index < 0 || index >= container.items.length) {
      throw new PyError(`У списку немає елемента з номером ${raw}: номери від 0 до ${container.items.length - 1}`, e.line)
    }
    return [container, index]
  }

  private lookup(name: string, line: number): Value {
    const scope = this.scope
    if (scope !== null && scope.own.has(name)) {
      const value = scope.vars.get(name)
      if (value === undefined) throw new PyError(`Змінна «${name}» у функції ще не має значення: задай його вище або напиши global ${name}`, line)
      return value
    }
    const value = this.globals.get(name) ?? this.builtins.get(name)
    if (value !== undefined) return value
    throw new PyError(this.unknownName(name), line)
  }

  private unknownName(name: string): string {
    const lower = name.toLowerCase()
    if (lower === "true" || lower === "false" || lower === "none") return `Пиши ${lower[0]?.toUpperCase()}${lower.slice(1)} з великої літери`
    if (KEYWORDS.has(lower)) return `Python розрізняє великі й малі літери: пиши «${lower}»`
    const known = [...this.globals.keys(), ...(this.scope?.vars.keys() ?? []), ...this.builtins.keys()]
    const guess = closest(name, known)
    const tail = guess === null ? "задай її значення вище, перш ніж брати" : `може, ${guess}?`
    return `Python не знає імені «${name}»: ${tail}`
  }

  private attribute(object: Value, name: string, line: number): Value {
    if (isList(object) && (name === "append" || name === "pop")) return { type: "listMethod", name, list: object }
    if (typeof object !== "object" || object === null || object.type !== "hero") {
      throw new PyError(`У значення типу «${typeName(object)}» немає «.${name}»`, line)
    }
    const method = PYTHON_METHODS.find((m) => m.name === name)
    if (method === undefined) {
      const guess = closest(name, METHOD_NAMES)
      throw new PyError(`Герой не вміє ${HERO_NAME}.${name}()${guess === null ? "" : `: може, ${HERO_NAME}.${guess}()?`}`, line)
    }
    if (!this.host.allows(method)) throw new PyError(`На цьому рівні ${HERO_NAME}.${name}() ще не відкрито`, line)
    return { type: "heroMethod", method }
  }

  // Calls

  private call(fn: Value, args: ReadonlyArray<Value>, line: number): Value {
    if (typeof fn !== "object" || fn === null || fn.type === "list" || fn.type === "hero") {
      throw new PyError(`${repr(fn)} — це ${typeName(fn)}, а не функція: дужки () після нього зайві`, line)
    }
    switch (fn.type) {
      case "builtin":
        return fn.call(args, line)
      case "function":
        return this.callFunction(fn, args, line)
      case "heroMethod":
        return this.heroCall(fn.method, args, line)
      case "listMethod":
        return this.listCall(fn.name, fn.list, args, line)
    }
  }

  private callFunction(fn: PyFunction, args: ReadonlyArray<Value>, line: number): Value {
    const { def } = fn
    if (args.length !== def.params.length) {
      throw new PyError(`Функція ${def.name}() чекає ${def.params.length} значень у дужках, а отримала ${args.length}`, line)
    }
    if (this.depth >= MAX_PY_DEPTH) throw new PyError(`Функція ${def.name}() викликає себе забагато разів`, line)
    const saved = this.scope
    this.scope = { vars: new Map(def.params.map((p, i) => [p, args[i] ?? null])), own: def.locals }
    this.depth++
    try {
      this.block(def.body)
      return null
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value
      if (signal instanceof BreakSignal || signal instanceof ContinueSignal) {
        throw new PyError(`break і continue працюють тільки всередині циклу, а не просто у функції ${def.name}()`, line)
      }
      throw signal
    } finally {
      this.depth--
      this.scope = saved
    }
  }

  private heroCall(method: PythonMethod, args: ReadonlyArray<Value>, line: number): Value {
    if (method.sensor !== undefined) {
      if (args.length > 0) throw new PyError(`${HERO_NAME}.${method.name}() нічого не приймає в дужках`, line)
      return this.host.sense(method.sensor)
    }
    const action = method.action as Action
    if (action !== "move" && args.length > 0) throw new PyError(`${HERO_NAME}.${method.name}() нічого не приймає в дужках`, line)
    if (args.length > 1) throw new PyError(`${HERO_NAME}.move() приймає одне число: скільки кроків`, line)
    const times = args.length === 0 ? 1 : toInt(args[0] ?? null, "Кількість кроків", line)
    if (times < 0 || times > MAX_MOVE_STEPS) throw new PyError(`Кроків має бути від 0 до ${MAX_MOVE_STEPS}`, line)
    for (let i = 0; i < times; i++) {
      this.tick()
      this.host.act(action, line, this.globals)
    }
    return null
  }

  private listCall(name: "append" | "pop", target: PyList, args: ReadonlyArray<Value>, line: number): Value {
    if (name === "append") {
      if (args.length !== 1) throw new PyError("append() додає одне значення: список.append(x)", line)
      if (target.items.length >= MAX_ITEMS) throw new PyError(`Забагато елементів: більше ніж ${MAX_ITEMS}`, line)
      target.items.push(args[0] ?? null)
      return null
    }
    if (target.items.length === 0) throw new PyError("pop() з порожнього списку: у ньому нічого немає", line)
    if (args.length === 0) return target.items.pop() ?? null
    const raw = toInt(args[0] ?? null, "Номер елемента", line)
    const index = raw < 0 ? target.items.length + raw : raw
    if (index < 0 || index >= target.items.length) throw new PyError(`У списку немає елемента з номером ${raw}`, line)
    return target.items.splice(index, 1)[0] ?? null
  }
}
