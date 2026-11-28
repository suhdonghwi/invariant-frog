import * as THREE from 'three';
import { COLORS } from '../constants';
import type { TagTone } from './SceneTag';

export const CASING_COLOR = COLORS.outline;
export const RING_COLORS: Record<TagTone, string> = { info: '#ffffff', good: '#34d058', fail: COLORS.fail };
export const WASH_COLORS: Record<TagTone, string> = RING_COLORS;
export const RING_ALPHA = 1;
export const WASH_ALPHA = 0.3;

const OUTER = 0.97;
const INNER = 0.79;
const EDGE = 0.018;
const INNER_R = 0.115;

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

const rect = (w: number) => roundedRect(w, INNER_R + (w - INNER) / 2);

function band(outer: number, inner: number): THREE.Shape {
  const s = rect(outer);
  s.holes.push(rect(inner) as unknown as THREE.Path);
  return s;
}

const flat = (shapes: THREE.Shape[]) => new THREE.ShapeGeometry(shapes, 8).rotateX(-Math.PI / 2);

export const casingGeometry = flat([band(OUTER, OUTER - 2 * EDGE), band(INNER + 2 * EDGE, INNER)]);
export const ringGeometry = flat([band(OUTER - 2 * EDGE, INNER + 2 * EDGE)]);
export const washGeometry = flat([rect(INNER)]);
