import { landEvents } from '../tileEvents';

const LAND = { depth: 0.13, dur: 0.85, freq: 21, decay: 5.5 };
export const LAND_BULGE = 0.35;
export const TAKEOFF_PRESS = 0.4;
export const HATCH_PRESS = 0.5;

export const GLSL_LAND = /* glsl */ `
uniform vec4 uLands[${landEvents.size}];
uniform float uLastLand;
float landSquash(vec2 tile) {
  if (uTime - uLastLand > ${LAND.dur.toFixed(2)}) return 0.0;
  float s = 0.0;
  for (int i = 0; i < ${landEvents.size}; i++) {
    vec4 e = uLands[i];
    float age = uTime - e.z;
    if (age < 0.0 || age > ${LAND.dur.toFixed(2)}) continue;
    if (abs(e.x - tile.x) > 0.5 || abs(e.y - tile.y) > 0.5) continue;
    s += e.w * ${LAND.depth.toFixed(3)} * sin(age * ${LAND.freq.toFixed(1)}) * exp(-age * ${LAND.decay.toFixed(1)});
  }
  return s;
}
`;

export const landUniforms = () => ({ uLands: landEvents.at, uLastLand: landEvents.last });

export function landSquash(x: number, y: number, t: number): number {
  if (t - landEvents.last.value > LAND.dur) return 0;
  let s = 0;
  for (const e of landEvents.live) {
    const age = t - e.t;
    if (age < 0 || age > LAND.dur || e.x !== x || e.y !== y) continue;
    s += e.weight * LAND.depth * Math.sin(age * LAND.freq) * Math.exp(-age * LAND.decay);
  }
  return s;
}
