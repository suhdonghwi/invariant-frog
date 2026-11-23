import * as THREE from 'three';
import { COLORS } from '../constants';

export const GLSL_COMMON = /* glsl */ `
const float STOP_HATCH_FREQ = 3.0;
float stopHatch(float v, float fw) {
  float s = fract(v);
  float e = clamp(fw, 0.02, 0.25);
  float h = smoothstep(0.0, e, s) * (1.0 - smoothstep(0.5 - e, 0.5, s));
  return mix(h, 0.45, smoothstep(0.3, 0.7, fw));
}
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 shadeLit(vec3 base, vec3 n) {
  vec3 L = normalize(vec3(0.45, 0.9, 0.35));
  float hemi = 0.5 + 0.5 * n.y;
  float diff = max(dot(n, L), 0.0);
  return base * (0.58 + 0.17 * hemi + 0.33 * diff);
}
`;

const BLOB_SIZE = 128;
const STENCIL_SOLID = 1;
const BLOB_CORE = 0.55;
const SHADOW_RGB = [40, 50, 70];
export const SHADOW_INK = `vec3(${SHADOW_RGB.map((c) => (c / 255).toFixed(3)).join(', ')})`;

let blobTexture: THREE.Texture | null = null;
export function getBlobTexture(): THREE.Texture {
  if (blobTexture) return blobTexture;
  const c = document.createElement('canvas');
  c.width = c.height = BLOB_SIZE;
  const g = c.getContext('2d')!;
  const img = g.createImageData(BLOB_SIZE, BLOB_SIZE);
  const half = BLOB_SIZE / 2;
  for (let y = 0; y < BLOB_SIZE; y++) {
    for (let x = 0; x < BLOB_SIZE; x++) {
      const r = Math.min(1, Math.hypot(x + 0.5 - half, y + 0.5 - half) / half);
      const i = (y * BLOB_SIZE + x) * 4;
      img.data.set([...SHADOW_RGB, Math.round(255 * BLOB_CORE * (1 - r * r * (3 - 2 * r)))], i);
    }
  }
  g.putImageData(img, 0, 0);
  blobTexture = new THREE.CanvasTexture(c);
  return blobTexture;
}

export function blobShadowMaterial(strength: number, plateau = 0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        #else
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #endif
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float a = ${BLOB_CORE.toFixed(2)} * (1.0 - smoothstep(${plateau.toFixed(2)}, 1.0, r));
        gl_FragColor = vec4(${SHADOW_INK}, a * ${strength.toFixed(2)});
      }`,
  });
}

export const EGG_SHADOW_SIZE = 0.66;
const EGG_CONTACT = { strength: 0.15, from: 0.12, to: 0.26 };
const EGG_BLOB = 0.36;

export const GLSL_EGG_SHADOW = /* glsl */ `
uniform sampler2D uMap;
float eggShadow(vec2 uv) {
  float blob = texture2D(uMap, uv).a * ${EGG_BLOB.toFixed(2)};
  float r = length(uv - 0.5) * ${EGG_SHADOW_SIZE.toFixed(2)};
  float contact = ${EGG_CONTACT.strength.toFixed(2)} * (1.0 - smoothstep(${EGG_CONTACT.from.toFixed(2)}, ${EGG_CONTACT.to.toFixed(2)}, r));
  return 1.0 - (1.0 - blob) * (1.0 - contact);
}
`;

export function eggShadowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: getBlobTexture() } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${GLSL_EGG_SHADOW}
      void main() {
        gl_FragColor = vec4(${SHADOW_INK}, eggShadow(vUv));
      }`,
  });
}

export function stencilMark<M extends THREE.Material>(m: M): M {
  m.stencilWrite = true;
  m.stencilRef = STENCIL_SOLID;
  m.stencilFunc = THREE.AlwaysStencilFunc;
  m.stencilZPass = THREE.ReplaceStencilOp;
  return m;
}

export function stencilSkip<M extends THREE.Material>(m: M): M {
  m.stencilWrite = true;
  m.stencilRef = STENCIL_SOLID;
  m.stencilFunc = THREE.NotEqualStencilFunc;
  return m;
}

export const colorUniform = (c: keyof typeof COLORS) => ({ value: new THREE.Color(COLORS[c]) });
