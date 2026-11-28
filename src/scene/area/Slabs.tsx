import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CompiledLevel } from '../../levels/level';
import { BASE, LONG } from '../../motion';
import { AtOrigin } from '../AtOrigin';
import { cameraRig } from '../cameraRig';
import { SLAB_H, TILE } from '../constants';
import { Toward } from '../easing';
import { hover } from '../hover';
import { GLSL_ORIGIN, origin, originUniforms } from '../origin';
import { sceneNow, TIME_UNIFORM } from '../sceneTime';
import { axisNameUniforms, getDigitTexture, GLSL_AXIS_LABELS, setAxisNames } from '../shaders/axisLabels';
import { colorUniform, GLSL_BLOB, GLSL_COMMON, SHADOW_INK } from '../shaders/common';
import { FADE_UNIFORMS, fadeRadius, GLSL_FADE } from '../shaders/fade';
import { GLSL_GOAL, goalUniforms } from '../shaders/goal';
import { GLSL_MASK, instanced } from './glsl';
import { GLSL_LAND, LAND_BULGE, landUniforms } from './landBounce';
import { areaMask, MASK_REACH } from './mask';
import { VisibleCells } from './visibleCells';

const CORNER = 0.07;
const BEVEL = 0.07;
const ROUND = [3, 3] as const;
const FACETED = [1, 1] as const;
const FACETED_BELOW_PX = 30;
const SHADOW_SIZE = 1.45;
const CONTACT = { strength: 0.2, reach: 0.12, corner: 0.02 };
const FLOOR_LOOK_BELOW = 0.5;
const FLOOR_CORNER = 0.1;

const slabVertex = /* glsl */ `
${GLSL_MASK}
uniform float uTime;
${GLSL_LAND}
attribute vec2 aOffset;
uniform vec2 uGrid;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vF;
varying vec2 vFlags;
varying vec2 vTile;
varying float vRise;
void main() {
  vec2 tile = uGrid + aOffset;
  vec4 m = maskAt(tile);
  float rise = riseOf(m, tile);
  float h = settle(rise);
  if (rise < 0.002) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  float s = landSquash(tile) * h;
  vec3 p = position;
  p.xz *= 1.0 + s * ${LAND_BULGE.toFixed(2)};
  p.y = p.y * (1.0 - s) + (h - 1.0) * ${SLAB_H.toFixed(3)};
  vec4 w = vec4(p + vec3(tile.x, 0.0, -tile.y), 1.0);
  vWorld = w.xyz;
  vN = normal;
  vF = vec2(position.x, -position.z);
  vFlags = vec2(m.b, mod(floor(m.a * 3.0 + 0.5), 2.0));
  vTile = tile;
  vRise = rise;
  gl_Position = projectionMatrix * modelViewMatrix * w;
}
`;

const slabFragment = /* glsl */ `
precision highp float;
precision highp int;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vF;
varying vec2 vFlags;
varying vec2 vTile;
varying float vRise;
uniform vec3 uTop, uSide, uHatch, uLabel, uLabelHalo;
uniform vec3 uFloorTile, uFloorGap, uFloorStop, uFloorHatch, uFloorLabel, uFloorLabelHalo;
uniform ivec2 uHover;
uniform float uHoverOn;
uniform float uDim;
${GLSL_ORIGIN}
uniform float uStopAmt;
uniform float uGoalAmt;
${GLSL_COMMON}
${GLSL_AXIS_LABELS}
${GLSL_GOAL}
${GLSL_FADE}
vec3 topColor(float stopFlag, float goalFlag, float hatch, float fwr) {
  vec3 col = uTop;
  bool stop = stopFlag > 0.5 && uStopAmt > 0.002;
  if (stop) col = mix(uTop, uHatch, hatch * uStopAmt);
  if (stop && goalFlag > 0.5 && uGoalAmt > 0.002) col = mix(col, drawGoal(col, vF, fwr, vTile), uGoalAmt);
  return col;
}
vec3 floorLook(float stopFlag, float goalFlag, float hatch, float fwr, vec4 df, ivec2 t, float inside) {
  vec3 col = uFloorTile;
  bool stop = stopFlag > 0.5 && uStopAmt > 0.002;
  if (stop) col = mix(uFloorTile, mix(uFloorStop, uFloorHatch, hatch), uStopAmt);
  if (stop && goalFlag > 0.5 && uGoalAmt > 0.002) col = mix(col, drawGoal(col, vF, fwr, vTile), uGoalAmt);
  col = drawAxisLabel(col, vF, df, t, uFloorLabel, uFloorLabelHalo, 1.0, 1.0);
  return mix(uFloorGap, col, inside);
}
void main() {
  vec4 df = vec4(dFdx(vF), dFdy(vF));
  float hatchV = (vF.x - vF.y) * STOP_HATCH_FREQ;
  float hatch = stopHatch(hatchV, fwidth(hatchV));
  float fwr = fwidth(length(vF));
  float ringD = abs(sdRoundBox(vF, vec2(0.372), 0.1)) - 0.026;
  float fwRing = fwidth(ringD);
  float edge = sdRoundBox(vF, vec2(${(TILE / 2).toFixed(3)}), ${FLOOR_CORNER.toFixed(2)});
  float inside = 1.0 - smoothstep(-fwidth(edge), fwidth(edge), edge);
  ivec2 t = ivec2(floor(vTile + 0.5)) + uOriginTile;
  vec3 n = normalize(vN);
  float top = step(0.6, n.y);
  vec3 col;
  if (top > 0.5) {
    col = topColor(vFlags.x, vFlags.y, hatch, fwr);
    if (uGoalAmt > 0.002) col = mix(col, SPLASH, splashAt(vTile + vF) * 0.45 * uGoalAmt);
    col = drawAxisLabel(col, vF, df, t, uLabel, uLabelHalo, 0.9, 1.0);
    if (uHoverOn > 0.5 && t == uHover) {
      col = mix(col, vec3(1.0), (1.0 - smoothstep(-fwRing, fwRing, ringD)) * 0.95);
    }
  } else {
    col = uSide;
  }
  col = shadeLit(col, n);
  col = mix(col, vec3(0.86, 0.88, 0.92), uDim);
  float floorAmt = 1.0 - clamp(vRise / ${FLOOR_LOOK_BELOW.toFixed(2)}, 0.0, 1.0);
  if (floorAmt > 0.0) col = mix(col, floorLook(vFlags.x, vFlags.y, hatch, fwr, df, t, inside), floorAmt);
  col = applyFade(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const shadowVertex = /* glsl */ `
