import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../game/store';
import { cameraRig } from './cameraRig';
import { origin } from './origin';
import { sceneNow, TIME_UNIFORM } from './sceneTime';
import { updateFade } from './shaders/fade';

export function Framing() {
  const size = useThree((s) => s.size);
  useFrame(({ gl }) => {
    const t = cameraRig.target();
    origin.follow(t.x, -t.z);
    TIME_UNIFORM.value = sceneNow();
    updateFade();
    const clarity = cameraRig.clarity();
    gl.domElement.style.opacity = clarity < 1 ? clarity.toFixed(3) : '';
  }, -100);
  useFrame(() => {
    cameraRig.tick(size.width, size.height, useGame.getState().mode !== 'menu');
  });
  return null;
}
