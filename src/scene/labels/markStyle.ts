import * as THREE from 'three';
import { COLORS } from '../constants';
import { figurePage } from '../figureClip';
import type { TagTone } from './SceneTag';

const SCREEN = {
  ring: { info: '#64748b', good: COLORS.trail, fail: COLORS.fail },
  wash: { info: '#64748b', good: '#34d058', fail: COLORS.fail },
  washAlpha: 0.3,
  outer: 0.96,
  inner: 0.84,
};

const PRINT = {
  ring: { info: '#2b3445', good: '#166534', fail: '#a3121a' },
  wash: { info: '#2b3445', good: '#34d058', fail: COLORS.fail },
  washAlpha: 0.45,
  outer: 0.88,
  inner: 0.72,
};

const STYLE = figurePage ? PRINT : SCREEN;

export const RING_COLORS: Record<TagTone, string> = STYLE.ring;
export const WASH_COLORS: Record<TagTone, string> = STYLE.wash;
export const RING_ALPHA = 1;
export const WASH_ALPHA = STYLE.washAlpha;

const { outer: OUTER, inner: INNER } = STYLE;

function roundedRect(w: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const h = w / 2;
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  return s;
}

const INNER_R = 0.115;
const OUTER_R = INNER_R + (OUTER - INNER) / 2;

export const ringGeometry = (() => {
  const outer = roundedRect(OUTER, OUTER_R);
  outer.holes.push(roundedRect(INNER, INNER_R) as unknown as THREE.Path);
  return new THREE.ShapeGeometry(outer, 8).rotateX(-Math.PI / 2);
})();
export const washGeometry = new THREE.ShapeGeometry(roundedRect(INNER, INNER_R), 8).rotateX(-Math.PI / 2);
