import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { clickTile } from '../../director/controls';
import { useT } from '../../i18n/i18n';
import { cameraRig, MAX_DISTANCE } from '../cameraRig';
import { hover } from '../hover';

const STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};
const DOLLY = 1.25;
const MIN_DISTANCE = 6;

function onKey(e: KeyboardEvent) {
  const step = STEPS[e.key];
  if (step) {
    e.preventDefault();
    const from = hover.tile ?? (({ x, y }) => [Math.round(x), Math.round(y)] as [number, number])(cameraRig.viewCenter());
    const to: [number, number] = hover.tile ? [from[0] + step[0], from[1] + step[1]] : from;
    hover.set(to);
    if (!cameraRig.shows(to)) void cameraRig.frame({ focus: [to] });
    return;
  }
  if (e.key === 'Enter' && hover.tile) {
    e.preventDefault();
    clickTile(hover.tile[0], hover.tile[1]);
    return;
  }
  if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '−') {
    e.preventDefault();
    const d = cameraRig.distance() * (e.key === '-' || e.key === '−' ? DOLLY : 1 / DOLLY);
    void cameraRig.zoomTo(Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d)));
    return;
  }
  if (e.key === 'Escape') hover.set(null);
}

export function useKeyboardCursor() {
  const canvas = useThree((s) => s.gl.domElement);
  const label = useT().board.label;
  useEffect(() => {
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', label);
    canvas.addEventListener('keydown', onKey);
    return () => {
      canvas.removeEventListener('keydown', onKey);
      canvas.removeAttribute('tabindex');
      canvas.removeAttribute('role');
      canvas.removeAttribute('aria-label');
    };
  }, [canvas, label]);
}
