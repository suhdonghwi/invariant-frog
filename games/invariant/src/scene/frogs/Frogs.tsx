import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../../game/store';
import { planeKey } from '../../levels/inputs';
import { field } from '../area/field';
import { COLORS } from '../constants';
import { uploadInstances } from '../instances';
import { frogGeometry, frogMaterial, ghostDepthMaterial } from '../models';
import { sceneNow } from '../sceneTime';
import { blobShadowMaterial, stencilMark } from '../shaders/common';
import { placeBadge } from './badges';
import { frogWorld, leaveFade, trailFrogs, yawToward, type FrogSim } from './frogWorld';
import { pose } from './motion';
import { byTile, leftTiles, MAX_SHOWN, occupancy, slotFor, tileKey, type Slot } from './occupancy';

const MAX_FROGS = 400;
const BADGES = 24;
const FROG_SHADOW_SIZE = 0.66;

const dummy = new THREE.Object3D();
const GHOST = new THREE.Color(COLORS.ghostFrog);
const ECHO = new THREE.Color(COLORS.frog);
// A real frog's trail: faded green copies where it stood.
const ECHO_FADE = 0.48;

function easeSlot(f: FrogSim, target: Slot, t: number, dt: number, k: number): Slot {
  if (!f.slot) return (f.slot = { ...target });
  const left = f.hop ? f.hop.t0 + f.hop.dur - t : 0;
  const kk = left > 0 ? Math.min(1, dt / left) : k;
  f.slot.dx += (target.dx - f.slot.dx) * kk;
  f.slot.dy += (target.dy - f.slot.dy) * kk;
  f.slot.scale += (target.scale - f.slot.scale) * kk;
  return f.slot;
}

