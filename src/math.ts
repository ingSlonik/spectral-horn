import { Vec2, Prism } from './types';

export function v2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vScale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function vCross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function vLen(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function vDist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function vNorm(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-7 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
}

export function vRotate(v: Vec2, rad: number): Vec2 {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Ray-segment intersection
// Returns distance t along ray, segment param u
export function raySegmentIntersection(
  ro: Vec2,
  rd: Vec2,
  p1: Vec2,
  p2: Vec2
): { t: number; u: number } | null {
  const v1 = vSub(ro, p1);
  const v2 = vSub(p2, p1);
  const v3 = { x: -rd.y, y: rd.x }; // Perpendicular to ray

  const dot = vDot(v2, v3);
  if (Math.abs(dot) < 1e-7) return null;

  const t1 = vCross(v2, v1) / dot;
  const t2 = vDot(v1, v3) / dot;

  // t1 is distance along ray (> 1e-4 to avoid self-intersection), t2 is parameter on segment [0, 1]
  if (t1 > 1e-4 && t2 >= 0 && t2 <= 1) {
    return { t: t1, u: t2 };
  }

  return null;
}

// Computes outward normal for polygon edge (p1, p2) given polygon centroid
export function getOutwardNormal(p1: Vec2, p2: Vec2, centroid: Vec2): Vec2 {
  const edge = vSub(p2, p1);
  // Perpendicular vector (-dy, dx)
  let n = vNorm({ x: -edge.y, y: edge.x });
  const mid = vScale(vAdd(p1, p2), 0.5);
  const toCentroid = vSub(centroid, mid);

  // Outward normal must point AWAY from centroid (dot product < 0)
  if (vDot(n, toCentroid) > 0) {
    n = vScale(n, -1);
  }
  return n;
}

// Refraction at boundary with known outward normal nOut
// isEntering: true if ray enters from air (n1=1 -> n2=prismN), false if exiting (n1=prismN -> n2=1)
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
    // Ray in air entering prism: normal pointing against ray is nOut
    const c1 = -vDot(v, nOut);
    if (c1 <= 0) {
      // Ray grazing or wrong side
      return { dir: v, isTIR: false };
    }
    const sin2_theta2 = eta * eta * (1 - c1 * c1);
    if (sin2_theta2 > 1.0) {
      // Exterior reflection
      const refl = vAdd(v, vScale(nOut, 2 * c1));
      return { dir: vNorm(refl), isTIR: true };
    }
    const c2 = Math.sqrt(Math.max(0, 1 - sin2_theta2));
    const refr = vAdd(vScale(v, eta), vScale(nOut, eta * c1 - c2));
    return { dir: vNorm(refr), isTIR: false };
  } else {
    // Ray inside prism exiting to air: normal pointing against ray is -nOut (inward)
    const nIn = vScale(nOut, -1);
    const c1 = -vDot(v, nIn); // = vDot(v, nOut) > 0
    if (c1 <= 0) {
      return { dir: v, isTIR: false };
    }
    const sin2_theta2 = eta * eta * (1 - c1 * c1);
    if (sin2_theta2 > 1.0) {
      // Total Internal Reflection (TIR) inside prism!
      const refl = vSub(v, vScale(nOut, 2 * (vDot(v, nOut))));
      return { dir: vNorm(refl), isTIR: true };
    }
    // Refraction into air
    const c2 = Math.sqrt(Math.max(0, 1 - sin2_theta2));
    const refr = vAdd(vScale(v, eta), vScale(nIn, eta * c1 - c2));
    return { dir: vNorm(refr), isTIR: false };
  }
}

// Get world-space vertices of a prism (sleeker, compact unicorn horn)
export function getPrismVertices(prism: Prism): Vec2[] {
  let localPoints: Vec2[];

  const s = prism.scale || 1;
  if (prism.shape === 'horn') {
    // Sleek, elegant unicorn horn crystal triangle
    localPoints = [
      { x: 0, y: -38 * s },     // Tip
      { x: 22 * s, y: 22 * s },  // Right base
      { x: -22 * s, y: 22 * s }, // Left base
    ];
  } else if (prism.shape === 'mirror') {
    // Polished flat mirror bar
    const w = 36 * s;
    const h = 6 * s;
    localPoints = [
      { x: -w, y: -h },
      { x: w, y: -h },
      { x: w, y: h },
      { x: -w, y: h },
    ];
  } else if (prism.shape === 'dove') {
    // Dove prism trapezoid (45 deg entry/exit faces)
    const topW = 20 * s;
    const botW = 44 * s;
    const h = 24 * s;
    localPoints = [
      { x: -topW, y: -h },
      { x: topW, y: -h },
      { x: botW, y: h },
      { x: -botW, y: h },
    ];
  } else if (prism.shape === 'orb') {
    // Crystal orb / sphere (64-sided ultra-precise regular polygon for smooth optical focus & caustics)
    localPoints = [];
    const segments = 64;
    const r = 30 * s;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      localPoints.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
      });
    }
  } else {
    // Default fallback
    localPoints = [
      { x: 0, y: -38 * s },
      { x: 22 * s, y: 22 * s },
      { x: -22 * s, y: 22 * s },
    ];
  }

  return localPoints.map((p) => {
    const rot = vRotate(p, prism.rot);
    return vAdd(rot, prism.pos);
  });
}

// Check if point is inside a polygon
export function isPointInPolygon(point: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance from circle center to segment AB
export function distToSegment(center: Vec2, a: Vec2, b: Vec2): number {
  const ab = vSub(b, a);
  const ac = vSub(center, a);
  const lenSq = vDot(ab, ab);
  if (lenSq < 1e-7) return vDist(center, a);

  const t = clamp(vDot(ac, ab) / lenSq, 0, 1);
  const proj = vAdd(a, vScale(ab, t));
  return vDist(center, proj);
}
