import { cameraRig, type Grip } from './cameraRig';

export function grab(canvas: HTMLElement): () => void {
  const held = new Map<number, { x: number; y: number }>();
  let rect = canvas.getBoundingClientRect();
  let grip: Grip | null = null;

  const gripOf = (): Grip | null => {
    if (!held.size) return null;
    let x = 0;
    let y = 0;
    for (const p of held.values()) {
      x += p.x;
      y += p.y;
    }
    x /= held.size;
    y /= held.size;
    let spread = 0;
    for (const p of held.values()) spread += Math.hypot(p.x - x, p.y - y);
    return { x, y, spread: spread / held.size };
  };

  const at = (e: PointerEvent) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });

  const down = (e: PointerEvent) => {
    if (!cameraRig.controls?.enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!held.size) rect = canvas.getBoundingClientRect();
    held.set(e.pointerId, at(e));
    grip = gripOf();
    cameraRig.userMoved();
  };

  const move = (e: PointerEvent) => {
    if (!held.has(e.pointerId)) return;
    held.set(e.pointerId, at(e));
    const next = gripOf();
    if (grip && next) cameraRig.drag(grip, next);
    grip = next;
  };

  const up = (e: PointerEvent) => {
    if (held.delete(e.pointerId)) grip = gripOf();
  };

  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
}
