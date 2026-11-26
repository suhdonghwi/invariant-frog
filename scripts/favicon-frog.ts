import * as THREE from 'three';
import { COLORS } from '../src/scene/constants';
import { frogGeometry, frogMaterial } from '../src/scene/models';

const RENDER = 1024;
const DRAW = 512;
const OUTLINE = 14;
const VIEW = { pitch: 0.3, yaw: -0.45, y: 0.27, half: 0.45 };
const PUPIL = '#1b1f2b';
const PART_PUPIL = 3;

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function only(geom: THREE.BufferGeometry, part: number): THREE.BufferGeometry {
  const g = geom.clone();
  const parts = g.getAttribute('aPart');
  const index = g.index!;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    if (parts.getX(index.getX(i)) === part) kept.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  g.setIndex(kept);
  return g;
}

function scene(): THREE.Scene {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight('#ffffff', '#cfd6e2', 2.1));
  const lights: [number, number, number, number][] = [
    [4, 10, 6, 1.6],
    [-6, 4, -4, 0.35],
    [1, 2, 10, 1.1],
  ];
  for (const [x, y, z, intensity] of lights) {
    const light = new THREE.DirectionalLight('#ffffff', intensity);
    light.position.set(x, y, z);
    s.add(light);
  }
  const geom = frogGeometry({ fine: true, sparkle: true });
  const pupil = new THREE.MeshBasicMaterial({ color: PUPIL, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const pupils = new THREE.Mesh(only(geom, PART_PUPIL), pupil);
  pupils.renderOrder = -1;
  const frog = new THREE.Group();
  frog.add(new THREE.Mesh(geom, frogMaterial()), pupils);
  frog.rotation.y = VIEW.yaw;
  s.add(frog);
  return s;
}

function shoot(): HTMLCanvasElement {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(RENDER, RENDER);
  const { half, pitch, y } = VIEW;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 10);
  camera.position.set(0, y + 3 * Math.sin(pitch), 3 * Math.cos(pitch));
  camera.lookAt(0, y, 0);
  renderer.render(scene(), camera);
  const [c, g] = canvas(RENDER);
  g.drawImage(renderer.domElement, 0, 0);
  renderer.dispose();
  return c;
}

function bounds(c: HTMLCanvasElement): [number, number, number, number] {
  const alpha = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let [x0, y0, x1, y1] = [c.width, c.height, -1, -1];
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (alpha[(y * c.width + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return [x0, y0, x1, y1];
}

function framed(shot: HTMLCanvasElement): HTMLCanvasElement {
  const [x0, y0, x1, y1] = bounds(shot);
  const side = Math.max(x1 - x0, y1 - y0) * (1 + (2 * OUTLINE + 6) / DRAW);
  const [c, g] = canvas(DRAW);
  g.drawImage(shot, (x0 + x1 - side) / 2, (y0 + y1 - side) / 2, side, side, 0, 0, DRAW, DRAW);
  return c;
}

function outlined(art: HTMLCanvasElement): HTMLCanvasElement {
  const [ink, i] = canvas(DRAW);
  i.drawImage(art, 0, 0);
  i.globalCompositeOperation = 'source-in';
  i.fillStyle = COLORS.outline;
  i.fillRect(0, 0, DRAW, DRAW);
  const [c, g] = canvas(DRAW);
  const steps = 96;
  for (let a = 0; a < steps; a++) {
    const t = (a / steps) * 2 * Math.PI;
    g.drawImage(ink, OUTLINE * Math.cos(t), OUTLINE * Math.sin(t));
  }
  g.drawImage(art, 0, 0);
  return c;
}

function shrunk(art: HTMLCanvasElement, size: number): HTMLCanvasElement {
  let c = art;
  while (c.width / 2 >= size) {
    const [half, g] = canvas(c.width / 2);
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, half.width, half.height);
    c = half;
  }
  return c;
}

export function renderFavicon(sizes: number[]): Record<number, string> {
  const art = outlined(framed(shoot()));
  return Object.fromEntries(sizes.map((n) => [n, shrunk(art, n).toDataURL('image/png').split(',')[1]]));
}
