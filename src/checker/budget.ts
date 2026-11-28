import type { Context } from 'z3-solver';
import type { Rule } from './types';

export const CHECK_BUDGET_MS = 8000;

export class CheckCancelled extends Error {}

export class CheckControl {
  cancelled = false;
  rule: Rule | null = null;
  private deadline = Infinity;
  private solving: Context<'main'> | null = null;

  constructor(
    readonly budget = CHECK_BUDGET_MS,
    private readonly onRule: (rule: Rule) => void = () => {},
  ) {}

  start(ctx: Context<'main'>) {
    this.deadline = performance.now() + this.budget;
    this.solving = ctx;
  }

  finish() {
    this.solving = null;
  }

  working(rule: Rule) {
    this.rule = rule;
    this.onRule(rule);
  }

  left(): number {
    return this.cancelled ? 0 : Math.max(0, this.deadline - performance.now());
  }

  guard() {
    if (this.cancelled) throw new CheckCancelled();
  }

  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    this.solving?.interrupt();
  }
}
