import {
  Vec2,
  Ray,
  RaySegment,
  RayPath,
  Prism,
  Target,
  Obstacle,
  Emitter,
} from './types';
import {
  v2,
  vAdd,
  vSub,
  vScale,
  vNorm,
  vDot,
  raySegmentIntersection,
  rayCircleIntersection,
  getOutwardNormal,
  refractRay,
  getPrismVertices,
  distToSegment,
} from './math';
import { getRefractiveIndex, wavelengthToRGB, checkColorMatch } from './color';

export interface TargetHitStats {
  valid: number;
  total: number;
  avgWavelength: number;
  sampledRgb: [number, number, number];
  isMatch: boolean;
  hasLight: boolean;
}

export interface TraceResult {
  rays: RayPath[];
  segments: RaySegment[];
  targetHits: Map<number, TargetHitStats>;
}

const MAX_BOUNCES = 24;
const EPS = 0.04;

export function traceScene(
  emitterInput: Emitter | Emitter[],
  prisms: Prism[],
  obstacles: Obstacle[],
  targets: Target[],
  boundsOrWidth: number | { minX: number; minY: number; maxX: number; maxY: number } = 1000,
  height = 1000
): TraceResult {
  const rays: RayPath[] = [];
  const segments: RaySegment[] = [];
  const targetStats = new Map<number, {
    t: Target;
    valid: number;
    total: number;
    sumWl: number;
    r: number;
    g: number;
    b: number;
  }>();

  for (const t of targets) {
    targetStats.set(t.id, { t, valid: 0, total: 0, sumWl: 0, r: 0, g: 0, b: 0 });
  }

  const emitters = Array.isArray(emitterInput) ? emitterInput : [emitterInput];

  const orbs: { prism: Prism; r: number }[] = [];
  const sceneEdges: { p1: Vec2; p2: Vec2; nOut: Vec2; prism?: Prism; obstacle?: Obstacle }[] = [];

  for (const p of prisms) {
    if (p.shape === 'orb') {
      orbs.push({ prism: p, r: 30 * (p.scale || 1) });
    } else {
      const v = getPrismVertices(p);
      const len = v.length;
      for (let i = 0; i < len; i++) {
        const p1 = v[i];
        const p2 = v[(i + 1) % len];
        sceneEdges.push({ p1, p2, nOut: getOutwardNormal(p1, p2, p.pos), prism: p });
      }
    }
  }

  for (const obs of obstacles) {
    const pts = obs.points;
    const len = pts.length;
    let cx = 0, cy = 0;
    for (const pt of pts) { cx += pt.x; cy += pt.y; }
    const centroid = v2(cx / len, cy / len);
    for (let i = 0; i < len; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % len];
      sceneEdges.push({ p1, p2, nOut: getOutwardNormal(p1, p2, centroid), obstacle: obs });
    }
  }

  const b = typeof boundsOrWidth === 'object'
    ? boundsOrWidth
    : { minX: 0, minY: 0, maxX: boundsOrWidth, maxY: height };

  sceneEdges.push(
    ...[
      [b.minX, b.minY, b.maxX, b.minY, 0, 1],
      [b.maxX, b.minY, b.maxX, b.maxY, -1, 0],
      [b.maxX, b.maxY, b.minX, b.maxY, 0, -1],
      [b.minX, b.maxY, b.minX, b.minY, 1, 0],
    ].map(([x1, y1, x2, y2, nx, ny]) => ({ p1: v2(x1, y1), p2: v2(x2, y2), nOut: v2(nx, ny) }))
  );

  for (const emitter of emitters) {
    const count = emitter.rayCount || 48;
    const minL = emitter.minLambda || 400;
    const maxL = emitter.maxLambda || 700;
    const width = emitter.width || 6;

    const baseDir = v2(Math.cos(emitter.angle), Math.sin(emitter.angle));
    const perpDir = v2(-baseDir.y, baseDir.x);

    for (let i = 0; i < count; i++) {
      const tParam = count > 1 ? i / (count - 1) : 0.5;
      const wavelength = minL + tParam * (maxL - minL);
      const origin = vAdd(emitter.pos, vScale(perpDir, (tParam - 0.5) * width));
      const rayPoints: Vec2[] = [origin];

      const ray: Ray = {
        origin,
        dir: baseDir,
        wavelength,
        intensity: 1.0,
        mediumIndex: 1.0,
        insidePrismId: null,
        bounceCount: 0,
      };

      while (ray.bounceCount < MAX_BOUNCES) {
        let minDist = Infinity;
        let hitPos: Vec2 | null = null;
        let hitPrism: Prism | null = null;
        let hitNormal: Vec2 | null = null;
        let hitObs: Obstacle | null = null;

        for (const o of orbs) {
          const hit = rayCircleIntersection(ray.origin, ray.dir, o.prism.pos, o.r, ray.insidePrismId === o.prism.id);
          if (hit && hit.t < minDist) {
            minDist = hit.t;
            hitPos = hit.hitPoint;
            hitPrism = o.prism;
            hitNormal = hit.normal;
            hitObs = null;
          }
        }

        for (const edge of sceneEdges) {
          const hit = raySegmentIntersection(ray.origin, ray.dir, edge.p1, edge.p2);
          if (hit && hit.t < minDist) {
            minDist = hit.t;
            hitPos = { x: ray.origin.x + ray.dir.x * hit.t, y: ray.origin.y + ray.dir.y * hit.t };
            hitPrism = edge.prism || null;
            hitNormal = edge.nOut;
            hitObs = edge.obstacle || null;
          }
        }

        if (!hitPos) {
          const far = vAdd(ray.origin, vScale(ray.dir, 2000));
          segments.push({ p1: ray.origin, p2: far, wavelength, intensity: ray.intensity });
          rayPoints.push(far);
          break;
        }

        const segStart = ray.origin;
        const segEnd = hitPos;
        segments.push({ p1: segStart, p2: segEnd, wavelength, intensity: ray.intensity });
        rayPoints.push(segEnd);

        for (const target of targets) {
          if (distToSegment(target.pos, segStart, segEnd) <= target.radius * 0.374) {
            const st = targetStats.get(target.id)!;
            st.total++;
            st.sumWl += wavelength;
            const [cr, cg, cb] = wavelengthToRGB(wavelength);
            st.r += cr * ray.intensity;
            st.g += cg * ray.intensity;
            st.b += cb * ray.intensity;
            if (wavelength >= target.minLambda && wavelength <= target.maxLambda) st.valid++;
          }
        }

        const isMirrorHit = (hitObs && hitObs.isMirror) || (hitPrism && hitPrism.shape === 'mirror');
        if (isMirrorHit && hitNormal) {
          const refl = vSub(ray.dir, vScale(hitNormal, 2 * vDot(ray.dir, hitNormal)));
          ray.dir = vNorm(refl);
          ray.origin = vAdd(hitPos, vScale(ray.dir, EPS));
          ray.bounceCount++;
        } else if (hitPrism && hitNormal) {
          const prismN = getRefractiveIndex(hitPrism.baseIndex, hitPrism.dispersionB, wavelength);
          const inside = ray.insidePrismId === hitPrism.id;
          const res = refractRay(ray.dir, hitNormal, inside ? prismN : 1.0, inside ? 1.0 : prismN, !inside);
          ray.dir = res.dir;
          ray.origin = vAdd(hitPos, vScale(res.dir, EPS));
          if (!res.isTIR) {
            ray.insidePrismId = inside ? null : hitPrism.id;
            ray.mediumIndex = inside ? 1.0 : prismN;
          }
          ray.bounceCount++;
        } else {
          break;
        }
      }

      rays.push({ wavelength, intensity: ray.intensity, points: rayPoints });
    }
  }

  const finalHits = new Map<number, TargetHitStats>();
  for (const [id, st] of targetStats.entries()) {
    const t = st.t;
    const targetRgb = t.targetRgb || wavelengthToRGB((t.minLambda + t.maxLambda) / 2);
    let sampledRgb: [number, number, number] = [0, 0, 0];
    let isMatch = false;
    let hasLight = false;

    if (st.total > 0) {
      const maxVal = Math.max(st.r, st.g, st.b, 1);
      sampledRgb = [
        Math.min(255, Math.round((st.r / maxVal) * 255)),
        Math.min(255, Math.round((st.g / maxVal) * 255)),
        Math.min(255, Math.round((st.b / maxVal) * 255)),
      ];
      const m = checkColorMatch(sampledRgb, targetRgb);
      isMatch = m.isMatch;
      hasLight = m.hasLight;
    }

    finalHits.set(id, {
      valid: st.valid,
      total: st.total,
      avgWavelength: st.total > 0 ? st.sumWl / st.total : 0,
      sampledRgb,
      isMatch,
      hasLight,
    });
  }

  return { rays, segments, targetHits: finalHits };
}
