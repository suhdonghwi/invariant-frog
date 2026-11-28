import { invalidate } from '@react-three/fiber';
import { IDLE_REST, LINGER } from '../motion';
import { onSceneTick, sceneNow } from './sceneTime';

let until = -Infinity;
let input = -Infinity;
const reasons = new Set<() => boolean>();

export function wake(seconds = LINGER) {
  until = Math.max(until, sceneNow() + seconds);
  invalidate();
}

export function touched() {
  input = sceneNow();
  wake();
}

export const restless = () => sceneNow() - input < IDLE_REST;

export function keepAlive(reason: () => boolean): () => void {
  reasons.add(reason);
  invalidate();
  return () => reasons.delete(reason);
}

export function live(): boolean {
  if (sceneNow() < until) return true;
  for (const r of reasons) if (r()) return true;
  return false;
}

onSceneTick(() => wake());
