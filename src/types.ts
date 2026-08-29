export interface Vec2 {
  x: number;
  y: number;
}

export interface Ray {
  origin: Vec2;
  dir: Vec2;
  wavelength: number; // in nanometers [400, 700]
  intensity: number;  // [0, 1]
  mediumIndex: number; // refractive index of current medium (1.0 = air)
  insidePrismId: number | null;
  bounceCount: number;
}

export interface RaySegment {
  p1: Vec2;
  p2: Vec2;
  wavelength: number;
  intensity: number;
}

export interface RayPath {
  wavelength: number;
  intensity: number;
  points: Vec2[];
}

export interface Prism {
  id: number;
  pos: Vec2;
  rot: number; // in radians
  scale: number; // size multiplier
  baseIndex: number; // base refractive index (e.g. 1.50)
  dispersionB: number; // Cauchy constant in nm^2 (e.g. 7000)
  locked?: boolean; // if true, cannot be moved/rotated
  shape: 'horn' | 'mirror' | 'dove' | 'orb';
  isMirror?: boolean;
  basePos?: Vec2;
  baseRot?: number;
  swayPhase?: number;
}

export interface Target {
  id: number;
  pos: Vec2;
  radius: number;
  minLambda: number; // min wavelength in nm
  maxLambda: number; // max wavelength in nm
  charge: number; // 0..1
  isSatisfied: boolean;
  name?: string;
  targetRgb?: [number, number, number];
  sampledRgb?: [number, number, number];
  isColorMatching?: boolean;
  hasLight?: boolean;
}

export interface Emitter {
  pos: Vec2;
  angle: number; // angle in radians
  width: number;
  rayCount: number;
  minLambda: number;
  maxLambda: number;
}

export interface Obstacle {
  id: number;
  points: Vec2[];
  isMirror?: boolean;
}

export interface LevelDef {
  id: number;
  title: string;
  subtitle: string;
  hint: string;
  emitter: Emitter | Emitter[];
  prisms: Prism[];
  targets: Target[];
  obstacles: Obstacle[];
}

export interface HitResult {
  dist: number;
  hitPoint: Vec2;
  normal: Vec2; // outward pointing normal
  prismId: number | null;
  obstacleId: number | null;
  isMirror: boolean;
}
