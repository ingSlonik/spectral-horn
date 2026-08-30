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
  wavelengthToRGBA,
  wavelengthToHex,
  wavelengthToRGB,
  getSpectrumName,
  rgbToHex,
} from './color';

// Pre-computed lookup tables for zero-allocation, 100% continuous smooth rainbow colors
const COLOR_TABLE_GLOW: string[] = [];
const COLOR_TABLE_CORE: string[] = [];
const COLOR_TABLE_FLASH: string[] = [];
for (let wl = 380; wl <= 750; wl++) {
  COLOR_TABLE_GLOW[wl] = wavelengthToRGBA(wl, 0.045);
  COLOR_TABLE_CORE[wl] = wavelengthToRGBA(wl, 0.12);
  COLOR_TABLE_FLASH[wl] = wavelengthToRGBA(wl, 0.95);
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
  private bgCanvas: HTMLCanvasElement | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.rayCanvas = document.createElement('canvas');
    this.rayCanvas.width = 1000;
    this.rayCanvas.height = 1000;
    this.rayCtx = this.rayCanvas.getContext('2d')!;
    this.initBackground();
    this.initDust();
  }

  /**
   * Pre-renders the textured cosmic radial gradient and wall projection grain
   * onto an offscreen canvas ONCE at startup for 0.01ms hardware GPU blitting.
   */
  private initBackground(): void {
    if (typeof document === 'undefined') return;
    try {
      this.bgCanvas = document.createElement('canvas');
      this.bgCanvas.width = 1000;
      this.bgCanvas.height = 1000;
      const bctx = this.bgCanvas.getContext('2d');
      if (!bctx) return;

      // 1. Deep cosmic radial gradient
      const bgGrad = bctx.createRadialGradient(500, 500, 40, 500, 500, 720);
      bgGrad.addColorStop(0, '#0e1635');
      bgGrad.addColorStop(0.5, '#070a1a');
      bgGrad.addColorStop(1, '#020309');
      bctx.fillStyle = bgGrad;
      bctx.fillRect(0, 0, 1000, 1000);

      // 2. Fine textured noise / wall projection grain
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
          buf[i + 3] = Math.floor(Math.random() * 16 + 6); // Subtle 6-22 alpha grain
        }
        nctx.putImageData(imgData, 0, 0);

        const pattern = bctx.createPattern(noiseCanvas, 'repeat');
        if (pattern) {
          bctx.fillStyle = pattern;
          bctx.fillRect(0, 0, 1000, 1000);
        }
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

  public clear(x: number = 0, y: number = 0, width: number = 1000, height: number = 1000): void {
    const ctx = this.ctx;

    // 1. Fill extended screen edges with base dark cosmic color
    ctx.fillStyle = '#020309';
    ctx.fillRect(x, y, width, height);

    // 2. Blit pre-rendered cosmic radial gradient + grain onto active 1000x1000 viewport (0.01ms GPU hardware blit!)
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0);
    }
  }

  public renderSquareBounds(size: number = 1000): void {
    const ctx = this.ctx;
    ctx.save();

    const pad = 12;
    const innerSize = size - pad * 2;
    const radius = 24;

    // 1. Soft ambient glow aura around play area
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(pad, pad, innerSize, innerSize, radius);
    ctx.stroke();

    // 2. Elegant celestial boundary frame
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(pad, pad, innerSize, innerSize, radius);
    ctx.stroke();

    // 3. Crisp optical reticle crosshairs (+) in the 4 corners
    const margin = 28;
    const arm = 7;
    const corners = [
      { x: margin, y: margin },
      { x: size - margin, y: margin },
      { x: size - margin, y: size - margin },
      { x: margin, y: size - margin },
    ];

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'butt';

    for (const pt of corners) {
      // Horizontal bar
      ctx.beginPath();
      ctx.moveTo(pt.x - arm, pt.y);
      ctx.lineTo(pt.x + arm, pt.y);
      ctx.stroke();

      // Vertical bar
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - arm);
      ctx.lineTo(pt.x, pt.y + arm);
      ctx.stroke();

      // Central micro-pinpoint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
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
    const tailSway = Math.sin(time * 0.003 + 2.2) * 6 * s;
    ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
    ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.7)' : 'rgba(192, 132, 252, 0.6)';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(38 * s, 82 * s);
    ctx.bezierCurveTo(55 * s + tailSway, 72 * s, 68 * s + tailSway, 92 * s, 54 * s + tailSway, 112 * s);
    ctx.bezierCurveTo(46 * s, 106 * s, 40 * s, 94 * s, 36 * s, 90 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Four Slowly Paddling / Fluttering Stubby Little Legs (Floating in cosmic space)
    // When upside down (rot ~ PI), the unicorn splays / spreads its legs apart cute starfish style!
    const upsideDownRaw = Math.max(0, -Math.cos(rot));
    const upsideDown = upsideDownRaw * upsideDownRaw * (3 - 2 * upsideDownRaw); // smoothstep blend

    const swimSpeed = 0.0035;
    const flutterSpeed = 0.007;

    const idleSwingFrontL = Math.sin(time * swimSpeed) * 0.35;
    const idleSwingFrontR = Math.sin(time * swimSpeed + Math.PI) * 0.35;
    const idleSwingBackL = Math.sin(time * swimSpeed + 1.2) * 0.35;
    const idleSwingBackR = Math.sin(time * swimSpeed + Math.PI + 1.2) * 0.35;

    const upsideFlutterFrontL = Math.sin(time * flutterSpeed) * 0.15;
    const upsideFlutterFrontR = Math.sin(time * flutterSpeed + Math.PI) * 0.15;
    const upsideFlutterBackL = Math.sin(time * flutterSpeed + 1.2) * 0.15;
    const upsideFlutterBackR = Math.sin(time * flutterSpeed + Math.PI + 1.2) * 0.15;

    // Front legs angle outward/forward (positive in canvas), back legs angle outward/backward (negative in canvas) when upside down
    const legAngleFrontL = (1 - upsideDown) * idleSwingFrontL + 0.95 * upsideDown + upsideDown * upsideFlutterFrontL;
    const legAngleFrontR = (1 - upsideDown) * idleSwingFrontR + 0.75 * upsideDown + upsideDown * upsideFlutterFrontR;
    const legAngleBackL = (1 - upsideDown) * idleSwingBackL - 0.95 * upsideDown + upsideDown * upsideFlutterBackL;
    const legAngleBackR = (1 - upsideDown) * idleSwingBackR - 0.75 * upsideDown + upsideDown * upsideFlutterBackR;

    const drawLittleLeg = (pivotX: number, pivotY: number, swing: number, isFar: boolean) => {
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(swing);

      const legLength = (isFar ? 14 : 17) * s;
      const legWidth = 7 * s;

      // Leg body
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

      // Cute glowing hoof tip
      ctx.beginPath();
      ctx.roundRect(-legWidth / 2, legLength - 5 * s, legWidth, 5 * s, [0, 0, 3.5 * s, 3.5 * s]);
      ctx.fillStyle = isDragged ? '#ffd700' : '#38bdf8';
      ctx.fill();

      ctx.restore();
    };

    // Draw Far legs (behind body) - with pivots splaying slightly outward when upside down
    drawLittleLeg((16 - 3 * upsideDown) * s, (102 - 3 * upsideDown) * s, legAngleFrontR, true);
    drawLittleLeg((36 + 5 * upsideDown) * s, (98 - 3 * upsideDown) * s, legAngleBackR, true);

    // 4. Flowing Multi-Layered Twilight Mane (Layered waves behind neck)
    const maneSway1 = Math.sin(time * 0.003 + 0.4) * 4.5 * s;
    const maneSway2 = Math.sin(time * 0.0036 + 1.2) * 5.5 * s;
    const maneSway3 = Math.sin(time * 0.0028 + 2.0) * 4.0 * s;

    // Mane Lock 1
    ctx.fillStyle = isDragged ? 'rgba(255, 215, 0, 0.35)' : 'rgba(192, 132, 252, 0.38)';
    ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.75)' : 'rgba(192, 132, 252, 0.65)';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(10 * s, 22 * s);
    ctx.bezierCurveTo(34 * s + maneSway1, 26 * s, 42 * s + maneSway1, 56 * s, 34 * s + maneSway1, 84 * s);
    ctx.bezierCurveTo(24 * s, 70 * s, 20 * s, 48 * s, 14 * s, 32 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mane Lock 2
    ctx.fillStyle = isDragged ? 'rgba(255, 215, 0, 0.25)' : 'rgba(56, 189, 248, 0.35)';
    ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.65)' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(14 * s, 36 * s);
    ctx.bezierCurveTo(44 * s + maneSway2, 48 * s, 48 * s + maneSway2, 82 * s, 28 * s + maneSway2, 104 * s);
    ctx.bezierCurveTo(22 * s, 86 * s, 18 * s, 64 * s, 10 * s, 48 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mane Lock 3
    ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(16 * s, 54 * s);
    ctx.bezierCurveTo(38 * s + maneSway3, 68 * s, 40 * s + maneSway3, 98 * s, 22 * s + maneSway3, 118 * s);
    ctx.bezierCurveTo(16 * s, 102 * s, 14 * s, 80 * s, 8 * s, 66 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Kawaii Head, Neck & Plump Chubby Body Silhouette
    ctx.beginPath();
    ctx.moveTo(-20 * s, 21 * s);
    ctx.bezierCurveTo(-25 * s, 28 * s, -35 * s, 38 * s, -36 * s, 48 * s);
    ctx.bezierCurveTo(-37 * s, 56 * s, -30 * s, 62 * s, -21 * s, 60 * s);
    ctx.bezierCurveTo(-14 * s, 59 * s, -10 * s, 54 * s, -6 * s, 50 * s);
    ctx.bezierCurveTo(-4 * s, 64 * s, -6 * s, 82 * s, -2 * s, 96 * s);
    ctx.bezierCurveTo(2 * s, 112 * s, 18 * s, 118 * s, 34 * s, 114 * s);
    ctx.bezierCurveTo(46 * s, 110 * s, 48 * s, 92 * s, 42 * s, 80 * s);
    ctx.bezierCurveTo(36 * s, 68 * s, 26 * s, 44 * s, 20 * s, 21 * s);
    ctx.closePath();

    ctx.fillStyle = isDragged ? 'rgba(38, 52, 94, 0.6)' : 'rgba(24, 34, 66, 0.48)';
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isDragged ? 2.0 : 1.5;
    ctx.stroke();

    // Draw Near legs (in front of body) - with pivots splaying slightly outward when upside down
    drawLittleLeg((4 - 4 * upsideDown) * s, (106 - 3 * upsideDown) * s, legAngleFrontL, false);
    drawLittleLeg((26 + 4 * upsideDown) * s, (104 - 3 * upsideDown) * s, legAngleBackL, false);

    // 6. Cute Soft Pink Cheek Blush
    const blushX = -18 * s;
    const blushY = 50 * s;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.beginPath();
    ctx.arc(blushX, blushY, 6 * s, 0, Math.PI * 2);
    ctx.fill();

    // 7. Cute Floppy Downward-Angled Ear
    const earDroop = Math.sin(time * 0.003) * 1.5 * s;
    ctx.save();
    ctx.translate(14 * s, 24 * s);
    ctx.rotate(0.6 + earDroop * 0.04);

    ctx.beginPath();
    ctx.moveTo(-6 * s, 0);
    ctx.quadraticCurveTo(-4 * s, 16 * s, 2 * s, 26 * s);
    ctx.quadraticCurveTo(8 * s, 18 * s, 8 * s, 0);
    ctx.closePath();
    ctx.fillStyle = isDragged ? 'rgba(36, 48, 86, 0.65)' : 'rgba(22, 30, 58, 0.52)';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner ear blush
    ctx.beginPath();
    ctx.moveTo(-3 * s, 2 * s);
    ctx.quadraticCurveTo(-1 * s, 12 * s, 2 * s, 19 * s);
    ctx.quadraticCurveTo(5 * s, 12 * s, 5 * s, 2 * s);
    ctx.closePath();
    ctx.fillStyle = isDragged ? 'rgba(255, 215, 0, 0.45)' : 'rgba(244, 114, 182, 0.35)';
    ctx.fill();
    ctx.restore();

    // 8. Cute Forehead Forelock
    const forelockSway = Math.sin(time * 0.0032) * 2 * s;
    ctx.beginPath();
    ctx.moveTo(-16 * s, 20 * s);
    ctx.bezierCurveTo(-26 * s + forelockSway, 24 * s, -28 * s + forelockSway, 32 * s, -22 * s + forelockSway, 36 * s);
    ctx.bezierCurveTo(-18 * s, 32 * s, -14 * s, 26 * s, -12 * s, 20 * s);
    ctx.closePath();
    ctx.fillStyle = isDragged ? 'rgba(255, 215, 0, 0.4)' : 'rgba(192, 132, 252, 0.38)';
    ctx.fill();
    ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.7)' : 'rgba(192, 132, 252, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 9. Golden Celestial Diadem & Horn Gem Mount
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-21 * s, 18 * s, 42 * s, 5 * s, 2.5 * s);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Center faceted celestial gem
    const gemPulse = 0.8 + Math.sin(time * 0.005) * 0.2;
    const gemX = 0;
    const gemY = 20.5 * s;
    ctx.fillStyle = isDragged ? '#fef08a' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(gemX, gemY - 3.5 * s);
    ctx.lineTo(gemX + 3.5 * s, gemY);
    ctx.lineTo(gemX, gemY + 3.5 * s);
    ctx.lineTo(gemX - 3.5 * s, gemY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Soft gem aura
    ctx.fillStyle = `rgba(56, 189, 248, ${0.4 * gemPulse})`;
    ctx.beginPath();
    ctx.arc(gemX, gemY, 7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 10. Expressive Kawaii Celestial Eye with Blinking Animation
    const eyeX = -16 * s;
    const eyeY = 38 * s;

    // Periodic blinking cycle
    const blinkCycle = (time * 0.001) % 3.6;
    const isBlinking = blinkCycle > 3.42;
    const blinkProgress = isBlinking ? Math.sin(((blinkCycle - 3.42) / 0.18) * Math.PI) : 0;

    if (blinkProgress > 0.75) {
      // Closed smiling eye
      ctx.strokeStyle = isDragged ? '#ffd700' : '#e0f2fe';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + 1 * s, 4.5 * s, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(eyeX - 4 * s, eyeY + 2 * s);
      ctx.lineTo(eyeX - 6.5 * s, eyeY + 0.5 * s);
      ctx.moveTo(eyeX + 4 * s, eyeY + 2 * s);
      ctx.lineTo(eyeX + 6.5 * s, eyeY + 0.5 * s);
      ctx.stroke();
    } else {
      // Open radiant eye
      const eyeHeightScale = Math.max(0.2, 1 - blinkProgress);

      ctx.save();
      ctx.translate(eyeX, eyeY);
      ctx.scale(1, eyeHeightScale);

      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5 * s, 7.5 * s, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Iris
      ctx.fillStyle = isDragged ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2 * s, 6.0 * s, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0.5 * s, 2.5 * s, 3.8 * s, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.5 * s, -2.5 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(1.8 * s, 2.2 * s, 1.0 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-1.5 * s, -2.5 * s - 2.8 * s);
      ctx.lineTo(-1.5 * s + 0.7 * s, -2.5 * s);
      ctx.lineTo(-1.5 * s, -2.5 * s + 2.8 * s);
      ctx.lineTo(-1.5 * s - 0.7 * s, -2.5 * s);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Cute upper eyelid & eyelashes
      ctx.strokeStyle = isDragged ? '#ffd700' : '#e0f2fe';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY - 2 * s, 5.8 * s, Math.PI * 1.15, Math.PI * 1.88);
      ctx.stroke();

      ctx.beginPath();
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

    // 1.1 Render Kawaii Vector Pony beneath the Horn ONLY if shape is 'horn'
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
      // 1.2 Celestial Mirror Bar
      const w = 36 * s;
      const h = 6 * s;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w - 2 * s, -h - 2 * s, (w + 2 * s) * 2, (h + 2 * s) * 2);

      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.2;
      for (let x = -w + 6 * s; x <= w; x += 12 * s) {
        ctx.beginPath();
        ctx.moveTo(x, 2 * s);
        ctx.lineTo(x - 6 * s, h + 2 * s);
        ctx.stroke();
      }
      ctx.restore();

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
      // 1.3 Glass Body (Horn, Dove, Lens, Orb)
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
        ctx.moveTo(-20 * s, -24 * s);
        ctx.lineTo(20 * s, -24 * s);
        ctx.lineTo(44 * s, 24 * s);
        ctx.lineTo(-44 * s, 24 * s);
      } else {
        // orb
        ctx.arc(0, 0, 30 * s, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = rimWidth;
      ctx.strokeStyle = rimStroke;
      ctx.stroke();

      // Shape-specific internal crystal accents
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
        ctx.moveTo(-20 * s, -24 * s);
        ctx.lineTo(0, 24 * s);
        ctx.lineTo(20 * s, -24 * s);
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

    ctx.restore(); // Restore rotated transform

    // ==========================================
    // 2. UNROTATED CONTROLS LAYER (World/Screen Aligned)
    // ==========================================
    ctx.save();
    ctx.translate(prism.pos.x, prism.pos.y);

    if (showControls) {
      // 2.0 Selection Ambient Glow Aura
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
      ctx.strokeStyle = isRotActive
        ? '#ffd700'
        : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = isRotActive ? 2.2 : 1.4;

      // Dashed outer rotation orbit
      ctx.setLineDash([8 * s, 6 * s]);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top Orbital Knob for coarse drag rotation
      const topBeadR = isRotActive ? 6.5 * s : 5.2 * s;
      ctx.fillStyle = isRotActive ? '#ffd700' : '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -ringRadius, topBeadR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2.1.1 Fine Rotation Buttons at Left (-ringRadius, 0) and Right (+ringRadius, 0)
      const drawStepBtn = (
        bx: number,
        by: number,
        isCCW: boolean,
        isBtnHovered: boolean,
        isBtnActive: boolean
      ) => {
        ctx.save();
        const btnR = (isBtnHovered || isBtnActive ? 15.0 : 13.5) * s;

        // Button background
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

        // Button circle
        ctx.beginPath();
        ctx.arc(bx, by, btnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Button Outer Glow Ring if hovered/active
        if (isBtnHovered || isBtnActive) {
          ctx.strokeStyle = isBtnActive
            ? 'rgba(255, 215, 0, 0.6)'
            : 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(bx, by, btnR + 2.5 * s, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw curved arc arrow
        const iconColor = isBtnActive
          ? '#ffd700'
          : isBtnHovered
          ? '#ffffff'
          : '#38bdf8';
        ctx.strokeStyle = iconColor;
        ctx.fillStyle = iconColor;
        ctx.lineWidth = 1.6 * s;
        ctx.lineCap = 'round';

        const arcR = 7.0 * s;
        ctx.beginPath();
        if (isCCW) {
          // Counter-Clockwise arc
          ctx.arc(bx, by, arcR, Math.PI * 0.25, Math.PI * 1.55, false);
          ctx.stroke();

          // Arrowhead
          const ax = bx + Math.cos(Math.PI * 1.55) * arcR;
          const ay = by + Math.sin(Math.PI * 1.55) * arcR;
          ctx.beginPath();
          ctx.moveTo(ax - 3.5 * s, ay + 1.0 * s);
          ctx.lineTo(ax + 1.0 * s, ay - 3.5 * s);
          ctx.lineTo(ax + 2.0 * s, ay + 2.5 * s);
          ctx.closePath();
          ctx.fill();
        } else {
          // Clockwise arc
          ctx.arc(bx, by, arcR, Math.PI * 0.75, Math.PI * 2.45, false);
          ctx.stroke();

          // Arrowhead
          const ax = bx + Math.cos(Math.PI * 2.45) * arcR;
          const ay = by + Math.sin(Math.PI * 2.45) * arcR;
          ctx.beginPath();
          ctx.moveTo(ax + 3.5 * s, ay + 1.0 * s);
          ctx.lineTo(ax - 1.0 * s, ay - 3.5 * s);
          ctx.lineTo(ax - 2.0 * s, ay + 2.5 * s);
          ctx.closePath();
          ctx.fill();
        }

        // Text label 1°
        ctx.font = `bold ${7.5 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = iconColor;
        ctx.fillText(isCCW ? '-1°' : '+1°', bx, by + 1.0 * s);

        ctx.restore();
      };

      const isCCWHover = hoverHandle === 'step-ccw';
      const isCCWActive = isDragged && dragMode === 'step-ccw';
      drawStepBtn(-ringRadius, 0, true, isCCWHover, isCCWActive);

      const isCWHover = hoverHandle === 'step-cw';
      const isCWActive = isDragged && dragMode === 'step-cw';
      drawStepBtn(ringRadius, 0, false, isCWHover, isCWActive);

      ctx.restore();

      // 2.2 Move Indicator - ALWAYS FIXED AT THE BOTTOM at (0, 82 * s)
      const moveY = 82 * s;
      const isMoveActive = (isDragged && dragMode === 'move') || hoverHandle === 'body';

      ctx.save();
      // Move badge background
      ctx.fillStyle = isMoveActive ? 'rgba(28, 40, 72, 0.96)' : 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = isMoveActive ? '#ffd700' : 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = isMoveActive ? 2.4 : 1.6;

      const badgeR = 19 * s;
      ctx.beginPath();
      ctx.arc(0, moveY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer badge glow ring
      ctx.save();
      ctx.strokeStyle = isMoveActive ? 'rgba(255, 215, 0, 0.6)' : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = isMoveActive ? 3.5 : 1.8;
      ctx.beginPath();
      ctx.arc(0, moveY, badgeR + 3 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4-directional Move Arrows (✥) - Always upright and prominent
      const arrowColor = isMoveActive ? '#ffd700' : '#38bdf8';
      ctx.fillStyle = arrowColor;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.0;

      const arm = 11.5 * s;
      const arrowSize = 3.6 * s;

      // Vertical & Horizontal cross lines
      ctx.beginPath();
      ctx.moveTo(0, moveY - arm);
      ctx.lineTo(0, moveY + arm);
      ctx.moveTo(-arm, moveY);
      ctx.lineTo(arm, moveY);
      ctx.stroke();

      // North arrow
      ctx.beginPath();
      ctx.moveTo(0, moveY - arm - 1.5 * s);
      ctx.lineTo(-arrowSize, moveY - arm + arrowSize * 0.7);
      ctx.lineTo(arrowSize, moveY - arm + arrowSize * 0.7);
      ctx.closePath();
      ctx.fill();

      // South arrow
      ctx.beginPath();
      ctx.moveTo(0, moveY + arm + 1.5 * s);
      ctx.lineTo(-arrowSize, moveY + arm - arrowSize * 0.7);
      ctx.lineTo(arrowSize, moveY + arm - arrowSize * 0.7);
      ctx.closePath();
      ctx.fill();

      // West arrow
      ctx.beginPath();
      ctx.moveTo(-arm - 1.5 * s, moveY);
      ctx.lineTo(-arm + arrowSize * 0.7, moveY - arrowSize);
      ctx.lineTo(-arm + arrowSize * 0.7, moveY + arrowSize);
      ctx.closePath();
      ctx.fill();

      // East arrow
      ctx.beginPath();
      ctx.moveTo(arm + 1.5 * s, moveY);
      ctx.lineTo(arm - arrowSize * 0.7, moveY - arrowSize);
      ctx.lineTo(arm - arrowSize * 0.7, moveY + arrowSize);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Center pivot indicator
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

    if (isMatch && Math.random() < 0.35) {
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
      const lensGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerRadius);
      lensGrad.addColorStop(0, `rgba(${Math.min(255, Math.round(sampledRgb[0] + 50))}, ${Math.min(255, Math.round(sampledRgb[1] + 50))}, ${Math.min(255, Math.round(sampledRgb[2] + 50))}, 1.0)`);
      lensGrad.addColorStop(0.7, `rgba(${Math.round(sampledRgb[0])}, ${Math.round(sampledRgb[1])}, ${Math.round(sampledRgb[2])}, 0.85)`);
      lensGrad.addColorStop(1, `rgba(${Math.max(0, Math.round(sampledRgb[0] - 30))}, ${Math.max(0, Math.round(sampledRgb[1] - 30))}, ${Math.max(0, Math.round(sampledRgb[2] - 30))}, 0.4)`);
      ctx.fillStyle = lensGrad;
      ctx.fill();

      // Optical core reflection
      ctx.fillStyle = isMatch ? '#ffffff' : `rgba(255, 255, 255, 0.7)`;
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
    const tickInner = centerRadius - 2.0;
    const tickOuter = centerRadius + 3.0;

    ctx.beginPath();
    ctx.moveTo(0, -tickInner); ctx.lineTo(0, -tickOuter);
    ctx.moveTo(0, tickInner);  ctx.lineTo(0, tickOuter);
    ctx.moveTo(-tickInner, 0); ctx.lineTo(-tickOuter, 0);
    ctx.moveTo(tickInner, 0);  ctx.lineTo(tickOuter, 0);
    ctx.stroke();
    ctx.restore();

    // 9. Prominent Text Label below target
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    const spectrumName = target.name || `${getSpectrumName(midWl)} Sensor`;
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
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();

    if (obstacle.isMirror) {
      // Chrome Mirror styling
      ctx.fillStyle = '#3a4a68';
      ctx.fill();
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Obsidian Absorbing Wall styling
      ctx.fillStyle = '#141724';
      ctx.fill();
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

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

  public renderProfiler(stats: {
    fps: number;
    traceTime: number;
    raysTime: number;
    dustTime: number;
    prismTime: number;
    clearTime: number;
    totalTime: number;
    rayCount: number;
    segmentCount: number;
  }): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    const x = 985;
    let y = 22;

    // FPS badge
    ctx.fillStyle = stats.fps >= 50 ? '#4ade80' : stats.fps >= 30 ? '#facc15' : '#f87171';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${stats.fps} FPS (${stats.totalTime.toFixed(1)}ms)`, x, y);
    y += 15;

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.fillText(`Rays (${stats.rayCount}r/${stats.segmentCount}s): ${stats.raysTime.toFixed(2)}ms`, x, y);
    y += 13;
    ctx.fillText(`CPU Trace: ${stats.traceTime.toFixed(2)}ms`, x, y);
    y += 13;
    ctx.fillText(`Dust: ${stats.dustTime.toFixed(2)}ms`, x, y);
    y += 13;
    ctx.fillText(`Prisms: ${stats.prismTime.toFixed(2)}ms`, x, y);
    y += 13;
    ctx.fillText(`Clear/BG: ${stats.clearTime.toFixed(2)}ms`, x, y);

    ctx.restore();
  }

  public renderFPS(fps: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${fps} FPS`, 985, 24);
    ctx.restore();
  }
}
