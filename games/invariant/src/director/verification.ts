import type { CheckResult } from '../checker/check';
import { RULES, type Rule } from '../checker/types';
import { useGame, type Game, type Region, type RegionTile } from '../game/store';
import { tilesNear, type TileWindow } from '../levels/tiles';
import { t as messages } from '../i18n/i18n';
import { BEAT, HOLD, ms, TICK } from '../motion';
import { cameraRig, type Shot } from '../scene/cameraRig';
import { sweepLength } from '../scene/labels/Region';
import { frogWorld } from '../scene/frogs/frogWorld';
import { sleep } from '../scene/sceneTime';
import { runChecker } from './checkRun';
import { clearTrace } from './codeTrace';
import { counterexample, offerOtherBoard, onOtherBoard, type CounterexampleOptions } from './counterexample';
import { sendFrogsHome } from './frogs';
import { proofWave } from './ghosts';
import { eggRegion, endingsRegion } from './regions';
import { busyWhile, currentLevel, type Token } from './sequence';


export function revealAll(res: CheckResult) {
  useGame.setState((g) => ({ verdicts: { ...g.verdicts, ...res.verdicts }, pending: [] }));
}

function reveal(rule: Rule, res: CheckResult) {
  const v = res.verdicts[rule];
  if (!v) return;
  useGame.setState((g) => ({ verdicts: { ...g.verdicts, [rule]: v }, pending: g.pending.filter((r) => r !== rule) }));
}

interface Outcome {
  failing?: Rule;
  undecided: boolean;
}

export async function checkAndPlay(rules: Rule[], onFail?: (rule: Rule) => CounterexampleOptions, owner?: Token): Promise<Outcome | null> {
  void sendFrogsHome('test');
  const res = await runChecker(rules);
  owner?.guard();
  return res && playVerification(res, rules, onFail);
}

function playVerification(res: CheckResult, rules: Rule[], onFail: (rule: Rule) => CounterexampleOptions = () => ({})): Promise<Outcome | null> {
  return busyWhile(async (tok) => {
    clearTrace();
    useGame.setState({ failMark: null, region: null, callouts: [] });
    try {
      return await verifyRules(tok, res, rules, onFail);
    } finally {
      useGame.setState((g) => ({ pending: g.pending.filter((r) => !rules.includes(r)) }));
    }
  });
}

async function verifyRules(tok: Token, res: CheckResult, rules: Rule[], onFail: (rule: Rule) => CounterexampleOptions): Promise<Outcome | null> {
  const order = RULES.filter((r) => rules.includes(r));
  let undecided = false;
  if (frogWorld.frogs.length) {
    await sendFrogsHome();
    await sleep(ms(TICK));
    if (!tok.alive) return null;
  }
  for (const [i, rule] of order.entries()) {
    const v = res.verdicts[rule];
    if (!v) continue;
    if (v.status === 'fail') {
      if (onOtherBoard(v.cex)) {
        reveal(rule, res);
        offerOtherBoard(v.cex, onFail(rule));
        return { failing: rule, undecided };
      }
      await counterexample(tok, v.cex, onFail(rule));
      if (!tok.alive) return null;
      reveal(rule, res);
      return { failing: rule, undecided };
    }
    if (v.status === 'undecided') {
      reveal(rule, res);
      undecided = true;
      await sleep(ms(HOLD));
      if (!tok.alive) return null;
      continue;
    }
    const tag = await showHolds(rule);
    if (!tok.alive) return null;
    reveal(rule, res);
    if (tag) useGame.setState({ callouts: [tag] });
    if (i < order.length - 1) {
      await sleep(ms(HOLD));
      if (!tok.alive) return null;
      useGame.setState({ region: null, callouts: [] });
      void sendFrogsHome('test');
      await sleep(ms(BEAT));
      if (!tok.alive) return null;
    }
  }
  return { undecided };
}

type Callout = Game['callouts'][number];

let shown = 0;
const ON_SCREEN_CAP = 60;
const AROUND_HOME = 40;
const SHOWN_TOGETHER = 3;
const TRIED = 24;

type Spot = { x: number; y: number };

function hopTiles(win: TileWindow): RegionTile[] {
  const { level, inputs, valid } = useGame.getState();
  const L = level!;
  return tilesNear(L, inputs, win, (s, x, y) => (L.fast.planeReq(s) === true && L.fast.guard(s) === true && valid?.fast(s) === true ? { x, y, tone: 'good' as const } : undefined));
}

function nearest(tiles: RegionTile[], to: Spot): RegionTile[] {
  const dist = (t: Spot) => Math.hypot(t.x - to.x, t.y - to.y);
  return tiles.sort((a, b) => dist(a) - dist(b));
}

const shotAt = (t: Spot): Shot => ({ focus: [[t.x, t.y]], labels: [[t.x, t.y]] });

function around(first: RegionTile, found: RegionTile[]): Shot {
  const focus = found.filter((t) => Math.hypot(t.x - first.x, t.y - first.y) <= SHOWN_TOGETHER).map((t) => [t.x, t.y] as const);
  return { focus, labels: [[first.x, first.y]] };
}

function pickShot(tiles: Region['tiles']): { shot: Shot; spot: Spot } | null {
  const here = cameraRig.viewCenter();
  const seen = nearest(tiles(cameraRig.viewWindow(ON_SCREEN_CAP)), here).filter((t) => cameraRig.shows([t.x, t.y]));
  const still = seen.slice(0, TRIED).find((t) => cameraRig.holds(shotAt(t)));
  if (still) return { shot: shotAt(still), spot: still };
  if (seen.length) return { shot: around(seen[0], seen), spot: seen[0] };
  const home = cameraRig.home(currentLevel());
  const found = nearest(tiles({ cx: Math.round(home.x), cy: Math.round(home.y), R: AROUND_HOME }), home);
  return found.length ? { shot: around(found[0], found), spot: found[0] } : null;
}

async function bringIntoView(tiles: Region['tiles']): Promise<Spot | null> {
  const picked = pickShot(tiles);
  if (!picked) return null;
  await cameraRig.arrive(picked.shot);
  return { x: picked.spot.x, y: picked.spot.y };
}

async function showHolds(rule: Rule): Promise<Callout | null> {
  const text = messages().verdicts.holdsTag[rule];
  const spot = await bringIntoView(rule === 'maintenance' ? hopTiles : rule === 'initialization' ? eggRegion('good').tiles : endingsRegion('good').tiles);
  if (rule === 'maintenance') {
    const f = await proofWave(spot ?? undefined);
    return f ? { x: f.x, y: f.y, frog: f.id, text, tone: 'good' } : null;
  }
  const region = rule === 'initialization' ? eggRegion('good') : endingsRegion('good');
  const id = `check-${rule}-${++shown}`;
  useGame.setState({ region: { ...region, id, tick: true } });
  await sleep(ms(TICK));
  await sleep(ms(sweepLength(id) + BEAT - TICK));
  return spot ? { ...spot, text, tone: 'good' } : null;
}
