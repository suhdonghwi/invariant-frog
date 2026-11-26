import * as THREE from 'three';
import { COLORS } from '../constants';
import type { TagTone } from './SceneTag';

// The rings and washes that mark tiles. Rings are dark, so they stand apart from
// both the white floor and the blue slabs even in grayscale, and they stop short
// of the tile's edge, so the rings of neighbouring tiles stay apart.

const INFO = '#2b3445';

export const RING_COLORS: Record<TagTone, string> = { info: INFO, good: '#166534', fail: '#a3121a' };
export const WASH_COLORS: Record<TagTone, string> = { info: INFO, good: '#34d058', fail: COLORS.fail };
export const RING_ALPHA = 1;
export const WASH_ALPHA = 0.3;

const OUTER = 0.96;
const INNER = 0.84;

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
const OUTER_R = INNER_R + 0.05;

export const ringGeometry = (() => {
  const outer = roundedRect(OUTER, OUTER_R);
  outer.holes.push(roundedRect(INNER, INNER_R) as unknown as THREE.Path);
  return new THREE.ShapeGeometry(outer, 8).rotateX(-Math.PI / 2);
})();
export const washGeometry = new THREE.ShapeGeometry(roundedRect(INNER, INNER_R), 8).rotateX(-Math.PI / 2);
