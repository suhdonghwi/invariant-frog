import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { check, editFormula } from '../../game/actions';
import { useGame } from '../../game/store';
import { useT } from '../../i18n/i18n';
import { displayNames } from '../../levels/level';
import { NO_SPAN } from '../../lang/ast';
import { applyFix, LangError } from '../../lang/parser';
import { BUTTON, button } from '../classes';
import { Markdown } from '../Markdown';
import { BASE, ms, reducedMotion } from '../../motion';
import { HighlightedCode } from '../codeColors';
import { RuleLights } from './RuleLights';

const SHAKE: Keyframe[] = [{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'none' }];

const CHECK = `${BUTTON} relative -top-[1.5px] bg-brand pl-4.5 pr-5 py-2 compact:pl-3.5 compact:pr-4 text-md compact:text-sm font-semibold text-white shadow-[0_3px_0_var(--color-brand-deep)] enabled:hover:bg-brand-light enabled:active:translate-y-px`;

const TEXT = 'col-start-1 row-start-1 m-0 min-w-0 px-1 py-2.5 font-mono text-(length:--formula-size) leading-[1.4] whitespace-pre-wrap [overflow-wrap:anywhere]';

export function FormulaBox() {
  const level = useGame((s) => s.level);
  const names = level ? displayNames(level) : [];
  const formula = useGame((s) => s.formula);
  const formulaText = useGame((s) => s.formulaText);
  const busy = useGame((s) => s.busy);
  const checking = useGame((s) => s.checking);
  const mode = useGame((s) => s.mode);
  const awaitingCheck = useGame((s) => s.tutorial.awaitingCheck);
  const locked = useGame((s) => s.mode === 'tutorial' && !s.tutorial.allow.formula);
  const spot = useGame((s) => s.tutorial.spotlight);
  const tr = useT();
  const errorId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [refused, setRefused] = useState<typeof formula | 'empty'>(null);
  const emptyRefused = refused === 'empty' && formulaText.trim() === '';
  const shownError = formula && !formula.ok && formula === refused ? formula.error : emptyRefused ? new LangError(tr.langErrors.empty, NO_SPAN) : null;
  const input = useRef<HTMLTextAreaElement>(null);
  const [slow, setSlow] = useState(false);
  if (!checking && slow) setSlow(false);
  useEffect(() => {
    if (!checking) return;
    const t = setTimeout(() => setSlow(true), 450);
    return () => clearTimeout(t);
  }, [checking]);

  const submit = () =>
    void check().then((r) => {
      if (r !== 'refused') return;
      setRefused(useGame.getState().formula ?? 'empty');
      if (!reducedMotion()) box.current?.animate(SHAKE, { duration: ms(BASE), easing: 'ease-in-out' });
    });
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };
  const placeholder = tr.formula.placeholder(names.join(', '));

  const canCheck = !busy && !checking && (mode !== 'tutorial' || awaitingCheck);
  return (
    // 16px on phones: any smaller and iOS zooms the page when the box is focused
    <div className="animate-rise-slow [--formula-size:17px] compact:[--formula-size:16px]">
      <div
        ref={box}
        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl border-2 bg-white py-1.25 pr-2.5 pl-4 shadow-card compact:gap-x-2 compact:pr-2 compact:pl-3 transition-colors duration-150 ${shownError ? 'border-fail/50' : 'border-brand/30 focus-within:border-brand/65'} has-[textarea:focus-visible]:focus-ring ${spot === 'formula' ? 'spotlight' : ''}`}
      >
        <span className="flex items-center gap-1.75 compact:ml-0.5 font-display text-xs font-semibold tracking-[0.08em] text-brand uppercase before:size-3 before:-translate-y-px before:rounded-sm before:bg-slab before:shadow-slab">
          <span className="compact:sr-only">{tr.formula.area}</span>
        </span>
        <div className={`grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] ${locked ? 'cursor-default opacity-60' : ''}`}>
          <div aria-hidden className={`${TEXT} pointer-events-none text-ink`}>
            {formulaText ? <HighlightedCode src={formulaText} boldNames mark={shownError?.span} /> : <span className="relative -top-[1.5px] font-sans text-[0.9em] text-faint">{placeholder}</span>}
            {'\u200b'}
          </div>
          <textarea
            ref={input}
            className={`${TEXT} w-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-ink outline-none selection:bg-brand/20 placeholder:text-transparent ${locked ? 'cursor-default' : ''}`}
            rows={1}
            value={formulaText}
            placeholder={placeholder}
            aria-label={tr.formula.area}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? errorId : undefined}
            readOnly={locked || (mode === 'tutorial' && (busy || checking))}
            tabIndex={locked ? -1 : 0}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            onChange={(e) => editFormula(e.target.value.replace(/\r?\n/g, ' '))}
            onKeyDown={onKeyDown}
          />
        </div>
        {shownError && (
          <div id={errorId} className="order-last mr-1.5 mb-1 flex basis-full animate-fade flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-[#fff1f0] px-2.5 py-1 text-xs leading-normal text-[#b42318]">
            <div className="min-w-0 flex-1">
              <Markdown text={shownError.message} />
            </div>
            {shownError.fix && (
              <button
                className={`${button('plain', 'none')} gap-1 px-2.5 py-0.5 text-xs font-medium`}
                onClick={() => {
                  editFormula(applyFix(formulaText, shownError.fix!));
                  input.current?.focus();
                }}
              >
                {tr.langErrors.fixTo} <code className="font-mono font-normal"><HighlightedCode src={applyFix(formulaText, shownError.fix).trim()} /></code>
              </button>
            )}
          </div>
        )}
        <div className="order-last -ml-1.5 mb-0.5 basis-full empty:hidden compact:-ml-1">
          <RuleLights />
        </div>
        <button
          className={`${CHECK} ${spot === 'check' ? 'spotlight spotlight-glow' : ''}`}
          disabled={!canCheck}
          onClick={submit}
        >
          {slow ? <LoaderCircle size={16} strokeWidth={2.6} className="animate-spin" /> : <Check size={16} strokeWidth={2.8} />}
          {tr.formula.check}
        </button>
      </div>
    </div>
  );
}
