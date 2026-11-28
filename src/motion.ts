export const MICRO = 0.12;
export const SHORT = 0.2;
export const EXIT = 0.15;
export const BASE = 0.34;
export const LONG = 0.5;

export const TICK = 0.09;
export const BEAT = 0.25;
export const HOLD = 1;

// keep in step with --duration-exit in styles.css
export const EXIT_MS = EXIT * 1000;

export const ms = (seconds: number) => seconds * 1000;

export const RISE = BASE;
export const RISE_OVERSHOOT = 0.9;
export const WAVE_SPREAD = 0.3;
export const WAVE_END = WAVE_SPREAD + RISE;

export const FLIGHT_MIN = 0.42;
export const FLIGHT_MAX = HOLD;
export const CUT = HOLD;
export const CAMERA_FADE = 0.7;
export const CAMERA_SMOOTH = FLIGHT_MIN;
export const DRAG_SMOOTH = 0.1;
export const ARRIVE_CAP = 2.4;

export const CHEER = 0.62;
export const HATCH_GROW = BEAT;
export const HATCH_WOBBLE = 0.07;
export const HATCH_CAP = 0.3;
export const ARC_DRAW = 0.45;
export const EGG_APPEAR = BASE;
export const EGG_APPEAR_SPREAD = 0.035;
export const EGG_APPEAR_CAP = CAMERA_FADE;
export const LAND_BOUNCE = 0.85;
export const GOAL_GLOW = CAMERA_FADE;
export const GOAL_BURST = HOLD;
export const RIPPLE = 1.6;
export const RIPPLE_GAP = 0.3;
export const RIPPLE_LIFE = 1.25;
export const SPLASH = 0.8;

export const HOME_INTRO = 1.6;
export const HOME_FLOOR_IN = 1.2;
export const HOME_BEAT = 0.95;
export const HOME_EGG_HOLD = 0.9;
export const HOME_EGG_STAGGER = 0.3;
export const HOME_EGG_GAP = 0.1;
export const HOME_LAST_OUT = 0.6;

// keep in step with --duration-pulse and --duration-flash in styles.css
export const PULSE = 1.6;
export const FLASH = 1.2;

export const LINGER = 2;
export const IDLE_REST = 8;

export const TYPE_KEY = 0.07;
export const TYPE_SPACE = 0.03;

export const REDUCE = '(prefers-reduced-motion: reduce)';
const query = typeof matchMedia !== 'undefined' ? matchMedia(REDUCE) : null;
let reduce = query?.matches ?? false;
query?.addEventListener('change', (e) => (reduce = e.matches));
export const reducedMotion = () => reduce;
