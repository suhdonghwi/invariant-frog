import type { Context } from 'z3-solver';
import { mk } from '../lang/ast';
import type { Inputs } from '../levels/inputs';
import { compileFormula, type CompiledLevel, type Formula, type Pitfall } from '../levels/level';
import { failureOnARun, smallestOnPlane } from './nearby';
import { breaksRule, counterexample, ruleQuery } from './rules';
import { CheckControl } from './budget';
import { equivalent, solve } from './smt';
import { RULES, type Rule, type RuleVerdict, type Verdicts } from './types';

interface CheckOptions {
  rules?: Rule[];
  control?: CheckControl;
}

export interface CheckResult {
  verdicts: Partial<Verdicts>;
  pitfall?: Pitfall;
  others?: string[];
}

const PITFALL_MS = 1000;

// Z3 builds terms with one allocator that isn't thread-safe, and a check runs on a worker
// thread, so no other check may build terms on the main thread until it ends.
let queue: Promise<unknown> = Promise.resolve();

export function checkFormula(ctx: Context<'main'>, level: CompiledLevel, inv: Formula, inputs: Inputs, opts: CheckOptions = {}): Promise<CheckResult> {
  const control = opts.control ?? new CheckControl();
  const run = queue.then(async () => {
    control.guard();
    control.start(ctx);
    try {
      return await checkAlone(ctx, level, inv, inputs, opts.rules ?? RULES, control);
    } finally {
      control.finish();
    }
  });
  queue = run.catch(() => {});
  return run;
}

async function checkAlone(ctx: Context<'main'>, level: CompiledLevel, inv: Formula, inputs: Inputs, rules: Rule[], control: CheckControl): Promise<CheckResult> {
  const left = () => control.left();
  const verdicts: Partial<Verdicts> = {};
  for (const rule of rules) {
    control.working(rule);
    const near = (rule === 'maintenance' ? failureOnARun(level, inv, inputs) : undefined) ?? smallestOnPlane(level, inv, rule, inputs);
    if (near) {
      verdicts[rule] = { status: 'fail', cex: near };
      continue;
    }
    const query = ruleQuery(level, inv.expr, rule);
    const r = await solve(ctx, level, query.dims, mk.andAll(query.parts), { left, verify: (s) => breaksRule(query, s) });
    control.guard();
    verdicts[rule] =
      r.kind === 'unsat'
        ? { status: 'pass', how: 'proved' }
        : r.kind === 'sat'
          ? { status: 'fail', cex: counterexample(level, inv, rule, r.state, true) }
          : r.kind === 'long'
            ? { status: 'long' }
            : { status: 'undecided' };
  }

  const same = async (text: string, cap = Infinity) => {
    const f = compileFormula(level, text);
    const ok = f.ok && (await equivalent(ctx, level, inv.expr, f.expr, () => Math.min(cap, left())));
    control.guard();
    return ok;
  };
  const firstSame = async <T>(items: T[], text: (x: T) => string, cap?: number) => {
    for (const x of items) if (await same(text(x), cap)) return x;
  };

  const undecided = rules.filter((r) => verdicts[r]?.status === 'undecided');
  const failed = rules.some((r) => verdicts[r]?.status === 'fail' || verdicts[r]?.status === 'long');
  if (undecided.length > 0 && !failed && (await firstSame(level.solutions, (s) => s)) !== undefined) {
    for (const r of undecided) verdicts[r] = { status: 'pass', how: 'equivalent' } satisfies RuleVerdict;
  }
  const pitfall = failed ? await firstSame(level.pitfalls ?? [], (p) => p.formula, PITFALL_MS) : undefined;
  const proved = rules.every((r) => verdicts[r]?.status === 'pass');
  let others: string[] | undefined;
  if (proved) {
    others = [];
    for (const s of level.solutions) {
      if (squash(s) !== squash(inv.text) && !(await same(s, PITFALL_MS))) others.push(s);
    }
  }
  return { verdicts, pitfall, others };
}

const squash = (s: string) => s.replace(/\s+/g, '');
