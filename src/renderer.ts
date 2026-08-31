import {
  Prism,
  Target,
  Obstacle,
  Emitter,
  RaySegment,
  RayPath,
  Vec2,
} from './types';
import {
  v2,
  distToSegment,
} from './math';
import {
  wavelengthToHex,
  wavelengthToRGB,
  rgbToHex,
} from './color';

// OPTIMIZATION (MATH ALIASING):
// Destructuring Math methods to module-level constants allows Terser and esbuild to minify calls
// like 'Math.sin(x)' into short 1-character local references like 's(x)' throughout the entire file.
const { sin, cos, min, max, random, round, PI } = Math;
const TAU = PI * 2;

// Pre-computed lookup table for zero-allocation continuous smooth rainbow colors
const COLOR_TABLE: string[] = [];
for (let wl = 380; wl <= 750; wl++) COLOR_TABLE[wl] = wavelengthToRGB(wl).join(',');

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  glintWl: number;
  glintAlpha: number;
  nextFlashTime: number;
}

// OPTIMIZATION (CANVAS 2D NATIVE API WRAPPERS):
// Browser Canvas2D method names (beginPath, stroke, fill, arc, roundRect, createRadialGradient, addColorStop)
// are un-mangleable native strings. Wrapping them in compact local helper functions (circ, rRect, line, arc, poly)
// isolates repeated DOM API invocations, dramatically reducing uncompressed and zipped payload sizes.
const fillStroke = (ctx: CanvasRenderingContext2D, fill?: string | CanvasGradient | CanvasPattern, stroke?: string, lw = 1) => {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
};

const beginPath = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
}

// Compact Canvas 2D primitives
const circ = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill?: string | CanvasGradient | CanvasPattern, stroke?: string, lw = 1) => {
  beginPath(ctx);
  ctx.arc(x, y, r, 0, TAU);
  fillStroke(ctx, fill, stroke, lw);
};

const rRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[], fill?: string | CanvasGradient, stroke?: string, lw = 1) => {
  beginPath(ctx);
  ctx.roundRect(x, y, w, h, r);
  fillStroke(ctx, fill, stroke, lw);
};

const line = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, stroke: string, lw = 1, cap?: CanvasLineCap) => {
  beginPath(ctx);
  if (cap) ctx.lineCap = cap;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  fillStroke(ctx, undefined, stroke, lw);
};

const addStops = (g: CanvasGradient, stops: [number, string][]) => {
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
};

const radGrad = (ctx: CanvasRenderingContext2D, x: number, y: number, r1: number, r2: number, stops: [number, string][]) =>
  addStops(ctx.createRadialGradient(x, y, r1, x, y, r2), stops);

const linGrad = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, stops: [number, string][]) =>
  addStops(ctx.createLinearGradient(x1, y1, x2, y2), stops);

const arc = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sa: number, ea: number, stroke?: string, lw = 1, cap?: CanvasLineCap, fill?: string) => {
  beginPath(ctx);
  if (cap) ctx.lineCap = cap;
  ctx.arc(x, y, r, sa, ea);
  fillStroke(ctx, fill, stroke, lw);
};

const C_GOLD = '#ffd700';
const C_CYAN = '#38bdf8';
const C_WHITE = '#ffffff';
const C_GREEN = '#4ade80';
const ROUND: CanvasLineCap = 'round';
const LIGHTER: GlobalCompositeOperation = 'lighter';
const H_CCW = 'step-ccw', H_CW = 'step-cw', H_BODY = 'body', H_ROT = 'rot';
const M_MOVE = 'move', M_ROTATE = 'rotate';
const SH_HORN = 'horn', SH_MIRROR = 'mirror', SH_DOVE = 'dove', SH_ORB = 'orb';
const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;
const rgbaG = (a: number) => rgba(255, 215, 0, a);
const rgbaC = (a: number) => rgba(56, 189, 248, a);
const rgbaP = (a: number) => rgba(192, 132, 252, a);
const rgbaW = (a: number) => rgba(255, 255, 255, a);
const rgbaB = (a: number) => rgba(15, 23, 42, a);
const rgbaPnk = (a: number) => rgba(244, 114, 182, a);
const rgbaAmber = (a: number) => rgba(251, 191, 36, a);

