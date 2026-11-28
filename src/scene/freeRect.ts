export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const area = (r: Rect) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

export const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function edges(view: Rect, blocks: Rect[], lo: 'left' | 'top', hi: 'right' | 'bottom'): number[] {
  const all = [view[lo], view[hi], ...blocks.flatMap((b) => [b[lo], b[hi]])];
  return [...new Set(all.filter((v) => v >= view[lo] && v <= view[hi]))].sort((a, b) => a - b);
}

interface Block {
  rect: Rect;
  soft: boolean;
}

let held: { innerHeight: number; blocks: Block[] } | null = null;
let cached: Block[] | null = null;
let version = 0;
let sizes: ResizeObserver | null = null;
const observed = new Set<HTMLElement>();
const fits = new Map<string, Rect>();

function stale() {
  cached = null;
  fits.clear();
  version++;
}

function watch() {
  if (sizes) return;
  sizes = new ResizeObserver(stale);
  new MutationObserver(stale).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'open', 'data-frame'] });
  window.addEventListener('resize', stale);
  for (const type of ['animationstart', 'animationend', 'transitionrun', 'transitionend']) document.addEventListener(type, stale, true);
}

function measure(): Block[] {
  watch();
  if (cached) return cached;
  const els = [...document.querySelectorAll<HTMLElement>('[data-frame]')];
  for (const el of observed)
    if (!els.includes(el)) {
      sizes?.unobserve(el);
      observed.delete(el);
    }
  for (const el of els)
    if (!observed.has(el)) {
      sizes?.observe(el);
      observed.add(el);
    }
  cached = els.map((el) => ({ rect: el.getBoundingClientRect(), soft: el.dataset.frame === 'soft' })).filter(({ rect }) => rect.width && rect.height);
  return cached;
}

export const layoutVersion = () => {
  measure();
  return version;
};

const opensKeyboard = (el: EventTarget | null) => el instanceof HTMLElement && el.matches('input, textarea') && matchMedia('(pointer: coarse)').matches;

function onFocusIn(e: FocusEvent) {
  if (opensKeyboard(e.target) && !held) {
    held = { innerHeight: window.innerHeight, blocks: measure() };
    stale();
  }
}

function onFocusOut(e: FocusEvent) {
  if (opensKeyboard(e.relatedTarget) || !held) return;
  held = null;
  stale();
}

export function followKeyboard(): () => void {
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  return () => {
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    held = null;
    stale();
  };
}

export function softBlocks(): Rect[] {
  return (held?.blocks ?? measure()).filter((b) => b.soft).map((b) => b.rect);
}

export function freeRect(width: number, height: number, aspect = 0, soft = true): Rect {
  const blocks = held?.blocks ?? measure();
  const key = `${width}|${height}|${aspect}|${soft}|${window.innerHeight}`;
  let fit = fits.get(key);
  if (!fit) {
    fit = largestFree(blocks, width, height, aspect, soft);
    fits.set(key, fit);
  }
  return fit;
}

function largestFree(all: Block[], width: number, height: number, aspect: number, soft: boolean): Rect {
  const score = (r: Rect) => (aspect ? Math.min((r.right - r.left) / aspect, r.bottom - r.top) : area(r));
  const view: Rect = { left: 0, top: 0, right: width, bottom: Math.min(height, held?.innerHeight ?? window.innerHeight) };
  const blocks = all.filter((b) => (soft || !b.soft) && overlaps(b.rect, view)).map((b) => b.rect);
  const xs = edges(view, blocks, 'left', 'right');
  const ys = edges(view, blocks, 'top', 'bottom');
  let best = view;
  let bestScore = blocks.length ? 0 : score(view);
  for (const [i, left] of xs.entries())
    for (const right of xs.slice(i + 1))
      for (const [j, top] of ys.entries())
        for (const bottom of ys.slice(j + 1)) {
          const r = { left, top, right, bottom };
          const a = score(r);
          if (a <= bestScore || blocks.some((b) => overlaps(b, r))) continue;
          best = r;
          bestScore = a;
        }
  return best;
}
