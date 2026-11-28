import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { TileWindow } from '../../levels/tiles';
import { MASK_REACH } from '../area/mask';
import { cameraRig } from '../cameraRig';
import { viewRadius } from '../shaders/fade';

const MIN_R = 16;
const MIN_DRIFT = 4;
const DRIFT_SHARE = 0.125;

export function useTileWindow(): TileWindow {
  const [win, setWin] = useState<TileWindow>({ cx: 0, cy: 0, R: MIN_R });
  const seen = useRef({ cx: 0, cy: 0, R: -Infinity, drift: MIN_DRIFT });
  useFrame(() => {
    const t = cameraRig.target();
    const cx = Math.round(t.x);
    const cy = Math.round(-t.z);
    const R = Math.max(MIN_R, Math.min(MASK_REACH, Math.ceil(viewRadius())));
    const s = seen.current;
    if (Math.abs(cx - s.cx) <= s.drift && Math.abs(cy - s.cy) <= s.drift && R <= s.R && R >= s.R - 2 * s.drift) return;
    const drift = Math.max(MIN_DRIFT, Math.round(R * DRIFT_SHARE));
    seen.current = { cx, cy, R: R + drift, drift };
    setWin({ cx, cy, R: R + 2 * drift });
  });
  return win;
}
