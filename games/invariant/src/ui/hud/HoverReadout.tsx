import { useLayoutEffect, useRef } from 'react';
import { useGame } from '../../game/store';
import { scalarNames } from '../../levels/level';
import { useHover } from '../../scene/hover';
import { tileState } from '../../levels/tiles';

const READOUT =
  'flex animate-[fade_var(--duration-micro)_var(--ease-entrance)] items-center rounded-full bg-ink/86 p-1.25 text-sm text-white shadow-card compact:mx-4 compact:justify-center';
const VAR = 'flex items-baseline gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 font-mono';

function Values({ names, state }: { names: string[]; state: Record<string, unknown> }) {
  return (
    <span className="flex flex-wrap justify-center gap-1">
      {names.map((n) => (
        <span key={n} className={VAR}>
          <span className="text-white/55">{n}</span>
          <span className="font-semibold tabular-nums">{String(state[n])}</span>
        </span>
      ))}
    </span>
  );
}

const CHIP_ROOM = 64;
const ROOM_EDGE = 34;

function useTopRowPlacement(ref: React.RefObject<HTMLDivElement | null>, chips: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    const pill = document.querySelector('[data-topbar] > [data-pill]')?.getBoundingClientRect();
    if (!pill || window.innerWidth / 2 - (chips * CHIP_ROOM + ROOM_EDGE) / 2 < pill.right) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translateY(${pill.top + pill.height / 2 - (r.top + r.height / 2)}px)`;
  });
}

export function HoverReadout() {
  const level = useGame((s) => s.level)!;
  const inputs = useGame((s) => s.inputs);
  const reveal = useGame((s) => s.reveal);
  const tile = useHover((s) => s.tile);
  const ref = useRef<HTMLDivElement>(null);
  useTopRowPlacement(ref, scalarNames(level).length);
  if (!tile || !reveal.axes) return null;
  const s = tileState(level, tile[0], tile[1], inputs);
  return (
    <div className={READOUT} ref={ref}>
      <Values names={scalarNames(level).filter((n) => n in s)} state={s} />
    </div>
  );
}
