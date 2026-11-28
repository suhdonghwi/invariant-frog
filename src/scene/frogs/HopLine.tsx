import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { COLORS } from '../constants';
import { arcPoints, fitArcLine, setArc, useArcLine, type ArcEnd } from './hopArc';

const SEGMENTS = 24;

interface HopPath {
  from: ArcEnd;
  to: ArcEnd;
  drawn: number;
  opacity: number;
}

export function HopLine({ path }: { path: () => HopPath | null }) {
  const size = useThree((s) => s.size);
  const line = useArcLine(COLORS.hopLine);
  const lineRef = useRef<LineSegments2>(null);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const p = path();
    line.visible = !!p && p.opacity > 0 && p.drawn > 0;
    if (!p || !line.visible) return;
    const count = Math.max(1, Math.round(SEGMENTS * Math.min(1, p.drawn)));
    const key = [...p.from, ...p.to].map((v) => v.toFixed(3)).join() + `:${count}`;
    if (key !== line.userData.key) {
      line.userData.key = key;
      setArc(line, arcPoints(p.from, p.to, SEGMENTS, count));
    }
    line.material.opacity = 0.9 * p.opacity;
    fitArcLine(line, size);
  });

  return <primitive ref={lineRef} object={line} />;
}
