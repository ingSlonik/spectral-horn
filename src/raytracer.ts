import {
  Vec2,
  Ray,
  RaySegment,
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
  getOutwardNormal,
  refractRay,
  getPrismVertices,
  distToSegment,
} from './math';
import { getRefractiveIndex } from './color';

export interface TraceResult {
  segments: RaySegment[];
  targetHits: Map<number, { valid: number; total: number; avgWavelength: number }>;
}

// Maximum number of bounces / refractions allowed per ray
const MAX_BOUNCES = 24;
const EPS = 0.04;

export function traceScene(
  emitterInput: Emitter | Emitter[],
  prisms: Prism[],
  obstacles: Obstacle[],
  targets: Target[],
  boundsOrWidth: number | { minX: number; minY: number; maxX: number; maxY: number } = 1000,
  height: number = 1000
): TraceResult {
  const segments: RaySegment[] = [];
  const targetHits = new Map<number, { valid: number; total: number; sumWl: number }>();

  for (const t of targets) {
    targetHits.set(t.id, { valid: 0, total: 0, sumWl: 0 });
  }

  const emitters = Array.isArray(emitterInput) ? emitterInput : [emitterInput];

  // Pre-calculate prism geometry and outward normals
  const prismPolys = prisms.map((p) => {
    const verts = getPrismVertices(p);
    const numV = verts.length;
    const edges = [];
    for (let i = 0; i < numV; i++) {
      const p1 = verts[i];
      const p2 = verts[(i + 1) % numV];
      const nOut = getOutwardNormal(p1, p2, p.pos);
      edges.push({ p1, p2, nOut });
    }
    return { prism: p, edges };
  });

  // Pre-calculate obstacle geometry
  const obstaclePolys = obstacles.map((obs) => {
    const pts = obs.points;
    const numP = pts.length;
    let cx = 0, cy = 0;
    pts.forEach((pt) => { cx += pt.x; cy += pt.y; });
    const centroid = v2(cx / numP, cy / numP);
    const edges = [];
    for (let i = 0; i < numP; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % numP];
      const nOut = getOutwardNormal(p1, p2, centroid);
      edges.push({ p1, p2, nOut });
    }
    return { obstacle: obs, edges };
  });

  // Outer bounds (can extend across entire screen)
  const bounds = typeof boundsOrWidth === 'object'
    ? boundsOrWidth
    : { minX: 0, minY: 0, maxX: boundsOrWidth, maxY: height };

  const { minX, minY, maxX, maxY } = bounds;

  const roomEdges = [
    { p1: v2(minX, minY), p2: v2(maxX, minY), normal: v2(0, 1) },
    { p1: v2(maxX, minY), p2: v2(maxX, maxY), normal: v2(-1, 0) },
    { p1: v2(maxX, maxY), p2: v2(minX, maxY), normal: v2(0, -1) },
    { p1: v2(minX, maxY), p2: v2(minX, minY), normal: v2(1, 0) },
  ];

  for (const emitter of emitters) {
    const rayCount = emitter.rayCount || 48;
    const minLambda = emitter.minLambda || 400;
    const maxLambda = emitter.maxLambda || 700;
    const beamWidth = emitter.width || 6;

    const baseDir = v2(Math.cos(emitter.angle), Math.sin(emitter.angle));
    const perpDir = v2(-baseDir.y, baseDir.x);

    for (let i = 0; i < rayCount; i++) {
      const t = rayCount > 1 ? i / (rayCount - 1) : 0.5;
      const wavelength = minLambda + t * (maxLambda - minLambda);

      // Spread rays evenly across emitter aperture
      const offset = (t - 0.5) * beamWidth;
      const origin = vAdd(emitter.pos, vScale(perpDir, offset));

      let currentRay: Ray = {
        origin,
        dir: baseDir,
        wavelength,
        intensity: 1.0,
        mediumIndex: 1.0,
        insidePrismId: null,
        bounceCount: 0,
      };

      while (currentRay.bounceCount < MAX_BOUNCES) {
        let closestHitDist = Infinity;
        let hitPoint: Vec2 | null = null;
        let hitPrism: Prism | null = null;
        let hitPrismEdgeNormal: Vec2 | null = null;
        let hitObstacle: Obstacle | null = null;
        let hitObstacleNormal: Vec2 | null = null;

        // 1. Test Prism Edges
        for (const item of prismPolys) {
          for (const edge of item.edges) {
            const hit = raySegmentIntersection(currentRay.origin, currentRay.dir, edge.p1, edge.p2);
            if (hit && hit.t < closestHitDist) {
              closestHitDist = hit.t;
              hitPoint = vAdd(currentRay.origin, vScale(currentRay.dir, hit.t));
              hitPrism = item.prism;
              hitPrismEdgeNormal = edge.nOut;
              hitObstacle = null;
            }
          }
        }

        // 2. Test Obstacles
        for (const item of obstaclePolys) {
          for (const edge of item.edges) {
            const hit = raySegmentIntersection(currentRay.origin, currentRay.dir, edge.p1, edge.p2);
            if (hit && hit.t < closestHitDist) {
              closestHitDist = hit.t;
              hitPoint = vAdd(currentRay.origin, vScale(currentRay.dir, hit.t));
              hitPrism = null;
              hitObstacle = item.obstacle;
              hitObstacleNormal = edge.nOut;
            }
          }
        }

        // 3. Test Room Boundaries
        for (const edge of roomEdges) {
          const hit = raySegmentIntersection(currentRay.origin, currentRay.dir, edge.p1, edge.p2);
          if (hit && hit.t < closestHitDist) {
            closestHitDist = hit.t;
            hitPoint = vAdd(currentRay.origin, vScale(currentRay.dir, hit.t));
            hitPrism = null;
            hitObstacle = null;
            hitObstacleNormal = edge.normal;
          }
        }

        // If no hit, ray exits scene
        if (!hitPoint) {
          const farPoint = vAdd(currentRay.origin, vScale(currentRay.dir, 2000));
          segments.push({
            p1: currentRay.origin,
            p2: farPoint,
            wavelength: currentRay.wavelength,
            intensity: currentRay.intensity,
          });
          break;
        }

        const segStart = currentRay.origin;
        const segEnd = hitPoint;

        // Record this beam segment
        segments.push({
          p1: segStart,
          p2: segEnd,
          wavelength: currentRay.wavelength,
          intensity: currentRay.intensity,
        });

        // Test Target Sensor Hits along this segment
        for (const target of targets) {
          const d = distToSegment(target.pos, segStart, segEnd);
          if (d <= target.radius) {
            const stats = targetHits.get(target.id)!;
            stats.total++;
            stats.sumWl += currentRay.wavelength;
            if (currentRay.wavelength >= target.minLambda && currentRay.wavelength <= target.maxLambda) {
              stats.valid++;
            }
          }
        }

        // Process interactions
        if (hitObstacle) {
          if (hitObstacle.isMirror && hitObstacleNormal) {
            // Specular mirror reflection
            const n = hitObstacleNormal;
            const refl = vSub(currentRay.dir, vScale(n, 2 * vDot(currentRay.dir, n)));
            currentRay.dir = vNorm(refl);
            currentRay.origin = vAdd(hitPoint, vScale(currentRay.dir, EPS));
            currentRay.bounceCount++;
          } else {
            // Absorbed by opaque barrier
            break;
          }
        } else if (hitPrism && hitPrismEdgeNormal) {
          if (hitPrism.shape === 'mirror' || hitPrism.isMirror) {
            // Interactive mirror element specular reflection
            const n = hitPrismEdgeNormal;
            const refl = vSub(currentRay.dir, vScale(n, 2 * vDot(currentRay.dir, n)));
            currentRay.dir = vNorm(refl);
            currentRay.origin = vAdd(hitPoint, vScale(currentRay.dir, EPS));
            currentRay.bounceCount++;
          } else {
            const prismN = getRefractiveIndex(hitPrism.baseIndex, hitPrism.dispersionB, currentRay.wavelength);
            const isCurrentlyInside = currentRay.insidePrismId === hitPrism.id;

            if (isCurrentlyInside) {
              // Exiting prism surface: Prism -> Air
              const result = refractRay(currentRay.dir, hitPrismEdgeNormal, prismN, 1.0, false);
              currentRay.dir = result.dir;
              currentRay.origin = vAdd(hitPoint, vScale(result.dir, EPS));
              if (!result.isTIR) {
                currentRay.insidePrismId = null;
                currentRay.mediumIndex = 1.0;
              }
            } else {
              // Entering prism surface: Air -> Prism
              const result = refractRay(currentRay.dir, hitPrismEdgeNormal, 1.0, prismN, true);
              currentRay.dir = result.dir;
              currentRay.origin = vAdd(hitPoint, vScale(result.dir, EPS));
              if (!result.isTIR) {
                currentRay.insidePrismId = hitPrism.id;
                currentRay.mediumIndex = prismN;
              }
            }
            currentRay.bounceCount++;
          }
        } else {
          // Hit screen boundary
          break;
        }
      }
    }
  }

  const finalHits = new Map<number, { valid: number; total: number; avgWavelength: number }>();
  for (const [id, stats] of targetHits.entries()) {
    finalHits.set(id, {
      valid: stats.valid,
      total: stats.total,
      avgWavelength: stats.total > 0 ? stats.sumWl / stats.total : 0,
    });
  }

  return { segments, targetHits: finalHits };
}