const poly = (ctx: CanvasRenderingContext2D, pts: any[], fill?: string | CanvasGradient, stroke?: string, lw = 1, close = true) => {
  beginPath(ctx);
  pts.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, p.x ?? p[0], p.y ?? p[1]));
  if (close) ctx.closePath();
  fillStroke(ctx, fill, stroke, lw);
};

const drawCurve = (ctx: CanvasRenderingContext2D, pts: number[], fill?: string, stroke?: string, lw = 1.4) => {
  beginPath(ctx);
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 6) {
    ctx.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
  }
  ctx.closePath();
  fillStroke(ctx, fill, stroke, lw);
};

export function createRenderer(ctx: CanvasRenderingContext2D) {
  let currentCtx = ctx;
  const particles: Particle[] = [];
  const dust: DustParticle[] = [];
  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = 1000;
  rayCanvas.height = 1000;
  const rayCtx = rayCanvas.getContext('2d')!;
  let noisePattern: CanvasPattern | null = null;

  try {
    const nc = document.createElement('canvas');
    nc.width = nc.height = 128;
    const nctx = nc.getContext('2d');
    if (nctx) {
      const img = nctx.createImageData(128, 128);
      const b = img.data;
      for (let i = 0; i < b.length; i += 4) {
        b[i] = b[i + 1] = b[i + 2] = (random() * 255) | 0;
        b[i + 3] = (random() * 16 + 6) | 0;
      }
      nctx.putImageData(img, 0, 0);
      noisePattern = ctx.createPattern(nc, 'repeat');
    }
  } catch { }

  for (let i = 0; i < 45; i++) {
    dust.push({
      x: random() * 1000,
      y: random() * 1000,
      vx: (random() - 0.5) * 0.18,
      vy: (random() - 0.5) * 0.18 - 0.02,
      size: 0.8 + random() * 1.2,
      glintWl: 550,
      glintAlpha: 0,
      nextFlashTime: random() * 1500,
    });
  }

  const addSpark = (x: number, y: number, color: string, count = 3): void => {
    for (let i = 0; i < count; i++) {
      const angle = random() * TAU;
      const speed = 0.5 + random() * 2.0;
      particles.push({
        x: x + (random() - 0.5) * 8,
        y: y + (random() - 0.5) * 8,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed,
        life: 0,
        maxLife: 20 + random() * 25,
        color,
        size: 1.2 + random() * 1.8,
      });
    }
  };

  const clear = (width = currentCtx.canvas.width, height = currentCtx.canvas.height): void => {
    const c = currentCtx;
    const cx = width / 2, cy = height / 2;
    const bgGrad = radGrad(c, cx, cy, 40, max(cx, cy, 500), [
      [0, '#0e1635'],
      [0.55, '#070a1a'],
      [1, '#020309'],
    ]);
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, width, height);

    if (noisePattern) {
      c.fillStyle = noisePattern;
      c.fillRect(0, 0, width, height);
    }
  };

  const renderPonyHead = (
    c: CanvasRenderingContext2D,
    s: number,
    isHovered: boolean,
    isDragged: boolean,
    time: number,
    rot = 0
  ): void => {
    c.save();
    c.scale(s, s);

    const floatY = sin(time * 0.0022) * 2.0;
    const floatRot = sin(time * 0.0018) * 0.02;
    c.translate(0, floatY);
    c.rotate(floatRot);

    const strokeColor = isDragged ? rgbaG(0.95) : isHovered ? rgbaC(0.9) : rgbaC(0.55);

    // Fluffy Celestial Tail
    const tailSway = sin(time * 0.003 + 2.2) * 6;
    drawCurve(
      c,
      [38, 82, 55 + tailSway, 72, 68 + tailSway, 92, 54 + tailSway, 112, 46, 106, 40, 94, 36, 90],
      rgbaP(0.4),
      isDragged ? rgbaG(0.7) : rgbaP(0.6),
      1.4
    );

    // 4 Paddling / Fluttering Legs
    const upsideDownRaw = max(0, -cos(rot));
    const upsideDown = upsideDownRaw * upsideDownRaw * (3 - 2 * upsideDownRaw);

    const [swingFL, swingFR, swingBL, swingBR] = [0, PI, 1.2, PI + 1.2].map((ph, idx) => {
      const baseOffset = idx === 0 ? 0.95 : idx === 1 ? 0.75 : idx === 2 ? -0.95 : -0.75;
      return (1 - upsideDown) * sin(time * 0.0035 + ph) * 0.35 + baseOffset * upsideDown + upsideDown * sin(time * 0.007 + ph) * 0.15;
    });

    const drawLeg = (px: number, py: number, swing: number, isFar: boolean) => {
      c.save();
      c.translate(px, py);
      c.rotate(swing);
      const l = isFar ? 14 : 17;
      rRect(c, -3.5, 0, 7, l, 3.5, isFar ? rgbaB(0.55) : isDragged ? rgbaB(0.7) : rgbaB(0.52), strokeColor, isFar ? 1.0 : 1.4);
      rRect(c, -3.5, l - 5, 7, 5, 3.5, isDragged ? C_GOLD : C_CYAN);
      c.restore();
    };

    // Far legs
    drawLeg(16 - 3 * upsideDown, 102 - 3 * upsideDown, swingFR, true);
    drawLeg(36 + 5 * upsideDown, 98 - 3 * upsideDown, swingBR, true);

    const s1 = sin(time * 0.003 + 0.4) * 4.5;
    const s2 = sin(time * 0.0036 + 1.2) * 5.5;
    const s3 = sin(time * 0.0028 + 2.0) * 4.0;

    drawCurve(c, [10, 22, 34 + s1, 26, 42 + s1, 56, 34 + s1, 84, 24, 70, 20, 48, 14, 32], isDragged ? rgbaG(0.35) : rgbaP(0.38), isDragged ? rgbaG(0.75) : rgbaP(0.65));
    drawCurve(c, [14, 36, 44 + s2, 48, 48 + s2, 82, 28 + s2, 104, 22, 86, 18, 64, 10, 48], isDragged ? rgbaG(0.25) : rgbaC(0.35), isDragged ? rgbaG(0.65) : rgbaC(0.6));
    drawCurve(c, [16, 54, 38 + s3, 68, 40 + s3, 98, 22 + s3, 118, 16, 102, 14, 80, 8, 66], rgbaAmber(0.3), rgbaAmber(0.55), 1.2);

    // Silhouette
    drawCurve(
      c,
      [-20, 21, -25, 28, -35, 38, -36, 48, -37, 56, -30, 62, -21, 60, -14, 59, -10, 54, -6, 50, -4, 64, -6, 82, -2, 96, 2, 112, 18, 118, 34, 114, 46, 110, 48, 92, 42, 80, 36, 68, 26, 44, 20, 21],
      isDragged ? rgbaB(0.65) : rgbaB(0.48),
      strokeColor,
      isDragged ? 2.0 : 1.5
    );

    // Near legs
    drawLeg(4 - 4 * upsideDown, 106 - 3 * upsideDown, swingFL, false);
    drawLeg(26 + 4 * upsideDown, 104 - 3 * upsideDown, swingBL, false);

    // Cheek blush
    circ(c, -18, 50, 6, rgbaPnk(0.35));

    // Ear
    const earDroop = sin(time * 0.003) * 1.5;
    c.save();
    c.translate(14, 24);
    c.rotate(0.6 + earDroop * 0.04);
    beginPath(c); c.moveTo(-6, 0); c.quadraticCurveTo(-4, 16, 2, 26); c.quadraticCurveTo(8, 18, 8, 0); c.closePath();
    fillStroke(c, isDragged ? rgbaB(0.65) : rgbaB(0.52), strokeColor, 1.5);
    beginPath(c); c.moveTo(-3, 2); c.quadraticCurveTo(-1, 12, 2, 19); c.quadraticCurveTo(5, 12, 5, 2); c.closePath();
    fillStroke(c, isDragged ? rgbaG(0.45) : rgbaPnk(0.35));
    c.restore();

    // Forelock
    const forelockSway = sin(time * 0.0032) * 2;
    drawCurve(
      c,
      [-16, 20, -26 + forelockSway, 24, -28 + forelockSway, 32, -22 + forelockSway, 36, -18, 32, -14, 26, -12, 20],
      isDragged ? rgbaP(0.4) : rgbaP(0.38),
      isDragged ? rgbaG(0.7) : rgbaP(0.6),
      1.2
    );

    // Diadem
    c.save();
    rRect(c, -21, 18, 42, 5, 2.5, '#f59e0b', C_WHITE, 0.9);
    poly(c, [[0, 17], [3.5, 20.5], [0, 24], [-3.5, 20.5]], isDragged ? '#fef08a' : C_CYAN, C_WHITE, 1.0);
    circ(c, 0, 20.5, 7, rgbaC(0.4 * (0.8 + sin(time * 0.005) * 0.2)));
    c.restore();

    // Eye
    const blinkCycle = (time * 0.001) % 3.6;
    const isBlinking = blinkCycle > 3.42;
    const blinkProgress = isBlinking ? sin(((blinkCycle - 3.42) / 0.18) * PI) : 0;
    const eyeStroke = isDragged ? C_GOLD : '#e0f2fe';

    if (blinkProgress > 0.75) {
      c.strokeStyle = eyeStroke;
      c.lineWidth = 2.4;
      c.lineCap = ROUND;
      beginPath(c);
      c.arc(-16, 39, 4.5, PI * 1.15, PI * 1.85);
      c.moveTo(-20, 40); c.lineTo(-22.5, 38.5);
      c.moveTo(-12, 40); c.lineTo(-9.5, 38.5);
      c.stroke();
    } else {
      c.save();
      c.translate(-16, 38);
      c.scale(1, max(0.2, 1 - blinkProgress));

      beginPath(c); c.ellipse(0, 0, 5.5, 7.5, 0.05, 0, TAU); fillStroke(c, rgbaW(0.95), strokeColor, 1.0);
      beginPath(c); c.ellipse(0, 0, 4.2, 6.0, 0.05, 0, TAU); fillStroke(c, isDragged ? '#f59e0b' : C_CYAN);
      beginPath(c); c.ellipse(0, 0.5, 2.5, 3.8, 0.05, 0, TAU); fillStroke(c, rgbaB(1));

      circ(c, -1.5, -2.5, 1.8, C_WHITE);
      circ(c, 1.8, 2.2, 1.0, C_WHITE);
      c.restore();

      c.strokeStyle = eyeStroke;
      c.lineWidth = 2.0;
      c.lineCap = ROUND;
      beginPath(c);
      c.arc(-16, 36, 5.8, PI * 1.15, PI * 1.88);
      c.moveTo(-20.5, 33.5);
      c.lineTo(-23.2, 31.5);
      c.stroke();
    }

    c.restore();
  };

  const renderPrism = (
    prism: Prism,
    isHovered: boolean,
    isDragged: boolean,
    hoverHandle: 'body' | 'rot' | 'step-ccw' | 'step-cw' | null,
    time: number,
    isSelected = false,
    dragMode: 'move' | 'rotate' | 'step-ccw' | 'step-cw' | null = null,
    targetCtx = currentCtx
  ): void => {
    const c = targetCtx;
    const s = prism.scale || 1;
    const showControls = !prism.locked && (isSelected || isDragged || isHovered);

    // 1. ROTATED LAYER
    c.save();
    c.translate(prism.pos.x, prism.pos.y);
    c.rotate(prism.rot);

    if (prism.shape === SH_HORN) {
      renderPonyHead(c, s, isHovered || isSelected, isDragged, time, prism.rot);
    }

    c.scale(s, s);

    const rimStroke = isDragged
      ? C_GOLD
      : (isHovered || isSelected)
        ? C_CYAN
        : rgbaC(0.85);
    const rimWidth = isDragged ? 2.5 : (isHovered || isSelected) ? 2.0 : 1.5;

    if (prism.shape === SH_MIRROR) {
      const w = 36, h = 6;
      rRect(c, -w - 2, -h - 2, (w + 2) * 2, (h + 2) * 2, 0, rgbaB(1));
      const grad = linGrad(c, -w, 0, w, 0, [[0, '#7dd3fc'], [0.5, C_WHITE], [1, C_CYAN]]);
      rRect(c, -w, -h, w * 2, h * 2, 0, grad, rimStroke, rimWidth);
      circ(c, 0, 0, 3, isDragged ? C_GOLD : C_CYAN);
    } else {
      const grad = linGrad(c, 0, -38, 0, 38, [
        [0, isDragged ? rgbaG(0.48) : rgbaC(0.35)],
        [1, isDragged ? rgbaG(0.24) : rgbaC(0.16)],
      ]);

      prism.shape === SH_ORB
        ? circ(c, 0, 0, 30, grad, rimStroke, rimWidth)
        : poly(c, prism.shape === SH_DOVE ? [[-30, -16], [30, -16], [62, 16], [-62, 16]] : [[0, -38], [22, 22], [-22, 22]], grad, rimStroke, rimWidth);

      c.save();
      const facetStroke = isDragged ? rgbaG(0.45) : rgbaW(0.38);

      if (prism.shape === SH_HORN) {
        for (let f = 1; f <= 3; f++) {
          const t = f / 4, y = -38 + 60 * t;
          beginPath(c);
          c.moveTo(-22 * t, y);
          c.quadraticCurveTo(0, y - 3, 22 * t, y);
          fillStroke(c, undefined, facetStroke, 1.2);
        }
      } else if (prism.shape === SH_DOVE) {
        poly(c, [[-30, -16], [0, 16], [30, -16]], undefined, facetStroke, 1.2);
      } else if (prism.shape === SH_ORB) {
        const starPulse = 3.5 + sin(time * 0.005) * 1.5;
        circ(c, -8, -8, 4, isDragged ? C_GOLD : C_WHITE);
        poly(c, [[0, -starPulse], [starPulse * 0.3, 0], [0, starPulse], [-starPulse * 0.3, 0]], isDragged ? C_GOLD : C_WHITE);
      }
      c.restore();
    }
    c.restore();

    // 2. UNROTATED CONTROLS LAYER
    c.save();
    c.translate(prism.pos.x, prism.pos.y);
    c.scale(s, s);

    if (showControls) {
      const pulse = 0.8 + sin(time * 0.005) * 0.2;
      const aura = radGrad(c, 0, 20, 10, 85, [
        [0, isDragged ? rgbaG(0.28 * pulse) : rgbaC(0.18 * pulse)],
        [1, '#0000'],
      ]);
      circ(c, 0, 20, 85, aura);

      // Rotation Ring
      const ringRadius = 78;
      const isRotActive = (isDragged && dragMode === M_ROTATE) || hoverHandle === H_ROT;

      c.save();
      c.setLineDash([8, 6]);
      circ(c, 0, 0, ringRadius, undefined, isRotActive ? C_GOLD : rgbaC(0.45), isRotActive ? 2.2 : 1.4);
      c.setLineDash([]);

      const topBeadR = isRotActive ? 6.5 : 5.2;
      circ(c, 0, -ringRadius, topBeadR, isRotActive ? C_GOLD : C_CYAN, C_WHITE, 1.2);

      for (const isCCW of [true, false]) {
        const bx = isCCW ? -ringRadius : ringRadius;
        const handle = isCCW ? H_CCW : H_CW;
        const isBtnHovered = hoverHandle === handle;
        const isBtnActive = isDragged && dragMode === handle;
        const isHot = isBtnHovered || isBtnActive;
        const btnR = isHot ? 15.0 : 13.5;

        const btnFill = isBtnActive ? rgbaG(0.35) : isBtnHovered ? rgbaC(0.32) : rgbaB(0.9);
        const btnStroke = isBtnActive ? C_GOLD : isBtnHovered ? C_WHITE : rgbaC(0.85);
        circ(c, bx, 0, btnR, btnFill, btnStroke, isBtnActive ? 2.2 : 1.5);

        if (isHot) {
          circ(c, bx, 0, btnR + 2.5, undefined, isBtnActive ? rgbaG(0.6) : rgbaC(0.5), 2.4);
        }

        const iconColor = isBtnActive ? C_GOLD : isBtnHovered ? C_WHITE : C_CYAN;
        c.save();
        c.translate(bx, 0);
        if (isCCW) c.scale(-1, 1);
        arc(c, 0, 0, 6, PI * 0.08, PI * 1.5, iconColor, 1.8, ROUND);
        poly(c, [[2.4, -6], [-2.2, -9.2], [-2.2, -2.8]], iconColor);
        c.restore();
      }
      c.restore();

      // Move Indicator
      const moveY = 82;
      const isMoveActive = (isDragged && dragMode === M_MOVE) || hoverHandle === H_BODY;

      const badgeR = 19;
      const moveFill = isMoveActive ? rgbaB(0.96) : rgbaB(0.9);
      const moveStroke = isMoveActive ? C_GOLD : rgbaC(0.85);
      circ(c, 0, moveY, badgeR, moveFill, moveStroke, isMoveActive ? 2.4 : 1.6);
      circ(c, 0, moveY, badgeR + 3, undefined, isMoveActive ? rgbaG(0.6) : rgbaC(0.25), isMoveActive ? 3.5 : 1.8);

      // Move Arrows
      const arrowColor = isMoveActive ? C_GOLD : C_CYAN;
      c.save();
      c.translate(0, moveY);
      for (let i = 0; i < 4; i++) {
        c.rotate(PI / 2);
        line(c, 0, 0, 0, -11.5, arrowColor, 2);
        poly(c, [[0, -13], [-3.6, -9], [3.6, -9]], arrowColor);
      }
      c.restore();
    }

    circ(c, 0, 0, 2.5, rgbaW(0.4));
    c.restore();
  };

  const renderTarget = (target: Target, time: number, targetCtx = currentCtx): void => {
    const c = targetCtx;
    const midWl = (target.minLambda + target.maxLambda) / 2;
    const targetRgb = target.targetRgb || wavelengthToRGB(midWl);
    const targetHex = rgbToHex(targetRgb);

    const isMatch = !!target.isColorMatching;
    const hasLight = !!target.hasLight;
    const sampledRgb = target.sampledRgb || [0, 0, 0];
    const sampledHex = rgbToHex(sampledRgb);

    c.save();
    c.translate(target.pos.x, target.pos.y);

    const r = target.radius * 0.85;
    const centerRadius = r * 0.44;

    // 1. Outer Glow
    const basePulse = sin(time * 0.005) * 0.08;
    const glowRad = r * (1.25 + target.charge * 0.85 + (isMatch ? 0.2 : 0) + basePulse);
    const glow = radGrad(c, 0, 0, centerRadius, glowRad, [
      [0, targetHex + (isMatch ? 'cc' : '66')],
      [0.5, targetHex + (isMatch ? '55' : '22')],
      [1, '#0000'],
    ]);
    circ(c, 0, 0, glowRad, glow);

    if (target.id !== 99 && isMatch && random() < 0.35) {
      addSpark(target.pos.x, target.pos.y, targetHex, 1);
    }

    // 2. Chassis Backplate
    circ(c, 0, 0, r, rgbaB(0.42), rgbaW(0.18), 1.5);

    // 3. Target Color Band
    circ(c, 0, 0, r - 2, undefined, targetHex, 3.2);

    // 4. Charge Progress Ring
    if (target.charge > 0) {
      arc(c, 0, 0, r - 2, -PI / 2, -PI / 2 + TAU * target.charge, isMatch ? C_WHITE : '#fef08a', 4.0, ROUND);
    }

    // 5. Mid-chassis Ring
    circ(c, 0, 0, r * 0.68, rgbaB(0.55));

    // 6. Sensor Aperture Lens
    if (hasLight) {
      const [sr, sg, sb] = sampledRgb;
      const lensGrad = radGrad(c, 0, 0, 0, centerRadius, [
        [0, rgba(min(255, sr + 50), min(255, sg + 50), min(255, sb + 50), 1)],
        [0.7, rgba(sr, sg, sb, 0.85)],
        [1, rgba(max(0, sr - 30), max(0, sg - 30), max(0, sb - 30), 0.4)],
      ]);
      circ(c, 0, 0, centerRadius, lensGrad);
      circ(c, 0, 0, isMatch ? 3.0 : 1.8, isMatch ? C_WHITE : rgbaW(0.7));
    } else {
      circ(c, 0, 0, centerRadius, rgbaB(0.65));
      circ(c, 0, 0, 1.5, rgbaW(0.2));
    }

    circ(c, 0, 0, centerRadius, undefined, isMatch ? C_WHITE : hasLight ? sampledHex : 'rgba(148,163,184,0.5)', isMatch ? 2.2 : 1.5);

    // 7. Mounting Brackets & Optical Reticle Notches (4-way symmetry loop)
    const ti = centerRadius - 2, to = centerRadius + 3;
    const reticleCol = isMatch ? C_WHITE : rgbaW(0.55);
    const r1 = 0.71 * (r - 2), r2 = 0.71 * (r + 6);
    for (let i = 0; i < 4; i++) {
      c.rotate(PI / 2);
      line(c, r1, r1, r2, r2, 'rgba(100,116,139,0.45)', 2);
      line(c, 0, -ti, 0, -to, reticleCol);
    }

    // 9. Text Label
    c.font = 'bold 10px sans-serif';
    c.textAlign = 'center';
    c.fillStyle = targetHex;
    c.fillText(target.name || '', 0, r + 14);

    if (target.isSatisfied || target.charge > 0) {
      c.fillStyle = target.isSatisfied ? C_GREEN : C_WHITE;
      c.font = 'bold 9px sans-serif';
      c.fillText(target.isSatisfied ? '✓ LOCKED' : round(target.charge * 100) + '%', 0, r + 25);
    }

    c.restore();
  };

  const renderCardPreview = (time: number): void => {
    const drawLeader = (c: CanvasRenderingContext2D, x1: number, y1: number, y2: number, color: string) => {
      c.save();
      c.strokeStyle = color;
      c.lineWidth = 1.3;
      c.setLineDash([3, 3]);
      const dx = 158 - x1, dy = y2 - y1;
      beginPath(c);
      c.moveTo(x1, y1);
      c.bezierCurveTo(x1 + dx * 0.45, y1 + dy * 0.45, 158 - dx * 0.35, y2, 158, y2);
      c.stroke();
      circ(c, x1, y1, 2.2, color);
      circ(c, 158, y2, 2.2, color);
      c.restore();
    };

    const renderCard = (
      id: string,
      draw: (cctx: CanvasRenderingContext2D) => void,
      leaders: readonly (readonly [number, number, number, string])[]
    ) => {
      document.querySelectorAll<HTMLCanvasElement>(id).forEach((c) => {
        const cctx = c.getContext('2d');
        if (cctx) {
          currentCtx = cctx;
          clear(160, 175);
          draw(cctx);
          leaders.forEach(([x, y, y2, col]) => drawLeader(cctx, x, y, y2, col));
        }
      });
    };

    renderCard(
      '#ch',
      (cctx) => renderPrism({ id: 99, pos: v2(66, 88), rot: 0, scale: 0.62, baseIndex: 1.52, dispersionB: 22000, shape: SH_HORN, basePos: v2(66, 88), baseRot: 0 }, true, false, H_ROT, time, true, null, cctx),
      [[72, 40, 28, C_CYAN], [124, 88, 88, C_GOLD], [78, 139, 146, C_GREEN]]
    );

    renderCard(
      '#cs',
      (cctx) => renderTarget({ id: 99, pos: v2(66, 80), radius: 26, minLambda: 520, maxLambda: 565, charge: 0.75, isSatisfied: false, isColorMatching: true, hasLight: true, sampledRgb: [50, 240, 90], name: 'Green Sensor' }, time, cctx),
      [[84, 56, 28, C_GREEN], [78, 80, 88, C_CYAN], [90, 122, 146, C_GOLD]]
    );
    currentCtx = ctx;
  };

  const renderSquareBounds = (): void => {
    const c = currentCtx;
    c.save();
    rRect(c, 12, 12, 976, 976, 24, undefined, rgbaC(0.06), 6);
    rRect(c, 12, 12, 976, 976, 24, undefined, rgbaW(0.09), 1.4);

    for (const px of [44, 956]) {
      for (const py of [44, 956]) {
        line(c, px - 7.5, py, px + 7.5, py, rgbaG(0.6), 1.2, ROUND);
        line(c, px, py - 7.5, px, py + 7.5, rgbaG(0.6), 1.2, ROUND);
        circ(c, px, py, 1.4, rgbaW(0.9));
      }
    }
    c.restore();
  };

  const renderDust = (segments: RaySegment[], time: number = performance.now()): void => {
    const c = currentCtx;
    const segCount = segments.length;
    if (dust.length === 0) return;

    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      d.x = (d.x + d.vx + 1000) % 1000;
      d.y = (d.y + d.vy + 1000) % 1000;
      d.glintAlpha *= 0.88;

      if (segCount > 0 && time >= d.nextFlashTime) {
        for (let s = 0; s < segCount; s++) {
          const seg = segments[s];
          const minX = min(seg.p1.x, seg.p2.x) - 12;
          const maxX = max(seg.p1.x, seg.p2.x) + 12;
          const minY = min(seg.p1.y, seg.p2.y) - 12;
          const maxY = max(seg.p1.y, seg.p2.y) + 12;
          if (d.x >= minX && d.x <= maxX && d.y >= minY && d.y <= maxY && distToSegment(d, seg.p1, seg.p2) <= 12) {
            d.glintWl = seg.wavelength;
            d.glintAlpha = 1.0;
            d.nextFlashTime = time + 1200 + random() * 2800;
            break;
          }
        }
      }
    }

    if (!dust.some((d) => d.glintAlpha > 0.05)) return;

    c.save();
    c.globalCompositeOperation = LIGHTER;

    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      if (d.glintAlpha <= 0.05) continue;

      const wl = max(380, min(750, round(d.glintWl)));
      const alpha = d.glintAlpha;
      const flareLen = (2.2 + d.size * 1.8) * alpha;
      const color = COLOR_TABLE[wl] ? `rgba(${COLOR_TABLE[wl]},0.95)` : C_WHITE;

      line(c, d.x - flareLen, d.y, d.x + flareLen, d.y, color, 1.2);
      line(c, d.x, d.y - flareLen, d.x, d.y + flareLen, color, 1.2);
      circ(c, d.x, d.y, 0.9 * alpha, C_WHITE);
    }

    c.restore();
  };

  const renderRays = (
    rays: RayPath[],
    bounds: { scale: number; offsetX: number; offsetY: number; dpr: number }
  ): void => {
    const rayCount = rays.length;
    if (rayCount === 0) return;

    if (rayCanvas.width !== currentCtx.canvas.width || rayCanvas.height !== currentCtx.canvas.height) {
      rayCanvas.width = currentCtx.canvas.width;
      rayCanvas.height = currentCtx.canvas.height;
    }

    rayCtx.setTransform(1, 0, 0, 1, 0, 0);
    rayCtx.clearRect(0, 0, rayCanvas.width, rayCanvas.height);

    const sd = bounds.scale * bounds.dpr;
    rayCtx.setTransform(sd, 0, 0, sd, bounds.offsetX * bounds.dpr, bounds.offsetY * bounds.dpr);
    rayCtx.globalCompositeOperation = LIGHTER;
    rayCtx.lineCap = ROUND;
    rayCtx.lineWidth = 2.4;

    for (let i = 0; i < rayCount; i++) {
      const r = rays[i];
      if (r.points.length >= 2) {
        const wl = max(380, min(750, round(r.wavelength)));
        poly(rayCtx, r.points, undefined, `rgba(${COLOR_TABLE[wl] || '255,255,255'},0.12)`, 2.4, false);
      }
    }

    const c = currentCtx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = LIGHTER;
    c.drawImage(rayCanvas, 0, 0);
    c.restore();
  };

  const renderEmitter = (emitter: Emitter, time: number): void => {
    const c = currentCtx;
    c.save();
    c.translate(emitter.pos.x, emitter.pos.y);
    c.rotate(emitter.angle);

    const isFiltered = (emitter.maxLambda - emitter.minLambda) < 150;
    const midWl = (emitter.minLambda + emitter.maxLambda) / 2;
    const emHex = isFiltered ? wavelengthToHex(midWl) : '#f1c40f';
    const [er, eg, eb] = isFiltered ? wavelengthToRGB(midWl) : [255, 255, 255];

    const pulse = 0.8 + sin(time * 0.005) * 0.2;
    const glow = radGrad(c, 0, 0, 2, 28, [
      [0, rgba(er, eg, eb, 0.5 * pulse)],
      [0.5, rgba(er, eg, eb, 0.2 * pulse)],
      [1, '#0000'],
    ]);
    circ(c, 0, 0, 28, glow);

    rRect(c, -20, -11, 22, 22, 4, '#1c2237', emHex, 1.8);
    poly(c, [[2, -8], [6, -5], [6, 5], [2, 8]], isFiltered ? emHex : '#f39c12');
    c.fillStyle = isFiltered ? emHex : C_WHITE;
    c.fillRect(6, -emitter.width / 2, 2.5, emitter.width);

    c.restore();
  };

  const renderEmitters = (emitters: Emitter | Emitter[], time: number): void =>
    (Array.isArray(emitters) ? emitters : [emitters]).forEach((em) => renderEmitter(em, time));

  const renderObstacle = (obs: Obstacle): void =>
    poly(currentCtx, obs.points, obs.isMirror ? '#3a4a68' : '#141724', obs.isMirror ? '#a5f3fc' : '#2d3748', obs.isMirror ? 2 : 1.8);

  const renderParticles = (): void => {
    const c = currentCtx;
    c.save();
    c.globalCompositeOperation = LIGHTER;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (++p.life >= p.maxLife) {
        particles.splice(i, 1);
      } else {
        c.globalAlpha = 1 - p.life / p.maxLife;
        circ(c, p.x, p.y, p.size, p.color);
      }
    }
    c.restore();
  };

  return {
    clear,
    renderCardPreview,
    renderSquareBounds,
    renderDust,
    renderRays,
    renderEmitters,
    renderPrism,
    renderTarget,
    renderObstacle,
    renderParticles,
  };
}

