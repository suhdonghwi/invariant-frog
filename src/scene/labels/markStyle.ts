import * as THREE from 'three';
import type { TagTone } from './SceneTag';

export const RING_COLORS: Record<TagTone, string> = { info: '#334155', good: '#007722', fail: '#be0019' };
export const WASH_COLORS = RING_COLORS;
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