function placeEchoes(walkers: FrogSim[], t: number, from: number, depth: THREE.InstancedMesh, ghosts: THREE.InstancedMesh, fades: THREE.InstancedBufferAttribute, clears: THREE.InstancedBufferAttribute): number {
  let n = from;
  for (const walker of walkers) {
    const trail = walker.trail!;
    const fade = ECHO_FADE * leaveFade(walker, t);
    leftTiles(walker).forEach(([x, y], i) => {
      if (n >= MAX_FROGS) return;
      const [tx, ty] = trail[i + 1] ?? [walker.hop!.tx, walker.hop!.ty];
      dummy.position.set(x, field.groundAt(x, y), -y);
      dummy.rotation.set(0, yawToward(x, y, tx, ty), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      depth.setMatrixAt(n, dummy.matrix);
      ghosts.setMatrixAt(n, dummy.matrix);
      fades.setX(n, fade);
      clears.setX(n, 0);
      ghosts.setColorAt(n++, ECHO);
    });
  }
  return n;
}

export function Frogs() {
  const body = useRef<THREE.InstancedMesh>(null);
  const ghosts = useRef<THREE.InstancedMesh>(null);
  const ghostDepth = useRef<THREE.InstancedMesh>(null);
  const shadows = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => frogGeometry(), []);
  const { ghostGeom, fades, clears } = useMemo(() => {
    const g = geom.clone();
    const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FROGS).fill(1), 1);
    const r = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FROGS), 1);
    g.setAttribute('aFade', a);
    g.setAttribute('aClear', r);
    return { ghostGeom: g, fades: a, clears: r };
  }, [geom]);
  const mat = useMemo(() => stencilMark(frogMaterial()), []);
  const ghostDepthMat = useMemo(() => stencilMark(ghostDepthMaterial()), []);
  const ghostMat = useMemo(() => {
    const m = frogMaterial({ ghost: true, fade: true });
    m.opacity = 1;
    return m;
  }, []);
  const shadowGeom = useMemo(() => new THREE.PlaneGeometry(FROG_SHADOW_SIZE, FROG_SHADOW_SIZE).rotateX(-Math.PI / 2), []);
  const shadowMat = useMemo(() => blobShadowMaterial(0.45, 0.55), []);
  useEffect(() => () => (geom.dispose(), ghostGeom.dispose(), shadowGeom.dispose()), [geom, ghostGeom, shadowGeom]);
  useEffect(
    () => () => [mat, ghostDepthMat, ghostMat, shadowMat].forEach((m) => m.dispose()),
    [mat, ghostDepthMat, ghostMat, shadowMat],
  );
  const plane = useGame((s) => planeKey(s.inputs));
  const lastT = useRef<number | undefined>(undefined);
  const badgeRefs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame(() => {
    const b = body.current;
    const gh = ghosts.current;
    const gd = ghostDepth.current;
    const sh = shadows.current;
    if (!b || !gh || !gd || !sh) return;
    const t = sceneNow();
    const visible = frogWorld.frogs.filter((f) => f.plane === plane);
    const walkers = trailFrogs(plane);
    occupancy.update(visible, walkers);
    const groups = byTile(visible);
    let n = 0;
    let nReal = 0;
    let nGhost = 0;
    const dt = Math.min(0.1, t - (lastT.current ?? t));
    const k = 1 - Math.exp(-dt * 11);
    lastT.current = t;
    let badges = 0;
    for (const f of visible) {
      if (n >= MAX_FROGS) break;
      const p = pose(f, t);
      const g = groups.get(tileKey(f))!;
      const i = g.indexOf(f);
      if (g.length > MAX_SHOWN && i === 0 && badges < BADGES) {
        placeBadge(badgeRefs.current[badges++], f.x, f.y, p.ground, g.length);
      }
      const slot = easeSlot(f, slotFor(i, g.length), t, dt, k);
      const os = slot.scale;
      const px = p.x + slot.dx;
      const pz = p.z - slot.dy;
      const ghost = f.kind === 'test';
      const py = p.y;
      if (!f.drawn) f.drawn = { x: 0, y: 0, ground: 0, z: 0, scale: 1 };
      f.drawn.x = px;
      f.drawn.y = py;
      f.drawn.ground = p.ground;
      f.drawn.z = pz;
      f.drawn.scale = os * Math.max(0, p.sx);
      dummy.position.set(px, py, pz);
      dummy.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
      dummy.scale.set(p.sx * os, p.sy * os, p.sx * os);
      dummy.updateMatrix();
      if (ghost) {
        gd.setMatrixAt(nGhost, dummy.matrix);
        gh.setMatrixAt(nGhost, dummy.matrix);
        fades.setX(nGhost, (f.fade ?? 1) * leaveFade(f, t));
        clears.setX(nGhost, 1);
        gh.setColorAt(nGhost++, GHOST);
      } else b.setMatrixAt(nReal++, dummy.matrix);
      const air = Math.max(0, py - p.ground);
      const ss = p.sx <= 0 ? 0 : Math.max(0.35, 1 - air * 0.5) * Math.min(p.sx, 1.2) * os * p.emerged * (f.fade ?? 1);
      dummy.position.set(px, p.ground + 0.008, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(ss, 1, ss);
      dummy.updateMatrix();
      sh.setMatrixAt(n, dummy.matrix);
      n++;
    }
    nGhost = placeEchoes(walkers, t, nGhost, gd, gh, fades, clears);
    for (let i = badges; i < BADGES; i++) {
      const sp = badgeRefs.current[i];
      if (sp) sp.visible = false;
    }
    b.count = nReal;
    gh.count = gd.count = nGhost;
    sh.count = n;
    uploadInstances(nReal, b.instanceMatrix);
    uploadInstances(nGhost, gh.instanceMatrix, gd.instanceMatrix, gh.instanceColor, fades, clears);
    uploadInstances(n, sh.instanceMatrix);
  });

  return (
    <group>
      <instancedMesh ref={shadows} args={[shadowGeom, shadowMat, MAX_FROGS]} count={0} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={body} args={[geom, mat, MAX_FROGS]} count={0} frustumCulled={false} onClick={(e) => e.stopPropagation()} />
      <instancedMesh ref={ghostDepth} args={[geom, ghostDepthMat, MAX_FROGS]} count={0} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={ghosts} args={[ghostGeom, ghostMat, MAX_FROGS]} count={0} frustumCulled={false} renderOrder={5} onClick={(e) => e.stopPropagation()} />
      {Array.from({ length: BADGES }, (_, i) => (
        <sprite key={i} ref={(el) => void (badgeRefs.current[i] = el)} visible={false} scale={[0.5, 0.3, 1]} renderOrder={10}>
          <spriteMaterial depthTest={false} transparent />
        </sprite>
      ))}
    </group>
  );
}
