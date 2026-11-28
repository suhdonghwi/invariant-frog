import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AtOrigin } from '../AtOrigin';
import { cameraRig } from '../cameraRig';
import { origin } from '../origin';
import { SLAB_H } from '../constants';
import { clamp01, smoothstep } from '../easing';
import { frogWorld } from '../frogs/frogWorld';
import { EGG_ALONE, EGG_ASIDE, occupancy } from '../frogs/occupancy';
import { eggGeometry } from '../models';
import { sceneNow } from '../sceneTime';
import { colorUniform, EGG_SHADOW_SIZE, getBlobTexture, GLSL_COMMON, GLSL_EGG_SHADOW, SHADOW_INK, stencilMark } from '../shaders/common';
import { fadeUniforms, GLSL_FADE, updateFade } from '../shaders/fade';
import { areaMask, EGG } from './mask';
import { useMaskTiles } from './maskTiles';
import { EGG_REGROW, GLSL_APPEAR, GLSL_BACK, GLSL_HEIGHT, GLSL_SLOT, instanced, SLOT_DUR } from './glsl';
import { GLSL_LAND, landUniforms } from './landBounce';

const eggVertex = /* glsl */ `
${GLSL_HEIGHT}
${GLSL_LAND}
${GLSL_SLOT}
${GLSL_APPEAR}
${GLSL_BACK}
attribute float aHide;
varying vec3 vN;
varying vec3 vWorld;
void main() {
  float h = heightNow();
  vec3 sl = slotNow();
  float s = (1.0 - aHide) * backNow() * sl.z * appearNow();
  vec3 p = position * s;
  vec2 tile = tileAt();
  vec4 w = vec4(p + vec3(tile.x + sl.x, h * ${SLAB_H.toFixed(3)} * (1.0 - landSquash(tile)), -tile.y - sl.y), 1.0);
  vWorld = w.xyz;
  vN = normal;
  gl_Position = projectionMatrix * modelViewMatrix * w;
}
`;
const eggFragment = /* glsl */ `
precision highp float;
varying vec3 vN;
varying vec3 vWorld;
uniform vec3 uEgg;
${GLSL_COMMON}
${GLSL_FADE}
void main() {
  vec3 n = normalize(vN);
  vec3 col = shadeLit(uEgg, n);
  col += pow(1.0 - max(n.y, 0.0), 3.0) * 0.04;
  col = applyFade(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
const shadowVertex = /* glsl */ `
${GLSL_HEIGHT}
${GLSL_LAND}
${GLSL_SLOT}
${GLSL_APPEAR}
${GLSL_BACK}
attribute float aHide;
varying vec2 vUv;
varying float vA;
void main() {
  vUv = uv;
  vec3 sl = slotNow();
  vA = (1.0 - aHide) * backNow() * sl.z * clamp(appearNow(), 0.0, 1.0);
  vec2 tile = tileAt();
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * sl.z + vec3(tile.x + sl.x, heightNow() * ${SLAB_H.toFixed(3)} * (1.0 - landSquash(tile)) + 0.006, -tile.y - sl.y), 1.0);
}
`;
const shadowFragment = /* glsl */ `
varying vec2 vUv;
varying float vA;
${GLSL_EGG_SHADOW}
void main() { gl_FragColor = vec4(${SHADOW_INK}, eggShadow(vUv) * vA); }
`;

interface SlotAnim {
  fx: number;
  fy: number;
  fs: number;
  tx: number;
  ty: number;
  ts: number;
  t0: number;
  hidden: boolean;
}

const PER_FROG_ATTRS = ['aHide', 'aBack', 'aSlot', 'aSlotAnim'] as const;

const DETAILED_WITHIN = 40;
const DETAILED_UNTIL = 56;
const NEVER_BACK = -100;

export function Eggs() {
  const { tiles, cx, cy, distance } = useMaskTiles(EGG);
  const { near, far } = useMemo(() => {
    const near: [number, number][] = [];
    const far: [number, number][] = [];
    const R = Math.max(0, Math.min(DETAILED_WITHIN, DETAILED_UNTIL - distance));
    const R2 = R * R;
    for (const t of tiles) (R > 0 && (t[0] - cx) ** 2 + (t[1] - cy) ** 2 <= R2 ? near : far).push(t);
    return { near, far };
  }, [tiles, cx, cy, distance]);
  const shapes = useMemo(() => ({ detailed: eggGeometry(), plain: eggGeometry(5, 8) }), []);
  useEffect(() => () => (shapes.detailed.dispose(), shapes.plain.dispose()), [shapes]);
  return (
    <>
      <EggField eggs={near} base={shapes.detailed} />
      <EggField eggs={far} base={shapes.plain} />
    </>
  );
}

function indexOf(eggs: [number, number][], x: number, y: number): number {
  let lo = 0;
  let hi = eggs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [mx, my] = eggs[mid];
    const d = my - y || mx - x;
    if (d === 0) return mid;
    if (d < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

const AT_REST: SlotAnim = { fx: EGG_ALONE.dx, fy: EGG_ALONE.dy, fs: EGG_ALONE.scale, tx: EGG_ALONE.dx, ty: EGG_ALONE.dy, ts: EGG_ALONE.scale, t0: -1000, hidden: false };

const settled = (a: SlotAnim, now: number) => !a.hidden && a.tx === EGG_ALONE.dx && a.ty === EGG_ALONE.dy && a.ts === EGG_ALONE.scale && now - a.t0 >= SLOT_DUR;

function EggField({ eggs, base }: { eggs: [number, number][]; base: THREE.BufferGeometry }) {
  const shadowBase = useMemo(() => new THREE.PlaneGeometry(EGG_SHADOW_SIZE, EGG_SHADOW_SIZE).rotateX(-Math.PI / 2), []);
  const slots = useRef(new Map<string, SlotAnim>());
  const touched = useRef<number[]>([]);
  const synced = useRef({ geom: null as THREE.BufferGeometry | null, hatch: -1, occ: -1 });

  const { geom, shadowGeom } = useMemo(() => {
    const n = eggs.length;
    const tile = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      tile[i * 2] = eggs[i][0] - origin.x;
      tile[i * 2 + 1] = eggs[i][1] - origin.y;
    }
    const back = new Float32Array(n).fill(NEVER_BACK);
    const slotAnim = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) slotAnim[i * 3] = slotAnim[i * 3 + 1] = EGG_ALONE.scale;
    const attrs = {
      aTile: [tile, 2],
      aHide: [new Float32Array(n), 1],
      aBack: [back, 1],
      aSlot: [new Float32Array(n * 4), 4],
      aSlotAnim: [slotAnim, 3],
    } as const;
    const geom = instanced(base, n, attrs);
    geom.userData.at = { x: origin.x, y: origin.y };
    return { geom, shadowGeom: instanced(shadowBase, n, attrs) };
  }, [eggs, base, shadowBase]);
  useEffect(() => () => (geom.dispose(), shadowGeom.dispose()), [geom, shadowGeom]);

  const syncFrogs = (geom: THREE.BufferGeometry, shadowGeom: THREE.BufferGeometry) => {
    const s = synced.current;
    if (s.geom === geom && s.hatch === frogWorld.hatchVersion && s.occ === occupancy.version) return;
    const fresh = s.geom !== geom;
    synced.current = { geom, hatch: frogWorld.hatchVersion, occ: occupancy.version };
    const hide = geom.getAttribute('aHide').array as Float32Array;
    const back = geom.getAttribute('aBack').array as Float32Array;
    const slot = geom.getAttribute('aSlot').array as Float32Array;
    const slotAnim = geom.getAttribute('aSlotAnim').array as Float32Array;
    const now = sceneNow();
    if (!fresh) {
      for (const i of touched.current) {
        hide[i] = 0;
        back[i] = NEVER_BACK;
        slot.fill(0, i * 4, i * 4 + 4);
        slotAnim.set([EGG_ALONE.scale, EGG_ALONE.scale, 0], i * 3);
      }
    }
    const keys = new Set([...frogWorld.hatched, ...frogWorld.returned.keys(), ...occupancy.frogs.keys(), ...slots.current.keys()]);
    const next: number[] = [];
    for (const k of keys) {
      const comma = k.indexOf(',');
      const i = indexOf(eggs, Number(k.slice(0, comma)), Number(k.slice(comma + 1)));
      if (i < 0) {
        slots.current.delete(k);
        continue;
      }
      const hatched = frogWorld.hatched.has(k);
      hide[i] = hatched ? 1 : 0;
      back[i] = frogWorld.returned.get(k) ?? NEVER_BACK;
      const target = occupancy.frogs.has(k) ? EGG_ASIDE : EGG_ALONE;
      const prev = slots.current.get(k) ?? AT_REST;
      const unseen = hatched || prev.hidden || now - back[i] < EGG_REGROW;
      let cur: SlotAnim = { fx: target.dx, fy: target.dy, fs: target.scale, tx: target.dx, ty: target.dy, ts: target.scale, t0: 0, hidden: hatched };
      if (!unseen) {
        const e = smoothstep(clamp01((now - prev.t0) / SLOT_DUR));
        const at = { x: prev.fx + (prev.tx - prev.fx) * e, y: prev.fy + (prev.ty - prev.fy) * e, s: prev.fs + (prev.ts - prev.fs) * e };
        cur =
          prev.tx === target.dx && prev.ty === target.dy && prev.ts === target.scale
            ? prev
            : { fx: at.x, fy: at.y, fs: at.s, tx: target.dx, ty: target.dy, ts: target.scale, t0: now, hidden: false };
      }
      if (settled(cur, now)) slots.current.delete(k);
      else slots.current.set(k, cur);
      slot.set([cur.fx, cur.fy, cur.tx, cur.ty], i * 4);
      slotAnim.set([cur.fs, cur.ts, cur.t0], i * 3);
      next.push(i);
    }
    touched.current = next;
    for (const g of [geom, shadowGeom]) for (const name of PER_FROG_ATTRS) g.getAttribute(name).needsUpdate = true;
  };

  const material = useMemo(
    () =>
      stencilMark(
        new THREE.ShaderMaterial({
          vertexShader: eggVertex,
          fragmentShader: eggFragment,
          uniforms: {
            uTime: { value: 0 },
            uEgg: colorUniform('egg'),
            uAppearT0: { value: sceneNow() },
            uAppearCenter: { value: new THREE.Vector2(cameraRig.target().x - origin.x, -cameraRig.target().z - origin.y) },
            uTileShift: { value: new THREE.Vector2() },
            ...fadeUniforms(),
            ...areaMask.uniforms,
            ...landUniforms(),
          },
        }),
      ),
    [],
  );
  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shadowVertex,
        fragmentShader: shadowFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { ...areaMask.uniforms, ...landUniforms(), uTileShift: material.uniforms.uTileShift, uTime: material.uniforms.uTime, uMap: { value: getBlobTexture() }, uAppearT0: material.uniforms.uAppearT0, uAppearCenter: material.uniforms.uAppearCenter },
      }),
    [material],
  );
  useEffect(() => () => (shadowBase.dispose(), material.dispose(), shadowMat.dispose()), [shadowBase, material, shadowMat]);
  const eggMesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const shadowMesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const egg = eggMesh.current;
    if (!egg || !shadowMesh.current) return;
    syncFrogs(egg.geometry, shadowMesh.current.geometry);
    const u = egg.material.uniforms;
    (u.uTileShift.value as THREE.Vector2).set(egg.geometry.userData.at.x - origin.x, egg.geometry.userData.at.y - origin.y);
    u.uTime.value = sceneNow();
    updateFade(u);
  });
  return (
    <AtOrigin>
      <mesh ref={shadowMesh} geometry={shadowGeom} material={shadowMat} frustumCulled={false} renderOrder={2} />
      <mesh ref={eggMesh} geometry={geom} material={material} frustumCulled={false} />
    </AtOrigin>
  );
}
