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

const { sin, cos, min, max, hypot, abs, round } = Math;

export interface TargetHitStats {
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
  targets: Target[]
): TraceResult {
  const rays: RayPath[] = [];
  const segments: RaySegment[] = [];
  const tStats = targets.map((t) => ({ t, total: 0, r: 0, g: 0, b: 0 }));

  const emitters = Array.isArray(emitterInput) ? emitterInput : [emitterInput];

  const orbs: { prism: Prism; r: number }[] = [];
  const sceneEdges: { p1: Vec2; p2: Vec2; nOut: Vec2; prism?: Prism; obstacle?: Obstacle }[] = [];

  const pushEdges = (pts: Vec2[], centroid: Vec2, prism?: Prism, obstacle?: Obstacle) => {
    for (let i = 0, len = pts.length; i < len; i++) {
      sceneEdges.push({ p1: pts[i], p2: pts[(i + 1) % len], nOut: getOutwardNormal(pts[i], pts[(i + 1) % len], centroid), prism, obstacle });
    }
  };

  for (const p of prisms) {
    p.shape === 'orb'
      ? orbs.push({ prism: p, r: 30 * (p.scale || 1) })
      : pushEdges(getPrismVertices(p), p.pos, p);
  }

  for (const obs of obstacles) {
    const pts = obs.points;
    pushEdges(pts, v2((pts[0].x + pts[2].x) / 2, (pts[0].y + pts[2].y) / 2), undefined, obs);
  }

  for (const emitter of emitters) {
    const count = emitter.rayCount || 48;
    const minL = emitter.minLambda || 400;
    const maxL = emitter.maxLambda || 700;
    const width = emitter.width || 6;

    const baseDir = v2(cos(emitter.angle), sin(emitter.angle));
    const perpDir = v2(-baseDir.y, baseDir.x);

    for (let i = 0; i < count; i++) {
      // CONTINUOUS SPECTRAL SAMPLING:
      // Linearly maps emitter width to discrete photon streams sampled across [minLambda, maxLambda]
      const tParam = count > 1 ? i / (count - 1) : 0.5;
      const wavelength = minL + tParam * (maxL - minL);
      let rOrigin = vAdd(emitter.pos, vScale(perpDir, (tParam - 0.5) * width));
      let rDir = baseDir;
      let insideId: number | null = null;
      let bounces = 0;
      const rayPoints: Vec2[] = [rOrigin];

      const [cr, cg, cb] = wavelengthToRGB(wavelength);

      while (bounces < MAX_BOUNCES) {
        let minDist = Infinity;
        let hitPos: Vec2 | null = null;
        let hitPrism: Prism | null = null;
        let hitNormal: Vec2 | null = null;
        let hitObs: Obstacle | null = null;

        // 1. CURVED OPTICS: Analytical ray-circle intersection for Orb prisms
        for (const o of orbs) {
          const hit = rayCircleIntersection(rOrigin, rDir, o.prism.pos, o.r, insideId === o.prism.id);
          if (hit && hit.t < minDist) {
            minDist = hit.t;
            hitPos = hit.hitPoint;
            hitPrism = o.prism;
            hitNormal = hit.normal;
            hitObs = null;
          }
        }

        // 2. POLYGONAL OPTICS: Ray-segment intersection against prism facets, obsidian & mirrors
        for (const edge of sceneEdges) {
          const hit = raySegmentIntersection(rOrigin, rDir, edge.p1, edge.p2);
          if (hit && hit.t < minDist) {
            minDist = hit.t;
            hitPos = v2(rOrigin.x + rDir.x * hit.t, rOrigin.y + rDir.y * hit.t);
            hitPrism = edge.prism || null;
            hitNormal = edge.nOut;
            hitObs = edge.obstacle || null;
          }
        }

        const segEnd = hitPos || vAdd(rOrigin, vScale(rDir, 3000));
        segments.push({ p1: rOrigin, p2: segEnd, wavelength, intensity: 1 });
        rayPoints.push(segEnd);

        // 3. SENSOR DETECTION: Integrate photon flux crossing the sensor photodiode aperture
        for (let ti = 0; ti < tStats.length; ti++) {
          const st = tStats[ti];
          if (distToSegment(st.t.pos, rOrigin, segEnd) <= st.t.radius * 0.374) {
            st.total++;
            st.r += cr;
            st.g += cg;
            st.b += cb;
          }
        }

        if (!hitPos) break;

        // 4. LAW OF SPECULAR REFLECTION: r_refl = d - 2 * (d · n) * n
        const isMirrorHit = (hitObs && hitObs.isMirror) || (hitPrism && hitPrism.shape === 'mirror');
        if (isMirrorHit && hitNormal) {
          rDir = vNorm(vSub(rDir, vScale(hitNormal, 2 * vDot(rDir, hitNormal))));
        } else if (hitPrism && hitNormal) {
          // 5. SNELL'S LAW & CHROMATIC DISPERSION
          const prismN = getRefractiveIndex(hitPrism.baseIndex, hitPrism.dispersionB, wavelength);
          const inside: boolean = insideId === hitPrism.id;
          const res = refractRay(rDir, hitNormal, inside ? prismN : 1.0, inside ? 1.0 : prismN, !inside);
          rDir = res.dir;
          if (!res.isTIR) insideId = inside ? null : hitPrism.id;
        } else {
          // Ray struck an opaque non-reflective obstacle or room boundary
          break;
        }
        rOrigin = vAdd(hitPos, vScale(rDir, EPS));
        bounces++;
      }

      rays.push({ wavelength, intensity: 1, points: rayPoints });
    }
  }

  // OPTIMIZATION: Streamlined reduction of sensor hit statistics avoiding intermediate array allocations
  const finalHits = new Map<number, TargetHitStats>();
  for (let ti = 0; ti < tStats.length; ti++) {
    const st = tStats[ti];
    const targetRgb = st.t.targetRgb || wavelengthToRGB((st.t.minLambda + st.t.maxLambda) / 2);
    const maxVal = max(st.r, st.g, st.b, 1);
    const sampledRgb: [number, number, number] = st.total
      ? [min(255, round(st.r / maxVal * 255)), min(255, round(st.g / maxVal * 255)), min(255, round(st.b / maxVal * 255))]
      : [0, 0, 0];
    const m = st.total ? checkColorMatch(sampledRgb, targetRgb) : { isMatch: false, hasLight: false };

    finalHits.set(st.t.id, {
      sampledRgb,
      isMatch: m.isMatch,
      hasLight: m.hasLight,
    });
  }

  return { rays, segments, targetHits: finalHits };
}
