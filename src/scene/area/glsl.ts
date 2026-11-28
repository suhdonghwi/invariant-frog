import * as THREE from 'three';
import { RISE, RISE_OVERSHOOT, SHORT, WAVE_CAP, WAVE_SPREAD } from '../../motion';

export const MASK_SIZE = 352;
export const SETTLE_POWER = 2.5;
export const FROM_SCALE = 255 / 127;

export const GLSL_MASK = /* glsl */ `
uniform highp sampler2D uMask;
uniform vec2 uMaskOrigin;
uniform highp sampler2D uFrom;
uniform vec2 uFromOrigin;
uniform float uWaveAge;
uniform vec2 uWaveCenter;
vec4 maskAt(vec2 tile) {
  ivec2 at = ivec2(floor(tile - uMaskOrigin + 0.5));
  if (at.x < 0 || at.y < 0 || at.x >= ${MASK_SIZE} || at.y >= ${MASK_SIZE}) return vec4(0.0);
  return texelFetch(uMask, at, 0);
}
float fromAt(vec2 tile, float to) {
  ivec2 at = ivec2(floor(tile - uFromOrigin + 0.5));
  if (at.x < 0 || at.y < 0 || at.x >= ${MASK_SIZE} || at.y >= ${MASK_SIZE}) return to;
  return texelFetch(uFrom, at, 0).r * ${FROM_SCALE.toFixed(6)};
}
float riseOf(vec4 m, vec2 tile) {
  float a = (uWaveAge - min(length(tile - uWaveCenter) * ${WAVE_SPREAD.toFixed(4)}, ${WAVE_CAP.toFixed(3)})) / ${RISE.toFixed(3)};
  if (a >= 1.0) return m.r;
  float from = fromAt(tile, m.r);
  if (a <= 0.0) return from;
  float b = a - 1.0;
  float e = m.r > from ? 1.0 + ${(RISE_OVERSHOOT + 1).toFixed(3)} * b * b * b + ${RISE_OVERSHOOT.toFixed(3)} * b * b : smoothstep(0.0, 1.0, a);
  return from + (m.r - from) * e;
}
float settle(float rise) {
  return pow(max(rise, 0.0), ${SETTLE_POWER.toFixed(1)});
}
float heightOf(vec4 m, vec2 tile) {
  return settle(riseOf(m, tile));
}
`;

export const GLSL_HEIGHT = /* glsl */ `
${GLSL_MASK}
attribute vec2 aTile;
uniform vec2 uTileShift;
uniform float uTime;
vec2 tileAt() {
  return aTile + uTileShift;
}
float heightNow() {
  vec2 t = tileAt();
  return heightOf(maskAt(t), t);
}
`;

export const SLOT_DUR = SHORT;
export const GLSL_SLOT = /* glsl */ `
attribute vec4 aSlot;
attribute vec3 aSlotAnim;
vec3 slotNow() {
  float u = smoothstep(0.0, 1.0, (uTime - aSlotAnim.z) / ${SLOT_DUR.toFixed(3)});
  return vec3(mix(aSlot.xy, aSlot.zw, u), mix(aSlotAnim.x, aSlotAnim.y, u));
}
`;

export const EGG_REGROW = SHORT;
export const GLSL_BACK = /* glsl */ `
attribute float aBack;
float backNow() {
  float b = clamp((uTime - aBack) / ${EGG_REGROW.toFixed(2)}, 0.0, 1.0);
  return 1.0 - pow(1.0 - b, 3.0);
}
`;

const APPEAR_OVERSHOOT = 1.70158;
export const GLSL_APPEAR = /* glsl */ `
uniform float uAppearT0;
uniform vec2 uAppearCenter;
float easeOutBack(float a) {
  float c1 = ${APPEAR_OVERSHOOT};
  float c3 = c1 + 1.0;
  return a <= 0.0 ? 0.0 : 1.0 + c3 * (a - 1.0) * (a - 1.0) * (a - 1.0) + c1 * (a - 1.0) * (a - 1.0);
}
float appearNow() {
  float delay = min(length(tileAt() - uAppearCenter) * 0.035, 0.7);
  float a = clamp((uTime - uAppearT0 - delay) / 0.38, 0.0, 1.0);
  return easeOutBack(a);
}
`;

export function instanced(base: THREE.BufferGeometry, count: number, attrs: Record<string, readonly [Float32Array, number]>) {
  const g = new THREE.InstancedBufferGeometry().copy(base as unknown as THREE.InstancedBufferGeometry);
  g.instanceCount = count;
  for (const [name, [array, size]] of Object.entries(attrs)) g.setAttribute(name, new THREE.InstancedBufferAttribute(array, size));
  return g;
}
