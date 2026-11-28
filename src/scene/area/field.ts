import type { FastFn, FastState } from '../../lang/eval';
import type { Inputs } from '../../levels/inputs';
import type { CompiledLevel, Formula } from '../../levels/level';
import { tilesNear, tileState, type TileWindow } from '../../levels/tiles';
import { RISE, RISE_OVERSHOOT, WAVE_END, WAVE_SPREAD } from '../../motion';
import { SLAB_H } from '../constants';
import { popIn, smoothstep } from '../easing';
import { sceneNow } from '../sceneTime';
import { SETTLE_POWER } from './glsl';
import { landSquash } from './landBounce';

type Rise = (x: number, y: number) => number;

interface Wave {
  level: CompiledLevel | null;
  area: FastFn | null;
  inputs: Inputs;
  from: Rise | null;
  t0: number;
  cx: number;
  cy: number;
  reach: number;
}

const still: Wave = { level: null, area: null, inputs: {}, from: null, t0: -Infinity, cx: 0, cy: 0, reach: 1 };

function target(w: Wave, x: number, y: number): number {
  if (!w.level) return 0;
  const s = tileState(w.level, x, y, w.inputs);
  return w.level.fast.planeReq(s) === true && w.area?.(s) === true ? 1 : 0;
}

function riseAt(w: Wave, x: number, y: number, t: number): number {
  const to = target(w, x, y);
  if (!w.from) return to;
  const a = (t - w.t0 - Math.min(Math.hypot(x - w.cx, y - w.cy) / w.reach, 1) * WAVE_SPREAD) / RISE;
  if (a >= 1) return to;
  const from = w.from(x, y);
  if (a <= 0) return from;
  return from + (to - from) * (to > from ? popIn(a, RISE_OVERSHOOT) : smoothstep(a));
}

class AreaField {
  level: CompiledLevel | null = null;
  inputs: Inputs = {};
  area: Formula | null = null;
  before: Formula | null = null;
  private wave: Wave = still;

  reset() {
    this.level = null;
    this.area = null;
    this.before = null;
    this.wave = still;
  }

  show(level: CompiledLevel, area: Formula | null) {
    this.before = level === this.level ? this.area : null;
    this.level = level;
    this.area = area;
  }

  begin(level: CompiledLevel | null, area: Formula | null, inputs: Inputs, t: number, cx: number, cy: number, reach: number) {
    const was = this.wave;
    const from: Rise = was.level !== level ? () => 0 : !was.from || t >= was.t0 + WAVE_END ? (x, y) => target(was, x, y) : (x, y) => riseAt(was, x, y, t);
    this.wave = { level, area: area?.fast ?? null, inputs, from, t0: t, cx, cy, reach };
  }

  heightAt(x: number, y: number): number {
    return Math.max(0, riseAt(this.wave, Math.round(x), Math.round(y), sceneNow())) ** SETTLE_POWER;
  }

  planeMovedNear(near: TileWindow, before: Inputs): { rising: number; sinking: number } {
    const level = this.level;
    if (!level) return { rising: 0, sinking: 0 };
    const on = (inputs: Inputs) => new Set(tilesNear(level, inputs, near, (s, x, y) => (level.fast.planeReq(s) === true && this.area?.fast(s) === true ? `${x},${y}` : undefined)));
    const now = on(this.inputs);
    const was = on(before);
    return { rising: [...now].filter((k) => !was.has(k)).length, sinking: [...was].filter((k) => !now.has(k)).length };
  }

  groundAt(x: number, y: number): number {
    return this.heightAt(x, y) * SLAB_H * (1 - landSquash(Math.round(x), Math.round(y), sceneNow()));
  }

  movedNear(near: TileWindow): { rising: number; sinking: number } {
    const level = this.level;
    if (!level) return { rising: 0, sinking: 0 };
    const covers = (f: Formula | null, s: FastState) => (f?.fast(s) === true ? 1 : 0);
    const moved = tilesNear(level, this.inputs, near, (s) => (level.fast.planeReq(s) === true ? covers(this.area, s) - covers(this.before, s) : 0));
    return { rising: moved.filter((m) => m > 0).length, sinking: moved.filter((m) => m < 0).length };
  }
}

export const field = new AreaField();
