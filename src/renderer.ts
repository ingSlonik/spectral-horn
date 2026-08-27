import {
  Prism,
  Target,
  Obstacle,
  Emitter,
  RaySegment,
} from './types';
import {
  vAdd,
  vRotate,
  getPrismVertices,
} from './math';
import {
  wavelengthToRGBA,
  wavelengthToHex,
  getSpectrumName,
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
    // Subtle boundary glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, size, size);

    // Elegant celestial corner accents
    const cLen = 32;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 2.0;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(0, cLen); ctx.lineTo(0, 0); ctx.lineTo(cLen, 0);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(size - cLen, 0); ctx.lineTo(size, 0); ctx.lineTo(size, cLen);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(size, size - cLen); ctx.lineTo(size, size); ctx.lineTo(size - cLen, size);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(cLen, size); ctx.lineTo(0, size); ctx.lineTo(0, size - cLen);
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

    // Glow aura
    const pulse = 0.8 + Math.sin(time * 0.005) * 0.2;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * pulse})`);
    glow.addColorStop(0.5, `rgba(220, 240, 255, ${0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    // Projector body
    ctx.fillStyle = '#1c2237';
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.roundRect(-20, -11, 22, 22, 4);
    ctx.fill();
    ctx.stroke();

    // Aperture nozzle
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(6, -5);
    ctx.lineTo(6, 5);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();

    // Lens slit
    ctx.fillStyle = '#ffffff';
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

    // 1.1 Render Minimalist Vector Pony beneath the Horn
    this.renderPonyHead(s, isHovered || isSelected, isDragged, time);

    // 1.2 Render Crystal Horn (Prism)
    // Horn apex is at (0, -38*s), base is from (-22*s, 22*s) to (22*s, 22*s)
    const localVerts = [
      { x: 0, y: -38 * s },
      { x: 22 * s, y: 22 * s },
      { x: -22 * s, y: 22 * s },
    ];

    // Glass body fill
    const grad = ctx.createLinearGradient(0, -38 * s, 0, 22 * s);
    grad.addColorStop(0, isDragged ? 'rgba(255, 240, 200, 0.45)' : 'rgba(200, 240, 255, 0.32)');
    grad.addColorStop(1, isDragged ? 'rgba(255, 215, 0, 0.22)' : 'rgba(120, 180, 240, 0.15)');

    ctx.beginPath();
    ctx.moveTo(localVerts[0].x, localVerts[0].y);
    for (let i = 1; i < localVerts.length; i++) {
      ctx.lineTo(localVerts[i].x, localVerts[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer crystal rim stroke
    ctx.lineWidth = isDragged ? 2.5 : (isHovered || isSelected) ? 2.0 : 1.5;
    ctx.strokeStyle = isDragged
      ? '#ffd700'
      : (isHovered || isSelected)
      ? '#a5e5ff'
      : 'rgba(210, 235, 255, 0.85)';
    ctx.stroke();

    // Internal crystalline facet lines (spiral horn grooves)
    ctx.save();
    ctx.strokeStyle = isDragged ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;

    const tip = localVerts[0];
    const bRight = localVerts[1];
    const bLeft = localVerts[2];

    for (let f = 1; f <= 3; f++) {
      const t = f / 4;
      const pL = { x: tip.x + (bLeft.x - tip.x) * t, y: tip.y + (bLeft.y - tip.y) * t };
      const pR = { x: tip.x + (bRight.x - tip.x) * t, y: tip.y + (bRight.y - tip.y) * t };
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.quadraticCurveTo(0, (pL.y + pR.y) / 2 - 3 * s, pR.x, pR.y);
      ctx.stroke();
    }
    ctx.restore();

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

  public renderTarget(target: Target, time: number): void {
    const ctx = this.ctx;
    const midWl = (target.minLambda + target.maxLambda) / 2;
    const colorHex = wavelengthToHex(midWl);

    ctx.save();
    ctx.translate(target.pos.x, target.pos.y);

    // Glowing aura when illuminated
    if (target.charge > 0.05) {
      const glowRad = target.radius * (1.3 + target.charge * 0.9 + Math.sin(time * 0.008) * 0.1);
      const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, glowRad);
      glow.addColorStop(0, colorHex + '99');
      glow.addColorStop(0.6, colorHex + '33');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
      ctx.fill();

      if (Math.random() < target.charge * 0.35) {
        this.addSpark(target.pos.x, target.pos.y, colorHex, 1);
      }
    }

    // Outer Target Rim Base
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, target.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Circular Charge Progress Ring
    if (target.charge > 0) {
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, target.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * target.charge);
      ctx.stroke();
    }

    // Target Core
    ctx.fillStyle = target.isSatisfied ? colorHex : '#121526';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, target.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Central core bullseye
    ctx.fillStyle = target.isSatisfied ? '#000000' : colorHex;
    ctx.beginPath();
    ctx.arc(0, 0, target.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Text Label below target
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const spectrumName = getSpectrumName(midWl);
    ctx.fillText(`${spectrumName} (${Math.round(midWl)}nm)`, 0, target.radius + 15);

    // Charge percentage text
    if (target.charge > 0) {
      ctx.fillStyle = colorHex;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${Math.round(target.charge * 100)}%`, 0, 3.5);
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
}
