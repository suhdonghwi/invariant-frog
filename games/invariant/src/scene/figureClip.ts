export interface ClipBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const figureClip: { box: ClipBox | null } = { box: null };

export const figurePage = import.meta.env.DEV && new URLSearchParams(location.search).has('figure');

export function inFigureClip(x: number, y: number): boolean {
  const b = figureClip.box;
  return !b || (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
}