${GLSL_MASK}
attribute vec2 aOffset;
uniform vec2 uGrid;
varying vec2 vUv;
varying float vH;
void main() {
  vec2 tile = uGrid + aOffset;
  vUv = uv;
  vH = heightOf(maskAt(tile), tile);
  if (vH < 0.002) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(tile.x, 0.003, -tile.y), 1.0);
}
`;
const shadowFragment = /* glsl */ `
${GLSL_COMMON}
varying vec2 vUv;
varying float vH;
${GLSL_BLOB}
void main() {
  float soft = blob(vUv) * 0.75;
  float d = sdRoundBox((vUv - 0.5) * ${SHADOW_SIZE.toFixed(2)}, vec2(${(TILE / 2).toFixed(3)}), ${CONTACT.corner.toFixed(2)});
  float contact = ${CONTACT.strength.toFixed(2)} * (1.0 - smoothstep(0.0, ${CONTACT.reach.toFixed(2)}, d));
  float a = 1.0 - (1.0 - soft) * (1.0 - contact);
  gl_FragColor = vec4(${SHADOW_INK}, a * vH);
}
`;


function slabGeometry(cornerSteps: number, bevelSteps: number): THREE.BufferGeometry {
  const half = TILE / 2;
  const rim: [number, number, number, number][] = [];
  for (let c = 0; c < 4; c++) {
    const sx = c === 0 || c === 3 ? 1 : -1;
    const sz = c < 2 ? 1 : -1;
    for (let k = 0; k <= cornerSteps; k++) {
      const a = (c + k / cornerSteps) * (Math.PI / 2);
      rim.push([sx * (half - CORNER), sz * (half - CORNER), Math.cos(a), Math.sin(a)]);
    }
  }
  const n = rim.length;
  const position: number[] = [0, SLAB_H, 0];
  const normal: number[] = [0, 1, 0];
  const ring = (reach: number, y: number, tilt: number) => {
    const first = position.length / 3;
    for (const [x, z, nx, nz] of rim) {
      position.push(x + nx * reach, y, z + nz * reach);
      normal.push(nx * Math.sin(tilt), Math.cos(tilt), nz * Math.sin(tilt));
    }
    return first;
  };
  const rings = Array.from({ length: bevelSteps + 1 }, (_, k) => {
    const tilt = (k / bevelSteps) * (Math.PI / 2);
    return ring(CORNER - BEVEL * (1 - Math.sin(tilt)), SLAB_H - BEVEL * (1 - Math.cos(tilt)), tilt);
  });
  rings.push(ring(CORNER, 0, Math.PI / 2));
  const index: number[] = [];
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    index.push(0, rings[0] + next, rings[0] + k);
    for (let r = 1; r < rings.length; r++) {
      const upper = rings[r - 1];
      const lower = rings[r];
      index.push(upper + k, upper + next, lower + k, upper + next, lower + next, lower + k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setIndex(index);
  return g;
}

export function Slabs({ level, dim, showStop, showGoal }: { level: CompiledLevel; dim: boolean; showStop: boolean; showGoal: boolean }) {
  const camera = useThree((three) => three.camera);
  const canvas = useThree((three) => three.gl.domElement);
  const cells = useMemo(() => new VisibleCells(), []);
  const geoms = useMemo(() => {
    const shadow = new THREE.PlaneGeometry(SHADOW_SIZE, SHADOW_SIZE).rotateX(-Math.PI / 2);
    const at = (base: THREE.BufferGeometry, offsets: THREE.InstancedBufferAttribute) => {
      const g = instanced(base, 0, {});
      g.setAttribute('aOffset', offsets);
      return g;
    };
    return {
      near: { slabs: at(slabGeometry(...ROUND), cells.near), shadow: at(shadow, cells.near) },
      far: { slabs: at(slabGeometry(...FACETED), cells.far), shadow: at(shadow, cells.far) },
    };
  }, [cells]);
  useEffect(() => () => [geoms.near, geoms.far].forEach((g) => (g.slabs.dispose(), g.shadow.dispose())), [geoms]);

  const [material] = useState(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: slabVertex,
        fragmentShader: slabFragment,
        uniforms: {
          uTime: TIME_UNIFORM,
          uTop: colorUniform('slabTop'),
          uSide: colorUniform('slabSide'),
          uHatch: colorUniform('slabHatch'),
          uLabel: colorUniform('slabLabel'),
          uLabelHalo: colorUniform('slabLabelHalo'),
          uFloorTile: colorUniform('tile'),
          uFloorGap: colorUniform('gap'),
          uFloorStop: colorUniform('stopTile'),
          uFloorHatch: colorUniform('stopHatch'),
          uFloorLabel: colorUniform('label'),
          uFloorLabelHalo: colorUniform('labelHalo'),
          ...goalUniforms(),
          uHover: { value: new THREE.Vector2() },
          uHoverOn: { value: 0 },
          uDim: { value: 0 },
          uStopAmt: { value: showStop ? 1 : 0 },
          uGoalAmt: { value: showGoal ? 1 : 0 },
          uDigits: { value: getDigitTexture() },
          ...axisNameUniforms(),
          ...FADE_UNIFORMS,
          ...areaMask.uniforms,
          ...landUniforms(),
          ...originUniforms(),
          uGrid: { value: new THREE.Vector2() },
        },
      }),
  );
  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shadowVertex,
        fragmentShader: shadowFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { ...areaMask.uniforms, uGrid: material.uniforms.uGrid },
      }),
    [material],
  );
  useEffect(() => () => (material.dispose(), shadowMat.dispose()), [material, shadowMat]);
  useEffect(() => setAxisNames(material.uniforms, level), [material, level]);
  const [amounts] = useState(() => ({ dim: new Toward(0, BASE), stop: new Toward(showStop ? 1 : 0, LONG), goal: new Toward(showGoal ? 1 : 0, LONG) }));
  const nearShadow = useRef<THREE.Mesh<THREE.InstancedBufferGeometry>>(null);
  const farShadow = useRef<THREE.Mesh<THREE.InstancedBufferGeometry>>(null);
  const nearSlabs = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>>(null);
  const farSlabs = useRef<THREE.Mesh<THREE.InstancedBufferGeometry>>(null);
  useFrame(() => {
    if (!nearSlabs.current || !farSlabs.current || !nearShadow.current || !farShadow.current) return;
    const u = nearSlabs.current.material.uniforms;
    const t = sceneNow();
    const ht = hover.tile;
    u.uHoverOn.value = ht ? 1 : 0;
    if (ht) u.uHover.value.set(ht[0], ht[1]);
    u.uDim.value = amounts.dim.at(dim ? 0.55 : 0, t);
    u.uStopAmt.value = amounts.stop.at(showStop ? 1 : 0, t);
    u.uGoalAmt.value = amounts.goal.at(showGoal ? 1 : 0, t);
    const reach = Math.min(MASK_REACH, Math.ceil(fadeRadius()));
    const target = cameraRig.target();
    (u.uGrid.value as THREE.Vector2).set(Math.round(target.x) - origin.x, Math.round(-target.z) - origin.y);
    const tilePxAtUnitDistance = (camera.projectionMatrix.elements[5] * canvas.height) / 2;
    cells.update(camera, target, reach, tilePxAtUnitDistance / FACETED_BELOW_PX);
    nearSlabs.current.geometry.instanceCount = nearShadow.current.geometry.instanceCount = cells.nearCount;
    farSlabs.current.geometry.instanceCount = farShadow.current.geometry.instanceCount = cells.farCount;
  });
  return (
    <AtOrigin>
      <mesh ref={nearShadow} geometry={geoms.near.shadow} material={shadowMat} frustumCulled={false} renderOrder={1} />
      <mesh ref={farShadow} geometry={geoms.far.shadow} material={shadowMat} frustumCulled={false} renderOrder={1} />
      <mesh ref={nearSlabs} geometry={geoms.near.slabs} material={material} frustumCulled={false} />
      <mesh ref={farSlabs} geometry={geoms.far.slabs} material={material} frustumCulled={false} />
    </AtOrigin>
  );
}
