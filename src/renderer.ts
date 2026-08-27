import {
  Prism,
  Target,
  Obstacle,
  Emitter,
  RaySegment,
  Vec2,
} from './types';
import {
  vAdd,
  vRotate,
  getPrismVertices,
} from './math';
import {
  wavelengthToRGBA,
  wavelengthToHex,
  wavelengthToRGB,
  getSpectrumName,
  rgbToHex,
} from './color';

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

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
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
    // Deep cosmic background
    ctx.fillStyle = '#080a14';
    ctx.fillRect(x, y, width, height);

    // Subtle background grid spanning the full cleared region
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const step = 50;
    const startX = Math.floor(x / step) * step;
    const startY = Math.floor(y / step) * step;
    const endX = x + width;
    const endY = y + height;

    for (let gx = startX; gx <= endX; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, endY);
      ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy += step) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(endX, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  public renderSquareBounds(size: number = 1000): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, size, size);

    const c = 32;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, c); ctx.lineTo(0, 0); ctx.lineTo(c, 0);
    ctx.moveTo(size - c, 0); ctx.lineTo(size, 0); ctx.lineTo(size, c);
    ctx.moveTo(size, size - c); ctx.lineTo(size, size); ctx.lineTo(size - c, size);
    ctx.moveTo(c, size); ctx.lineTo(0, size); ctx.lineTo(0, size - c);
    ctx.stroke();
    ctx.restore();
  }

  public renderRays(segments: RaySegment[]): void {
    const ctx = this.ctx;
    ctx.save();
    // Additive blending for realistic spectral ray combination!
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // Pass 1: Subtle soft bloom glow
    ctx.lineWidth = 4.0;
    for (const seg of segments) {
      ctx.strokeStyle = wavelengthToRGBA(seg.wavelength, 0.045);
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();
    }

    // Pass 2: Intense vibrant core beam
    ctx.lineWidth = 2.2;
    for (const seg of segments) {
      ctx.strokeStyle = wavelengthToRGBA(seg.wavelength, 0.11);
      ctx.beginPath();
      ctx.moveTo(seg.p1.x, seg.p1.y);
      ctx.lineTo(seg.p2.x, seg.p2.y);
      ctx.stroke();
    }

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

  private renderPonyHead(
    s: number,
    isHovered: boolean,
    isDragged: boolean,
    time: number
  ): void {
    const ctx = this.ctx;
    ctx.save();

    const strokeColor = isDragged
      ? 'rgba(255, 215, 0, 0.9)'
      : isHovered
      ? 'rgba(165, 229, 255, 0.85)'
      : 'rgba(148, 163, 220, 0.45)';

    // 1. Flowing Magical Mane (behind neck)
    const maneSway = Math.sin(time * 0.003) * 3 * s;
    ctx.fillStyle = isDragged ? 'rgba(255, 215, 0, 0.15)' : 'rgba(56, 189, 248, 0.10)';
    ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.6)' : 'rgba(125, 211, 252, 0.4)';
    ctx.lineWidth = 1.4;

    // Mane lock 1
    ctx.beginPath();
    ctx.moveTo(12 * s, 22 * s);
    ctx.bezierCurveTo(32 * s + maneSway, 28 * s, 38 * s + maneSway, 54 * s, 32 * s + maneSway, 78 * s);
    ctx.bezierCurveTo(24 * s, 66 * s, 20 * s, 46 * s, 16 * s, 32 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mane lock 2
    ctx.beginPath();
    ctx.moveTo(16 * s, 34 * s);
    ctx.bezierCurveTo(42 * s - maneSway, 48 * s, 44 * s - maneSway, 76 * s, 26 * s, 94 * s);
    ctx.bezierCurveTo(20 * s, 80 * s, 18 * s, 60 * s, 12 * s, 46 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Ear (Pointed celestial ear)
    ctx.beginPath();
    ctx.moveTo(6 * s, 20 * s);
    ctx.lineTo(16 * s, -8 * s);
    ctx.lineTo(22 * s, 21 * s);
    ctx.closePath();
    ctx.fillStyle = isDragged ? 'rgba(30, 42, 75, 0.55)' : 'rgba(18, 24, 46, 0.4)';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner ear pinkish/golden accent
    ctx.beginPath();
    ctx.moveTo(10 * s, 18 * s);
    ctx.lineTo(16 * s, 0 * s);
    ctx.lineTo(19 * s, 19 * s);
    ctx.closePath();
    ctx.fillStyle = isDragged ? 'rgba(255, 215, 0, 0.35)' : 'rgba(244, 114, 182, 0.25)';
    ctx.fill();

    // 3. Head & Neck Silhouette
    ctx.beginPath();
    // Start at forehead under horn front
    ctx.moveTo(-20 * s, 21 * s);
    // Bridge of snout/muzzle
    ctx.bezierCurveTo(-24 * s, 30 * s, -34 * s, 40 * s, -34 * s, 50 * s);
    // Cute curved muzzle tip
    ctx.bezierCurveTo(-34 * s, 58 * s, -28 * s, 62 * s, -20 * s, 60 * s);
    // Chin & jawline
    ctx.bezierCurveTo(-14 * s, 59 * s, -10 * s, 52 * s, -7 * s, 48 * s);
    // Throat / front of neck
    ctx.bezierCurveTo(-5 * s, 62 * s, -3 * s, 80 * s, -1 * s, 96 * s);
    // Torso bottom pedestal curve
    ctx.bezierCurveTo(12 * s, 100 * s, 24 * s, 98 * s, 30 * s, 94 * s);
    // Back of neck
    ctx.bezierCurveTo(28 * s, 70 * s, 24 * s, 42 * s, 20 * s, 21 * s);
    ctx.closePath();

    // Translucent ethereal cosmic glass body fill
    const bodyGrad = ctx.createLinearGradient(-26 * s, 24 * s, 26 * s, 95 * s);
    bodyGrad.addColorStop(0, isDragged ? 'rgba(32, 45, 80, 0.52)' : 'rgba(20, 28, 54, 0.38)');
    bodyGrad.addColorStop(1, 'rgba(10, 14, 30, 0.22)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isDragged ? 1.8 : 1.3;
    ctx.stroke();

    // 4. Forehead Celestial Diadem / Gem mount under horn base
    ctx.fillStyle = isDragged ? '#ffd700' : '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-21 * s, 18 * s, 42 * s, 5 * s, 2.5 * s);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // 5. Stylized Magical Eye (Starry slit / ✦)
    const eyeX = -15 * s;
    const eyeY = 39 * s;
    ctx.fillStyle = isDragged ? '#ffd700' : '#67e8f9';

    // 4-point star eye
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY - 3.5 * s);
    ctx.quadraticCurveTo(eyeX, eyeY, eyeX + 3.5 * s, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY, eyeX, eyeY + 3.5 * s);
    ctx.quadraticCurveTo(eyeX, eyeY, eyeX - 3.5 * s, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY, eyeX, eyeY - 3.5 * s);
    ctx.closePath();
    ctx.fill();

    // Subtle eye glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 1.0 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public renderPrism(
    prism: Prism,
    isHovered: boolean,
    isDragged: boolean,
    hoverHandle: 'body' | 'rot' | null,
    time: number,
    isSelected: boolean = false,
    dragMode: 'move' | 'rotate' | null = null
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

    // 1.1 Render Minimalist Vector Pony beneath the Horn ONLY if shape is 'horn'
    if (prism.shape === 'horn') {
      this.renderPonyHead(s, isHovered || isSelected, isDragged, time);
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
      grad.addColorStop(0, isDragged ? 'rgba(255, 240, 200, 0.45)' : 'rgba(200, 240, 255, 0.32)');
      grad.addColorStop(1, isDragged ? 'rgba(255, 215, 0, 0.22)' : 'rgba(120, 180, 240, 0.15)');
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
      ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.35)';
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

      // Orbital Grip Beads (at top, left, right)
      const beadPositions = [
        { x: 0, y: -ringRadius },
        { x: ringRadius, y: 0 },
        { x: -ringRadius, y: 0 },
      ];

      for (let i = 0; i < beadPositions.length; i++) {
        const bp = beadPositions[i];
        const beadR = isRotActive ? (i === 0 ? 6.5 * s : 4.5 * s) : (i === 0 ? 5.5 * s : 3.8 * s);

        ctx.fillStyle = isRotActive
          ? '#ffd700'
          : (i === 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.arc(bp.x, bp.y, beadR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

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

  public sampleCanvasColorAt(
    pos: Vec2,
    bounds: { scale: number; offsetX: number; offsetY: number },
    dpr: number
  ): [number, number, number] {
    const ctx = this.ctx;
    // Map virtual space (0..1000) to actual canvas pixel coordinates
    const px = Math.round((pos.x * bounds.scale + bounds.offsetX) * dpr);
    const py = Math.round((pos.y * bounds.scale + bounds.offsetY) * dpr);

    // Sample a 5x5 region around the center
    const radius = Math.max(1, Math.round(3 * bounds.scale * dpr));
    const size = radius * 2 + 1;
    const startX = Math.max(0, Math.min(ctx.canvas.width - size, px - radius));
    const startY = Math.max(0, Math.min(ctx.canvas.height - size, py - radius));

    try {
      const imgData = ctx.getImageData(startX, startY, size, size);
      const data = imgData.data;
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count++;
      }
      if (count === 0) return [8, 10, 20];
      return [sumR / count, sumG / count, sumB / count];
    } catch {
      return [8, 10, 20];
    }
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
    const centerRadius = r * 0.44; // Central sensor lens ("jedno kolečko")

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

    // 3. Semi-Transparent Glass Chassis Backplate (lets underlying beams show through)
    ctx.fillStyle = 'rgba(10, 15, 30, 0.42)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. VIBRANT TARGET COLOR BAND (Very prominent indicator of required color)
    // Colored filled ring band
    ctx.fillStyle = targetHex + '2a';
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.arc(0, 0, r - 5, 0, Math.PI * 2, true);
    ctx.fill();

    // Solid prominent neon outer stroke
    ctx.strokeStyle = targetHex;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Circular Charge Progress Ring (fills clockwise from top)
    if (target.charge > 0) {
      ctx.strokeStyle = isMatch ? '#ffffff' : '#fef08a';
      ctx.lineWidth = 4.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * target.charge);
      ctx.stroke();
    }

    // 6. Translucent mid-chassis ring surrounding the central sensor
    ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.fill();

    // =========================================================================
    // 7. CENTRAL SENSOR APERTURE / LENS ("JEDNO KOLEČKO")
    // =========================================================================
    // Base lens background
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);

    if (hasLight) {
      // Light is striking the central circle!
      // Fill central lens with the exact detected color from the canvas
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
      // Idle dark translucent lens awaiting light
      ctx.fillStyle = 'rgba(3, 6, 14, 0.65)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central lens border / metallic bezel
    ctx.strokeStyle = isMatch
      ? '#ffffff'
      : hasLight
      ? sampledHex
      : 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = isMatch ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 8. Optical Reticle / Crosshair notches indicating central sampling
    ctx.save();
    ctx.strokeStyle = isMatch ? '#ffffff' : 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.0;
    const tickInner = centerRadius - 2.0;
    const tickOuter = centerRadius + 3.0;

    // 4 cardinal reticle ticks (North, South, East, West)
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
