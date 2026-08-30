import { Vec2, Prism } from './types';
import {
  v2,
  vDist,
  isPointInPolygon,
  getPrismVertices,
  clamp,
} from './math';
import { initAudio, playPrismRotate, playPrismMove } from './audio';

export interface DragState {
  prismIndex: number | null;
  mode: 'move' | 'rotate' | 'step-ccw' | 'step-cw' | null;
  dragOffset: Vec2;
  lastAngle: number;
  isTouch: boolean;
}

const TOUCH_DRAG_OFFSET_Y = 60; // World units offset upwards so finger does not cover pony & rays

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
    const rect = this.canvas.getBoundingClientRect();
    const side = Math.min(rect.width, rect.height) || 1000;
    const offsetX = (rect.width - side) / 2;
    const offsetY = (rect.height - side) / 2;
    return {
      x: (e.clientX - rect.left - offsetX) * (1000 / side),
      y: (e.clientY - rect.top - offsetY) * (1000 / side),
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
    if (this.repeatDelayTimer !== null) {
      clearTimeout(this.repeatDelayTimer);
      this.repeatDelayTimer = null;
    }
    if (this.repeatTimer !== null) {
      clearInterval(this.repeatTimer);
      this.repeatTimer = null;
    }
  }

  private initEvents(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) =>
      this.handlePointerDown(this.getCanvasPos(e), e.button === 2, false)
    );
    window.addEventListener('mousemove', (e) =>
      this.handlePointerMove(this.getCanvasPos(e), false)
    );
    window.addEventListener('mouseup', () => this.handlePointerUp());

    // Context menu prevent for right-drag rotation
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard arrow keys for fine positioning/nudging of the selected unicorn
    window.addEventListener('keydown', (e) => {
      if (this.selectedPrismIndex === null) return;
      const prisms = this.getPrisms();
      const prism = prisms[this.selectedPrismIndex];
      if (!prism || prism.locked) return;

      const step = e.shiftKey ? 1 : (e.ctrlKey || e.metaKey ? 6 : 2);
      let moved = false;

      if (e.key === 'ArrowLeft') {
        prism.pos.x = clamp(prism.pos.x - step, 60, 1000 - 60);
        moved = true;
      } else if (e.key === 'ArrowRight') {
        prism.pos.x = clamp(prism.pos.x + step, 60, 1000 - 60);
        moved = true;
      } else if (e.key === 'ArrowUp') {
        prism.pos.y = clamp(prism.pos.y - step, 60, 1000 - 60);
        moved = true;
      } else if (e.key === 'ArrowDown') {
        prism.pos.y = clamp(prism.pos.y + step, 60, 1000 - 60);
        moved = true;
      }

      if (moved) {
        e.preventDefault();
        initAudio();
        if (prism.basePos) {
          prism.basePos.x = prism.pos.x;
          prism.basePos.y = prism.pos.y;
        }
        playPrismMove(0.15);
        this.onStateChange?.();
      }
    });

    // Mouse wheel for fine rotation of selected/hovered horn
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        initAudio();
        const targetIdx =
          this.hoverPrismIndex !== null
            ? this.hoverPrismIndex
            : this.selectedPrismIndex;
        if (targetIdx !== null) {
          const delta = Math.sign(e.deltaY) * (Math.PI / 180) * 2; // 2 degrees per notch
          const prism = this.getPrisms()[targetIdx];
          if (prism && !prism.locked) {
            prism.rot += delta;
            if (prism.baseRot !== undefined) prism.baseRot = prism.rot;
            playPrismRotate(0.5);
            this.onStateChange?.();
          }
        }
      },
      { passive: false }
    );

    // Touch events with passive: false to prevent scrolling during gameplay
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          this.handlePointerDown(this.getCanvasPos(e.touches[0]), false, true);
        }
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          this.handlePointerMove(this.getCanvasPos(e.touches[0]), true);
        }
      },
      { passive: false }
    );

    window.addEventListener('touchend', () => this.handlePointerUp());
    window.addEventListener('touchcancel', () => this.handlePointerUp());
  }

  // Delegate function to retrieve current active prisms from game
  public getPrisms: () => Prism[] = () => [];

  public updateHover(prisms: Prism[]): void {
    this.hoverPrismIndex = null;
    this.hoverHandle = null;

    // Check selected prism first if available
    if (this.selectedPrismIndex !== null && prisms[this.selectedPrismIndex]) {
      const prism = prisms[this.selectedPrismIndex];
      if (!prism.locked) {
        const s = prism.scale || 1;
        const moveHandlePos = { x: prism.pos.x, y: prism.pos.y + 82 * s };
        const leftBtnPos = { x: prism.pos.x - 78 * s, y: prism.pos.y };
        const rightBtnPos = { x: prism.pos.x + 78 * s, y: prism.pos.y };

        const dLeft = vDist(this.mousePos, leftBtnPos);
        const dRight = vDist(this.mousePos, rightBtnPos);
        const dMove = vDist(this.mousePos, moveHandlePos);
        const dCenter = vDist(this.mousePos, prism.pos);

        // 1. Step rotation buttons (⟲ and ⟳)
        if (dLeft <= 18 * s) {
          this.hoverPrismIndex = this.selectedPrismIndex;
          this.hoverHandle = 'step-ccw';
          this.canvas.style.cursor = 'pointer';
          return;
        }
        if (dRight <= 18 * s) {
          this.hoverPrismIndex = this.selectedPrismIndex;
          this.hoverHandle = 'step-cw';
          this.canvas.style.cursor = 'pointer';
          return;
        }

        // 2. Move hit (bottom handle with generous hit radius or center body)
        if (dMove <= 34 * s || dCenter <= 38 * s || isPointInPolygon(this.mousePos, getPrismVertices(prism))) {
          this.hoverPrismIndex = this.selectedPrismIndex;
          this.hoverHandle = 'body';
          this.canvas.style.cursor = 'move';
          return;
        }

        // 3. Rotation Ring hit zone (outer halo band ~45*s to ~105*s)
        if (dCenter >= 45 * s && dCenter <= 105 * s) {
          this.hoverPrismIndex = this.selectedPrismIndex;
          this.hoverHandle = 'rot';
          this.canvas.style.cursor = 'grab';
          return;
        }
      }
    }

    // Check other unselected prisms
    for (let i = prisms.length - 1; i >= 0; i--) {
      const prism = prisms[i];
      if (prism.locked) continue;
      if (i === this.selectedPrismIndex) continue;

      const s = prism.scale || 1;
      const d = vDist(this.mousePos, prism.pos);
      const verts = getPrismVertices(prism);

      if (d <= 75 * s || isPointInPolygon(this.mousePos, verts)) {
        this.hoverPrismIndex = i;
        this.hoverHandle = 'body';
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    this.canvas.style.cursor = 'default';
  }

  private handlePointerDown(pos: Vec2, isRightClick: boolean, isTouch: boolean): void {
    initAudio();
    this.mousePos = pos;
    const prisms = this.getPrisms();

    let targetIdx: number | null = null;
    let mode: 'move' | 'rotate' | 'step-ccw' | 'step-cw' | null = null;

    // 1. Check if clicked within selected prism controls
    if (
      this.selectedPrismIndex !== null &&
      prisms[this.selectedPrismIndex] &&
      !prisms[this.selectedPrismIndex].locked
    ) {
      const prism = prisms[this.selectedPrismIndex];
      const s = prism.scale || 1;
      const moveHandlePos = { x: prism.pos.x, y: prism.pos.y + 82 * s };
      const leftBtnPos = { x: prism.pos.x - 78 * s, y: prism.pos.y };
      const rightBtnPos = { x: prism.pos.x + 78 * s, y: prism.pos.y };

      const dLeft = vDist(pos, leftBtnPos);
      const dRight = vDist(pos, rightBtnPos);
      const dMove = vDist(pos, moveHandlePos);
      const dCenter = vDist(pos, prism.pos);

      if (isRightClick) {
        if (dCenter <= 115 * s) {
          targetIdx = this.selectedPrismIndex;
          mode = 'rotate';
        }
      } else if (dLeft <= 18 * s) {
        // Tapped Step-CCW button ⟲ (-1 degree)
        targetIdx = this.selectedPrismIndex;
        mode = 'step-ccw';
        prism.rot -= (Math.PI / 180);
        if (prism.baseRot !== undefined) prism.baseRot = prism.rot;
        playPrismRotate(0.5);
        this.startStepAutoRepeat(-(Math.PI / 180), prism);
      } else if (dRight <= 18 * s) {
        // Tapped Step-CW button ⟳ (+1 degree)
        targetIdx = this.selectedPrismIndex;
        mode = 'step-cw';
        prism.rot += (Math.PI / 180);
        if (prism.baseRot !== undefined) prism.baseRot = prism.rot;
        playPrismRotate(0.5);
        this.startStepAutoRepeat(+(Math.PI / 180), prism);
      } else if (dMove <= 34 * s || dCenter <= 38 * s || isPointInPolygon(pos, getPrismVertices(prism))) {
        // Tapped move badge or center body
        targetIdx = this.selectedPrismIndex;
        mode = 'move';
      } else if (dCenter >= 45 * s && dCenter <= 110 * s) {
        // Tapped outer rotation ring
        targetIdx = this.selectedPrismIndex;
        mode = 'rotate';
      }
    }

    // 2. If not hitting selected prism, check if tapping any other prism
    if (targetIdx === null) {
      for (let i = prisms.length - 1; i >= 0; i--) {
        const prism = prisms[i];
        if (prism.locked) continue;
        const s = prism.scale || 1;
        const d = vDist(pos, prism.pos);

        if (d <= 75 * s || isPointInPolygon(pos, getPrismVertices(prism))) {
          this.selectedPrismIndex = i;
          targetIdx = i;
          mode = isRightClick ? 'rotate' : 'move';
          break;
        }
      }
    }

    // 3. If tapped empty space far away from any prism, deselect
    if (targetIdx === null) {
      let nearAny = false;
      for (const p of prisms) {
        if (vDist(pos, p.pos) <= 115 * (p.scale || 1)) {
          nearAny = true;
          break;
        }
      }
      if (!nearAny) {
        this.selectedPrismIndex = null;
      }
    }

    // 4. Initialize drag state if an action was triggered
    if (targetIdx !== null && mode !== null) {
      const prism = prisms[targetIdx];
      this.selectedPrismIndex = targetIdx;

      if (mode === 'rotate') {
        const currentAngle = Math.atan2(pos.y - prism.pos.y, pos.x - prism.pos.x);
        this.dragState = {
          prismIndex: targetIdx,
          mode: 'rotate',
          dragOffset: v2(0, 0),
          lastAngle: currentAngle,
          isTouch,
        };
        this.canvas.style.cursor = 'grabbing';
      } else if (mode === 'move') {
        const effectiveY = isTouch ? pos.y - TOUCH_DRAG_OFFSET_Y : pos.y;
        this.dragState = {
          prismIndex: targetIdx,
          mode: 'move',
          dragOffset: { x: prism.pos.x - pos.x, y: prism.pos.y - effectiveY },
          lastAngle: 0,
          isTouch,
        };
        this.canvas.style.cursor = 'move';
      } else {
        // step-ccw or step-cw
        this.dragState = {
          prismIndex: targetIdx,
          mode,
          dragOffset: v2(0, 0),
          lastAngle: 0,
          isTouch,
        };
        this.canvas.style.cursor = 'pointer';
      }
    }

    this.updateHover(prisms);
    this.onStateChange?.();
  }

  private handlePointerMove(pos: Vec2, isTouch: boolean): void {
    this.mousePos = pos;
    const prisms = this.getPrisms();

    if (this.dragState.prismIndex !== null) {
      const prism = prisms[this.dragState.prismIndex];
      if (prism && !prism.locked) {
        if (this.dragState.mode === 'move') {
          const effectiveY = this.dragState.isTouch
            ? pos.y - TOUCH_DRAG_OFFSET_Y
            : pos.y;
          prism.pos.x = clamp(pos.x + this.dragState.dragOffset.x, 60, 1000 - 60);
          prism.pos.y = clamp(effectiveY + this.dragState.dragOffset.y, 60, 1000 - 60);
          if (prism.basePos) {
            prism.basePos.x = prism.pos.x;
            prism.basePos.y = prism.pos.y;
          }
          playPrismMove(0.2);
        } else if (this.dragState.mode === 'rotate') {
          const dFromCenter = vDist(pos, prism.pos);
          if (dFromCenter >= 10) {
            const currentAngle = Math.atan2(pos.y - prism.pos.y, pos.x - prism.pos.x);
            let dTheta = currentAngle - this.dragState.lastAngle;
            // Normalize delta to (-PI, PI] to handle crossing the -PI/PI branch cut seamlessly
            while (dTheta > Math.PI) dTheta -= Math.PI * 2;
            while (dTheta < -Math.PI) dTheta += Math.PI * 2;

            prism.rot += dTheta;
            this.dragState.lastAngle = currentAngle;

            if (prism.baseRot !== undefined) {
              prism.baseRot = prism.rot;
            }
            playPrismRotate(Math.abs(dTheta) * 8);
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
      this.dragState = {
        prismIndex: null,
        mode: null,
        dragOffset: v2(0, 0),
        lastAngle: 0,
        isTouch: false,
      };
      this.canvas.style.cursor = 'default';
      this.updateHover(this.getPrisms());
      this.onStateChange?.();
    }
  }
}
