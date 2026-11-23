import { CameraControls, CameraControlsImpl, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef, useState } from 'react';
import { prepareSound } from '../audio/sfx';
import { useGame } from '../game/store';
import { cameraRig, FOV, MAX_DISTANCE } from './cameraRig';
import { MAX_DPR } from './constants';
import { HomeScene } from './home/HomeScene';
import { LevelScene } from './level/LevelScene';
import { figurePage } from './figureClip';
import { Framing } from './Framing';
import { startScene } from './sceneTime';

function Lights() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#cfd6e2', 2.1]} />
      <directionalLight position={[4, 10, 6]} intensity={1.6} color="#ffffff" />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#ffffff" />
    </>
  );
}

const WHEEL_SPEED = 0.6;
const PINCH_SPEED = 1.2;

function Controls() {
  const ref = useRef<CameraControls>(null);
  const interactive = useGame((s) => s.mode !== 'menu');
  const canvas = useThree((s) => s.gl.domElement);
  useLayoutEffect(() => {
    const pickSpeed = (e: PointerEvent | WheelEvent) => {
      if (ref.current) ref.current.dollySpeed = e instanceof PointerEvent && e.pointerType === 'touch' ? PINCH_SPEED : WHEEL_SPEED;
    };
    canvas.addEventListener('wheel', cameraRig.userMoved, { passive: true });
    canvas.addEventListener('wheel', pickSpeed, { passive: true, capture: true });
    canvas.addEventListener('pointerdown', pickSpeed, { capture: true });
    return () => {
      canvas.removeEventListener('wheel', cameraRig.userMoved);
      canvas.removeEventListener('wheel', pickSpeed, { capture: true });
      canvas.removeEventListener('pointerdown', pickSpeed, { capture: true });
    };
  }, [canvas]);
  useLayoutEffect(() => {
    cameraRig.attach(ref.current);
    const c = ref.current;
    if (c) {
      c.mouseButtons.left = CameraControlsImpl.ACTION.SCREEN_PAN;
      c.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE;
      c.touches.one = CameraControlsImpl.ACTION.TOUCH_SCREEN_PAN;
      // camera-controls handles this action but leaves it out of the touches.two type
      c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_SCREEN_PAN as typeof c.touches.two;
    }
    return () => cameraRig.attach(null);
  }, []);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      enabled={interactive}
      minDistance={6}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={0.25}
      maxPolarAngle={1.15}
      dollySpeed={WHEEL_SPEED}
      smoothTime={0.42}
      draggingSmoothTime={0.1}
    />
  );
}

function Start() {
  const frames = useRef(0);
  useFrame(() => {
    // the first frame compiles the shaders, and is on screen once the second begins
    if (++frames.current === 2) {
      prepareSound();
      void document.fonts.ready.then(startScene);
    }
  });
  return null;
}

function SceneSwitch() {
  const mode = useGame((s) => s.mode);
  const level = useGame((s) => s.level);
  if (mode === 'menu' || !level)
    return (
      <>
        <HomeScene />
        <Start key="home" />
      </>
    );
  return (
    <>
      <LevelScene />
      <Start key={level.id} />
    </>
  );
}

export function World() {
  const top = Math.max(1, figurePage ? window.devicePixelRatio : Math.min(window.devicePixelRatio, MAX_DPR));
  const [dpr, setDpr] = useState(top);
  return (
    <Canvas
      flat
      dpr={dpr}
      camera={{ position: [3, 10, 12], fov: FOV, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: true, stencil: true }}
    >
      <PerformanceMonitor
        factor={1}
        onChange={({ factor }) => !figurePage && setDpr(factor === 1 ? top : Math.round((1 + (top - 1) * factor) * 4) / 4)}
      />
      <Lights />
      <Controls />
      <Framing />
      <SceneSwitch />
    </Canvas>
  );
}
