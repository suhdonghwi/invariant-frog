import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

const WINDOW_MS = 250;
const GAP_MS = 100;
const WINDOWS = 10;
const AGREE = 0.75;
const STEP = 0.1;

interface Meter {
  since: number;
  last: number;
  frames: number;
  rates: number[];
  top: number;
  factor: number;
}

export function Resolution({ onChange }: { onChange: (factor: number) => void }) {
  const meter = useRef<Meter>({ since: 0, last: -Infinity, frames: 0, rates: [], top: 0, factor: 1 });
  useFrame(() => {
    const m = meter.current;
    const now = performance.now();
    if (now - m.last > GAP_MS) {
      m.since = now;
      m.frames = 0;
    }
    m.last = now;
    if (now - m.since < WINDOW_MS) {
      m.frames++;
      return;
    }
    const rate = (m.frames * 1000) / (now - m.since);
    m.since = now;
    m.frames = 0;
    m.top = Math.max(m.top, rate);
    m.rates.push(rate);
    if (m.rates.length < WINDOWS) return;
    const [low, high] = m.top > 100 ? [60, 100] : [40, 60];
    const below = m.rates.filter((r) => r < low).length / WINDOWS;
    const above = m.rates.filter((r) => r >= high).length / WINDOWS;
    m.rates = [];
    const next = below >= AGREE ? Math.max(0, m.factor - STEP) : above >= AGREE ? Math.min(1, m.factor + STEP) : m.factor;
    if (next === m.factor) return;
    m.factor = next;
    onChange(next);
  });
  return null;
}
