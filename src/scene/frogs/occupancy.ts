import type { FrogSim } from './frogWorld';

export interface Slot {
  dx: number;
  dy: number;
  scale: number;
}

const LAYOUTS: Slot[][] = [
  [{ dx: 0, dy: 0, scale: 1 }],
  [
    { dx: -0.2, dy: 0.02, scale: 0.78 },
    { dx: 0.2, dy: -0.02, scale: 0.78 },
  ],
  [
    { dx: -0.2, dy: -0.13, scale: 0.7 },
    { dx: 0.2, dy: -0.13, scale: 0.7 },
    { dx: 0, dy: 0.18, scale: 0.7 },
  ],
  [
    { dx: -0.2, dy: 0.19, scale: 0.62 },
    { dx: 0.2, dy: 0.19, scale: 0.62 },
    { dx: -0.2, dy: -0.19, scale: 0.62 },
    { dx: 0.2, dy: -0.19, scale: 0.62 },
  ],
];

export const MAX_SHOWN = 4;

export const EGG_ALONE: Slot = { dx: 0, dy: 0, scale: 1 };
export const EGG_ASIDE: Slot = { dx: 0.27, dy: -0.25, scale: 0.5 };

export function slotFor(index: number, count: number): Slot {
  const layout = LAYOUTS[Math.min(count, MAX_SHOWN) - 1] ?? LAYOUTS[0];
  if (index >= MAX_SHOWN) return { dx: 0, dy: 0, scale: 0 };
  return layout[index] ?? LAYOUTS[0][0];
}

export const tileKey = (f: FrogSim) => (f.hop ? `${f.hop.tx},${f.hop.ty}` : `${f.x},${f.y}`);
export const leftTiles = (f: FrogSim) => (f.hop ? f.trail! : f.trail!.slice(0, -1));

export function byTile(frogs: FrogSim[], groups = new Map<string, FrogSim[]>()): Map<string, FrogSim[]> {
  for (const g of groups.values()) g.length = 0;
  for (const f of frogs) {
    const key = tileKey(f);
    const g = groups.get(key);
    if (g) g.push(f);
    else groups.set(key, [f]);
  }
  for (const [key, g] of groups) if (!g.length) groups.delete(key);
  return groups;
}

export const occupancy = {
  frogs: new Map<string, number>(),
  version: 0,
  signature: '',
  scratch: new Map<string, number>(),
  update(visible: FrogSim[], walkers: FrogSim[]) {
    const taken = this.scratch;
    taken.clear();
    const take = (k: string) => taken.set(k, (taken.get(k) ?? 0) + 1);
    for (const f of visible) if (!f.leave) take(tileKey(f));
    for (const w of walkers) if (!w.leave) for (const [x, y] of leftTiles(w)) take(`${x},${y}`);
    let sig = '';
    for (const [k, count] of taken) sig += `${k}:${count}|`;
    if (sig === this.signature) return;
    this.signature = sig;
    this.frogs = new Map(taken);
    this.version++;
  },
};
