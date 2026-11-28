import { sfx } from '../audio/sfx';
import { useGame } from '../game/store';
import type { State } from '../lang/ast';
import { holds } from '../lang/eval';
import { hop, running, toBig } from '../levels/level';
import { tileOf, tilesNear } from '../levels/tiles';
import { cameraRig } from '../scene/cameraRig';
import { clamp01, smoothstep } from '../scene/easing';
import { frogWorld, type FrogSim } from '../scene/frogs/frogWorld';
import { ARC_DRAW, hopArcs } from '../scene/frogs/HopArcs';
import { APPEAR } from '../scene/labels/Region';
import { BEAT, ms } from '../motion';
import { after, sceneNow, sleep } from '../scene/sceneTime';
import { sendFrogsHome } from './frogs';
import { busyWhile, currentLevel } from './sequence';

export const SEE_THROUGH_RISE = 0.6;
const TURNS = 2;
export const ARC_AFTER_RISE = 0.1;
export const PROOF_PICTURE = SEE_THROUGH_RISE + ARC_AFTER_RISE + ARC_DRAW + APPEAR + BEAT;

export function raiseSeeThrough(s: State, fade = 1): FrogSim {
  const L = currentLevel();
  const f = frogWorld.add(L, 'seeThrough', s, { rise: { t0: sceneNow(), dur: SEE_THROUGH_RISE, turns: TURNS }, fade });
  after(ms(SEE_THROUGH_RISE), () => {
    if (frogWorld.frogs.includes(f) && !running(L, f.state) && holds(L.post, f.state)) frogWorld.landOnGoal(f);
  });
  return f;
}

export function previewHop(s: State, fade = 1, to: State = hop(currentLevel(), s), ring = true): FrogSim {
  const L = currentLevel();
  const f = raiseSeeThrough(s, fade);
  const [tx, ty] = tileOf(L, to);
  hopArcs.add({
    frog: f.id,
    fx: f.x,
    fy: f.y,
    tx,
    ty,
    plane: f.plane,
    t0: sceneNow() + SEE_THROUGH_RISE + ARC_AFTER_RISE,
    fade,
    ring,
  });
  after(ms(SEE_THROUGH_RISE + ARC_AFTER_RISE + ARC_DRAW), () => ring && frogWorld.frogs.includes(f) && sfx.landing());
  return f;
}

const PROOF_NEAR = 6;
const PROOF_FAR = 13;
const PROOF_MAX = 40;

interface ProofHop {
  from: State;
  to: State;
  d: number;
}

function spreadHops(hops: ProofHop[]): ProofHop[] {
  const L = currentLevel();
  const at = (s: State) => tileOf(L, s);
  const apart = (a: readonly number[], b: readonly number[], r: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) >= r;
  const picked: ProofHop[] = [];
  for (const h of hops) {
    if (picked.length >= PROOF_MAX) break;
    const [f, t] = [at(h.from), at(h.to)];
    const fits = picked.every((p) => {
      const [pf, pt] = [at(p.from), at(p.to)];
      return apart(f, pf, 2.2) && apart(f, pt, 1.2) && apart(t, pf, 1.2) && apart(t, pt, 1.2);
    });
    if (fits) picked.push(h);
  }
  return picked;
}

export function playProof() {
  return busyWhile(async (tok) => {
    await Promise.all([sendFrogsHome(), cameraRig.zoomTo(Math.max(cameraRig.distance(), 18))]);
    if (tok.alive) await proofWave();
  });
}

export async function proofWave(around?: { x: number; y: number }): Promise<FrogSim | null> {
  const { level: L, valid: inv, inputs } = useGame.getState();
  if (!L || !inv) return null;
  const { x: tx, y: ty } = around ?? cameraRig.viewCenter();
  const near = (x: number, y: number) => Math.hypot(x - tx, y - ty);
  const candidates = tilesNear(L, inputs, { cx: Math.round(tx), cy: Math.round(ty), R: PROOF_FAR }, (s, x, y) => {
    if (!L.fast.planeReq(s) || inv.fast(s) !== true || L.fast.guard(s) !== true || near(x, y) > PROOF_FAR) return undefined;
    const from = toBig(s);
    return { from, to: hop(L, from), d: near(x, y) };
  });
  const hops = spreadHops(candidates.sort((a, b) => a.d - b.d));
  const fadeAt = (d: number) => 1 - smoothstep(clamp01((d - PROOF_NEAR) / (PROOF_FAR - PROOF_NEAR)));
  sfx.seeThrough();
  const frogs = hops.map((h) => previewHop(h.from, fadeAt(h.d)));
  await sleep(ms(PROOF_PICTURE));
  return frogs[0] ?? null;
}
