import { describe, expect, it } from 'vitest';
import type { FastState } from '../src/lang/eval';
import { allLevels } from '../src/levels/catalog';
import { startInputs, withLengths, type Inputs } from '../src/levels/inputs';
import { compileFormula, compileLevel, type CompiledLevel } from '../src/levels/level';
import { levelGlsl } from '../src/scene/floor/levelGlsl';

type Area = (t: { x: number; y: number }) => boolean;

function asJs(glsl: string): string {
  return glsl
    .replace(/^uniform .*$/gm, '')
    .replace(/\b(?:bool|int) (\w+)\(([^)]*)\) \{/g, (_, name: string, params: string) => `function ${name}(${params.replace(/\b(?:int|ivec2) /g, '')}) {`)
    .replace(/\bint (\w+) = /g, 'let $1 = ')
    .replace(/\bbool (\w+) = /g, 'let $1 = ')
    .replace(/\bbool (\w+);/g, 'let $1;')
    .replace(/\bint (\w+);/g, 'let $1;')
    .replace(/\ba \/ k\b/g, 'Math.trunc(a / k)')
    .replace(/\(([\w.-]+) \* ([\w.-]+)\)/g, 'Math.imul($1, $2)');
}

function shaderArea(level: CompiledLevel, text: string, inputs: Inputs): Area {
  const f = compileFormula(level, text);
  if (!f.ok) throw f.error;
  const js = asJs(levelGlsl(level, { area: f.expr, before: null }));
  const args: Record<string, unknown> = { min: Math.min, max: Math.max, abs: Math.abs, int: Math.trunc, float: Number, floor: Math.floor, uExists: true };
  for (const n of level.offAxis) args[level.arrays[n] ? `uArr_${n}` : `uIn_${n}`] = inputs[n];
  for (const [a, len] of Object.entries(level.arrays)) args[`uIn_${len}`] = (inputs[a] as number[]).length;
  const names = Object.keys(args);
  return new Function(...names, `${js}\nreturn L_area;`)(...names.map((n) => args[n])) as Area;
}

function cpuArea(level: CompiledLevel, text: string, inputs: Inputs): Area {
  const f = compileFormula(level, text);
  if (!f.ok) throw f.error;
  return ({ x, y }) => f.fast({ ...inputs, [level.view.x]: x, [level.view.y]: y } as FastState) === true;
}

const level = (id: string) => compileLevel(allLevels.find((l) => l.id === id)!);

function agree(id: string, text: string, tiles: [number, number][], inputs?: Inputs) {
  const lvl = level(id);
  const ins = withLengths(lvl, inputs ?? startInputs(lvl));
  const gpu = shaderArea(lvl, text, ins);
  const cpu = cpuArea(lvl, text, ins);
  for (const [x, y] of tiles) expect(gpu({ x, y }), `${text} at (${x}, ${y})`).toBe(cpu({ x, y }));
}

function random(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const rand = random(7);
const small = (r: number) => Math.round((rand() * 2 - 1) * r);
const tiles = (r: number, count = 300) => Array.from({ length: count }, () => [small(r), small(r)] as [number, number]);

describe('the drawn area matches the checked one', () => {
  it('on random small tiles', () => {
    agree('countdown', '0 <= i <= n && i % 3 != 1', tiles(40));
    agree('countdown', 'i / 3 >= n / 2 - 4 || i * n > 20', tiles(40));
    agree('countdown', 'min(i, n) == abs(i - 2) && !(i == 5)', tiles(40));
    agree('sum-to-n', '2 * s == i * (i + 1) && i <= n', tiles(30), { s: 10 });
    agree('biggest-so-far', 'forall 0 <= k < i: A[k] <= m', tiles(40), { A: [3, -1, 7, 2, 9, 0] });
    agree('biggest-so-far', 'exists 0 <= j < k <= i: A[j] == A[k] + m', tiles(12), { A: [3, -1, 7, 2, 9, 0] });
  });
  it('past the shader’s old loop bound', () => {
    agree('countdown', 'exists 0 <= k <= i: i == 3 * k', [[96, 0], [99, 0], [300, 0], [3000, 0], [5000, 0]]);
    agree('countdown', 'forall 0 <= k < i: k * 2 != n', [[200, 300], [200, 401], [4000, 1], [5000, 1]]);
    agree('countdown', 'forall 0 <= k < 1000: k != i', [[50, 0], [-1, 0], [1000, 0]]);
  });
  it('rounds division down for negative numbers', () => {
    agree('countdown', 'i / 3 == n', [[-1, -1], [-3, -1], [-4, -2], [-7, -3], [7, 2], [-6, -2]]);
    agree('countdown', 'i % 4 == n', [[-1, 3], [-4, 0], [-5, 3], [5, 1]]);
  });
});
