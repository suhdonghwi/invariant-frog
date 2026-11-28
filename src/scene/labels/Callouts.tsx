import { useState } from 'react';
import { useGame, type Game } from '../../game/store';
import { useLingering, usePresentList } from '../../hooks/presence';
import { frogWorld, type FrogSim } from '../frogs/frogWorld';
import { SceneTag } from './SceneTag';
import { FailRings } from './FailRings';
import { TileTag } from './TileTag';

type Callout = Game['callouts'][number];
const calloutKey = (c: Callout) => (c.frog !== undefined ? `f${c.frog},${c.text}` : `${c.x},${c.y},${c.text}`);

export function Callouts() {
  const callouts = usePresentList(
    useGame((s) => s.callouts),
    calloutKey,
  );
  return (
    <>
      {callouts.map(({ item: c, key, leaving }) =>
        c.frog === undefined ? (
          <TileTag key={key} x={c.x} y={c.y} label={c.text} tone={c.tone} leaving={leaving} />
        ) : (
          <FrogCallout key={key} callout={c} frogId={c.frog} leaving={leaving} />
        ),
      )}
    </>
  );
}

function FrogCallout({ callout, frogId, leaving }: { callout: Callout; frogId: number; leaving: boolean }) {
  const live = frogWorld.frogs.find((f) => f.id === frogId);
  const [seen, setSeen] = useState<FrogSim | undefined>(live);
  if (live && live !== seen) setSeen(live);
  const frog = live ?? seen;
  if (!frog) return null;
  return (
    <SceneTag anchor={{ frog }} tone={callout.tone} leaving={leaving}>
      {callout.text}
    </SceneTag>
  );
}

export function FailMarker() {
  const { value: mark, leaving } = useLingering(useGame((s) => s.failMark));
  if (!mark) return null;
  const frog = mark.frog === undefined ? undefined : frogWorld.frogs.find((f) => f.id === mark.frog);
  const key = `${mark.x},${mark.y},${mark.t0}`;
  const level = useGame.getState().level;
  return (
    <>
      {mark.fail && level && <FailRings level={level} fail={mark.fail} t0={mark.t0} leaving={leaving} />}
      {mark.frog === undefined ? (
        <TileTag key={key} x={mark.x} y={mark.y} label={mark.label} tone="fail" pulse leaving={leaving} />
      ) : (
        frog &&
        mark.label !== '' && (
          <SceneTag key={key} anchor={{ frog }} tone="fail" leaving={leaving}>
            {mark.label}
          </SceneTag>
        )
      )}
    </>
  );
}
