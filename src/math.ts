import { Vec2, Prism } from './types';

const { hypot, cos, sin, max, min, abs, sqrt, PI } = Math;

// OPTIMIZATION (FUNCTIONAL VECTOR PRIMITIVES):
// Using lightweight plain object vectors { x, y } and pure functional micro-helpers (v2, vAdd, vSub, vDot, vDist)
// avoids the runtime prototype overhead and memory allocation churn of class-based Vector instances,
// and allows Terser to inline vector calculations across optimization passes.
export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const vAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const vSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const vScale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const vDot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const vNorm = (v: Vec2): Vec2 => {
  const l = hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};

export function raySegmentIntersection(
  ro: Vec2,
  rd: Vec2,
  p1: Vec2,
  p2: Vec2
): { t: number; u: number } | null {
  const v1x = ro.x - p1.x;
  const v1y = ro.y - p1.y;
  const v2x = p2.x - p1.x;
  const v2y = p2.y - p1.y;
  const dot = v2x * -rd.y + v2y * rd.x;
  if (abs(dot) < 1e-7) return null;

  const t1 = (v2x * v1y - v2y * v1x) / dot;
  const t2 = (v1x * -rd.y + v1y * rd.x) / dot;

  return t1 > 1e-4 && t2 >= 0 && t2 <= 1 ? { t: t1, u: t2 } : null;
}

export function rayCircleIntersection(
  ro: Vec2,
  rd: Vec2,
  center: Vec2,
  radius: number,
  isInside: boolean
): { t: number; hitPoint: Vec2; normal: Vec2 } | null {
  const ocX = ro.x - center.x;
  const ocY = ro.y - center.y;
  const b = 2 * (rd.x * ocX + rd.y * ocY);
  const c = ocX * ocX + ocY * ocY - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;

  const sqrtDisc = sqrt(disc);
  const t1 = (-b - sqrtDisc) * 0.5;
  const t2 = (-b + sqrtDisc) * 0.5;

  const t = isInside
    ? (t2 > 1e-4 ? t2 : t1 > 1e-4 ? t1 : -1)
    : (t1 > 1e-4 ? t1 : t2 > 1e-4 ? t2 : -1);
  if (t <= 1e-4) return null;

  const hx = ro.x + rd.x * t;
  const hy = ro.y + rd.y * t;
  return {
    t,
    hitPoint: v2(hx, hy),
    normal: v2((hx - center.x) / radius, (hy - center.y) / radius),
  };
}

// OPTIMIZATION: Compact outward normal vector computation via perpendicular vector & dot product
export const getOutwardNormal = (p1: Vec2, p2: Vec2, centroid: Vec2): Vec2 => {
  const n = vNorm(v2(p1.y - p2.y, p2.x - p1.x));
  return vDot(n, vSub(centroid, vScale(vAdd(p1, p2), 0.5))) > 0 ? vScale(n, -1) : n;
};

/**
 * OPTICAL LAW: Vector Formulation of Snell's Law & Total Internal Reflection (TIR)
 *
 * Given incident unit direction v and surface normal n pointing opposite to the ray:
 *   c1 = cos(θ1) = - (v · n)
 *   η  = n1 / n2  (ratio of refractive indices)
 *
 * Snell's Law states: n1 * sin(θ1) = n2 * sin(θ2) => sin^2(θ2) = η^2 * (1 - c1^2)
 *
 * 1. TOTAL INTERNAL REFLECTION (TIR):
 *    If sin^2(θ2) > 1.0 (incident angle exceeds critical angle θc = arcsin(n2/n1)),
 *    no refracted wave can propagate into medium 2. The photon stream is 100% specularly reflected:
 *      v_refl = v + 2 * c1 * n
 *
 * 2. VECTOR REFRACTION:
 *    When sin^2(θ2) <= 1.0, the transmitted ray direction is:
 *      c2 = cos(θ2) = sqrt(1 - sin^2(θ2))
 *      v_trans = η * v + (η * c1 - c2) * n
 */
export function refractRay(
  rayDir: Vec2,
  nOut: Vec2,
  n1: number,
  n2: number,
  isEntering: boolean
): { dir: Vec2; isTIR: boolean } {
  const v = vNorm(rayDir);
  const n = isEntering ? nOut : vScale(nOut, -1);
  const c1 = -vDot(v, n);
  if (c1 <= 0) return { dir: v, isTIR: false };

  const eta = n1 / n2;
  const sin2_theta2 = eta * eta * (1 - c1 * c1);
  if (sin2_theta2 > 1.0) {
    return { dir: vNorm(vAdd(v, vScale(n, 2 * c1))), isTIR: true };
  }
  const c2 = sqrt(max(0, 1 - sin2_theta2));
  return { dir: vNorm(vAdd(vScale(v, eta), vScale(n, eta * c1 - c2))), isTIR: false };
}

// OPTIMIZATION: Compact ternary branches for polygon vertices across optical shapes
export function getPrismVertices(prism: Prism): Vec2[] {
  const s = prism.scale || 1, sh = prism.shape;
  const raw = sh === 'mirror'
    ? [[-36, -6], [36, -6], [36, 6], [-36, 6]]
    : sh === 'dove'
    ? [[-30, -16], [30, -16], [62, 16], [-62, 16]]
    : [[0, -38], [22, 22], [-22, 22]];
  const c = cos(prism.rot) * s, sn = sin(prism.rot) * s, px = prism.pos.x, py = prism.pos.y;
  return raw.map(([x, y]) => ({ x: x * c - y * sn + px, y: x * sn + y * c + py }));
}

// OPTIMIZATION NOTE:
// The legacy 'isPointInPolygon(point, poly)' helper was removed because UI hit testing
// (in 'src/input.ts') is significantly smoother, faster, and more forgiving on touch/mouse
// using circular distance metrics ('vDist(pos, p.pos) <= 75 * s'), saving bundle size with zero UX loss.

export function distToSegment(center: Vec2, a: Vec2, b: Vec2): number {
  const abX = b.x - a.x, abY = b.y - a.y;
  const acX = center.x - a.x, acY = center.y - a.y;
  const lenSq = abX * abX + abY * abY;
  if (lenSq < 1e-7) return hypot(acX, acY);
  const t = max(0, min(1, (acX * abX + acY * abY) / lenSq));
  return hypot(center.x - (a.x + abX * t), center.y - (a.y + abY * t));
}
