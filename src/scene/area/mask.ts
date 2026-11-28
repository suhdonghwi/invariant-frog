import * as THREE from 'three';
import type { Expr } from '../../lang/ast';
import { planeExists, planeKey, type Inputs } from '../../levels/inputs';
import type { CompiledLevel } from '../../levels/level';
import { inputUniforms, levelGlsl, setInputUniforms } from '../floor/levelGlsl';
import { wake } from '../awake';
import { origin } from '../origin';
import { FROM_SCALE, GLSL_MASK, MASK_SIZE } from './glsl';

export { MASK_SIZE };

const SNAP = 32;
export const MASK_REACH = MASK_SIZE / 2 - SNAP / 2;

export const GOAL = 1;
export const EGG = 2;
export type MaskBit = typeof GOAL | typeof EGG;

const vertex = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const empty = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}
`;

function evaluator(level: CompiledLevel, area: Expr | null) {
  return /* glsl */ `
precision highp float;
precision highp int;
uniform ivec2 uOrigin;
${levelGlsl(level, { area })}
void main() {
  ivec2 t = uOrigin + ivec2(gl_FragCoord.xy);
  bool exists = uExists && L_exists(t);
  bool stop = exists && L_stop(t);
  gl_FragColor = vec4(
    exists && L_area(t) ? 1.0 : 0.0,
    0.0,
    stop ? 1.0 : 0.0,
    ((stop && L_goal(t) ? 1.0 : 0.0) + (exists && L_egg(t) ? 2.0 : 0.0)) / 3.0
  );
}
`;
}

const snapshot = /* glsl */ `
precision highp float;
precision highp int;
${GLSL_MASK}
uniform vec2 uSnapOrigin;
uniform bool uZero;
void main() {
  vec2 tile = uSnapOrigin + floor(gl_FragCoord.xy);
  float rise = uZero ? 0.0 : riseOf(maskAt(tile), tile);
  gl_FragColor = vec4(rise / ${FROM_SCALE.toFixed(6)}, 0.0, 0.0, 1.0);
}
`;

const CACHED = 48;

const shader = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending });

const blank = shader(empty, {});

const maskTarget = () => new THREE.WebGLRenderTarget(MASK_SIZE, MASK_SIZE, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });

interface Shown {
  material: THREE.ShaderMaterial;
  level: CompiledLevel | null;
  tag: unknown;
}

interface Pending extends Shown {
  started: boolean;
  ready: boolean;
}

class AreaMask {
  readonly uniforms = {
    uMask: { value: null as THREE.Texture | null },
    uMaskOrigin: { value: new THREE.Vector2() },
    uFrom: { value: null as THREE.Texture | null },
    uFromOrigin: { value: new THREE.Vector2() },
    uWaveAge: { value: 1e6 },
    uWaveCenter: { value: new THREE.Vector2() },
    uWaveReach: { value: 1 },
  };
  private target: THREE.WebGLRenderTarget | null = null;
  private from: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  private readonly scene = new THREE.Scene();
  private readonly probeScene = new THREE.Scene();
  private readonly snapScene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blank);
  private readonly probe = new THREE.Mesh(this.quad.geometry, blank);
  private readonly snapUniforms = { uSnapOrigin: { value: new THREE.Vector2() }, uZero: { value: false } };
  private readonly programs = new Map<string, THREE.ShaderMaterial>();
  private pending: Pending | null = null;
  private current: Shown = { material: blank, level: null, tag: null };
  private shown = 0;
  private levels = 0;
  private drawnLevels = 0;
  private drawn = '';
  private content = '';
  private at = { x: 0, y: 0 };
  private fromAt = { x: 0, y: 0 };
  private wave = { t0: -1e6, x: 0, y: 0, reach: 1 };
  private pixels = new Uint8Array(MASK_SIZE * MASK_SIZE * 4);
  private read = '';
  private readContent = '';
  private origin = { x: 0, y: 0 };
  private reads = 0;
  private landed = 0;
  revision = 0;

  constructor(private readonly options: { wave: boolean; readBack: boolean }) {
    for (const [scene, mesh] of [
      [this.scene, this.quad],
      [this.probeScene, this.probe],
      [this.snapScene, new THREE.Mesh(this.quad.geometry, shader(snapshot, { ...this.uniforms, ...this.snapUniforms }))],
    ] as const) {
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
  }

  get level() {
    return this.current.level;
  }

  get tag() {
    return this.current.tag;
  }

  private program(level: CompiledLevel, area: Expr | null) {
    const source = evaluator(level, area);
    let material = this.programs.get(source);
    if (material) this.programs.delete(source);
    else material = shader(source, { ...inputUniforms(level), uOrigin: { value: new THREE.Vector2() } });
    this.programs.set(source, material);
    for (const [key, old] of this.programs) {
      if (this.programs.size <= CACHED) break;
      if (old === this.current.material) continue;
      this.programs.delete(key);
      old.dispose();
    }
    return material;
  }

  private use(next: Shown) {
    if (next.level !== this.current.level) this.levels++;
    this.current = next;
    this.quad.material = next.material;
    this.shown++;
  }

  show(level: CompiledLevel, area: Expr | null, tag: unknown = null) {
    this.pending = { material: this.program(level, area), level, tag, started: false, ready: false };
  }

  clear() {
    this.pending = null;
    this.use({ material: blank, level: null, tag: null });
  }

  tilesWithin(bit: MaskBit, cx: number, cy: number, R: number): [number, number][] {
    const out: [number, number][] = [];
    const { x: ox, y: oy } = this.origin;
    const R2 = R * R;
    for (let y = Math.max(oy, cy - R); y <= Math.min(oy + MASK_SIZE - 1, cy + R); y++) {
      const dy2 = (y - cy) * (y - cy);
      if (dy2 > R2) continue;
      const row = (y - oy) * MASK_SIZE;
      for (let x = Math.max(ox, cx - R); x <= Math.min(ox + MASK_SIZE - 1, cx + R); x++) {
        const a = this.pixels[(row + x - ox) * 4 + 3];
        if (a && Math.round(a / 85) & bit && (x - cx) * (x - cx) + dy2 <= R2) out.push([x, y]);
      }
    }
    return out;
  }

  private compile(gl: THREE.WebGLRenderer) {
    const p = this.pending;
    if (!p) return;
    if (!p.started) {
      p.started = true;
      this.probe.material = p.material;
      void gl.compileAsync(this.probeScene, this.camera).then(() => {
        p.ready = true;
        wake();
      });
    }
    if (!p.ready) return;
    this.pending = null;
    this.use(p);
  }

  private place() {
    this.uniforms.uMaskOrigin.value.set(this.at.x - origin.x, this.at.y - origin.y);
    this.uniforms.uFromOrigin.value.set(this.fromAt.x - origin.x, this.fromAt.y - origin.y);
    this.uniforms.uWaveCenter.value.set(this.wave.x - origin.x, this.wave.y - origin.y);
    this.uniforms.uWaveReach.value = this.wave.reach;
  }

  private snapshot(gl: THREE.WebGLRenderer, zero: boolean, now: number, x: number, y: number, reach: number) {
    this.from ??= [maskTarget(), maskTarget()];
    const next = this.uniforms.uFrom.value === this.from[0].texture ? this.from[1] : this.from[0];
    this.snapUniforms.uSnapOrigin.value.set(this.at.x - origin.x, this.at.y - origin.y);
    this.snapUniforms.uZero.value = zero;
    gl.setRenderTarget(next);
    gl.render(this.snapScene, this.camera);
    this.uniforms.uFrom.value = next.texture;
    this.fromAt = { ...this.at };
    this.wave = { t0: now, x, y, reach };
    this.uniforms.uWaveAge.value = 0;
    this.place();
  }

  draw(gl: THREE.WebGLRenderer, x: number, y: number, inputs: Inputs, now: number, reach = MASK_REACH): boolean {
    this.compile(gl);
    this.target ??= maskTarget();
    this.uniforms.uMask.value = this.target.texture;
    this.uniforms.uWaveAge.value = now - this.wave.t0;
    this.place();
    const level = this.current.level;
    const plane = level ? planeKey(inputs) : '';
    const ox = Math.round(x / SNAP) * SNAP - MASK_SIZE / 2;
    const oy = Math.round(y / SNAP) * SNAP - MASK_SIZE / 2;
    const content = `${this.shown}|${plane}`;
    const key = `${content}|${ox},${oy}`;
    if (key === this.drawn) return false;
    this.drawn = key;
    const back = gl.getRenderTarget();
    const changed = content !== this.content;
    this.content = content;
    if (changed && this.options.wave) {
      this.snapshot(gl, this.levels !== this.drawnLevels, now, x, y, reach);
      this.drawnLevels = this.levels;
    }
    this.at = { x: ox, y: oy };
    this.place();
    const u = this.current.material.uniforms;
    if (level) {
      setInputUniforms(u, level, inputs, planeExists(level, inputs));
      (u.uOrigin.value as THREE.Vector2).set(ox, oy);
    }
    gl.setRenderTarget(this.target);
    gl.render(this.scene, this.camera);
    if (this.options.readBack) this.readBack(gl, `${this.levels}|${plane}`, ox, oy);
    gl.setRenderTarget(back);
    return changed;
  }

  private readBack(gl: THREE.WebGLRenderer, content: string, ox: number, oy: number) {
    const read = `${content}|${ox},${oy}`;
    if (read === this.read || !this.target) return;
    const moved = content === this.readContent;
    this.read = read;
    this.readContent = content;
    const ticket = ++this.reads;
    const into = new Uint8Array(MASK_SIZE * MASK_SIZE * 4);
    const land = () => {
      if (ticket < this.landed) return;
      this.landed = ticket;
      this.pixels = into;
      this.origin = { x: ox, y: oy };
      this.revision++;
    };
    if (moved) void gl.readRenderTargetPixelsAsync(this.target, 0, 0, MASK_SIZE, MASK_SIZE, into).then(land);
    else {
      gl.readRenderTargetPixels(this.target, 0, 0, MASK_SIZE, MASK_SIZE, into);
      land();
    }
  }
}

export const areaMask = new AreaMask({ wave: true, readBack: true });

export const failMask = new AreaMask({ wave: false, readBack: false });
