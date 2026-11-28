import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../../game/store';
import { planeKey } from '../../levels/inputs';
import { field } from '../area/field';
import { COLORS } from '../constants';
import { AtOrigin } from '../AtOrigin';
import { uploadInstances } from '../instances';
import { origin } from '../origin';
import { clipBelowFloor, frogGeometry, frogMaterial, seeThroughDepthMaterial } from '../models';
import { sceneNow } from '../sceneTime';
import { blobShadowMaterial, stencilMark } from '../shaders/common';
import { frogWorld, leaveFade, trailFrogs, yawToward, type FrogSim } from './frogWorld';
import { pose } from './motion';
import { byTile, leftTiles, occupancy, slotFor, tileKey, type Slot } from './occupancy';

const MAX_FROGS = 400;
const FROG_SHADOW_SIZE = 0.66;

const dummy = new THREE.Object3D();
const SEE_THROUGH = new THREE.Color(COLORS.seeThroughFrog);
const ECHO = new THREE.Color(COLORS.frog);
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

function placeEchoes(walkers: FrogSim[], t: number, from: number, depth: THREE.InstancedMesh, seeThrough: THREE.InstancedMesh, fades: THREE.InstancedBufferAttribute, clears: THREE.InstancedBufferAttribute): number {
  let n = from;
  for (const walker of walkers) {
    const trail = walker.trail!;
    const fade = ECHO_FADE * leaveFade(walker, t);
    leftTiles(walker).forEach(([x, y], i) => {
      if (n >= MAX_FROGS) return;
      const [tx, ty] = trail[i + 1] ?? [walker.hop!.tx, walker.hop!.ty];
      dummy.position.set(x - origin.x, field.groundAt(x, y), origin.y - y);
      dummy.rotation.set(0, yawToward(x, y, tx, ty), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      depth.setMatrixAt(n, dummy.matrix);
      seeThrough.setMatrixAt(n, dummy.matrix);
      fades.setX(n, fade);
      clears.setX(n, 0);
      seeThrough.setColorAt(n++, ECHO);
    });
  }
  return n;
}

export function Frogs() {
  const body = useRef<THREE.InstancedMesh>(null);
  const seeThrough = useRef<THREE.InstancedMesh>(null);
  const seeThroughDepth = useRef<THREE.InstancedMesh>(null);
  const shadows = useRef<THREE.InstancedMesh>(null);
  const { geom, blinks } = useMemo(() => {
    const g = frogGeometry();
    const b = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FROGS), 1);
    g.setAttribute('aBlink', b);
    return { geom: g, blinks: b };
  }, []);
  const { seeThroughGeom, fades, clears } = useMemo(() => {
    const g = geom.clone();
    const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FROGS).fill(1), 1);
    const r = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FROGS), 1);
    g.setAttribute('aFade', a);
    g.setAttribute('aClear', r);
    return { seeThroughGeom: g, fades: a, clears: r };
  }, [geom]);
  const mat = useMemo(() => stencilMark(frogMaterial({ blink: true })), []);
  const seeThroughDepthMat = useMemo(() => stencilMark(clipBelowFloor(seeThroughDepthMaterial())), []);
  const seeThroughMat = useMemo(() => {
    const m = clipBelowFloor(frogMaterial({ seeThrough: true, fade: true }));
    m.opacity = 1;
    return m;
  }, []);
  const shadowGeom = useMemo(() => new THREE.PlaneGeometry(FROG_SHADOW_SIZE, FROG_SHADOW_SIZE).rotateX(-Math.PI / 2), []);
  const shadowMat = useMemo(() => blobShadowMaterial(0.45, 0.55), []);
  useEffect(() => () => (geom.dispose(), seeThroughGeom.dispose(), shadowGeom.dispose()), [geom, seeThroughGeom, shadowGeom]);
  useEffect(
    () => () => [mat, seeThroughDepthMat, seeThroughMat, shadowMat].forEach((m) => m.dispose()),
    [mat, seeThroughDepthMat, seeThroughMat, shadowMat],
  );
  const plane = useGame((s) => planeKey(s.inputs));
  const lastT = useRef<number | undefined>(undefined);

  const shown = useRef<FrogSim[]>([]);
  const tiles = useRef(new Map<string, FrogSim[]>());

  useFrame(() => {
    const b = body.current;
    const gh = seeThrough.current;
    const gd = seeThroughDepth.current;
    const sh = shadows.current;
    if (!b || !gh || !gd || !sh) return;
    const t = sceneNow();
    const visible = shown.current;
    visible.length = 0;
    for (const f of frogWorld.frogs) if (f.plane === plane) visible.push(f);
    const walkers = trailFrogs(plane);
    occupancy.update(visible, walkers);
    const groups = byTile(visible, tiles.current);
    let n = 0;
    let nReal = 0;
    let nSeeThrough = 0;
    const dt = Math.min(0.1, t - (lastT.current ?? t));
    const k = 1 - Math.exp(-dt * 11);
    lastT.current = t;
    for (const f of visible) {
      if (n >= MAX_FROGS) break;
      const p = pose(f, t);
      const g = groups.get(tileKey(f))!;
      const slot = easeSlot(f, slotFor(g.indexOf(f), g.length), t, dt, k);
      const os = slot.scale;
      const px = p.x + slot.dx;
      const pz = p.z - slot.dy;
      const seeThroughFrog = f.kind === 'seeThrough';
      const py = p.y;
      if (!f.drawn) f.drawn = { x: 0, y: 0, ground: 0, z: 0, scale: 1 };
      f.drawn.x = px;
      f.drawn.y = py;
      f.drawn.ground = p.ground;
      f.drawn.z = pz;
      f.drawn.scale = os * Math.max(0, p.sx);
      dummy.position.set(px - origin.x, py, pz + origin.y);
      dummy.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
      dummy.scale.set(p.sx * os, p.sy * os, p.sx * os);
      dummy.updateMatrix();
      if (seeThroughFrog) {
        gd.setMatrixAt(nSeeThrough, dummy.matrix);
        gh.setMatrixAt(nSeeThrough, dummy.matrix);
        fades.setX(nSeeThrough, (f.fade ?? 1) * leaveFade(f, t));
        clears.setX(nSeeThrough, 1);
        gh.setColorAt(nSeeThrough++, SEE_THROUGH);
      } else {
        blinks.setX(nReal, p.blink);
        b.setMatrixAt(nReal++, dummy.matrix);
      }
      const air = Math.max(0, py - p.ground);
      const ss = p.sx <= 0 ? 0 : Math.max(0.35, 1 - air * 0.5) * Math.min(p.sx, 1.2) * os * p.emerged * (f.fade ?? 1);
      dummy.position.set(px - origin.x, p.ground + 0.008, pz + origin.y);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(ss, 1, ss);
      dummy.updateMatrix();
      sh.setMatrixAt(n, dummy.matrix);
      n++;
    }
    nSeeThrough = placeEchoes(walkers, t, nSeeThrough, gd, gh, fades, clears);
    b.count = nReal;
    gh.count = gd.count = nSeeThrough;
    sh.count = n;
    uploadInstances(nReal, b.instanceMatrix, blinks);
    uploadInstances(nSeeThrough, gh.instanceMatrix, gd.instanceMatrix, gh.instanceColor, fades, clears);
    uploadInstances(n, sh.instanceMatrix);
    // three caches an instanced mesh's bounding sphere, first computed while it was empty
    b.boundingSphere = gh.boundingSphere = null;
  });

  return (
    <AtOrigin>
      <instancedMesh ref={shadows} args={[shadowGeom, shadowMat, MAX_FROGS]} count={0} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={body} args={[geom, mat, MAX_FROGS]} count={0} frustumCulled={false} onClick={(e) => e.stopPropagation()} />
      <instancedMesh ref={seeThroughDepth} args={[geom, seeThroughDepthMat, MAX_FROGS]} count={0} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={seeThrough} args={[seeThroughGeom, seeThroughMat, MAX_FROGS]} count={0} frustumCulled={false} renderOrder={5} onClick={(e) => e.stopPropagation()} />
    </AtOrigin>
  );
}
