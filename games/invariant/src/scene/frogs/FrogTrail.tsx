import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../../game/store';
import { planeKey } from '../../levels/inputs';
import { field } from '../area/field';
import { COLORS } from '../constants';
import { clamp01 } from '../easing';
import { sceneNow } from '../sceneTime';
import { leaveFade, trailFrogs, type FrogSim } from './frogWorld';
import { arcPoints, fitArcLine, setArc, useArcLine, type ArcEnd } from './hopArc';

const TRAILS = 4;
const SEGMENTS = 16;

type Tile = readonly [number, number];

const onGround = ([x, y]: Tile): ArcEnd => [x, y, field.groundAt(x, y)];

function arc(from: Tile, to: Tile, upTo = 1): number[] {
  return arcPoints(onGround(from), onGround(to), SEGMENTS, Math.round(SEGMENTS * clamp01(upTo)));
}

function pathOf(f: FrogSim): number[] {
  const trail = f.trail!;
  const points = trail.slice(1).flatMap((to, k) => arc(trail[k], to));
  if (f.hop) points.push(...arc([f.hop.fx, f.hop.fy], [f.hop.tx, f.hop.ty], (sceneNow() - f.hop.t0) / f.hop.dur));
  return points;
}

const same = (a: Tile, x: number, y: number) => a[0] === x && a[1] === y;

export function trailDraws(plane: string, from: Tile, to: Tile): boolean {
  return trailFrogs(plane)
    .slice(0, TRAILS)
    .some((f) => {
      const t = f.trail!;
      if (t.some((p, k) => k > 0 && same(t[k - 1], ...from) && same(p, ...to))) return true;
      return !!f.hop && same(from, f.hop.fx, f.hop.fy) && same(to, f.hop.tx, f.hop.ty);
    });
}

function TrailLine({ index }: { index: number }) {
  const size = useThree((s) => s.size);
  const plane = useGame((s) => planeKey(s.inputs));
  const line = useArcLine(COLORS.trail);

  useFrame(() => {
    const f = trailFrogs(plane)[index];
    const points = f ? pathOf(f) : [];
    line.visible = !!f && points.length >= 6;
    if (!f || !line.visible) return;
    const key = points.join();
    if (key !== line.userData.key) {
      line.userData.key = key;
      setArc(line, points);
    }
    line.material.opacity = 0.9 * leaveFade(f, sceneNow());
    fitArcLine(line, size);
  });

  return <primitive object={line} />;
}

export function FrogTrail() {
  return Array.from({ length: TRAILS }, (_, index) => <TrailLine key={index} index={index} />);
}
