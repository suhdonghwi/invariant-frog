import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { create } from 'zustand';
import { useGame } from '../../game/store';
import { planeKey } from '../../levels/inputs';
import { field } from '../area/field';
import { clamp01 } from '../easing';
import { AtOrigin } from '../AtOrigin';
import { uploadInstances } from '../instances';
import { origin } from '../origin';
import { APPEAR, ringPop } from '../labels/Region';
import { RING_ALPHA, RING_COLORS, ringGeometry, SLAB_RING_COLORS, SLAB_WASH_COLORS, WASH_ALPHA, WASH_COLORS, washGeometry } from '../labels/markStyle';
import { sceneNow } from '../sceneTime';
import { frogWorld, leaveFade, type FrogSim } from './frogWorld';
import { HopLine } from './HopLine';
import { ARC_DRAW } from '../../motion';

const MAX = 80;

interface Arc {
  frog: FrogSim;
  tx: number;
  ty: number;
  t0: number;
  ring: boolean;
}

const useHopArcs = create<{ arcs: Arc[] }>(() => ({ arcs: [] }));

export const hopArcs = {
  add(a: Arc) {
    useHopArcs.setState((s) => ({ arcs: [...s.arcs, a].slice(-MAX) }));
  },
  clear() {
    useHopArcs.setState({ arcs: [] });
  },
};

const vertex = /* glsl */ `
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;
const fragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vColor, vAlpha);
  #include <colorspace_fragment>
}
`;

function instancedParts(base: THREE.BufferGeometry, count: number) {
  const g = base.clone();
  const color = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  g.setAttribute('aColor', color);
  g.setAttribute('aAlpha', alpha);
  const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false });
  return { g, mat, color, alpha };
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const RING = new THREE.Color(RING_COLORS.good);
const WASH = new THREE.Color(WASH_COLORS.good);
const SLAB_RING = new THREE.Color(SLAB_RING_COLORS.good);
const SLAB_WASH = new THREE.Color(SLAB_WASH_COLORS.good);
const mixed = new THREE.Color();

function SeeThroughHop({ arc, plane }: { arc: Arc; plane: string }) {
  return (
    <HopLine
      path={() => {
        const { frog } = arc;
        if (frog.plane !== plane || !frogWorld.frogs.includes(frog)) return null;
        const t = sceneNow();
        const fx = frog.drawn ? frog.drawn.x : frog.x;
        const fy = frog.drawn ? -frog.drawn.z : frog.y;
        return {
          from: [fx, fy, field.groundAt(frog.x, frog.y)],
          to: [arc.tx, arc.ty, field.groundAt(arc.tx, arc.ty)],
          drawn: (t - arc.t0) / ARC_DRAW,
          opacity: (frog.fade ?? 1) * leaveFade(frog, t),
        };
      }}
    />
  );
}

export function HopArcs() {
  const list = useHopArcs((s) => s.arcs);
  const rings = useRef<THREE.InstancedMesh>(null);
  const washes = useRef<THREE.InstancedMesh>(null);
  const plane = useGame((s) => planeKey(s.inputs));
  const parts = useMemo(() => ({ ring: instancedParts(ringGeometry, MAX), wash: instancedParts(washGeometry, MAX) }), []);
  useEffect(() => () => [parts.ring, parts.wash].forEach((p) => (p.g.dispose(), p.mat.dispose())), [parts]);

  useFrame(() => {
    const r = rings.current;
    const w = washes.current;
    if (!r || !w) return;
    const t = sceneNow();
    let { arcs } = useHopArcs.getState();
    if (arcs.some((a) => !frogWorld.frogs.includes(a.frog))) {
      arcs = arcs.filter((a) => frogWorld.frogs.includes(a.frog));
      useHopArcs.setState({ arcs });
    }
    let nr = 0;
    for (const { frog, t0, ring } of arcs) {
      if (frog.plane !== plane || !ring) continue;
      const shown = clamp01((t - t0 - ARC_DRAW) / APPEAR);
      if (shown <= 0) continue;
      const { scale, alpha } = ringPop(shown);
      const h0 = field.groundAt(frog.x, frog.y);
      m.compose(pos.set(frog.x - origin.x, h0 + 0.012, origin.y - frog.y), q, scl.set(scale, 1, scale));
      const fade = alpha * (frog.fade ?? 1) * leaveFade(frog, t);
      const h = clamp01(field.heightAt(frog.x, frog.y));
      for (const [mesh, p, opacity, c, slab] of [
        [r, parts.ring, RING_ALPHA, RING, SLAB_RING],
        [w, parts.wash, WASH_ALPHA, WASH, SLAB_WASH],
      ] as const) {
        mesh.setMatrixAt(nr, m);
        mixed.lerpColors(c, slab, h);
        p.color.setXYZ(nr, mixed.r, mixed.g, mixed.b);
        p.alpha.setX(nr, opacity * fade);
      }
      nr++;
    }
    for (const [mesh, p] of [
      [r, parts.ring],
      [w, parts.wash],
    ] as const) {
      mesh.count = nr;
      uploadInstances(nr, mesh.instanceMatrix, p.color, p.alpha);
    }
  });

  return (
    <>
      {list.map((a) => (
        <SeeThroughHop key={a.frog.id} arc={a} plane={plane} />
      ))}
      <AtOrigin>
        <instancedMesh ref={washes} args={[parts.wash.g, parts.wash.mat, MAX]} count={0} frustumCulled={false} renderOrder={8} />
        <instancedMesh ref={rings} args={[parts.ring.g, parts.ring.mat, MAX]} count={0} frustumCulled={false} renderOrder={9} />
      </AtOrigin>
    </>
  );
}
