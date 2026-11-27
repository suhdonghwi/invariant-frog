import { useEffect } from 'react';
import { checkFormula } from '../../checker/check';
import { RULES } from '../../checker/types';
import { browserZ3 } from '../../checker/z3-browser';
import { clickTile, stepFrogs } from '../../director/controls';
import { playCounterexample } from '../../director/counterexample';
import { useGame } from '../../game/store';
import { levels, tutorialLevel } from '../../levels/catalog';
import { compileFormula, hop, toBig, type LevelDef } from '../../levels/level';
import { tileState } from '../../levels/tiles';
import { cameraRig, type Tile } from '../../scene/cameraRig';
import { figureClip, type ClipBox } from '../../scene/figureClip';
import { frogWorld } from '../../scene/frogs/frogWorld';
import { sceneStarted, sleep } from '../../scene/sceneTime';

interface FigureDef {
  level: LevelDef;
  box: ClipBox;
  frog?: { tile: Tile; hops: number };
  area?: string;
  check?: string;
  example?: Tile;
  bare?: boolean;
}

const overshoot = levels.find((l) => l.id === 'overshoot')!;

const STATES: ClipBox = { x0: 0, y0: 0, x1: 3, y1: 2 };
const IN_STATES = 'i >= 0 && n <= 2';

const OVERSHOOT: ClipBox = { x0: 0, y0: 0, x1: 5, y1: 2 };
const IN_OVERSHOOT = 'i >= 0 && i <= 5 && n <= 2';

export const FIGURES: Record<string, FigureDef> = {
  a: { level: tutorialLevel, box: STATES, frog: { tile: [0, 2], hops: 2 }, bare: true },
  b: { level: tutorialLevel, box: STATES, frog: { tile: [0, 2], hops: 2 } },
  c: { level: tutorialLevel, box: STATES, frog: { tile: [0, 2], hops: 2 }, area: `i <= n && ${IN_STATES}` },
  'overshoot-init': { level: overshoot, box: OVERSHOOT, check: 'i == n', area: `i == n && ${IN_OVERSHOOT}` },
  'overshoot-maint': { level: overshoot, box: OVERSHOOT, check: 'i <= n', example: [0, 2], area: `i <= n && ${IN_OVERSHOOT}` },
  'overshoot-exit': { level: overshoot, box: OVERSHOOT, check: 'i <= n + 3', area: `i <= n + 3 && ${IN_OVERSHOOT}` },
  'overshoot-pass': { level: overshoot, box: OVERSHOOT, check: 'i <= n + 2', area: `i <= n + 2 && ${IN_OVERSHOOT}` },
};

const SETTLE_MS = 2500;
let started = false;

async function playFirstFailure(text: string, example?: Tile) {
  const { level, inputs } = useGame.getState();
  const inv = compileFormula(level!, text);
  if (!inv.ok) throw new Error(`figure formula ${text} does not compile`);
  const res = await checkFormula(await browserZ3(), level!, inv, inputs);
  const failure = RULES.map((r) => res.verdicts[r]).find((v) => v?.status === 'fail');
  if (failure?.status === 'fail') {
    let { cex } = failure;
    if (example) {
      const state = toBig(tileState(level!, ...example, inputs));
      cex = { ...cex, state, next: cex.rule === 'maintenance' ? hop(level!, state) : undefined };
    }
    await playCounterexample(cex);
  }
  useGame.setState((g) => ({ failMark: g.failMark && { ...g.failMark, label: '' } }));
}

export function Figure() {
  useEffect(() => {
    if (started) return;
    started = true;
    const name = new URLSearchParams(location.search).get('figure') || 'c';
    const fig = FIGURES[name];
    if (!fig) throw new Error(`no figure ${name}`);
    figureClip.box = fig.box;
    document.documentElement.style.background = 'transparent';
    useGame.getState().openLevel(fig.level, 'level');
    useGame.getState().setReveal({ hover: false });
    void (async () => {
      while (!sceneStarted()) await sleep(50);
      await sleep(400);
      if (fig.frog) {
        clickTile(...fig.frog.tile);
        await sleep(600);
        for (let k = 0; k < fig.frog.hops; k++) await stepFrogs();
      }
      if (fig.bare) useGame.getState().setReveal({ eggs: false, stop: false, goals: false });
      if (fig.area) useGame.getState().setFormula(fig.area);
      if (fig.check) await playFirstFailure(fig.check, fig.example);
      // The see-through frog stands alone on its tile: an egg there would
      // read as a frog that hatched from it.
      if (fig.example) frogWorld.markHatched(...fig.example);
      useGame.setState({ caption: null, callouts: [], frogTags: false });
      const { x0, y0, x1, y1 } = fig.box;
      const tiles: Tile[] = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push([x, y]);
      await cameraRig.frame({ focus: tiles }, false);
      await sleep(SETTLE_MS);
      Object.assign(window, { __figureReady: true });
    })();
  }, []);
  return null;
}
