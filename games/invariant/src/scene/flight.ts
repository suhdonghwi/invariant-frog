import { clamp01, smootherstep, swell } from './easing';

export interface Pose {
  x: number;
  y: number;
  d: number;
  az: number;
  po: number;
}

const KEYS = ['x', 'y', 'd', 'az', 'po'] as const;

export const STILL: Pose = { x: 0, y: 0, d: 0, az: 0, po: 0 };

export const FLIGHT_MIN = 0.42;
export const FLIGHT_MAX = 1.15;
const PER_DOUBLING = 0.3;
const LIFT_FROM = 1.2;
const VIEWS_AT_PEAK = 2.5;
export const HIGHEST = 60;
const CUT_FROM = 40;
const CUT_VIEWS = 5;
const VEILED = 0.06;
const CLEARED = 0.7;

export interface Flight {
  from: Pose;
  to: Pose;
  v0: Pose;
  dur: number;
  lift: number;
  cut: { dx: number; dy: number } | null;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function travel(from: Pose, to: Pose): number {
  const views = Math.hypot(to.x - from.x, to.y - from.y) / Math.max(1, (from.d + to.d) / 2);
  const zoom = Math.abs(Math.log2(Math.max(1e-3, to.d) / Math.max(1e-3, from.d)));
  const turn = Math.abs(wrap(to.az - from.az)) + Math.abs(to.po - from.po);
  return views + 0.8 * zoom + 0.6 * turn;
}

export function plan(from: Pose, to: Pose, v0: Pose = STILL, reduced = false): Flight {
  const target = { ...to, az: from.az + wrap(to.az - from.az) };
  const w = travel(from, target);
  const dur = Math.min(FLIGHT_MAX, FLIGHT_MIN + PER_DOUBLING * Math.log2(1 + w));
  const span = Math.hypot(target.x - from.x, target.y - from.y);
  const low = Math.max(1e-3, from.d, target.d);
  const shown = CUT_VIEWS * low;
  const cut = span / low > CUT_FROM ? { dx: ((target.x - from.x) / span) * shown, dy: ((target.y - from.y) / span) * shown } : null;
  return { from, to: target, v0, dur, lift: reduced ? 0 : liftFor(from, target, cut ? shown : span), cut };
}

function liftFor(from: Pose, to: Pose, span: number): number {
  const low = Math.max(from.d, to.d);
  if (span / low <= LIFT_FROM) return 0;
  const peak = Math.min(HIGHEST, Math.max(low, span / VIEWS_AT_PEAK));
  const mid = (from.d + to.d) / 2;
  return Math.max(0, peak / mid - 1);
}

const carry = (u: number) => u - 6 * u ** 3 + 8 * u ** 4 - 3 * u ** 5;

export interface Sample {
  pose: Pose;
  done: boolean;
}

export function sample(f: Flight, elapsed: number): Sample {
  const u = clamp01(elapsed / f.dur);
  const done = elapsed >= f.dur;
  const s = smootherstep(u);
  const c = carry(u) * f.dur;
  const pose = { ...f.to };
  for (const k of KEYS) pose[k] = f.from[k] + (f.to[k] - f.from[k]) * s + f.v0[k] * c;
  if (f.cut) {
    const [side, along] = u < 0.5 ? [f.from, s] : [f.to, s - 1];
    pose.x = side.x + f.cut.dx * along + f.v0.x * c;
    pose.y = side.y + f.cut.dy * along + f.v0.y * c;
  }
  pose.d *= 1 + f.lift * swell(u);
  return { pose, done };
}

export function clarity(f: Flight, elapsed: number): number {
  if (!f.cut) return 1;
  const away = Math.abs(2 * clamp01(elapsed / f.dur) - 1);
  return smootherstep(clamp01((away - VEILED) / (CLEARED - VEILED)));
}

const EPS = 1 / 120;

export function velocity(f: Flight, elapsed: number): Pose {
  if (elapsed >= f.dur) return { ...STILL };
  let lo = Math.max(0, elapsed - EPS);
  let hi = elapsed + EPS;
  const mid = f.dur / 2;
  if (f.cut && lo < mid && hi >= mid) [lo, hi] = elapsed < mid ? [lo, mid - 1e-6] : [mid, hi];
  const a = sample(f, lo).pose;
  const b = sample(f, hi).pose;
  const span = hi - lo;
  const v = { ...STILL };
  for (const k of KEYS) v[k] = (b[k] - a[k]) / span;
  return v;
}
