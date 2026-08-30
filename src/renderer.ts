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
  vAdd,
  vRotate,
  getPrismVertices,
  distToSegment,
} from './math';
import {
  wavelengthToHex,
  wavelengthToRGB,
  rgbToHex,
} from './color';

// Pre-computed lookup tables for zero-allocation, 100% continuous smooth rainbow colors
const COLOR_TABLE_CORE: string[] = [];
const COLOR_TABLE_FLASH: string[] = [];
for (let wl = 380; wl <= 750; wl++) {
  const [r, g, b] = wavelengthToRGB(wl);
  COLOR_TABLE_CORE[wl] = `rgba(${r},${g},${b},0.12)`;
  COLOR_TABLE_FLASH[wl] = `rgba(${r},${g},${b},0.95)`;
}

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

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private dust: DustParticle[] = [];
  private rayCanvas: HTMLCanvasElement;
  private rayCtx: CanvasRenderingContext2D;
  private noisePattern: CanvasPattern | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.rayCanvas = document.createElement('canvas');
    this.rayCanvas.width = 1000;
    this.rayCanvas.height = 1000;
    this.rayCtx = this.rayCanvas.getContext('2d')!;

    this.initBackground();
    this.initDust();
  }

  private initBackground(): void {
    if (typeof document === 'undefined') return;
    try {
      const noiseCanvas = document.createElement('canvas');
      noiseCanvas.width = 128;
      noiseCanvas.height = 128;
      const nctx = noiseCanvas.getContext('2d');
      if (nctx) {
        const imgData = nctx.createImageData(128, 128);
        const buf = imgData.data;
        for (let i = 0; i < buf.length; i += 4) {
          const v = Math.floor(Math.random() * 255);
          buf[i] = v;
          buf[i + 1] = v;
          buf[i + 2] = v;
          buf[i + 3] = Math.floor(Math.random() * 16 + 6);
        }
        nctx.putImageData(imgData, 0, 0);
        this.noisePattern = this.ctx.createPattern(noiseCanvas, 'repeat');
      }
    } catch {}
  }

  private initDust(count: number = 45): void {
    this.dust = [];
    for (let i = 0; i < count; i++) {
      this.dust.push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18 - 0.02,
        size: 0.8 + Math.random() * 1.2,
        glintWl: 550,
        glintAlpha: 0,
        nextFlashTime: Math.random() * 1500,
      });
    }
  }

  public addSpark(x: number, y: number, color: string, count: number = 3): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.0;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 25,
        color,
        size: 1.2 + Math.random() * 1.8,
      });
    }
  }

  public updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  public clear(width: number = this.ctx.canvas.width, height: number = this.ctx.canvas.height): void {
    const ctx = this.ctx;
    const cx = width / 2;
    const cy = height / 2;
    const bgGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(cx, cy, 500));
    bgGrad.addColorStop(0, '#0e1635');
    bgGrad.addColorStop(0.55, '#070a1a');
    bgGrad.addColorStop(1, '#020309');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    if (this.noisePattern) {
      ctx.fillStyle = this.noisePattern;
      ctx.fillRect(0, 0, width, height);
    }
  }

  public renderCardPreview(time: number): void {
    const drawLeader = (c: CanvasRenderingContext2D, x1: number, y1: number, y2: number, color: string) => {
      c.save();
      c.strokeStyle = color;
      c.lineWidth = 1.3;
      c.setLineDash([3, 3]);
      const dx = 158 - x1, dy = y2 - y1;
      c.beginPath();
      c.moveTo(x1, y1);
      c.bezierCurveTo(x1 + dx * 0.45, y1 + dy * 0.45, 158 - dx * 0.35, y2, 158, y2);
      c.stroke();

      c.fillStyle = color;
      c.beginPath();
      c.arc(x1, y1, 2.2, 0, Math.PI * 2);
      c.arc(158, y2, 2.2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const oldCtx = this.ctx;
    document.querySelectorAll<HTMLCanvasElement>('#card-horn-c').forEach((c) => {
      const ctx = c.getContext('2d');
      if (ctx) {
        this.ctx = ctx;
        this.clear(160, 175);
        this.renderPrism({ id: 99, pos: { x: 66, y: 88 }, rot: 0, scale: 0.62, baseIndex: 1.52, dispersionB: 22000, shape: 'horn', basePos: { x: 66, y: 88 }, baseRot: 0 }, true, false, 'rot', time, true);
        ([[72, 40, 28, '#38bdf8'], [124, 88, 88, '#ffd700'], [78, 139, 146, '#4ade80']] as const).forEach(([x, y, y2, col]) => drawLeader(ctx, x, y, y2, col));
      }
    });

    document.querySelectorAll<HTMLCanvasElement>('#card-sensor-c').forEach((c) => {
      const ctx = c.getContext('2d');
      if (ctx) {
        this.ctx = ctx;
        this.clear(160, 175);
        this.renderTarget({ id: 99, pos: { x: 66, y: 80 }, radius: 26, minLambda: 520, maxLambda: 565, charge: 0.75, isSatisfied: false, isColorMatching: true, hasLight: true, sampledRgb: [50, 240, 90], name: 'Green Sensor' }, time);
        ([[84, 56, 28, '#4ade80'], [78, 80, 88, '#38bdf8'], [90, 122, 146, '#ffd700']] as const).forEach(([x, y, y2, col]) => drawLeader(ctx, x, y, y2, col));
      }
    });
    this.ctx = oldCtx;
  }

  public renderSquareBounds(size: number = 1000): void {
    const ctx = this.ctx;
    ctx.save();
    const pad = 12;
    const innerSize = size - pad * 2;
    const radius = 24;

    for (const [col, lw] of [['rgba(56, 189, 248, 0.06)', 6], ['rgba(255, 255, 255, 0.09)', 1.4]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.roundRect(pad, pad, innerSize, innerSize, radius);
      ctx.stroke();
    }

    const margin = 44, arm = 7.5;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    for (const pt of [{ x: margin, y: margin }, { x: size - margin, y: margin }, { x: size - margin, y: size - margin }, { x: margin, y: size - margin }]) {
      ctx.beginPath();
      ctx.moveTo(pt.x - arm, pt.y); ctx.lineTo(pt.x + arm, pt.y);
      ctx.moveTo(pt.x, pt.y - arm); ctx.lineTo(pt.x, pt.y + arm);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public updateDust(time: number): void {
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x += 1000;
      else if (d.x > 1000) d.x -= 1000;
      if (d.y < 0) d.y += 1000;
      else if (d.y > 1000) d.y -= 1000;
      d.glintAlpha *= 0.88; // Fast natural spark fade
    }
  }

  public renderDust(segments: RaySegment[], time: number = performance.now()): void {
    const ctx = this.ctx;
    const segCount = segments.length;
    if (this.dust.length === 0 || segCount === 0) return;

    // Check if particles in beams occasionally sparkle/glint
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      if (time < d.nextFlashTime) continue;

      for (let s = 0; s < segCount; s++) {
        const seg = segments[s];
        const minX = (seg.p1.x < seg.p2.x ? seg.p1.x : seg.p2.x) - 12;
        const maxX = (seg.p1.x > seg.p2.x ? seg.p1.x : seg.p2.x) + 12;
        const minY = (seg.p1.y < seg.p2.y ? seg.p1.y : seg.p2.y) - 12;
        const maxY = (seg.p1.y > seg.p2.y ? seg.p1.y : seg.p2.y) + 12;
        if (d.x < minX || d.x > maxX || d.y < minY || d.y > maxY) continue;

        const dist = distToSegment(d, seg.p1, seg.p2);
        if (dist <= 12) {
          // Dust particle caught the beam angle and flashes momentarily!
          d.glintWl = seg.wavelength;
          d.glintAlpha = 1.0;
          d.nextFlashTime = time + 1200 + Math.random() * 2800;
          break;
        }
      }
    }

    // Fast check: skip if no active glints
    let hasGlints = false;
    for (let i = 0; i < this.dust.length; i++) {
      if (this.dust[i].glintAlpha > 0.05) {
        hasGlints = true;
        break;
      }
    }
    if (!hasGlints) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      if (d.glintAlpha <= 0.05) continue;

      const wl = Math.max(380, Math.min(750, Math.round(d.glintWl)));
      const alpha = d.glintAlpha;
      const flareLen = (2.2 + d.size * 1.8) * alpha;

      // 1. Colored micro-sparkle cross
      ctx.strokeStyle = COLOR_TABLE_FLASH[wl] || '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(d.x - flareLen, d.y);
      ctx.lineTo(d.x + flareLen, d.y);
      ctx.moveTo(d.x, d.y - flareLen);
      ctx.lineTo(d.x, d.y + flareLen);
      ctx.stroke();

      // 2. White-hot pinpoint core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 0.9 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.rayCanvas.width = width;
    this.rayCanvas.height = height;
  }

  public renderRays(
    rays: RayPath[],
    bounds: { scale: number; offsetX: number; offsetY: number; dpr: number }
  ): void {
    const rayCount = rays.length;
    if (rayCount === 0) return;

    const rctx = this.rayCtx;
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    rctx.clearRect(0, 0, this.rayCanvas.width, this.rayCanvas.height);

    rctx.setTransform(
      bounds.scale * bounds.dpr,
      0,
      0,
      bounds.scale * bounds.dpr,
      bounds.offsetX * bounds.dpr,
      bounds.offsetY * bounds.dpr
    );
    rctx.globalCompositeOperation = 'lighter';
    rctx.lineCap = 'round';
    rctx.lineWidth = 2.4;

    // Stroke every single ray individually on the optical canvas
    // (100% physically accurate additive blending, ZERO dark artifacts)
    for (let i = 0; i < rayCount; i++) {
      const r = rays[i];
      const pts = r.points;
      const ptLen = pts.length;
      if (ptLen < 2) continue;
      const wl = Math.max(380, Math.min(750, Math.round(r.wavelength)));
      rctx.strokeStyle = COLOR_TABLE_CORE[wl] || 'rgba(255,255,255,0.12)';
      rctx.beginPath();
      rctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < ptLen; j++) {
        rctx.lineTo(pts[j].x, pts[j].y);
      }
      rctx.stroke();
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.rayCanvas, 0, 0);
    ctx.restore();
  }

  public renderEmitter(emitter: Emitter, time: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(emitter.pos.x, emitter.pos.y);
    ctx.rotate(emitter.angle);

    const isFiltered = (emitter.maxLambda - emitter.minLambda) < 150;
    const midWl = (emitter.minLambda + emitter.maxLambda) / 2;
    const emHex = isFiltered ? wavelengthToHex(midWl) : '#f1c40f';
    const [er, eg, eb] = isFiltered ? wavelengthToRGB(midWl) : [255, 255, 255];

    // Glow aura
    const pulse = 0.8 + Math.sin(time * 0.005) * 0.2;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
    glow.addColorStop(0, `rgba(${er}, ${eg}, ${eb}, ${0.5 * pulse})`);
    glow.addColorStop(0.5, `rgba(${er}, ${eg}, ${eb}, ${0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    // Projector body
    ctx.fillStyle = '#1c2237';
    ctx.strokeStyle = emHex;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.roundRect(-20, -11, 22, 22, 4);
    ctx.fill();
    ctx.stroke();

    // Aperture nozzle
    ctx.fillStyle = isFiltered ? emHex : '#f39c12';
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(6, -5);
    ctx.lineTo(6, 5);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();

    // Lens slit
    ctx.fillStyle = isFiltered ? emHex : '#ffffff';
    ctx.fillRect(6, -emitter.width / 2, 2.5, emitter.width);

    ctx.restore();
  }

  public renderEmitters(emitters: Emitter | Emitter[], time: number): void {
    const list = Array.isArray(emitters) ? emitters : [emitters];
    for (const em of list) {
      this.renderEmitter(em, time);
    }
  }

  private drawCurve(
    s: number,
    start: [number, number],
    segs: number[][],
    fill?: string,
    stroke?: string,
    lineWidth = 1.4,
    close = true
  ): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(start[0] * s, start[1] * s);
    for (const seg of segs) {
      if (seg.length === 6) {
        ctx.bezierCurveTo(seg[0] * s, seg[1] * s, seg[2] * s, seg[3] * s, seg[4] * s, seg[5] * s);
      } else if (seg.length === 4) {
        ctx.quadraticCurveTo(seg[0] * s, seg[1] * s, seg[2] * s, seg[3] * s);
      } else {
        ctx.lineTo(seg[0] * s, seg[1] * s);
      }
    }
    if (close) ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  /**
   * Renders the cute, kawaii chibi celestial unicorn with floppy drooping ears,
   * a round chubby body, slowly paddling little legs, and flowing animated mane.
   */
  private renderPonyHead(
    s: number,
    isHovered: boolean,
    isDragged: boolean,
    time: number,
    rot: number = 0
  ): void {
    const ctx = this.ctx;
    ctx.save();

    // 1. Idle animation offsets: gentle breathing and buoyant floating bobbing
    const floatY = Math.sin(time * 0.0022) * 2.0 * s;
    const floatRot = Math.sin(time * 0.0018) * 0.02;
    ctx.translate(0, floatY);
    ctx.rotate(floatRot);

    const strokeColor = isDragged
      ? 'rgba(255, 215, 0, 0.95)'
      : isHovered
      ? 'rgba(165, 229, 255, 0.9)'
      : 'rgba(160, 180, 235, 0.55)';

    // 2. Fluffy Floating Celestial Tail (at rear of chubby body)
    const tailSway = Math.sin(time * 0.003 + 2.2) * 6;
    this.drawCurve(
      s,
      [38, 82],
      [
        [55 + tailSway, 72, 68 + tailSway, 92, 54 + tailSway, 112],
        [46, 106, 40, 94, 36, 90],
      ],
      'rgba(192, 132, 252, 0.4)',
      isDragged ? 'rgba(255, 215, 0, 0.7)' : 'rgba(192, 132, 252, 0.6)',
      1.4
    );

    // 3. Four Slowly Paddling / Fluttering Stubby Little Legs
    const upsideDownRaw = Math.max(0, -Math.cos(rot));
    const upsideDown = upsideDownRaw * upsideDownRaw * (3 - 2 * upsideDownRaw);

    const swimSpeed = 0.0035;
    const flutterSpeed = 0.007;

    const [swingFL, swingFR, swingBL, swingBR] = [0, Math.PI, 1.2, Math.PI + 1.2].map((ph, idx) => {
      const baseOffset = idx === 0 ? 0.95 : idx === 1 ? 0.75 : idx === 2 ? -0.95 : -0.75;
      return (1 - upsideDown) * Math.sin(time * 0.0035 + ph) * 0.35 + baseOffset * upsideDown + upsideDown * Math.sin(time * 0.007 + ph) * 0.15;
    });

    const drawLittleLeg = (pivotX: number, pivotY: number, swing: number, isFar: boolean) => {
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(swing);

      const legLength = (isFar ? 14 : 17) * s;
      const legWidth = 7 * s;

      ctx.beginPath();
      ctx.roundRect(-legWidth / 2, 0, legWidth, legLength, 3.5 * s);
      ctx.fillStyle = isFar
        ? 'rgba(16, 22, 46, 0.55)'
        : isDragged
        ? 'rgba(38, 52, 94, 0.65)'
        : 'rgba(24, 34, 66, 0.52)';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isFar ? 1.0 : 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(-legWidth / 2, legLength - 5 * s, legWidth, 5 * s, [0, 0, 3.5 * s, 3.5 * s]);
      ctx.fillStyle = isDragged ? '#ffd700' : '#38bdf8';
      ctx.fill();

      ctx.restore();
    };

    // Far legs
    drawLittleLeg((16 - 3 * upsideDown) * s, (102 - 3 * upsideDown) * s, swingFR, true);
    drawLittleLeg((36 + 5 * upsideDown) * s, (98 - 3 * upsideDown) * s, swingBR, true);

    // 4. Flowing Multi-Layered Twilight Mane
    const maneSway1 = Math.sin(time * 0.003 + 0.4) * 4.5;
    const maneSway2 = Math.sin(time * 0.0036 + 1.2) * 5.5;
    const maneSway3 = Math.sin(time * 0.0028 + 2.0) * 4.0;

    const manes: [[number, number], number[][], string, string, number][] = [
      [[10, 22], [[34 + maneSway1, 26, 42 + maneSway1, 56, 34 + maneSway1, 84], [24, 70, 20, 48, 14, 32]], isDragged ? 'rgba(255, 215, 0, 0.35)' : 'rgba(192, 132, 252, 0.38)', isDragged ? 'rgba(255, 215, 0, 0.75)' : 'rgba(192, 132, 252, 0.65)', 1.4],
      [[14, 36], [[44 + maneSway2, 48, 48 + maneSway2, 82, 28 + maneSway2, 104], [22, 86, 18, 64, 10, 48]], isDragged ? 'rgba(255, 215, 0, 0.25)' : 'rgba(56, 189, 248, 0.35)', isDragged ? 'rgba(255, 215, 0, 0.65)' : 'rgba(56, 189, 248, 0.6)', 1.4],
      [[16, 54], [[38 + maneSway3, 68, 40 + maneSway3, 98, 22 + maneSway3, 118], [16, 102, 14, 80, 8, 66]], 'rgba(251, 191, 36, 0.3)', 'rgba(251, 191, 36, 0.55)', 1.2],
    ];
    for (const m of manes) {
      this.drawCurve(s, m[0], m[1], m[2], m[3], m[4]);
    }

    // 5. Silhouette
    this.drawCurve(
      s,
      [-20, 21],
      [
        [-25, 28, -35, 38, -36, 48],
        [-37, 56, -30, 62, -21, 60],
        [-14, 59, -10, 54, -6, 50],
        [-4, 64, -6, 82, -2, 96],
        [2, 112, 18, 118, 34, 114],
        [46, 110, 48, 92, 42, 80],
        [36, 68, 26, 44, 20, 21],
      ],
      isDragged ? 'rgba(38, 52, 94, 0.6)' : 'rgba(24, 34, 66, 0.48)',
      strokeColor,
      isDragged ? 2.0 : 1.5
    );

    // Near legs
    drawLittleLeg((4 - 4 * upsideDown) * s, (106 - 3 * upsideDown) * s, swingFL, false);
    drawLittleLeg((26 + 4 * upsideDown) * s, (104 - 3 * upsideDown) * s, swingBL, false);

    // 6. Cheek blush
    ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.beginPath();
    ctx.arc(-18 * s, 50 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();

    // 7. Ear
    const earDroop = Math.sin(time * 0.003) * 1.5;
    ctx.save();
    ctx.translate(14 * s, 24 * s);
    ctx.rotate(0.6 + earDroop * 0.04);
    this.drawCurve(s, [-6, 0], [[-4, 16, 2, 26], [8, 18, 8, 0]], isDragged ? 'rgba(36, 48, 86, 0.65)' : 'rgba(22, 30, 58, 0.52)', strokeColor, 1.5);
    this.drawCurve(s, [-3, 2], [[-1, 12, 2, 19], [5, 12, 5, 2]], isDragged ? 'rgba(255, 215, 0, 0.45)' : 'rgba(244, 114, 182, 0.35)');
    ctx.restore();

    // 8. Forelock
    const forelockSway = Math.sin(time * 0.0032) * 2;
    this.drawCurve(
      s,
      [-16, 20],
      [
        [-26 + forelockSway, 24, -28 + forelockSway, 32, -22 + forelockSway, 36],
        [-18, 32, -14, 26, -12, 20],
      ],
      isDragged ? 'rgba(255, 215, 0, 0.4)' : 'rgba(192, 132, 252, 0.38)',
      isDragged ? 'rgba(255, 215, 0, 0.7)' : 'rgba(192, 132, 252, 0.6)',
      1.2
    );

    // 9. Diadem
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-21 * s, 18 * s, 42 * s, 5 * s, 2.5 * s);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    const gemPulse = 0.8 + Math.sin(time * 0.005) * 0.2;
    const gemY = 20.5 * s;
    this.drawCurve(s, [0, 20.5 - 3.5], [[3.5, 20.5], [0, 20.5 + 3.5], [-3.5, 20.5]], isDragged ? '#fef08a' : '#38bdf8', '#ffffff', 1.0);
    ctx.fillStyle = `rgba(56, 189, 248, ${0.4 * gemPulse})`;
    ctx.beginPath();
    ctx.arc(0, gemY, 7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 10. Eye
    const eyeX = -16 * s;
    const eyeY = 38 * s;
    const blinkCycle = (time * 0.001) % 3.6;
    const isBlinking = blinkCycle > 3.42;
    const blinkProgress = isBlinking ? Math.sin(((blinkCycle - 3.42) / 0.18) * Math.PI) : 0;

    if (blinkProgress > 0.75) {
      ctx.strokeStyle = isDragged ? '#ffd700' : '#e0f2fe';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + 1 * s, 4.5 * s, Math.PI * 1.15, Math.PI * 1.85);
      ctx.moveTo(eyeX - 4 * s, eyeY + 2 * s); ctx.lineTo(eyeX - 6.5 * s, eyeY + 0.5 * s);
      ctx.moveTo(eyeX + 4 * s, eyeY + 2 * s); ctx.lineTo(eyeX + 6.5 * s, eyeY + 0.5 * s);
      ctx.stroke();
    } else {
      const eyeHeightScale = Math.max(0.2, 1 - blinkProgress);
      ctx.save();
      ctx.translate(eyeX, eyeY);
      ctx.scale(1, eyeHeightScale);

      for (const [rw, rh, col, str, lw] of [
        [5.5, 7.5, 'rgba(240, 249, 255, 0.95)', strokeColor, 1.0],
        [4.2, 6.0, isDragged ? '#f59e0b' : '#38bdf8'],
        [2.5, 3.8, '#0f172a']
      ] as const) {
        ctx.fillStyle = col as string;
        ctx.beginPath();
        ctx.ellipse(0, rw === 2.5 ? 0.5 * s : 0, rw * s, rh * s, 0.05, 0, Math.PI * 2);
        ctx.fill();
        if (str) { ctx.strokeStyle = str; ctx.lineWidth = lw as number; ctx.stroke(); }
      }

      ctx.fillStyle = '#ffffff';
      for (const [sx, sy, sr] of [[-1.5, -2.5, 1.8], [1.8, 2.2, 1.0]]) {
        ctx.beginPath();
        ctx.arc(sx * s, sy * s, sr * s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      ctx.strokeStyle = isDragged ? '#ffd700' : '#e0f2fe';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY - 2 * s, 5.8 * s, Math.PI * 1.15, Math.PI * 1.88);
      ctx.moveTo(eyeX - 4.5 * s, eyeY - 4.5 * s);
      ctx.lineTo(eyeX - 7.2 * s, eyeY - 6.5 * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  public renderPrism(
    prism: Prism,
    isHovered: boolean,
    isDragged: boolean,
    hoverHandle: 'body' | 'rot' | 'step-ccw' | 'step-cw' | null,
    time: number,
    isSelected: boolean = false,
    dragMode: 'move' | 'rotate' | 'step-ccw' | 'step-cw' | null = null
  ): void {
    const ctx = this.ctx;
    const s = prism.scale || 1;
    const showControls = !prism.locked && (isSelected || isDragged || isHovered);

    // ==========================================
    // 1. ROTATED LAYER (Pony head & Crystal Horn)
    // ==========================================
    ctx.save();
    ctx.translate(prism.pos.x, prism.pos.y);
    ctx.rotate(prism.rot);

    if (prism.shape === 'horn') {
      this.renderPonyHead(s, isHovered || isSelected, isDragged, time, prism.rot);
    }

    const rimStroke = isDragged
      ? '#ffd700'
      : (isHovered || isSelected)
      ? '#a5e5ff'
      : 'rgba(210, 235, 255, 0.85)';
    const rimWidth = isDragged ? 2.5 : (isHovered || isSelected) ? 2.0 : 1.5;

    if (prism.shape === 'mirror') {
      const w = 36 * s;
      const h = 6 * s;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w - 2 * s, -h - 2 * s, (w + 2 * s) * 2, (h + 2 * s) * 2);

      const grad = ctx.createLinearGradient(-w, 0, w, 0);
      grad.addColorStop(0, '#7dd3fc');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.fillRect(-w, -h, w * 2, h * 2);

      ctx.lineWidth = rimWidth;
      ctx.strokeStyle = rimStroke;
      ctx.strokeRect(-w, -h, w * 2, h * 2);

      ctx.fillStyle = isDragged ? '#ffd700' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createLinearGradient(0, -38 * s, 0, 38 * s);
      grad.addColorStop(0, isDragged ? 'rgba(255, 240, 200, 0.48)' : 'rgba(200, 240, 255, 0.35)');
      grad.addColorStop(1, isDragged ? 'rgba(255, 215, 0, 0.24)' : 'rgba(120, 180, 240, 0.16)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      if (prism.shape === 'horn') {
        ctx.moveTo(0, -38 * s);
        ctx.lineTo(22 * s, 22 * s);
        ctx.lineTo(-22 * s, 22 * s);
      } else if (prism.shape === 'dove') {
        ctx.moveTo(-30 * s, -16 * s);
        ctx.lineTo(30 * s, -16 * s);
        ctx.lineTo(62 * s, 16 * s);
        ctx.lineTo(-62 * s, 16 * s);
      } else {
        ctx.arc(0, 0, 30 * s, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = rimWidth;
      ctx.strokeStyle = rimStroke;
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.45)' : 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 1.2;

      if (prism.shape === 'horn') {
        for (let f = 1; f <= 3; f++) {
          const t = f / 4;
          ctx.beginPath();
          ctx.moveTo(-22 * s * t, -38 * s + 60 * s * t);
          ctx.quadraticCurveTo(0, -38 * s + 60 * s * t - 3 * s, 22 * s * t, -38 * s + 60 * s * t);
          ctx.stroke();
        }
      } else if (prism.shape === 'dove') {
        ctx.beginPath();
        ctx.moveTo(-30 * s, -16 * s);
        ctx.lineTo(0, 16 * s);
        ctx.lineTo(30 * s, -16 * s);
        ctx.stroke();
      } else if (prism.shape === 'orb') {
        const starPulse = 3.5 * s + Math.sin(time * 0.005) * 1.5 * s;
        ctx.fillStyle = isDragged ? '#ffd700' : '#ffffff';
        ctx.beginPath();
        ctx.arc(-8 * s, -8 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -starPulse);
        ctx.lineTo(starPulse * 0.3, 0);
        ctx.lineTo(0, starPulse);
        ctx.lineTo(-starPulse * 0.3, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();

    // ==========================================
    // 2. UNROTATED CONTROLS LAYER (World/Screen Aligned)
    // ==========================================
    ctx.save();
    ctx.translate(prism.pos.x, prism.pos.y);

    if (showControls) {
      const pulse = 0.8 + Math.sin(time * 0.005) * 0.2;
      const aura = ctx.createRadialGradient(0, 20 * s, 10, 0, 20 * s, 85 * s);
      aura.addColorStop(
        0,
        isDragged
          ? `rgba(255, 215, 0, ${0.28 * pulse})`
          : `rgba(56, 189, 248, ${0.18 * pulse})`
      );
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 20 * s, 85 * s, 0, Math.PI * 2);
      ctx.fill();

      // 2.1 Radial Rotation Ring
      const ringRadius = 78 * s;
      const isRotActive = (isDragged && dragMode === 'rotate') || hoverHandle === 'rot';

      ctx.save();
      ctx.strokeStyle = isRotActive ? '#ffd700' : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = isRotActive ? 2.2 : 1.4;

      ctx.setLineDash([8 * s, 6 * s]);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const topBeadR = isRotActive ? 6.5 * s : 5.2 * s;
      ctx.fillStyle = isRotActive ? '#ffd700' : '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -ringRadius, topBeadR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2.1.1 Step Buttons (CCW & CW)
      [-ringRadius, ringRadius].forEach((bx, idx) => {
        const isCCW = idx === 0;
        const isBtnHovered = hoverHandle === (isCCW ? 'step-ccw' : 'step-cw');
        const isBtnActive = isDragged && dragMode === (isCCW ? 'step-ccw' : 'step-cw');
        const btnR = (isBtnHovered || isBtnActive ? 15.0 : 13.5) * s;

        ctx.save();
        ctx.fillStyle = isBtnActive
          ? 'rgba(255, 215, 0, 0.35)'
          : isBtnHovered
          ? 'rgba(56, 189, 248, 0.32)'
          : 'rgba(10, 18, 42, 0.90)';
        ctx.strokeStyle = isBtnActive
          ? '#ffd700'
          : isBtnHovered
          ? '#ffffff'
          : 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = isBtnActive ? 2.2 : 1.5;

        ctx.beginPath();
        ctx.arc(bx, 0, btnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isBtnHovered || isBtnActive) {
          ctx.strokeStyle = isBtnActive ? 'rgba(255, 215, 0, 0.6)' : 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(bx, 0, btnR + 2.5 * s, 0, Math.PI * 2);
          ctx.stroke();
        }

        const iconColor = isBtnActive ? '#ffd700' : isBtnHovered ? '#ffffff' : '#38bdf8';
        ctx.translate(bx, 0);
        if (isCCW) ctx.scale(-1, 1);
        ctx.strokeStyle = iconColor;
        ctx.fillStyle = iconColor;
        ctx.lineWidth = 1.8 * s;
        ctx.lineCap = 'round';

        const arcR = 6.0 * s;
        ctx.beginPath();
        ctx.arc(0, 0, arcR, Math.PI * 0.08, Math.PI * 1.50, false);
        ctx.stroke();

        const tipX = 2.4 * s;
        const tipY = -arcR;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 4.6 * s, tipY - 3.2 * s);
        ctx.lineTo(tipX - 4.6 * s, tipY + 3.2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();

      // 2.2 Move Indicator at (0, 82 * s)
      const moveY = 82 * s;
      const isMoveActive = (isDragged && dragMode === 'move') || hoverHandle === 'body';

      ctx.save();
      ctx.fillStyle = isMoveActive ? 'rgba(28, 40, 72, 0.96)' : 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = isMoveActive ? '#ffd700' : 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = isMoveActive ? 2.4 : 1.6;

      const badgeR = 19 * s;
      ctx.beginPath();
      ctx.arc(0, moveY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = isMoveActive ? 'rgba(255, 215, 0, 0.6)' : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = isMoveActive ? 3.5 : 1.8;
      ctx.beginPath();
      ctx.arc(0, moveY, badgeR + 3 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4-directional Move Arrows
      const arrowColor = isMoveActive ? '#ffd700' : '#38bdf8';
      ctx.fillStyle = arrowColor;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.0;

      const arm = 11.5 * s;
      const arrowSize = 3.6 * s;

      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(0, moveY);
        ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -arm);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -arm - 1.5 * s);
        ctx.lineTo(-arrowSize, -arm + arrowSize * 0.7);
        ctx.lineTo(arrowSize, -arm + arrowSize * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public renderTarget(target: Target, time: number): void {
    const ctx = this.ctx;
    const midWl = (target.minLambda + target.maxLambda) / 2;
    const targetRgb = target.targetRgb || wavelengthToRGB(midWl);
    const targetHex = rgbToHex(targetRgb[0], targetRgb[1], targetRgb[2]);

    const isMatch = !!target.isColorMatching;
    const hasLight = !!target.hasLight;
    const sampledRgb = target.sampledRgb || [0, 0, 0];
    const sampledHex = rgbToHex(sampledRgb[0], sampledRgb[1], sampledRgb[2]);

    ctx.save();
    ctx.translate(target.pos.x, target.pos.y);

    // Scale sensor to be slightly smaller and sleeker
    const r = target.radius * 0.85;
    const centerRadius = r * 0.44; // Central sensor lens

    // 1. Vibrant outer glow & aura in the target's requested color
    const basePulse = Math.sin(time * 0.005) * 0.08;
    const glowRad = r * (1.25 + target.charge * 0.85 + (isMatch ? 0.2 : 0) + basePulse);
    const glow = ctx.createRadialGradient(0, 0, centerRadius, 0, 0, glowRad);
    glow.addColorStop(0, targetHex + (isMatch ? 'cc' : '66'));
    glow.addColorStop(0.5, targetHex + (isMatch ? '55' : '22'));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
    ctx.fill();

    if (target.id !== 99 && isMatch && Math.random() < 0.35) {
      this.addSpark(target.pos.x, target.pos.y, targetHex, 1);
    }

    // 2. Translucent Mechanical Mounting Brackets (4 corners)
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 2.0;
    for (let angle = Math.PI / 4; angle < Math.PI * 2; angle += Math.PI / 2) {
      ctx.beginPath();
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      ctx.moveTo(cosA * (r - 2), sinA * (r - 2));
      ctx.lineTo(cosA * (r + 6), sinA * (r + 6));
      ctx.stroke();
    }
    ctx.restore();

    // 3. Semi-Transparent Glass Chassis Backplate
    ctx.fillStyle = 'rgba(10, 15, 30, 0.42)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. VIBRANT TARGET COLOR BAND
    ctx.fillStyle = targetHex + '2a';
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.arc(0, 0, r - 5, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.strokeStyle = targetHex;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Circular Charge Progress Ring
    if (target.charge > 0) {
      ctx.strokeStyle = isMatch ? '#ffffff' : '#fef08a';
      ctx.lineWidth = 4.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * target.charge);
      ctx.stroke();
    }

    // 6. Translucent mid-chassis ring
    ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.fill();

    // 7. CENTRAL SENSOR APERTURE / LENS
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);

    if (hasLight) {
      const [sr, sg, sb] = sampledRgb;
      const lensGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerRadius);
      lensGrad.addColorStop(0, `rgba(${Math.min(255, sr + 50)}, ${Math.min(255, sg + 50)}, ${Math.min(255, sb + 50)}, 1)`);
      lensGrad.addColorStop(0.7, `rgba(${sr}, ${sg}, ${sb}, 0.85)`);
      lensGrad.addColorStop(1, `rgba(${Math.max(0, sr - 30)}, ${Math.max(0, sg - 30)}, ${Math.max(0, sb - 30)}, 0.4)`);
      ctx.fillStyle = lensGrad;
      ctx.fill();

      ctx.fillStyle = isMatch ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, isMatch ? 3.0 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(3, 6, 14, 0.65)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central lens border
    ctx.strokeStyle = isMatch
      ? '#ffffff'
      : hasLight
      ? sampledHex
      : 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = isMatch ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 8. Optical Reticle notches
    ctx.save();
    ctx.strokeStyle = isMatch ? '#ffffff' : 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.0;
    const ti = centerRadius - 2.0, to = centerRadius + 3.0;
    ctx.beginPath();
    ctx.moveTo(0, -ti); ctx.lineTo(0, -to);
    ctx.moveTo(0, ti); ctx.lineTo(0, to);
    ctx.moveTo(-ti, 0); ctx.lineTo(-to, 0);
    ctx.moveTo(ti, 0); ctx.lineTo(to, 0);
    ctx.stroke();
    ctx.restore();

    // 9. Prominent Text Label below target
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    const spectrumName = target.name || `${Math.round(midWl)}nm Sensor`;
    ctx.fillStyle = targetHex;
    ctx.fillText(spectrumName, 0, r + 14);

    // Charge percentage or Lock indicator
    if (target.isSatisfied) {
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('✓ LOCKED', 0, r + 25);
    } else if (target.charge > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${Math.round(target.charge * 100)}%`, 0, r + 25);
    }

    ctx.restore();
  }

  public renderObstacle(obstacle: Obstacle): void {
    const ctx = this.ctx;
    const pts = obstacle.points;
    if (pts.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();

    ctx.fillStyle = obstacle.isMirror ? '#3a4a68' : '#141724';
    ctx.fill();
    ctx.strokeStyle = obstacle.isMirror ? '#a5f3fc' : '#2d3748';
    ctx.lineWidth = obstacle.isMirror ? 2.0 : 1.8;
    ctx.stroke();

    ctx.strokeStyle = obstacle.isMirror ? 'rgba(255, 255, 255, 0.4)' : '#4a5568';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  public renderParticles(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
