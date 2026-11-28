import { COMPARISON_OPS, type BinOp, type Expr } from '../src/lang/ast';

export function show(e: Expr): string {
  const prec: Record<BinOp, number> = {
    '||': 1, '&&': 2,
    '==': 3, '!=': 3, '<': 3, '<=': 3, '>': 3, '>=': 3,
    '+': 4, '-': 4, '*': 5, '/': 5, '%': 5,
  };
  const go = (e: Expr, ctx: number): string => {
    switch (e.kind) {
      case 'num': return e.value.toString();
      case 'bool': return String(e.value);
      case 'var': return e.name;
      case 'unary': return e.op + go(e.arg, 6);
      case 'call': return `${e.fn}(${e.args.map((a) => go(a, 0)).join(', ')})`;
      case 'index': return `${e.array}[${go(e.index, 0)}]`;
      case 'quant': {
        const chain = [go(e.lo, 4), ...e.vars.flatMap((v, i) => [e.ops[i], v]), e.ops[e.vars.length], go(e.hi, 4)].join(' ');
        return `${e.q} ${chain}: ${go(e.body, 3)}`;
      }
      case 'ite': return `(${go(e.cond, 0)} ? ${go(e.then, 0)} : ${go(e.else, 0)})`;
      case 'binary': {
        const p = prec[e.op];
        const s = `${go(e.left, COMPARISON_OPS.has(e.op) ? p + 1 : p)} ${e.op} ${go(e.right, p + 1)}`;
        return p < ctx ? `(${s})` : s;
      }
    }
  };
  return go(e, 0);
}
