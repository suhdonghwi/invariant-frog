import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useGame, type CaptionTone } from '../../game/store';
import { useT } from '../../i18n/i18n';
import { button } from '../classes';
import { Markdown } from '../Markdown';
import { useLingering } from '../../hooks/presence';

const TONE: Record<CaptionTone, string> = {
  info: 'border-line',
  muted: 'border-line text-muted',
  fail: 'border-fail/35',
  success: 'border-pass/40',
};

const plain = (md: string) => md.replace(/\*\*|`/g, '').replace(/^\s*[-*]\s+/gm, '');

export function CaptionAnnouncer() {
  const caption = useGame((s) => s.caption);
  return (
    <p role="status" className="sr-only">
      {caption ? plain([caption.text, caption.aside].filter(Boolean).join('\n\n')) : ''}
    </p>
  );
}

export function CaptionBar() {
  const { value: caption, leaving } = useLingering(useGame((s) => s.caption));
  const back = useGame((s) => (s.mode === 'tutorial' ? s.tutorial.back : null));
  const replayLocked = useGame((s) => s.busy || s.checking);
  const inLevel = useGame((s) => s.mode === 'level');
  const tr = useT();
  if (!caption) return null;
  const closable = inLevel && caption.tone !== 'success';
  return (
    <div
      key={caption.text}
      className={`relative flex min-h-0 flex-col gap-2.5 rounded-2xl border-2 bg-card py-3.5 pr-4 pl-4.5 text-md shadow-card backdrop-blur-md transition-colors duration-200 compact:gap-2 compact:py-2.75 compact:pr-3 compact:pl-3.5 compact:text-sm compact:leading-[1.45] ${TONE[caption.tone]} ${leaving ? 'pointer-events-none animate-sink-out' : 'animate-rise'}`}
    >
      {closable && (
        <button
          className={`${button('quiet', 'none')} absolute top-2.5 right-2.5 size-7 compact:top-2 compact:right-2 compact:size-6.5`}
          aria-label={tr.caption.close}
          title={tr.caption.close}
          onClick={() => useGame.setState({ caption: null })}
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      )}
      <div className={`min-h-0 overflow-y-auto ${closable ? 'pr-7 compact:pr-6.5' : ''}`}>
        <Markdown text={caption.text} />
        {caption.aside && (
          <div className="mt-2.5 border-t border-line pt-2.5 font-medium compact:mt-2 compact:pt-2">
            <Markdown text={caption.aside} />
          </div>
        )}
      </div>
      {(caption.action || caption.replay || caption.choices || back) && (
        <div className="-mr-1.5 flex min-h-8.5 flex-wrap items-center justify-end gap-1.5 compact:-mr-1">
          {back && (
            <button className={button('quiet', 'sm')} onClick={back}>
              <ArrowLeft size={15} strokeWidth={2.4} /> {tr.caption.back}
            </button>
          )}
          <span className="flex-1" />
          {caption.choices?.map((c) => (
            <button key={c.label} className={button('plain', 'sm')} onClick={c.onClick}>
              {c.tone === 'yes' && <Check size={15} strokeWidth={2.6} className="text-pass" />}
              {c.tone === 'no' && <X size={15} strokeWidth={2.6} className="text-fail" />}
              {c.label}
            </button>
          ))}
          {caption.replay && (
            <button className={button(caption.action ? 'quiet' : 'primary', 'sm')} disabled={replayLocked} onClick={caption.replay}>
              <RotateCcw size={15} strokeWidth={2.4} />
              {tr.caption.replay}
            </button>
          )}
          {caption.action && (
            <button className={button('primary', 'sm')} disabled={caption.action.disabled} onClick={() => caption.action!.onClick()}>
              {caption.action.label}
              <ArrowRight size={15} strokeWidth={2.4} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
