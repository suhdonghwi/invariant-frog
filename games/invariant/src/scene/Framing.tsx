import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../game/store';
import { cameraRig } from './cameraRig';
import { origin } from './origin';

export function Framing() {
  const size = useThree((s) => s.size);
  useFrame(() => {
    const t = cameraRig.target();
    origin.follow(t.x, -t.z);
  }, -100);
  useFrame(() => {
    cameraRig.tick(size.width, size.height, useGame.getState().mode !== 'menu');
  });
  return null;
}
