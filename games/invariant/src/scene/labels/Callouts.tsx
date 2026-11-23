import { useRef } from 'react';
import { useGame, type Game } from '../../game/store';
import { useLingering, usePresentList } from '../../hooks/presence';
import { frogWorld, type FrogSim } from '../frogs/frogWorld';
import { SceneTag } from './SceneTag';
import { FailRings } from './FailRings';
import { TileTag, TONE_PREFIX } from './TileTag';

type Callout = Game['callouts'][number];
const calloutKey = (c: Callout) => (c.frog !== undefined ? `f${c.frog},${c.text}` : `${c.x},${c.y},${c.text}`);

export function Callouts() {
  const callouts = usePresentList(
    useGame((s) => s.callouts),
    calloutKey,
  );
  const frogs = useRef(new Map<number, FrogSim>());
  return (
    <>
      {callouts.map(({ item: c, key, leaving }) => {
        if (c.frog === undefined) return <TileTag key={key} x={c.x} y={c.y} label={c.text} tone={c.tone} wash leaving={leaving} />;
        const frog = frogWorld.frogs.find((f) => f.id === c.frog) ?? frogs.current.get(c.frog);
        if (!frog) return null;
        frogs.current.set(c.frog, frog);
        return (
          <SceneTag key={key} anchor={{ frog }} tone={c.tone} leaving={leaving}>
            {TONE_PREFIX[c.tone]}
            {c.text}
          </SceneTag>
        );
      })}
    </>
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
        <TileTag key={key} x={mark.x} y={mark.y} label={mark.label} tone="fail" pulse wash leaving={leaving} />
      ) : (
        frog &&
        mark.label !== '' && (
          <SceneTag key={key} anchor={{ frog }} tone="fail" leaving={leaving}>
            {TONE_PREFIX.fail}
            {mark.label}
          </SceneTag>
        )
      )}
    </>
  );
}
