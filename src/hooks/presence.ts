import { useEffect, useRef, useState } from 'react';
import { EXIT_MS } from '../motion';
import { clamp01, easeIn } from '../scene/easing';

export function usePresence(show: boolean): { mounted: boolean; leaving: boolean } {
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);
  useEffect(() => {
    if (show) return;
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [show]);
  return { mounted: show || mounted, leaving: !show && mounted };
}

export function useLingering<T>(current: T | null | undefined): { value: T | null; leaving: boolean } {
  const [last, setLast] = useState<T | null>(current ?? null);
  if (current != null && current !== last) setLast(current);
  const { mounted, leaving } = usePresence(current != null);
  return { value: mounted ? (current ?? last) : null, leaving };
}

interface Gone<T> {
  item: T;
  key: string;
  index: number;
}

export function usePresentList<T>(items: readonly T[], keyOf: (t: T) => string): { item: T; key: string; leaving: boolean }[] {
  const [prev, setPrev] = useState(items);
  const [gone, setGone] = useState<Gone<T>[]>([]);
  const keys = new Set(items.map(keyOf));
  const changed = prev.length !== items.length || prev.some((item, i) => keyOf(item) !== keyOf(items[i]));
  if (changed) {
    const next = gone.filter((g) => !keys.has(g.key));
    prev.forEach((item, index) => {
      const key = keyOf(item);
      if (!keys.has(key) && !next.some((g) => g.key === key)) next.push({ item, key, index });
    });
    setPrev(items);
    setGone(next);
  }

  const timers = useRef(new Map<Gone<T>, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    for (const g of gone) {
      if (timers.current.has(g)) continue;
      const t = setTimeout(() => {
        timers.current.delete(g);
        setGone((list) => list.filter((x) => x !== g));
      }, EXIT_MS);
      timers.current.set(g, t);
    }
  }, [gone]);
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);

  const out = items.map((item) => ({ item, key: keyOf(item), leaving: false }));
  for (const g of gone) if (!keys.has(g.key)) out.splice(Math.min(g.index, out.length), 0, { item: g.item, key: g.key, leaving: true });
  return out;
}

class ExitFade {
  private leftAt: number | null = null;

  at(leaving: boolean): number {
    if (!leaving) this.leftAt = null;
    else if (this.leftAt === null) this.leftAt = performance.now();
    return this.leftAt === null ? 1 : 1 - easeIn(clamp01((performance.now() - this.leftAt) / EXIT_MS));
  }
}

export function useExitFade(leaving: boolean): () => number {
  const [fade] = useState(() => new ExitFade());
  return () => fade.at(leaving);
}
