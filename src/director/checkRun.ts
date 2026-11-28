import { CHECK_BUDGET_MS, CheckCancelled, CheckControl } from '../checker/budget';
import { checkFormula, type CheckResult } from '../checker/check';
import { useSolver } from '../checker/solverStatus';
import type { Rule } from '../checker/types';
import { browserZ3 } from '../checker/z3-browser';
import { captionOf } from '../game/captions';
import { useGame, type Caption } from '../game/store';
import { t as messages } from '../i18n/i18n';
import { clearTrace } from './codeTrace';
import { sendFrogsHome } from './frogs';
import { abandonCheck, begin, beginCheck, caption } from './sequence';

const SLOW_MS = 2000;

let live: CheckControl | null = null;

export function abandonRun() {
  abandonCheck();
  live?.cancel();
  live = null;
  useGame.setState({ checking: false, pending: [] });
}

export function cancelCheck() {
  begin();
  abandonRun();
  clearTrace();
  void sendFrogsHome();
  useGame.setState({ busy: false, region: null, callouts: [], failMark: null });
}

function borrowCaption() {
  const before = useGame.getState().caption;
  let mine: Caption | null = null;
  return {
    show(next: Caption) {
      if (mine && useGame.getState().caption !== mine) return;
      mine = next;
      useGame.setState({ caption: next });
    },
    restore() {
      if (mine && useGame.getState().caption === mine) useGame.setState({ caption: before });
      mine = null;
    },
  };
}

function slowNotice(control: CheckControl) {
  const notice = borrowCaption();
  let due = false;
  const say = () => {
    if (!control.rule) return;
    due = true;
    notice.show(
      captionOf({
        text: messages().verdicts.stillChecking(messages().rules[control.rule]),
        tone: 'muted',
        action: { label: messages().verdicts.cancel, onClick: cancelCheck },
      }),
    );
  };
  const timer = setTimeout(say, SLOW_MS);
  return {
    ruleChanged: () => due && say(),
    end: () => {
      clearTimeout(timer);
      notice.restore();
    },
  };
}

async function loadSolver() {
  if (useSolver.getState().status === 'ready') return browserZ3();
  const notice = borrowCaption();
  notice.show({ text: messages().verdicts.loadingChecker, tone: 'muted' });
  try {
    return await browserZ3();
  } finally {
    notice.restore();
  }
}

export async function runChecker(rules: Rule[]): Promise<CheckResult | null> {
  const g = useGame.getState();
  const inv = g.valid;
  if (!g.level || !inv || (g.formula && !g.formula.ok)) return null;
  const keep = { ...g.verdicts };
  for (const r of rules) delete keep[r];
  abandonRun();
  const run = beginCheck();
  const current = () => {
    const now = useGame.getState();
    return run.alive && now.level === g.level && now.mode === g.mode && now.valid === inv;
  };
  let slow: ReturnType<typeof slowNotice> | null = null;
  const control = new CheckControl(CHECK_BUDGET_MS, () => slow?.ruleChanged());
  live = control;
  useGame.setState({ checking: true, verdicts: keep, pending: rules, failMark: null, region: null });
  let res: CheckResult | null = null;
  try {
    const ctx = await loadSolver().catch(() => null);
    if (!current()) return null;
    if (!ctx) {
      caption(messages().verdicts.solverUnavailable, 'fail');
      return null;
    }
    if (g.mode === 'level') slow = slowNotice(control);
    try {
      const checked = await checkFormula(ctx, g.level, inv, g.inputs, { rules, control });
      if (current()) res = checked;
    } catch (e) {
      if (!(e instanceof CheckCancelled) && current()) {
        console.error('The check failed:', e);
        caption(messages().verdicts.checkFailed, 'fail');
      }
    }
  } finally {
    slow?.end();
    if (run.alive) {
      live = null;
      useGame.setState((now) => ({
        checking: false,
        pending: res ? now.pending : now.pending.filter((r) => !rules.includes(r)),
        ...(res ? { pitfallMessage: res.pitfall?.message ?? null } : {}),
      }));
    }
  }
  return res;
}
