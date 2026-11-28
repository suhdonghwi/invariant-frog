import { sfx } from '../audio/sfx';
import { RULES } from '../checker/types';
import { warmSolver } from '../checker/z3-browser';
import { cancelCheck } from '../director/checkRun';
import { resetFrogs, resetLevel } from '../director/reset';
import { caption } from '../director/sequence';
import { checkAndPlay } from '../director/verification';
import { t } from '../i18n/i18n';
import { toDafny } from '../lang/dafny';
import { levels, tutorialLevel } from '../levels/catalog';
import { planeKey, startInputs, type Inputs } from '../levels/inputs';
import type { LevelDef } from '../levels/level';
import { localizeLevel } from '../levels/localize';
import { cameraRig } from '../scene/cameraRig';
import { switchScene } from '../scene/sceneTime';
import { startTutorial, stopTutorial, tutorialCheck } from '../tutorial/tutorial';
import { markCleared } from './progress';
import { openingCaption, useGame, type CaptionTone } from './store';

export function openLevel(def: LevelDef) {
  switchScene(() => {
    stopTutorial();
    resetLevel();
    useGame.getState().openLevel(def, 'level');
    warmSolver();
  });
}

export function openTutorial() {
  switchScene(() => {
    resetLevel();
    useGame.getState().openLevel(tutorialLevel, 'tutorial');
    warmSolver();
    const from = Number(new URLSearchParams(location.search).get('step') ?? 0);
    startTutorial(() => openLevel(levels[0]), from);
  });
}

export function goMenu(view: 'home' | 'levels' = 'home') {
  switchScene(() => {
    stopTutorial();
    resetLevel();
    useGame.getState().backToMenu(view);
    if (view === 'levels') warmSolver();
  });
}

export function showLevels() {
  useGame.setState({ menuView: 'levels' });
  warmSolver();
}

export function resetScreen() {
  const { level, busy } = useGame.getState();
  if (!level || busy) return;
  resetFrogs();
  useGame.setState({ inputs: startInputs(level), caption: openingCaption(level), callouts: [], region: null });
  cameraRig.opening(level, true);
}

export function changeInputs(next: Inputs) {
  const { busy, inputs } = useGame.getState();
  if (busy) return;
  if (planeKey(next) !== planeKey(inputs)) {
    resetFrogs();
    useGame.setState({ callouts: [], region: null });
  }
  useGame.setState({ inputs: next });
}

export function showLevelHint() {
  const g = useGame.getState();
  if (g.busy || !g.level?.hints?.length) return;
  showHints(Math.max(g.hintsShown, 1));
}

function showHints(shown: number) {
  const hints = useGame.getState().level?.hints ?? [];
  const text = hints
    .slice(0, shown)
    .map((h, k) => `${t().level.hint(k + 1, hints.length)} ${h}`)
    .join('\n\n');
  useGame.setState({
    hintsShown: shown,
    caption: {
      text,
      tone: 'info',
      action: shown < hints.length ? { label: t().level.anotherHint, onClick: () => showHints(shown + 1) } : undefined,
    },
  });
}

const CHECK_TONES: ReadonlySet<CaptionTone> = new Set(['fail', 'muted']);

export function editFormula(text: string) {
  const g = useGame.getState();
  if (g.mode === 'level') {
    if (g.checking || g.busy) cancelCheck();
    const { caption } = useGame.getState();
    if (text !== g.formulaText && caption && CHECK_TONES.has(caption.tone)) useGame.setState({ caption: null });
  }
  useGame.getState().setFormula(text);
}

export async function check(): Promise<'refused' | void> {
  const g = useGame.getState();
  if (g.busy || g.checking || !g.level) return;
  if (g.mode === 'tutorial') return tutorialCheck();
  if (!g.formula || !g.formula.ok) return 'refused';
  const out = await checkAndPlay(RULES);
  if (!out || out.failing) return;
  const now = useGame.getState();
  if (now.level !== g.level || now.valid !== g.valid) return;
  if (out.undecided) {
    const tip = g.formulaText.includes('/') ? t().level.avoidDivision : '';
    caption(`${t().level.undecided}${tip}`, 'muted');
    return;
  }
  const level = g.level;
  const proof = toDafny(level, g.formula.expr) ?? undefined;
  markCleared(level.id);
  const others = otherAnswers(out.others ?? []);
  const next = levels[levels.findIndex((l) => l.id === level.id) + 1];
  sfx.cleared();
  useGame.setState({
    caption: {
      text: others ? `${t().level.proved}\n\n${others}` : t().level.proved,
      tone: 'success',
      proof,
      action: next
        ? { label: t().level.next(localizeLevel(next).title), onClick: () => openLevel(next) }
        : { label: t().level.backToLevels, onClick: () => goMenu('levels') },
    },
  });
}

function otherAnswers(rest: string[]): string | null {
  return rest.length ? `${t().level.otherAnswers(rest.length)}\n\n${rest.map((s) => `- \`${s}\``).join('\n')}` : null;
}
