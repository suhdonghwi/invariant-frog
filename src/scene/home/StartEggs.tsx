import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { field } from '../area/field';
import { COLORS } from '../constants';
import { popIn } from '../easing';
import { uploadInstances } from '../instances';
import { eggGeometry } from '../models';
import { sceneNow } from '../sceneTime';
import { EGG_SHADOW_SIZE, eggShadowMaterial } from '../shaders/common';

export interface StartEgg {
  x: number;
  y: number;
  appear: number;
  hatch: number;
}

const MAX = 16;
const dummy = new THREE.Object3D();

export function StartEggs({ eggs }: { eggs: React.RefObject<StartEgg[]> }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(eggGeometry(), new THREE.MeshStandardMaterial({ color: COLORS.egg, roughness: 0.7 }), MAX);
    m.frustumCulled = false;
    m.count = 0;
    return m;
  }, []);
  const shadow = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(EGG_SHADOW_SIZE, EGG_SHADOW_SIZE).rotateX(-Math.PI / 2), eggShadowMaterial(), MAX);
    m.frustumCulled = false;
    m.count = 0;
    m.renderOrder = 2;
    return m;
  }, []);
  useEffect(() => () => [mesh, shadow].forEach((m) => (m.geometry.dispose(), m.material.dispose())), [mesh, shadow]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    const mesh = meshRef.current;
    const shadow = shadowRef.current;
    if (!mesh || !shadow) return;
    const t = sceneNow();
    let n = 0;
    for (const e of eggs.current) {
      if (t < e.appear || t >= e.hatch || n >= MAX) continue;
      const ground = field.groundAt(e.x, e.y);
      dummy.position.set(e.x, ground, -e.y);
      dummy.scale.setScalar(popIn((t - e.appear) / 0.32));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      dummy.position.y = ground + 0.006;
      dummy.updateMatrix();
      shadow.setMatrixAt(n++, dummy.matrix);
    }
    mesh.count = shadow.count = n;
    uploadInstances(n, mesh.instanceMatrix);
    uploadInstances(n, shadow.instanceMatrix);
  });
  return (
    <>
      <primitive ref={shadowRef} object={shadow} />
      <primitive ref={meshRef} object={mesh} />
    </>
  );
}
