import { createRoot, events, extend, type ReconcilerRoot, type RenderProps } from '@react-three/fiber';
import { Component, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DirectionalLight, Group, HemisphereLight, InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Sprite, SpriteMaterial } from 'three';

extend({ DirectionalLight, Group, HemisphereLight, InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Sprite, SpriteMaterial });

type CanvasProps = Omit<RenderProps<HTMLCanvasElement>, 'size' | 'events'> & { children: ReactNode };

interface Size {
  width: number;
  height: number;
  top: number;
  left: number;
}

class Catch extends Component<{ set: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.set(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Canvas({ children, ...config }: CanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [, setReady] = useState(false);
  if (error) throw error;

  const measure = (el: HTMLDivElement | null) => {
    if (!el) return;
    const sizes = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s && s.width === r.width && s.height === r.height && s.top === r.top && s.left === r.left ? s : { width: r.width, height: r.height, top: r.top, left: r.left }));
    });
    sizes.observe(el);
    return () => sizes.disconnect();
  };

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || !size?.width || !size.height) return;
    root.current ??= createRoot(el);
    const r = root.current;
    r.configure({ ...config, events, size }).catch(setError);
    if (r.ready.status === 'fulfilled') r.render(<Catch set={setError}>{children}</Catch>);
    else if (r.ready.status === 'pending') void r.ready.then(() => setReady(true));
  }, [size, config, children]);

  useLayoutEffect(
    () => () => {
      root.current?.unmount();
      root.current = null;
    },
    [],
  );

  return (
    <div ref={measure} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas ref={canvas} style={{ display: 'block' }} />
    </div>
  );
}
