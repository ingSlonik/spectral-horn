import { Vec2, Prism } from './types';

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const vAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const vSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const vScale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const vDot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const vDist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const vNorm = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-7 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};

export const vRotate = (v: Vec2, rad: number): Vec2 => {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

export const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

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
  if (Math.abs(dot) < 1e-7) return null;

  const t1 = (v2x * v1y - v2y * v1x) / dot;
  const t2 = (v1x * -rd.y + v1y * rd.x) / dot;

  if (t1 > 1e-4 && t2 >= 0 && t2 <= 1) {
    return { t: t1, u: t2 };
  }
  return null;
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

  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) * 0.5;
  const t2 = (-b + sqrtDisc) * 0.5;

  let t = -1;
  if (isInside) {
    t = t2 > 1e-4 ? t2 : t1 > 1e-4 ? t1 : -1;
  } else {
    t = t1 > 1e-4 ? t1 : t2 > 1e-4 ? t2 : -1;
  }
  if (t <= 1e-4) return null;

  const hx = ro.x + rd.x * t;
  const hy = ro.y + rd.y * t;
  return {
    t,
    hitPoint: { x: hx, y: hy },
    normal: { x: (hx - center.x) / radius, y: (hy - center.y) / radius },
  };
}

export function getOutwardNormal(p1: Vec2, p2: Vec2, centroid: Vec2): Vec2 {
  const edge = vSub(p2, p1);
  let n = vNorm({ x: -edge.y, y: edge.x });
  if (vDot(n, vSub(centroid, vScale(vAdd(p1, p2), 0.5))) > 0) {
    n = vScale(n, -1);
  }
  return n;
}

export function refractRay(
  rayDir: Vec2,
  nOut: Vec2,
  n1: number,
  n2: number,
  isEntering: boolean
): { dir: Vec2; isTIR: boolean } {
  const v = vNorm(rayDir);
  const eta = n1 / n2;

  if (isEntering) {
    const c1 = -vDot(v, nOut);
    if (c1 <= 0) return { dir: v, isTIR: false };
    const sin2_theta2 = eta * eta * (1 - c1 * c1);
    if (sin2_theta2 > 1.0) {
      return { dir: vNorm(vAdd(v, vScale(nOut, 2 * c1))), isTIR: true };
    }
    const c2 = Math.sqrt(Math.max(0, 1 - sin2_theta2));
    return { dir: vNorm(vAdd(vScale(v, eta), vScale(nOut, eta * c1 - c2))), isTIR: false };
  } else {
    const nIn = vScale(nOut, -1);
    const c1 = -vDot(v, nIn);
    if (c1 <= 0) return { dir: v, isTIR: false };
    const sin2_theta2 = eta * eta * (1 - c1 * c1);
    if (sin2_theta2 > 1.0) {
      return { dir: vNorm(vSub(v, vScale(nOut, 2 * vDot(v, nOut)))), isTIR: true };
    }
    const c2 = Math.sqrt(Math.max(0, 1 - sin2_theta2));
    return { dir: vNorm(vAdd(vScale(v, eta), vScale(nIn, eta * c1 - c2))), isTIR: false };
  }
}

export function getPrismVertices(prism: Prism): Vec2[] {
  let pts: Vec2[];
  const s = prism.scale || 1;
  if (prism.shape === 'horn') {
    pts = [{ x: 0, y: -38 * s }, { x: 22 * s, y: 22 * s }, { x: -22 * s, y: 22 * s }];
  } else if (prism.shape === 'mirror') {
    pts = [{ x: -36 * s, y: -6 * s }, { x: 36 * s, y: -6 * s }, { x: 36 * s, y: 6 * s }, { x: -36 * s, y: 6 * s }];
  } else if (prism.shape === 'dove') {
    pts = [{ x: -30 * s, y: -16 * s }, { x: 30 * s, y: -16 * s }, { x: 62 * s, y: 16 * s }, { x: -62 * s, y: 16 * s }];
  } else if (prism.shape === 'orb') {
    pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * 30 * s, y: Math.sin(a) * 30 * s });
    }
  } else {
    pts = [{ x: 0, y: -38 * s }, { x: 22 * s, y: 22 * s }, { x: -22 * s, y: 22 * s }];
  }
  return pts.map((p) => vAdd(vRotate(p, prism.rot), prism.pos));
}

export function isPointInPolygon(point: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > point.y !== yj > point.y) && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export function distToSegment(center: Vec2, a: Vec2, b: Vec2): number {
  const abX = b.x - a.x, abY = b.y - a.y;
  const acX = center.x - a.x, acY = center.y - a.y;
  const lenSq = abX * abX + abY * abY;
  if (lenSq < 1e-7) return Math.hypot(acX, acY);
  const t = Math.max(0, Math.min(1, (acX * abX + acY * abY) / lenSq));
  return Math.hypot(center.x - (a.x + abX * t), center.y - (a.y + abY * t));
}
