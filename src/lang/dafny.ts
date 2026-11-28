import type { CompiledLevel } from '../levels/level';
import { ORDERING_OPS, type BinOp, type BuiltinFn, type Expr, type Stmt } from './ast';

const HELPERS: Record<BuiltinFn, string> = {
  abs: 'function Abs(x: int): int { if x < 0 then -x else x }',
  min: 'function Min(a: int, b: int): int { if a <= b then a else b }',
  max: 'function Max(a: int, b: int): int { if a >= b then a else b }',
};

const CALLS: Record<BuiltinFn, string> = { abs: 'Abs', min: 'Min', max: 'Max' };

const LOGIC = 1;
const RELATION = 2;
const SUM = 3;
const PRODUCT = 4;
const UNARY = 5;
const ATOM = 6;

const UP: ReadonlySet<BinOp> = new Set(['<', '<=']);
const DOWN: ReadonlySet<BinOp> = new Set(['>', '>=']);

function chainOf(e: Expr): Extract<Expr, { kind: 'binary' }>[] | null {
  if (e.kind === 'binary' && ORDERING_OPS.has(e.op)) return [e];
  if (e.kind !== 'binary' || e.op !== '&&') return null;
  const left = chainOf(e.left);
  const right = chainOf(e.right);
  if (!left || !right || right.length !== 1) return null;
  const last = left[left.length - 1];
  const next = right[0];
  const dir = (op: BinOp) => (UP.has(op) ? UP : DOWN);
  if (last.right !== next.left || dir(last.op) !== dir(next.op)) return null;
  return [...left, next];
}

class Printer {
  used = new Set<BuiltinFn>();

  constructor(private readonly rename: (name: string) => string = (n) => n) {}

  expr(e: Expr, outer = 0): string {
    const [text, prec] = this.raw(e);
    return prec < outer ? `(${text})` : text;
  }

  private raw(e: Expr): [string, number] {
    switch (e.kind) {
      case 'num':
        return [e.value < 0n ? `(${e.value})` : String(e.value), ATOM];
      case 'bool':
        return [String(e.value), ATOM];
      case 'var':
        return [this.rename(e.name), ATOM];
      case 'unary':
        return [`${e.op}${this.expr(e.arg, UNARY)}`, UNARY];
      case 'call':
        this.used.add(e.fn);
        return [`${CALLS[e.fn]}(${e.args.map((a) => this.expr(a)).join(', ')})`, ATOM];
      case 'index':
        return [`${this.rename(e.array)}[${this.expr(e.index)}]`, ATOM];
      case 'ite':
        return [`if ${this.expr(e.cond)} then ${this.expr(e.then)} else ${this.expr(e.else)}`, 0];
      case 'quant': {
        const range = [this.expr(e.lo, SUM), ...e.vars.flatMap((v, k) => [e.ops[k], v]), e.ops[e.vars.length], this.expr(e.hi, SUM)].join(' ');
        const joint = e.q === 'forall' ? '==>' : '&&';
        return [`${e.q} ${e.vars.join(', ')} :: ${range} ${joint} ${this.expr(e.body, LOGIC + 1)}`, 0];
      }
      case 'binary':
        return this.binary(e);
    }
  }

  private binary(e: Extract<Expr, { kind: 'binary' }>): [string, number] {
    const chain = chainOf(e);
    if (chain && chain.length > 1) {
      const parts = [this.expr(chain[0].left, SUM), ...chain.flatMap((c) => [c.op, this.expr(c.right, SUM)])];
      return [parts.join(' '), RELATION];
    }
    if (e.op === '&&' || e.op === '||') {
      const side = (s: Expr) => (s.kind === 'binary' && (s.op === '&&' || s.op === '||') && s.op !== e.op ? `(${this.expr(s)})` : this.expr(s, LOGIC));
      return [`${side(e.left)} ${e.op} ${side(e.right)}`, LOGIC];
    }
    if (e.op === '+' || e.op === '-') return [`${this.expr(e.left, SUM)} ${e.op} ${this.expr(e.right, PRODUCT)}`, SUM];
    if (e.op === '*' || e.op === '/' || e.op === '%') return [`${this.expr(e.left, PRODUCT)} ${e.op} ${this.expr(e.right, UNARY)}`, PRODUCT];
    return [`${this.expr(e.left, SUM)} ${e.op} ${this.expr(e.right, SUM)}`, RELATION];
  }

  stmts(body: Stmt[], indent: string): string[] {
    return body.flatMap((s) => {
      if (s.kind === 'assign') return [`${indent}${this.rename(s.name)} := ${this.expr(s.value)};`];
      const out = [`${indent}if ${this.expr(s.cond)} {`, ...this.stmts(s.then, indent + '  ')];
      if (s.else.length) out.push(`${indent}} else {`, ...this.stmts(s.else, indent + '  '));
      out.push(`${indent}}`);
      return out;
    });
  }
}

const methodName = (title: string) => {
  const name = title
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
  return /^[A-Za-z]/.test(name) ? name : `Level${name}`;
};

export function dafnyCovers(level: CompiledLevel): boolean {
  return Object.keys(level.arrays).length === 0;
}

export function toDafny(level: CompiledLevel, invariant: Expr): string | null {
  if (!dafnyCovers(level)) return null;
  const { program } = level;
  const taken = new Set(level.names);
  const start = new Map<string, string>();
  for (const v of program.vars) {
    if (v.init) continue;
    let name = `${v.name}0`;
    while (taken.has(name)) name += '_';
    taken.add(name);
    start.set(v.name, name);
  }
  const p = new Printer();
  const inits = new Map(program.vars.filter((v) => v.init).map((v) => [v.name, v.init!]));
  const before: Printer = new Printer((n) => start.get(n) ?? (inits.has(n) ? `(${before.expr(inits.get(n)!)})` : n));
  const params = [...program.inputs.map((d) => d.name), ...start.values()].map((n) => `${n}: int`).join(', ');
  const returns = program.vars.map((v) => `${v.name}: int`).join(', ');
  const lines = [
    `method ${methodName(level.title)}(${params}) returns (${returns})`,
    ...program.requires.map((r) => `  requires ${before.expr(r)}`),
    ...program.ensures.map((r) => `  ensures ${p.expr(r)}`),
    '{',
    ...program.vars.map((v) => `  ${v.name} := ${v.init ? p.expr(v.init) : start.get(v.name)};`),
    `  while ${p.expr(program.loop.guard)}`,
    `    invariant ${p.expr(invariant)}`,
    '  {',
    ...p.stmts(program.loop.body, '    '),
    '  }',
    '}',
  ];
  const used = new Set([...p.used, ...before.used]);
  const helpers = (Object.keys(HELPERS) as BuiltinFn[]).filter((f) => used.has(f)).map((f) => HELPERS[f]);
  return [...helpers, ...(helpers.length ? [''] : []), ...lines].join('\n');
}
