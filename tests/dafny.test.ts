import { describe, expect, it } from 'vitest';
import { toDafny } from '../src/lang/dafny';
import { allLevels } from '../src/levels/catalog';
import { compileFormula, compileLevel } from '../src/levels/level';

const level = (id: string) => compileLevel(allLevels.find((l) => l.id === id)!);

function dafny(id: string, text: string) {
  const lvl = level(id);
  const f = compileFormula(lvl, text);
  if (!f.ok) throw f.error;
  return toDafny(lvl, f.expr);
}

describe('the proof as Dafny', () => {
  it('prints a level as a method with the area as its invariant', () => {
    expect(dafny('overshoot', 'i < n + 3')).toBe(`method Overshoot(n: int) returns (i: int)
  requires n >= 0
  ensures n <= i < n + 3
{
  i := 0;
  while i < n
    invariant i < n + 3
  {
    i := i + 3;
  }
}`);
  });
  it('starts a variable without a value from a parameter', () => {
    const out = dafny('meet-in-the-middle', 'lo <= hi + 1')!;
    expect(out).toContain('method MeetInTheMiddle(lo0: int, hi0: int) returns (lo: int, hi: int)');
    expect(out).toContain('requires lo0 <= hi0');
    expect(out).toContain('  lo := lo0;\n  hi := hi0;');
  });
  it('brackets mixed logic and adds helpers for builtins', () => {
    const out = dafny('countdown', '(i >= 0 || i == n) && abs(i) <= max(n, 0)')!;
    expect(out).toContain('invariant (i >= 0 || i == n) && Abs(i) <= Max(n, 0)');
    expect(out.startsWith('function Abs(x: int): int')).toBe(true);
    expect(out).toContain('function Max(a: int, b: int): int');
    expect(out).not.toContain('function Min');
  });
  it('keeps an if in the body and quantifiers in the invariant', () => {
    const out = dafny('even-out', 'x >= 0 && y >= 0 && forall 0 <= k < x: k != -1')!;
    expect(out).toMatch(/if x > y \{\n\s+x := x - 1;\n\s+\} else \{\n\s+y := y - 1;\n\s+\}/);
    expect(out).toContain('forall k :: 0 <= k < x ==> k != -1');
  });
  it('leaves array levels out', () => {
    expect(dafny('biggest-so-far', 'forall 0 <= k < i: A[k] <= m')).toBeNull();
  });
});
