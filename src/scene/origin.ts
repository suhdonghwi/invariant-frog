import * as THREE from 'three';

const DRIFT = 512;

export const origin = {
  x: 0,
  y: 0,
  version: 0,
  tile: { value: new THREE.Vector2() },
  follow(tx: number, ty: number) {
    if (Math.abs(tx - origin.x) <= DRIFT && Math.abs(ty - origin.y) <= DRIFT) return;
    origin.x = Math.round(tx);
    origin.y = Math.round(ty);
    origin.tile.value.set(origin.x, origin.y);
    origin.version++;
  },
  place(group: THREE.Object3D) {
    group.position.set(origin.x, 0, -origin.y);
  },
};

export const GLSL_ORIGIN = /* glsl */ `
uniform ivec2 uOriginTile;
`;

export const originUniforms = () => ({ uOriginTile: origin.tile });
