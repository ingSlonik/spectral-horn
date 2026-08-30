import { Vec2, Prism } from './types';
import { v2, vDist, isPointInPolygon, getPrismVertices, clamp } from './math';
import { initAudio, playPrismRotate, playPrismMove } from './audio';

export interface DragState {
  prismIndex: number | null;
  mode: 'move' | 'rotate' | 'step-ccw' | 'step-cw' | null;
  dragOffset: Vec2;
  lastAngle: number;
  isTouch: boolean;
}

const TOUCH_OFFSET_Y = 60;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  public mousePos: Vec2 = v2(0, 0);
  public selectedPrismIndex: number | null = null;
  public dragState: DragState = {
    prismIndex: null,
    mode: null,
    dragOffset: v2(0, 0),
    lastAngle: 0,
    isTouch: false,
  };
  public hoverPrismIndex: number | null = null;
  public hoverHandle: 'body' | 'rot' | 'step-ccw' | 'step-cw' | null = null;

  private repeatTimer: number | null = null;
  private repeatDelayTimer: number | null = null;
  private onStateChange?: () => void;

  constructor(canvas: HTMLCanvasElement, onStateChange?: () => void) {
    this.canvas = canvas;
    this.onStateChange = onStateChange;
    this.initEvents();
  }

  private getCanvasPos(e: MouseEvent | Touch): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    const s = Math.min(r.width, r.height) || 1000;
    return {
      x: (e.clientX - r.left - (r.width - s) / 2) * (1000 / s),
      y: (e.clientY - r.top - (r.height - s) / 2) * (1000 / s),
    };
  }

  private startStepAutoRepeat(deltaRad: number, prism: Prism): void {
    this.stopStepAutoRepeat();
    this.repeatDelayTimer = window.setTimeout(() => {
      this.repeatTimer = window.setInterval(() => {
        if (prism && !prism.locked) {
          prism.rot += deltaRad;
          if (prism.baseRot !== undefined) prism.baseRot = prism.rot;
          playPrismRotate(0.25);
          this.onStateChange?.();
        }
      }, 70);
    }, 280);
  }

  private stopStepAutoRepeat(): void {
    if (this.repeatDelayTimer !== null) { clearTimeout(this.repeatDelayTimer); this.repeatDelayTimer = null; }
    if (this.repeatTimer !== null) { clearInterval(this.repeatTimer); this.repeatTimer = null; }
  }

  private hitTest(pos: Vec2, prisms: Prism[]): { idx: number; handle: 'body' | 'rot' | 'step-ccw' | 'step-cw' } | null {
    if (this.selectedPrismIndex !== null && prisms[this.selectedPrismIndex]) {
      const p = prisms[this.selectedPrismIndex];
      if (!p.locked) {
        const s = p.scale || 1;
        if (vDist(pos, { x: p.pos.x - 78 * s, y: p.pos.y }) <= 18 * s) return { idx: this.selectedPrismIndex, handle: 'step-ccw' };
        if (vDist(pos, { x: p.pos.x + 78 * s, y: p.pos.y }) <= 18 * s) return { idx: this.selectedPrismIndex, handle: 'step-cw' };
        const dCenter = vDist(pos, p.pos);
        if (vDist(pos, { x: p.pos.x, y: p.pos.y + 82 * s }) <= 34 * s || dCenter <= 38 * s || isPointInPolygon(pos, getPrismVertices(p))) {
          return { idx: this.selectedPrismIndex, handle: 'body' };
        }
        if (dCenter >= 45 * s && dCenter <= 110 * s) return { idx: this.selectedPrismIndex, handle: 'rot' };
      }
    }

    for (let i = prisms.length - 1; i >= 0; i--) {
      const p = prisms[i];
      if (p.locked || i === this.selectedPrismIndex) continue;
      const s = p.scale || 1;
      if (vDist(pos, p.pos) <= 75 * s || isPointInPolygon(pos, getPrismVertices(p))) {
        return { idx: i, handle: 'body' };
      }
    }
    return null;
  }

  private initEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(this.getCanvasPos(e), e.button === 2, false));
    window.addEventListener('mousemove', (e) => this.handlePointerMove(this.getCanvasPos(e), false));
    window.addEventListener('mouseup', () => this.handlePointerUp());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (this.selectedPrismIndex === null) return;
      const p = this.getPrisms()[this.selectedPrismIndex];
      if (!p || p.locked) return;

      const step = e.shiftKey ? 1 : e.ctrlKey || e.metaKey ? 6 : 2;
      let moved = false;
      if (e.key === 'ArrowLeft') { p.pos.x = clamp(p.pos.x - step, 60, 940); moved = true; }
      else if (e.key === 'ArrowRight') { p.pos.x = clamp(p.pos.x + step, 60, 940); moved = true; }
      else if (e.key === 'ArrowUp') { p.pos.y = clamp(p.pos.y - step, 60, 940); moved = true; }
      else if (e.key === 'ArrowDown') { p.pos.y = clamp(p.pos.y + step, 60, 940); moved = true; }

      if (moved) {
        e.preventDefault();
        initAudio();
        if (p.basePos) { p.basePos.x = p.pos.x; p.basePos.y = p.pos.y; }
        playPrismMove(0.15);
        this.onStateChange?.();
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      initAudio();
      const idx = this.hoverPrismIndex ?? this.selectedPrismIndex;
      if (idx !== null) {
        const p = this.getPrisms()[idx];
        if (p && !p.locked) {
          p.rot += Math.sign(e.deltaY) * (Math.PI / 90);
          if (p.baseRot !== undefined) p.baseRot = p.rot;
          playPrismRotate(0.5);
          this.onStateChange?.();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) this.handlePointerDown(this.getCanvasPos(e.touches[0]), false, true);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) this.handlePointerMove(this.getCanvasPos(e.touches[0]), true);
    }, { passive: false });

    window.addEventListener('touchend', () => this.handlePointerUp());
    window.addEventListener('touchcancel', () => this.handlePointerUp());
  }

  public getPrisms: () => Prism[] = () => [];

  public updateHover(prisms: Prism[]): void {
    const hit = this.hitTest(this.mousePos, prisms);
    if (hit) {
      this.hoverPrismIndex = hit.idx;
      this.hoverHandle = hit.handle;
      this.canvas.style.cursor = hit.handle === 'body' ? 'move' : hit.handle === 'rot' ? 'grab' : 'pointer';
    } else {
      this.hoverPrismIndex = null;
      this.hoverHandle = null;
      this.canvas.style.cursor = 'default';
    }
  }

  private handlePointerDown(pos: Vec2, isRightClick: boolean, isTouch: boolean): void {
    initAudio();
    this.mousePos = pos;
    const prisms = this.getPrisms();
    const hit = this.hitTest(pos, prisms);

    if (hit) {
      this.selectedPrismIndex = hit.idx;
      const p = prisms[hit.idx];
      const mode = isRightClick || hit.handle === 'rot' ? 'rotate' : hit.handle === 'body' ? 'move' : hit.handle;

      if (mode === 'step-ccw' || mode === 'step-cw') {
        const delta = (mode === 'step-ccw' ? -0.5 : 0.5) * (Math.PI / 180);
        p.rot += delta;
        if (p.baseRot !== undefined) p.baseRot = p.rot;
        playPrismRotate(0.5);
        this.startStepAutoRepeat(delta, p);
      }

      this.dragState = {
        prismIndex: hit.idx,
        mode,
        dragOffset: mode === 'move'
          ? { x: p.pos.x - pos.x, y: p.pos.y - (isTouch ? pos.y - TOUCH_OFFSET_Y : pos.y) }
          : v2(0, 0),
        lastAngle: mode === 'rotate' ? Math.atan2(pos.y - p.pos.y, pos.x - p.pos.x) : 0,
        isTouch,
      };
      this.canvas.style.cursor = mode === 'rotate' ? 'grabbing' : mode === 'move' ? 'move' : 'pointer';
    } else {
      if (!prisms.some((p) => vDist(pos, p.pos) <= 115 * (p.scale || 1))) this.selectedPrismIndex = null;
    }

    this.updateHover(prisms);
    this.onStateChange?.();
  }

  private handlePointerMove(pos: Vec2, isTouch: boolean): void {
    this.mousePos = pos;
    const prisms = this.getPrisms();

    if (this.dragState.prismIndex !== null) {
      const p = prisms[this.dragState.prismIndex];
      if (p && !p.locked) {
        if (this.dragState.mode === 'move') {
          const y = isTouch ? pos.y - TOUCH_OFFSET_Y : pos.y;
          p.pos.x = clamp(pos.x + this.dragState.dragOffset.x, 60, 940);
          p.pos.y = clamp(y + this.dragState.dragOffset.y, 60, 940);
          if (p.basePos) { p.basePos.x = p.pos.x; p.basePos.y = p.pos.y; }
          playPrismMove(0.2);
        } else if (this.dragState.mode === 'rotate') {
          if (vDist(pos, p.pos) >= 10) {
            const cur = Math.atan2(pos.y - p.pos.y, pos.x - p.pos.x);
            let d = cur - this.dragState.lastAngle;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            p.rot += d;
            this.dragState.lastAngle = cur;
            if (p.baseRot !== undefined) p.baseRot = p.rot;
            playPrismRotate(Math.abs(d) * 8);
          }
        }
        this.onStateChange?.();
      }
    } else {
      this.updateHover(prisms);
    }
  }

  private handlePointerUp(): void {
    this.stopStepAutoRepeat();
    if (this.dragState.prismIndex !== null) {
      this.dragState = { prismIndex: null, mode: null, dragOffset: v2(0, 0), lastAngle: 0, isTouch: false };
      this.canvas.style.cursor = 'default';
      this.updateHover(this.getPrisms());
      this.onStateChange?.();
    }
  }
}
