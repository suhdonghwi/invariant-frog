import * as THREE from 'three';
import { sceneNow } from './sceneTime';

export const MAX_EVENTS = 24;
const NONE = -100;

interface TileEvent {
  x: number;
  y: number;
  plane: string;
  t: number;
  weight: number;
}

export class TileEvents {
  private events: TileEvent[] = [];
  private synced: string | null = null;
  readonly at: { value: THREE.Vector4[] };
  readonly last = { value: NONE };

  constructor(readonly size: number) {
    this.at = { value: Array.from({ length: size }, () => new THREE.Vector4(0, 0, NONE, 0)) };
  }

  push(x: number, y: number, plane: string, t = sceneNow(), weight = 1) {
    if (this.events.some((e) => e.x === x && e.y === y && e.plane === plane && e.weight === weight && Math.abs(t - e.t) < 0.15)) return;
    this.events.push({ x, y, plane, t, weight });
    if (this.events.length > this.size) this.events.shift();
    this.synced = null;
  }

  sync(plane: string) {
    if (this.synced === plane) return;
    const out = this.at.value;
    let k = 0;
    let last = NONE;
    for (let i = this.events.length - 1; i >= 0 && k < out.length; i--) {
      const e = this.events[i];
      if (e.plane !== plane) continue;
      out[k++].set(e.x, e.y, e.t, e.weight);
      last = Math.max(last, e.t);
    }
    for (; k < out.length; k++) out[k].set(0, 0, NONE, 0);
    this.last.value = last;
    this.synced = plane;
  }

  clear() {
    this.events.length = 0;
    this.synced = null;
  }
}

export const goalEvents = new TileEvents(MAX_EVENTS);
export const landEvents = new TileEvents(2 * MAX_EVENTS);
