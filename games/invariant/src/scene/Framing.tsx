import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../game/store';
import { cameraRig } from './cameraRig';
import { origin } from './origin';

export function Framing() {
  const size = useThree((s) => s.size);
  const canvas = useThree((s) => s.gl.domElement);
  useFrame(() => {
    const t = cameraRig.target();
    origin.follow(t.x, -t.z);
    const clarity = cameraRig.clarity();
    canvas.style.opacity = clarity < 1 ? clarity.toFixed(3) : '';
  }, -100);
  useFrame(() => {
    cameraRig.tick(size.width, size.height, useGame.getState().mode !== 'menu');
  });
  return null;
}
