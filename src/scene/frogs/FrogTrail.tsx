import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
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

const same = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];

type Segments = Map<string, number[]>;

interface Path {
  parts: number[][];
  omit?: [number, number];
  moving: boolean;
}

function pathOf(f: FrogSim, cache: Segments, used: Segments): Path {
  const trail = f.trail!;
  const skip = hoverHop.current;
  const parts: number[][] = [];
  let count = 0;
  let omit: [number, number] | undefined;
  const add = (from: Tile, to: Tile, points: number[]) => {
    if (skip && same(from, skip.from) && same(to, skip.to)) omit = [count, count + points.length / 3 - 1];
    parts.push(points);
    count += points.length / 3;
  };
  trail.slice(1).forEach((to, k) => {
    const from = trail[k];
    const a: ArcEnd = [from[0], from[1], field.groundAt(from[0], from[1])];
    const b: ArcEnd = [to[0], to[1], field.groundAt(to[0], to[1])];
    const key = `${a}|${b}`;
    const points = cache.get(key) ?? arcPoints(a, b, SEGMENTS);
    used.set(key, points);
    add(from, to, points);
  });
  if (f.hop) {
    const { fx, fy, tx, ty } = f.hop;
    const upTo = Math.round(SEGMENTS * clamp01((sceneNow() - f.hop.t0) / f.hop.dur));
    add([fx, fy], [tx, ty], arcPoints([fx, fy, field.groundAt(fx, fy)], [tx, ty, field.groundAt(tx, ty)], SEGMENTS, upTo));
  }
  return { parts, omit, moving: !!f.hop };
}

const unchanged = (a: Path | null, b: Path) => !!a && !a.moving && !b.moving && a.omit?.join() === b.omit?.join() && a.parts.length === b.parts.length && a.parts.every((p, k) => p === b.parts[k]);

function TrailLine({ index }: { index: number }) {
  const size = useThree((s) => s.size);
  const plane = useGame((s) => planeKey(s.inputs));
  const line = useArcLine(COLORS.trail);
  const lineRef = useRef<LineSegments2>(null);
  const cache = useRef<Segments>(new Map());
  const drawn = useRef<Path | null>(null);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const f = trailFrogs(plane)[index];
    const used: Segments = new Map();
    const path = f ? pathOf(f, cache.current, used) : null;
    cache.current = used;
    line.visible = !!path && path.parts.reduce((n, p) => n + p.length, 0) >= 6;
    if (!f || !path || !line.visible) {
      drawn.current = null;
      return;
    }
    if (!unchanged(drawn.current, path)) {
      drawn.current = path;
      setArc(line, path.parts.flat(), path.omit);
    }
    line.material.opacity = 0.9 * leaveFade(f, sceneNow());
    fitArcLine(line, size);
  });

  return <primitive ref={lineRef} object={line} />;
}

export function FrogTrail() {
  return Array.from({ length: TRAILS }, (_, index) => <TrailLine key={index} index={index} />);
}
