import { useGame, type CaptionTone } from '../game/store';
import type { CompiledLevel } from '../levels/level';

export class Aborted extends Error {}

export interface Token {
  readonly alive: boolean;
  guard(): void;
}

export function createScope() {
  let current = 0;
  const token = (id: number): Token => ({
    get alive() {
      return id === current;
    },
    guard() {
      if (id !== current) throw new Aborted();
    },
  });
  return { begin: () => token(++current), watch: () => token(current) };
}

const sequences = createScope();

export function begin(): Token {
  useGame.setState({ busy: false, running: false });
  return sequences.begin();
}

export const watchSequence = sequences.watch;

export async function busyWhile<T>(body: (tok: Token) => Promise<T>): Promise<T> {
  const tok = begin();
  useGame.setState({ busy: true });
  try {
    return await body(tok);
  } finally {
    if (tok.alive) useGame.setState({ busy: false });
  }
}

export const currentLevel = (): CompiledLevel => useGame.getState().level!;

export function caption(text: string, tone: CaptionTone) {
  useGame.setState({ caption: { text, tone } });
}

export type EventName = 'stepped' | 'runDone';

const listeners = new Set<(e: EventName) => void>();

export const events = {
  emit(e: EventName) {
    listeners.forEach((l) => l(e));
  },
  on(l: (e: EventName) => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};
