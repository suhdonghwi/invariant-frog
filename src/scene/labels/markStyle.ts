import * as THREE from 'three';
import { COLORS } from '../constants';
import { figurePage } from '../figureClip';
import type { TagTone } from './SceneTag';

const SCREEN = {
  ring: { info: '#64748b', good: COLORS.trail, fail: COLORS.fail },
  wash: { info: '#64748b', good: '#34d058', fail: COLORS.fail },
  washAlpha: 0.3,
  outer: { w: 0.96, r: 0.165 },
  inner: { w: 0.84, r: 0.115 },
};

const PRINT = {
  ring: { info: '#2b3445', good: '#166534', fail: '#a3121a' },
  wash: { info: '#2b3445', good: '#34d058', fail: COLORS.fail },
  washAlpha: 0.45,
  outer: { w: 0.92, r: 0.11 },
  inner: { w: 0.82, r: 0.06 },
};

const STYLE = figurePage ? PRINT : SCREEN;

export const RING_COLORS: Record<TagTone, string> = STYLE.ring;
export const WASH_COLORS: Record<TagTone, string> = STYLE.wash;
export const RING_ALPHA = 1;
export const WASH_ALPHA = STYLE.washAlpha;

function roundedRect({ w, r }: { w: number; r: number }): THREE.Shape {
  const s = new THREE.Shape();
  const h = w / 2 - r;
  s.absarc(h, -h, r, -Math.PI / 2, 0);
  s.absarc(h, h, r, 0, Math.PI / 2);
  s.absarc(-h, h, r, Math.PI / 2, Math.PI);
  s.absarc(-h, -h, r, Math.PI, (3 * Math.PI) / 2);
  return s;
}

export const ringGeometry = (() => {
  const outer = roundedRect(STYLE.outer);
  outer.holes.push(roundedRect(STYLE.inner) as unknown as THREE.Path);
  return new THREE.ShapeGeometry(outer, 8).rotateX(-Math.PI / 2);
})();
export const washGeometry = new THREE.ShapeGeometry(roundedRect(STYLE.inner), 8).rotateX(-Math.PI / 2);
