import { useGame } from '../game/store';
import { field } from '../scene/area/field';
import { frogWorld } from '../scene/frogs/frogWorld';
import { hopArcs } from '../scene/frogs/HopArcs';
import { hatchFx } from '../scene/frogs/Hatch';
import { clearTrace } from './codeTrace';
import { sendFrogsHome } from './frogs';
import { abandonRun } from './checkRun';
import { begin } from './sequence';

export function interrupt() {
  begin();
  abandonRun();
  clearTrace();
  frogWorld.clear();
  hatchFx.clear();
  hopArcs.clear();
  useGame.setState({ stepping: false, failMark: null });
}

export function resetLevel() {
  interrupt();
  field.reset();
}

export function resetFrogs() {
  begin();
  clearTrace();
  void sendFrogsHome();
  useGame.setState({ failMark: null });
}
