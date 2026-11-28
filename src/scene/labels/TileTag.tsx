import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { field } from '../area/field';
import { useExitFade } from '../../hooks/presence';
import { keepAlive } from '../awake';
import { sceneNow } from '../sceneTime';
import { RING_ALPHA, RING_COLORS, ringGeometry, WASH_ALPHA, WASH_COLORS, washGeometry } from './markStyle';
import { SceneTag, type TagTone } from './SceneTag';
import { BASE, reducedMotion } from '../../motion';

interface TileTagProps {
  x: number;
  y: number;
  label: string;
  tone: TagTone;
  pulse?: boolean;
  leaving?: boolean;
}

export function TileTag({ x, y, label, tone, pulse = false, leaving = false }: TileTagProps) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const washRef = useRef<THREE.Mesh>(null);
  const t0 = useRef(sceneNow());
  const exit = useExitFade(leaving);
  useEffect(() => (pulse ? keepAlive(() => !reducedMotion()) : undefined), [pulse]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = sceneNow() - t0.current;
    g.position.set(x, field.groundAt(x, y) + 0.012, -y);
    const out = exit();
    const pop = Math.min(1, t / BASE) * out;
    const beat = pulse && !reducedMotion() ? 0.5 + 0.5 * Math.sin(t * 4.2) : 1;
    if (ring.current) {
      ring.current.scale.setScalar(0.9 + 0.1 * pop + (pulse ? 0.035 * beat : 0));
      (ring.current.material as THREE.MeshBasicMaterial).opacity = pop * RING_ALPHA * (pulse ? 0.85 + 0.15 * beat : 1);
    }
    if (washRef.current) (washRef.current.material as THREE.MeshBasicMaterial).opacity = pop * (pulse ? 0.12 + 0.1 * beat : WASH_ALPHA);
  });

  return (
    <>
      <group ref={group}>
        <mesh ref={washRef} geometry={washGeometry} renderOrder={8}>
          <meshBasicMaterial color={WASH_COLORS[tone]} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh ref={ring} geometry={ringGeometry} renderOrder={9}>
          <meshBasicMaterial color={RING_COLORS[tone]} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {label !== '' && (
        <SceneTag anchor={{ tile: [x, y] }} tone={tone} leaving={leaving}>
          {label}
        </SceneTag>
      )}
    </>
  );
}
