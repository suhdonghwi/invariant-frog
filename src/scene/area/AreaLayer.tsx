import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useEffectEvent, useRef } from 'react';
import { sfx } from '../../audio/sfx';
import { planeKey, type Inputs } from '../../levels/inputs';
import type { CompiledLevel, Formula } from '../../levels/level';
import { cameraRig } from '../cameraRig';
import { sceneNow } from '../sceneTime';
import { goalEvents, landEvents } from '../tileEvents';
import { Eggs } from './Eggs';
import { field } from './field';
import { GoalColumns } from './GoalColumns';
import { areaMask, MASK_REACH } from './mask';
import { Slabs } from './Slabs';

interface AreaLayerProps {
  level: CompiledLevel;
  inputs: Inputs;
  area: Formula | null;
  dim: boolean;
  showStop: boolean;
  showGoal: boolean;
  showEggs: boolean;
}

const HEARD_WITHIN = 12;

function useArea(level: CompiledLevel, inputs: Inputs, area: Formula | null) {
  const gl = useThree((s) => s.gl);
  const showArea = useEffectEvent(() => {
    field.inputs = inputs;
    field.show(level, area);
    areaMask.show(level, area?.expr ?? null, area);
    const t = cameraRig.target();
    const { rising, sinking } = field.movedNear({ cx: Math.round(t.x), cy: Math.round(-t.z), R: HEARD_WITHIN });
    sfx.slabs(rising, sinking);
  });
  useEffect(() => showArea(), [level, area]);
  useEffect(
    () => () => {
      field.reset();
      areaMask.clear();
    },
    [],
  );
  const shown = useRef({ level, inputs });
  useFrame(() => {
    field.inputs = inputs;
    const t = cameraRig.target();
    const was = shown.current;
    shown.current = { level, inputs };
    if (was.level === level && planeKey(was.inputs) !== planeKey(inputs)) {
      const { rising, sinking } = field.planeMovedNear({ cx: Math.round(t.x), cy: Math.round(-t.z), R: HEARD_WITHIN }, was.inputs);
      sfx.slabs(rising, sinking);
    }
    goalEvents.sync(planeKey(inputs));
    landEvents.sync(planeKey(inputs));
    const now = sceneNow();
    const reach = cameraRig.reachFrom(t.x, -t.z, MASK_REACH);
    if (areaMask.draw(gl, t.x, -t.z, inputs, now, reach)) field.begin(areaMask.level, areaMask.tag as Formula | null, inputs, now, t.x, -t.z, reach);
  }, -1);
}

export function AreaLayer({ level, inputs, area, dim, showStop, showGoal, showEggs }: AreaLayerProps) {
  useArea(level, inputs, area);
  return (
    <group>
      <Slabs level={level} dim={dim} showStop={showStop} showGoal={showGoal} />
      {showEggs && <Eggs />}
      {showGoal && <GoalColumns />}
    </group>
  );
}
