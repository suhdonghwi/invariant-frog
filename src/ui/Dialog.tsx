import { Check } from 'lucide-react';
import { useGame, type Game } from '../game/store';
import { usePresence } from '../hooks/presence';
import { useT } from '../i18n/i18n';
import { button } from './classes';

const modal = (el: HTMLDivElement | null) => {
  if (!el) return;
  const opener = document.activeElement;
  const rest = [...el.parentElement!.children].filter((c): c is HTMLElement => c !== el && c instanceof HTMLElement && !c.inert);
  for (const c of rest) c.inert = true;
  (el.querySelector('button') ?? el).focus();
  return () => {
    for (const c of rest) c.inert = false;
    if (opener instanceof HTMLElement) opener.focus();
  };
};

export function Overlay({ open, onClose, label, card, children }: { open: boolean; onClose: () => void; label: string; card: string; children: React.ReactNode }) {
  const { mounted, leaving } = usePresence(open);
  if (!mounted) return null;
  return (
    <div
      ref={modal}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-horizon/55 p-4 outline-none backdrop-blur-xs max-sm:p-2.5 ${leaving ? 'pointer-events-none animate-fade-out' : 'animate-fade'}`}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className={`max-h-full w-full rounded-3xl shadow-float ${card} ${leaving ? 'animate-pop-out' : 'animate-[pop_0.18s_var(--ease-entrance)]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Dialog({ flag, label, wide, children }: { flag: 'showRules' | 'showSyntax'; label: string; wide?: boolean; children: React.ReactNode }) {
  const open = useGame((s) => s[flag]);
  const tr = useT();
  const close = () => useGame.setState({ [flag]: false } as Partial<Game>);
  return (
    <Overlay open={open} onClose={close} label={label} card={`${wide ? 'max-w-185' : 'max-w-150'} overflow-y-auto bg-white px-7.5 pt-7 pb-6 text-center max-sm:px-5 max-sm:pt-6`}>
      {children}
      <button className={button('primary')} onClick={close}>
        <Check size={17} strokeWidth={2.6} /> {tr.gotIt}
      </button>
    </Overlay>
  );
}
