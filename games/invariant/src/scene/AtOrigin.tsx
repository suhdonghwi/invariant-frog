import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type * as THREE from 'three';
import { origin } from './origin';

export function AtOrigin({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => group.current && origin.place(group.current));
  return <group ref={group}>{children}</group>;
}
