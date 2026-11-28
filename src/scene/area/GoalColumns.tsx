import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AtOrigin } from '../AtOrigin';
import { COLORS, SLAB_H } from '../constants';
import { origin } from '../origin';
import { sceneNow } from '../sceneTime';
import { goalEvents } from '../tileEvents';
import { stencilSkip } from '../shaders/common';
import { GLSL_GOAL_PULSE } from '../shaders/goal';
import { areaMask, GOAL } from './mask';
import { useMaskTiles } from './maskTiles';
import { GLSL_HEIGHT, instanced } from './glsl';
import { GLSL_LAND, landUniforms } from './landBounce';

const vertex = /* glsl */ `
${GLSL_HEIGHT}
${GLSL_LAND}
${GLSL_GOAL_PULSE}
varying float vV;
varying float vBurst;
varying vec3 vN;
varying vec3 vView;
void main() {
  vV = uv.y;
  vec2 tile = tileAt();
  float burst = tilePulse(tile, 1.0, 0.06, 1.6);
  vBurst = burst;
  vec3 pos = position * vec3(1.0 + 0.25 * burst, 1.0 + 2.2 * burst, 1.0 + 0.25 * burst);
  vec4 v = modelViewMatrix * vec4(pos + vec3(tile.x, heightNow() * ${SLAB_H.toFixed(3)} * (1.0 - landSquash(tile)) + 0.004, -tile.y), 1.0);
  vView = v.xyz;
  vN = normalMatrix * normal;
  gl_Position = projectionMatrix * v;
}
`;

const fragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uAppearT0;
varying float vV;
varying float vBurst;
varying vec3 vN;
varying vec3 vView;
void main() {
  vec3 V = normalize(-vView);
  float edge = pow(1.0 - abs(dot(normalize(vN), V)), 1.4);
  float fall = pow(1.0 - vV, 1.6);
  float a = fall * (0.2 + 0.32 * edge);
  a += (0.25 + 0.45 * edge) * vBurst * pow(1.0 - vV, 0.8);
  a *= smoothstep(0.0, 0.7, uTime - uAppearT0);
  vec3 col = mix(uColor, vec3(1.0, 0.93, 0.72), 0.25 + 0.4 * vBurst);
  gl_FragColor = vec4(col, min(a, 0.92));
  #include <colorspace_fragment>
}
`;

export function GoalColumns() {
  const { tiles } = useMaskTiles(GOAL);

  const base = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.4, 40, 1, true).translate(0, 0.2, 0), []);
  const geom = useMemo(() => {
    const n = tiles.length;
    const tile = new Float32Array(n * 2);
    tiles.forEach(([x, y], i) => tile.set([x - origin.x, y - origin.y], i * 2));
    const g = instanced(base, n, { aTile: [tile, 2] });
    g.userData.at = { x: origin.x, y: origin.y };
    return g;
  }, [tiles, base]);
  useEffect(() => () => geom.dispose(), [geom]);

  const material = useMemo(
    () =>
      stencilSkip(
        new THREE.ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: fragment,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(COLORS.goal) },
            uAppearT0: { value: sceneNow() },
            uTileShift: { value: new THREE.Vector2() },
            uEvents: goalEvents.at,
            ...areaMask.uniforms,
            ...landUniforms(),
          },
        }),
      ),
    [],
  );
  useEffect(() => () => (base.dispose(), material.dispose()), [base, material]);
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.material.uniforms.uTime.value = sceneNow();
    (m.material.uniforms.uTileShift.value as THREE.Vector2).set(m.geometry.userData.at.x - origin.x, m.geometry.userData.at.y - origin.y);
  });
  return (
    <AtOrigin>
      <mesh ref={mesh} geometry={geom} material={material} frustumCulled={false} renderOrder={6} />
    </AtOrigin>
  );
}
