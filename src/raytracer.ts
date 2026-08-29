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
  const rays: RayPath[] = [];
  const segments: RaySegment[] = [];
  const targetStatsMap = new Map<number, {
    target: Target;
    valid: number;
    total: number;
    sumWl: number;
    accR: number;
    accG: number;
    accB: number;
  }>();

  for (const t of targets) {
    targetStatsMap.set(t.id, {
      target: t,
      valid: 0,
      total: 0,
      sumWl: 0,
      accR: 0,
      accG: 0,
      accB: 0,
    });
  }

  const emitters = Array.isArray(emitterInput) ? emitterInput : [emitterInput];

  // Separate analytic orbs from polygonal prisms
  const orbPrisms: {
    prism: Prism;
    radius: number;
  }[] = [];

  const polyPrisms: {
    prism: Prism;
    edges: { p1: Vec2; p2: Vec2; nOut: Vec2 }[];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }[] = [];

  for (const p of prisms) {
    if (p.shape === 'orb') {
      const radius = 30 * (p.scale || 1);
      orbPrisms.push({ prism: p, radius });
    } else {
      const verts = getPrismVertices(p);
      const numV = verts.length;
      const edges = [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < numV; i++) {
        const p1 = verts[i];
        const p2 = verts[(i + 1) % numV];
        minX = Math.min(minX, p1.x);
        minY = Math.min(minY, p1.y);
        maxX = Math.max(maxX, p1.x);
        maxY = Math.max(maxY, p1.y);
        const nOut = getOutwardNormal(p1, p2, p.pos);
        edges.push({ p1, p2, nOut });
      }
      polyPrisms.push({ prism: p, edges, minX, minY, maxX, maxY });
    }
  }

  // Pre-calculate obstacle geometry & AABBs
  const obstaclePolys = obstacles.map((obs) => {
    const pts = obs.points;
    const numP = pts.length;
    let cx = 0, cy = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < numP; i++) {
      const pt = pts[i];
      cx += pt.x;
      cy += pt.y;
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    const centroid = v2(cx / numP, cy / numP);
    const edges = [];
    for (let i = 0; i < numP; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % numP];
      const nOut = getOutwardNormal(p1, p2, centroid);
      edges.push({ p1, p2, nOut });
    }
    return { obstacle: obs, edges, minX, minY, maxX, maxY };
  });

  // Outer bounds
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
      const rayPoints: Vec2[] = [origin];

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

        // 1. Test Orb Prisms (O(1) analytic circle intersection)
        for (const item of orbPrisms) {
          const isInsideThisOrb = currentRay.insidePrismId === item.prism.id;
          const hit = rayCircleIntersection(currentRay.origin, currentRay.dir, item.prism.pos, item.radius, isInsideThisOrb);
          if (hit && hit.t < closestHitDist) {
            closestHitDist = hit.t;
            hitPoint = hit.hitPoint;
            hitPrism = item.prism;
            hitPrismEdgeNormal = hit.normal;
            hitObstacle = null;
          }
        }

        // 2. Test Polygonal Prism Edges
        for (const item of polyPrisms) {
          for (const edge of item.edges) {
            const hit = raySegmentIntersection(currentRay.origin, currentRay.dir, edge.p1, edge.p2);
            if (hit && hit.t < closestHitDist) {
              closestHitDist = hit.t;
              hitPoint = {
                x: currentRay.origin.x + currentRay.dir.x * hit.t,
                y: currentRay.origin.y + currentRay.dir.y * hit.t,
              };
              hitPrism = item.prism;
              hitPrismEdgeNormal = edge.nOut;
              hitObstacle = null;
            }
          }
        }

        // 3. Test Obstacles
        for (const item of obstaclePolys) {
          for (const edge of item.edges) {
            const hit = raySegmentIntersection(currentRay.origin, currentRay.dir, edge.p1, edge.p2);
            if (hit && hit.t < closestHitDist) {
              closestHitDist = hit.t;
              hitPoint = {
                x: currentRay.origin.x + currentRay.dir.x * hit.t,
                y: currentRay.origin.y + currentRay.dir.y * hit.t,
              };
              hitPrism = null;
              hitObstacle = item.obstacle;
              hitObstacleNormal = edge.nOut;
            }
          }
        }

        // 4. Test Room Boundaries
        for (const edge of roomEdges) {
          const hit = raySegmentIntersection(currentRay.origin, currentRay.dir, edge.p1, edge.p2);
          if (hit && hit.t < closestHitDist) {
            closestHitDist = hit.t;
            hitPoint = {
              x: currentRay.origin.x + currentRay.dir.x * hit.t,
              y: currentRay.origin.y + currentRay.dir.y * hit.t,
            };
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
          rayPoints.push(farPoint);
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
        rayPoints.push(segEnd);

        // Test Target Sensor Hits along this segment
        for (const target of targets) {
          const d = distToSegment(target.pos, segStart, segEnd);
          if (d <= target.radius) {
            const stats = targetStatsMap.get(target.id)!;
            stats.total++;
            stats.sumWl += currentRay.wavelength;
            const [r, g, b] = wavelengthToRGB(currentRay.wavelength);
            stats.accR += r * currentRay.intensity;
            stats.accG += g * currentRay.intensity;
            stats.accB += b * currentRay.intensity;
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

      rays.push({
        wavelength,
        intensity: currentRay.intensity,
        points: rayPoints,
      });
    }
  }

  const finalHits = new Map<number, TargetHitStats>();
  for (const [id, stats] of targetStatsMap.entries()) {
    const t = stats.target;
    const midWl = (t.minLambda + t.maxLambda) / 2;
    const targetRgb = t.targetRgb || wavelengthToRGB(midWl);

    let sampledRgb: [number, number, number] = [0, 0, 0];
    let isMatch = false;
    let hasLight = false;

    if (stats.total > 0) {
      const maxVal = Math.max(stats.accR, stats.accG, stats.accB, 1);
      sampledRgb = [
        Math.min(255, Math.round((stats.accR / maxVal) * 255)),
        Math.min(255, Math.round((stats.accG / maxVal) * 255)),
        Math.min(255, Math.round((stats.accB / maxVal) * 255)),
      ];
      const match = checkColorMatch(sampledRgb, targetRgb, [0, 0, 0]);
      isMatch = match.isMatch;
      hasLight = match.hasLight;
    }

    finalHits.set(id, {
      valid: stats.valid,
      total: stats.total,
      avgWavelength: stats.total > 0 ? stats.sumWl / stats.total : 0,
      sampledRgb,
      isMatch,
      hasLight,
    });
  }

  return { rays, segments, targetHits: finalHits };
}
