import type { Z3LowLevel } from 'z3-solver';

// z3-solver's finalizers dec_ref on the main thread while solver.check() runs on a worker,
// and Z3's reference counts aren't thread-safe, so dec_refs wait until the check ends.
type LowLevel = Z3LowLevel['Z3'];

let solving = 0;
const queued: (() => void)[] = [];

export function guardDecRefs(Z3: LowLevel): void {
  const api = Z3 as unknown as Record<string, unknown>;
  for (const key of Object.keys(api)) {
    if (key !== 'dec_ref' && !key.endsWith('_dec_ref')) continue;
    const original = api[key] as (...args: unknown[]) => void;
    api[key] = (...args: unknown[]) => {
      if (solving) queued.push(() => original(...args));
      else original(...args);
    };
  }
}

export async function whileSolving<T>(run: () => Promise<T>): Promise<T> {
  solving++;
  try {
    return await run();
  } finally {
    if (--solving === 0) for (const f of queued.splice(0)) f();
  }
}
