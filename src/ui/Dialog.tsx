import { Check } from 'lucide-react';
import { useGame, type Game } from '../game/store';
import { usePresence } from '../hooks/presence';
import { useT } from '../i18n/i18n';
import { button } from './classes';

const modal = (d: HTMLDialogElement | null) => {
  if (!d) return;
  if (!d.open) d.showModal();
  return () => d.close();
};

export function Overlay({ open, onClose, label, card, children }: { open: boolean; onClose: () => void; label: string; card: string; children: React.ReactNode }) {
  const { mounted, leaving } = usePresence(open);
  if (!mounted) return null;
  return (
    <dialog
      ref={modal}
      aria-label={label}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-visible bg-transparent p-0 backdrop:bg-transparent"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className={`fixed inset-0 flex items-center justify-center bg-horizon/55 p-4 backdrop-blur-xs max-sm:p-2.5 ${leaving ? 'pointer-events-none animate-fade-out' : 'animate-fade'}`}
        onClick={onClose}
      >
        <div
          className={`max-h-full w-full rounded-3xl shadow-float ${card} ${leaving ? 'animate-pop-out' : 'animate-[pop_0.18s_var(--ease-entrance)]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </dialog>
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
