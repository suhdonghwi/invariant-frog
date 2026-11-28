import { sfx } from '../audio/sfx';
import { ruleQuery } from '../checker/rules';
import type { Counterexample } from '../checker/types';
import { useGame, type Caption, type CaptionTone } from '../game/store';
import { t as messages } from '../i18n/i18n';
import { mk, type Expr, type State } from '../lang/ast';
import { inputsOf, planeKey, showInputs } from '../levels/inputs';
import { showState } from '../levels/level';
import { tileOf } from '../levels/tiles';
import { ARC_DRAW, BEAT, ms } from '../motion';
import { cameraRig } from '../scene/cameraRig';
import { after, sceneNow, sleep } from '../scene/sceneTime';
import { traceHop } from './codeTrace';
import { sendFrogsHome } from './frogs';
import type { FrogSim } from '../scene/frogs/frogWorld';
import { ARC_AFTER_RISE, SEE_THROUGH_RISE, previewHop, raiseSeeThrough } from './seeThrough';
import { busyWhile, currentLevel, type Token } from './sequence';

export interface CounterexampleOptions {
  prefix?: string;
  note?: string;
  area?: string;
  tone?: CaptionTone;
  extra?: string;
  seeThroughExtra?: string;
  action?: () => Caption['action'];
}

const fmt = (s: State) => '`' + showState(currentLevel(), s) + '`';

function failExpr(rule: Counterexample['rule']): Expr | undefined {
  const inv = useGame.getState().valid;
  if (!inv) return undefined;
  const L = currentLevel();
  if (rule === 'initialization') return mk.andAll([L.eggAt, mk.not(inv.expr)]);
  return mk.andAll(ruleQuery(L, inv.expr, rule).parts);
}

function markFailure(rule: Counterexample['rule'], x: number, y: number, label: string, frog?: FrogSim) {
  useGame.setState({ failMark: { x, y, label, t0: sceneNow(), frog: frog?.id, fail: failExpr(rule) } });
  sfx.fail();
}

const LOOK = BEAT;

const planeOf = (cex: Counterexample) => inputsOf(currentLevel(), cex.state);

export const onOtherBoard = (cex: Counterexample) => planeKey(planeOf(cex)) !== planeKey(useGame.getState().inputs);

export function offerOtherBoard(cex: Counterexample, opts: CounterexampleOptions) {
  const L = currentLevel();
  const say = messages().verdicts;
  const there = showInputs(L, planeOf(cex));
  sfx.fail();
  useGame.setState({
    caption: { text: say.elsewhere(showInputs(L, useGame.getState().inputs), there), tone: 'fail', action: { label: say.showThere(there), onClick: () => void playCounterexample(cex, { ...opts, note: opts.note ?? '' }) } },
  });
}

async function focusOn(tok: Token, cex: Counterexample, leaving: Promise<void>) {
  const L = currentLevel();
  if (onOtherBoard(cex)) {
    useGame.setState({ inputs: planeOf(cex) });
    await sleep(ms(LOOK));
    if (!tok.alive) return;
  }
  const tile = (s: State) => tileOf(L, s);
  const labels = [cex.state, cex.next].flatMap((s) => (s ? [tile(s)] : []));
  await Promise.all([cameraRig.arrive({ labels, centre: true }), leaving]);
}

export function playCounterexample(cex: Counterexample, opts: CounterexampleOptions = {}) {
  return busyWhile((tok) => counterexample(tok, cex, opts));
}

const FARTHEST = 1_000_000_000n;

const withinReach = (cex: Counterexample) =>
  [cex.state, cex.next].every((s) => !s || Object.values(s).every((v) => (Array.isArray(v) ? v : [v]).every((x) => x <= FARTHEST && x >= -FARTHEST)));

function told(cex: Counterexample, area: string, note: string, broken: string): string {
  const say = messages().verdicts;
  if (cex.rule === 'initialization') return say.startsOutside(fmt(cex.state), area, note) + broken;
  if (cex.rule === 'maintenance' && cex.next) return say.landsOutside(fmt(cex.state), fmt(cex.next), area, note) + broken;
  return say.offGoal(fmt(cex.state), area, note);
}

export async function counterexample(tok: Token, cex: Counterexample, opts: CounterexampleOptions) {
  const L = currentLevel();
  useGame.setState({ failMark: null, region: null });
  const say = messages().verdicts;
  const prefix = opts.prefix ?? '';
  const note = opts.note ?? (cex.far ? say.far : '');
  const area = opts.area ?? say.yourArea;
  const broken = cex.broken ? (cex.rule === 'maintenance' ? say.noLongerHolds(cex.broken) : say.falseThere(cex.broken)) : '';
  const text = prefix + told(cex, area, note, broken);
  if (!withinReach(cex)) {
    await sendFrogsHome();
    if (!tok.alive) return;
    sfx.fail();
    finish(cex, opts, `${text}\n\n${say.tooFar}`);
    return;
  }
  const [x, y] = tileOf(L, cex.state);
  await focusOn(tok, cex, sendFrogsHome());
  if (!tok.alive) return;
  if (cex.rule === 'initialization') {
    await sleep(ms(BEAT));
    if (!tok.alive) return;
    markFailure(cex.rule, x, y, say.startsOutsideTag(area));
    finish(cex, opts, text);
    return;
  }
  sfx.seeThrough();
  if (cex.rule === 'maintenance' && cex.next) {
    const { state, next } = cex;
    const frog = previewHop(state, 1, false);
    after(ms(SEE_THROUGH_RISE + ARC_AFTER_RISE), () => tok.alive && traceHop(L, state, next, ARC_DRAW));
    await sleep(ms(SEE_THROUGH_RISE + ARC_AFTER_RISE + ARC_DRAW));
    if (!tok.alive) return;
    markFailure(cex.rule, x, y, say.landsOutsideTag(area), frog);
  } else {
    const frog = raiseSeeThrough(cex.state);
    await sleep(ms(SEE_THROUGH_RISE + BEAT));
    if (!tok.alive) return;
    markFailure(cex.rule, x, y, say.offGoalTag, frog);
  }
  finish(cex, opts, opts.seeThroughExtra ? `${text}\n\n${opts.seeThroughExtra}` : text);
}

function finish(cex: Counterexample, opts: CounterexampleOptions, said: string) {
  let text = said;
  if (opts.extra) text += `\n\n${opts.extra}`;
  const { mode, pitfallMessage } = useGame.getState();
  const aside = mode === 'level' && pitfallMessage ? pitfallMessage : undefined;
  const action = opts.action?.();
  const tone = opts.tone ?? 'fail';
  useGame.setState({ caption: { text, aside, tone, action, replay: () => void playCounterexample(cex, opts) } });
}
