import * as THREE from 'three';
import { sceneNow } from './sceneTime';

export const MAX_EVENTS = 24;
const NONE = -100;

interface TileEvent {
  x: number;
  y: number;
  plane: string;
  t: number;
}

export class TileEvents {
  private events: TileEvent[] = [];
  private synced: string | null = null;
  readonly at = { value: Array.from({ length: MAX_EVENTS }, () => new THREE.Vector3(0, 0, NONE)) };
  readonly last = { value: NONE };

  push(x: number, y: number, plane: string, t = sceneNow()) {
    if (this.events.some((e) => e.x === x && e.y === y && e.plane === plane && Math.abs(t - e.t) < 0.15)) return;
    this.events.push({ x, y, plane, t });
    if (this.events.length > MAX_EVENTS) this.events.shift();
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
      out[k++].set(e.x, e.y, e.t);
      last = Math.max(last, e.t);
    }
    for (; k < out.length; k++) out[k].set(0, 0, NONE);
    this.last.value = last;
    this.synced = plane;
  }

  clear() {
    this.events.length = 0;
    this.synced = null;
  }
}

export const goalEvents = new TileEvents();
export const landEvents = new TileEvents();
