import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../../game/store';
import { useExitFade } from '../../hooks/presence';
import type { Expr } from '../../lang/ast';
import type { CompiledLevel } from '../../levels/level';
import { areaMask, failMask, MASK_REACH, MASK_SIZE } from '../area/mask';
import { GLSL_MASK, instanced } from '../area/glsl';
import { VisibleCells } from '../area/visibleCells';
import { AtOrigin } from '../AtOrigin';
import { cameraRig } from '../cameraRig';
import { SLAB_H } from '../constants';
import { figureClip } from '../figureClip';
import { origin } from '../origin';
import { sceneNow } from '../sceneTime';
import { fadeUniforms, GLSL_FADE, updateFade } from '../shaders/fade';
import { APPEAR, GLSL_RING_POP } from './Region';
import { RING_ALPHA, RING_COLORS, ringGeometry, WASH_ALPHA, WASH_COLORS, washGeometry } from './markStyle';


const vertex = /* glsl */ `
${GLSL_MASK}
${GLSL_RING_POP}
uniform highp sampler2D uFail;
uniform vec2 uFailOrigin;
uniform vec2 uGrid;
uniform vec4 uClip;
uniform float uClipOn;
uniform float uTime;
uniform float uT0;
attribute vec2 aOffset;
varying vec3 vWorld;
varying float vA;
bool failing(vec2 tile) {
  ivec2 at = ivec2(floor(tile - uFailOrigin + 0.5));
  if (at.x < 0 || at.y < 0 || at.x >= ${MASK_SIZE} || at.y >= ${MASK_SIZE}) return false;
  return texelFetch(uFail, at, 0).r > 0.5;
}
void main() {
  vec2 tile = uGrid + aOffset;
  bool clipped = uClipOn > 0.5 && (tile.x < uClip.x || tile.y < uClip.y || tile.x > uClip.z || tile.y > uClip.w);
  if (clipped || !failing(tile)) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  float a = clamp((uTime - uT0) / ${APPEAR.toFixed(2)}, 0.0, 1.0);
  float s = ringPopScale(a);
  vec4 w = vec4(position * vec3(s, 1.0, s) + vec3(tile.x, heightOf(maskAt(tile), tile) * ${SLAB_H.toFixed(3)} + 0.012, -tile.y), 1.0);
  vWorld = w.xyz;
  vA = ringPopAlpha(a);
  gl_Position = projectionMatrix * modelViewMatrix * w;
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uOut;
varying vec3 vWorld;
varying float vA;
${GLSL_FADE}
void main() {
  gl_FragColor = vec4(applyFade(uColor, vWorld), uAlpha * vA * uOut);
  #include <colorspace_fragment>
}
`;

interface FailRingsProps {
  level: CompiledLevel;
  fail: Expr;
  t0: number;
  leaving: boolean;
}

export function FailRings({ level, fail, t0, leaving }: FailRingsProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const inputs = useGame((s) => s.inputs);
  const cells = useMemo(() => new VisibleCells(), []);
  useEffect(() => {
    failMask.show(level, fail);
    return () => failMask.clear();
  }, [level, fail]);

  const shared = useMemo(
    () => ({
      uFail: failMask.uniforms.uMask,
      uFailOrigin: failMask.uniforms.uMaskOrigin,
      uGrid: { value: new THREE.Vector2() },
      uClip: { value: new THREE.Vector4() },
      uClipOn: { value: 0 },
      uTime: { value: 0 },
      uT0: { value: 0 },
      uOut: { value: 1 },
      ...fadeUniforms(),
    }),
    [],
  );
  const materials = useMemo(() => {
    const make = (alpha: number, color: string) =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: { ...shared, ...areaMask.uniforms, uAlpha: { value: alpha }, uColor: { value: new THREE.Color(color) } },
      });
    return { ring: make(RING_ALPHA, RING_COLORS.fail), wash: make(WASH_ALPHA, WASH_COLORS.fail) };
  }, [shared]);
  useEffect(() => () => (materials.ring.dispose(), materials.wash.dispose()), [materials]);
  const geoms = useMemo(() => {
    const at = (base: THREE.BufferGeometry) => {
      const g = instanced(base, 0, {});
      g.setAttribute('aOffset', cells.near);
      return g;
    };
    return { ring: at(ringGeometry), wash: at(washGeometry) };
  }, [cells]);
  useEffect(() => () => (geoms.ring.dispose(), geoms.wash.dispose()), [geoms]);
  const exit = useExitFade(leaving);

  const ring = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>>(null);
  const wash = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>>(null);

  useFrame(() => {
    if (!ring.current || !wash.current) return;
    const u = ring.current.material.uniforms;
    const target = cameraRig.target();
    failMask.draw(gl, target.x, -target.z, inputs, sceneNow());
    const reach = Math.min(MASK_REACH, Math.ceil(updateFade(u)));
    (u.uGrid.value as THREE.Vector2).set(Math.round(target.x) - origin.x, Math.round(-target.z) - origin.y);
    const box = figureClip.box;
    u.uClipOn.value = box ? 1 : 0;
    if (box) (u.uClip.value as THREE.Vector4).set(box.x0 - origin.x, box.y0 - origin.y, box.x1 - origin.x, box.y1 - origin.y);
    u.uTime.value = sceneNow();
    u.uT0.value = t0;
    u.uOut.value = exit();
    cells.update(camera, target, reach, Infinity);
    ring.current.geometry.instanceCount = wash.current.geometry.instanceCount = cells.nearCount;
  });

  return (
    <AtOrigin>
      <mesh ref={wash} geometry={geoms.wash} material={materials.wash} frustumCulled={false} renderOrder={8} />
      <mesh ref={ring} geometry={geoms.ring} material={materials.ring} frustumCulled={false} renderOrder={9} />
    </AtOrigin>
  );
}
