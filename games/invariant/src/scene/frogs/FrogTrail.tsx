import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../../game/store';
import { planeKey } from '../../levels/inputs';
import { field } from '../area/field';
import { hoverHop } from '../hover';
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

const same = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];

function piecesOf(f: FrogSim): number[][] {
  const trail = f.trail!;
  const skip = hoverHop.current;
  const pieces: number[][] = [[]];
  const add = (from: Tile, to: Tile, upTo = 1) => {
    if (skip && same(from, skip.from) && same(to, skip.to)) pieces.push([]);
    else pieces.at(-1)!.push(...arc(from, to, upTo));
  };
  trail.slice(1).forEach((to, k) => add(trail[k], to));
  if (f.hop) add([f.hop.fx, f.hop.fy], [f.hop.tx, f.hop.ty], (sceneNow() - f.hop.t0) / f.hop.dur);
  return pieces.filter((p) => p.length >= 6);
}

function TrailLine({ index }: { index: number }) {
  const size = useThree((s) => s.size);
  const plane = useGame((s) => planeKey(s.inputs));
  const line = useArcLine(COLORS.trail);

  useFrame(() => {
    const f = trailFrogs(plane)[index];
    const pieces = f ? piecesOf(f) : [];
    line.visible = !!f && pieces.length > 0;
    if (!f || !line.visible) return;
    const key = pieces.map((p) => p.join()).join('|');
    if (key !== line.userData.key) {
      line.userData.key = key;
      setArc(line, ...pieces);
    }
    line.material.opacity = 0.9 * leaveFade(f, sceneNow());
    fitArcLine(line, size);
  });

  return <primitive object={line} />;
}

export function FrogTrail() {
  return Array.from({ length: TRAILS }, (_, index) => <TrailLine key={index} index={index} />);
}
