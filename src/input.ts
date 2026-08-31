import { Vec2, Prism } from './types';
import { v2 } from './math';
import { initAudio, playPrismRotate, playPrismMove } from './audio';

const { hypot, min, max, atan2, abs, PI } = Math;

const H_BODY = 'body', H_ROT = 'rot', H_CCW = 'step-ccw', H_CW = 'step-cw';
const M_MOVE = 'move', M_ROTATE = 'rotate';
const C_POINTER = 'pointer', C_DEFAULT = 'default';

export interface DragState {
  prismIndex: number | null;
  mode: 'move' | 'rotate' | 'step-ccw' | 'step-cw' | null;
  dragOffset: Vec2;
  lastAngle: number;
  isTouch: boolean;
}

const TOUCH_OFFSET_Y = 60;

export function createInput(canvas: HTMLCanvasElement, onStateChange?: () => void) {
  let mousePos: Vec2 = v2(0, 0);
  let selectedPrismIndex: number | null = null;
  let dragState: DragState = {
    prismIndex: null,
    mode: null,
    dragOffset: v2(0, 0),
    lastAngle: 0,
    isTouch: false,
  };
  let hoverPrismIndex: number | null = null;
  let hoverHandle: 'body' | 'rot' | 'step-ccw' | 'step-cw' | null = null;
  let repeatTimer: number | null = null;
  let repeatDelayTimer: number | null = null;
  let getPrisms: () => Prism[] = () => [];

  const getCanvasPos = (e: MouseEvent | Touch): Vec2 => {
    const r = canvas.getBoundingClientRect();
    const s = min(r.width, r.height) || 1000;
    return v2(
      (e.clientX - r.left - (r.width - s) / 2) * (1000 / s),
      (e.clientY - r.top - (r.height - s) / 2) * (1000 / s)
    );
  };

  const stopStepAutoRepeat = (): void => {
    if (repeatDelayTimer !== null) { clearTimeout(repeatDelayTimer); repeatDelayTimer = null; }
    if (repeatTimer !== null) { clearInterval(repeatTimer); repeatTimer = null; }
  };

  const startStepAutoRepeat = (deltaRad: number, prism: Prism): void => {
    stopStepAutoRepeat();
    repeatDelayTimer = window.setTimeout(() => {
      repeatTimer = window.setInterval(() => {
        if (prism && !prism.locked) {
          prism.rot += deltaRad;
          if (prism.baseRot !== undefined) prism.baseRot = prism.rot;
          playPrismRotate(0.25);
          onStateChange?.();
        }
      }, 70);
    }, 280);
  };

  // OPTIMIZATION (RADIAL HIT TESTING):
  // Rather than iterating polygon edges with ray-casting point-in-polygon math,
  // we compute radial distances against interactive handle centers (body, rot ring, step buttons).
  // This is computationally lighter, executes faster during mousemove, and provides smoother, more forgiving touch hitboxes.
  const hitTest = (pos: Vec2, prisms: Prism[]): { idx: number; handle: 'body' | 'rot' | 'step-ccw' | 'step-cw' } | null => {
    if (selectedPrismIndex !== null && prisms[selectedPrismIndex]) {
      const p = prisms[selectedPrismIndex];
      if (!p.locked) {
        const s = p.scale || 1, px = p.pos.x, py = p.pos.y;
        if (hypot(pos.x - (px - 78 * s), pos.y - py) <= 18 * s) return { idx: selectedPrismIndex, handle: H_CCW };
        if (hypot(pos.x - (px + 78 * s), pos.y - py) <= 18 * s) return { idx: selectedPrismIndex, handle: H_CW };
        const dCenter = hypot(pos.x - px, pos.y - py);
        if (hypot(pos.x - px, pos.y - (py + 82 * s)) <= 34 * s || dCenter <= 40 * s) {
          return { idx: selectedPrismIndex, handle: H_BODY };
        }
        if (dCenter >= 45 * s && dCenter <= 110 * s) return { idx: selectedPrismIndex, handle: H_ROT };
      }
    }

    for (let i = prisms.length - 1; i >= 0; i--) {
      const p = prisms[i];
      if (p.locked || i === selectedPrismIndex) continue;
      if (hypot(pos.x - p.pos.x, pos.y - p.pos.y) <= 75 * (p.scale || 1)) return { idx: i, handle: H_BODY };
    }
    return null;
  };

  const updateHover = (prisms: Prism[]): void => {
    const hit = hitTest(mousePos, prisms);
    hoverPrismIndex = hit ? hit.idx : null;
    hoverHandle = hit ? hit.handle : null;
    canvas.style.cursor = !hit ? C_DEFAULT : hit.handle === H_BODY ? M_MOVE : hit.handle === H_ROT ? 'grab' : C_POINTER;
  };

  const handlePointerDown = (pos: Vec2, isRightClick: boolean, isTouch: boolean): void => {
    initAudio();
    mousePos = pos;
    const prisms = getPrisms();
    const hit = hitTest(pos, prisms);

    if (hit) {
      selectedPrismIndex = hit.idx;
      const p = prisms[hit.idx];
      const mode = isRightClick || hit.handle === H_ROT ? M_ROTATE : hit.handle === H_BODY ? M_MOVE : hit.handle;

      if (mode === H_CCW || mode === H_CW) {
        const delta = (mode === H_CCW ? -0.5 : 0.5) * (PI / 180);
        p.rot += delta;
        if (p.baseRot !== undefined) p.baseRot = p.rot;
        playPrismRotate(0.5);
        startStepAutoRepeat(delta, p);
      }

      dragState = {
        prismIndex: hit.idx,
        mode,
        dragOffset: mode === M_MOVE
          ? v2(p.pos.x - pos.x, p.pos.y - (isTouch ? pos.y - TOUCH_OFFSET_Y : pos.y))
          : v2(0, 0),
        lastAngle: mode === M_ROTATE ? atan2(pos.y - p.pos.y, pos.x - p.pos.x) : 0,
        isTouch,
      };
      canvas.style.cursor = mode === M_ROTATE ? 'grabbing' : mode === M_MOVE ? M_MOVE : C_POINTER;
    } else {
      if (!prisms.some((p) => hypot(pos.x - p.pos.x, pos.y - p.pos.y) <= 115 * (p.scale || 1))) selectedPrismIndex = null;
    }

    updateHover(prisms);
    onStateChange?.();
  };

  const handlePointerMove = (pos: Vec2, isTouch: boolean): void => {
    mousePos = pos;
    const prisms = getPrisms();

    if (dragState.prismIndex !== null) {
      const p = prisms[dragState.prismIndex];
      if (p && !p.locked) {
        if (dragState.mode === M_MOVE) {
          const y = isTouch ? pos.y - TOUCH_OFFSET_Y : pos.y;
          p.pos.x = max(60, min(940, pos.x + dragState.dragOffset.x));
          p.pos.y = max(60, min(940, y + dragState.dragOffset.y));
          if (p.basePos) { p.basePos.x = p.pos.x; p.basePos.y = p.pos.y; }
          playPrismMove(0.2);
        } else if (dragState.mode === M_ROTATE) {
          let d = (atan2(pos.y - p.pos.y, pos.x - p.pos.x) - dragState.lastAngle + 3 * PI) % (2 * PI) - PI;
          p.rot += d;
          dragState.lastAngle += d;
          if (p.baseRot !== undefined) p.baseRot = p.rot;
          playPrismRotate(abs(d) * 8);
        }
        onStateChange?.();
      }
    } else {
      updateHover(prisms);
    }
  };

  const handlePointerUp = (): void => {
    stopStepAutoRepeat();
    if (dragState.prismIndex !== null) {
      dragState = { prismIndex: null, mode: null, dragOffset: v2(0, 0), lastAngle: 0, isTouch: false };
      canvas.style.cursor = C_DEFAULT;
      updateHover(getPrisms());
      onStateChange?.();
    }
  };

  const on = (t: EventTarget, ev: string, fn: any, opts?: any) => t.addEventListener(ev, fn, opts);

  on(canvas, 'mousedown', (e: MouseEvent) => handlePointerDown(getCanvasPos(e), e.button === 2, false));
  on(window, 'mousemove', (e: MouseEvent) => handlePointerMove(getCanvasPos(e), false));
  on(window, 'mouseup', handlePointerUp);
  on(canvas, 'contextmenu', (e: MouseEvent) => e.preventDefault());

  /* JS13K OPTIMIZATION: Keyboard arrow nudging & shift/ctrl step modifiers
     Commented out to reduce bundle size. Mouse/touch drag controls and on-screen
     step buttons (↺ ↻) provide full, intuitive positioning and angle steering without needing keyboard shortcuts.
  window.addEventListener('keydown', (e) => {
    if (selectedPrismIndex === null) return;
    const p = getPrisms()[selectedPrismIndex];
    if (!p || p.locked) return;

    const step = e.shiftKey ? 1 : e.ctrlKey || e.metaKey ? 6 : 2;
    const k = e.key;
    const dx = k === 'ArrowRight' ? step : k === 'ArrowLeft' ? -step : 0;
    const dy = k === 'ArrowDown' ? step : k === 'ArrowUp' ? -step : 0;
    if (dx || dy) {
      p.pos.x = clamp(p.pos.x + dx, 60, 940);
      p.pos.y = clamp(p.pos.y + dy, 60, 940);
      e.preventDefault();
      initAudio();
      if (p.basePos) { p.basePos.x = p.pos.x; p.basePos.y = p.pos.y; }
      playPrismMove(0.15);
      onStateChange?.();
    }
  });
  */

  /* JS13K OPTIMIZATION: Mouse wheel rotation handler
     Commented out to save bytes. Rotation is cleanly handled by dragging the rotation ring or clicking step buttons.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    initAudio();
    const idx = hoverPrismIndex ?? selectedPrismIndex;
    if (idx !== null) {
      const p = getPrisms()[idx];
      if (p && !p.locked) {
        p.rot += sign(e.deltaY) * (PI / 90);
        if (p.baseRot !== undefined) p.baseRot = p.rot;
        playPrismRotate(0.5);
        onStateChange?.();
      }
    }
  }, { passive: false });
  */

  const onTouch = (e: TouchEvent, isMove = false) => {
    if (e.touches[0]) (isMove ? handlePointerMove : handlePointerDown)(getCanvasPos(e.touches[0]), false, true);
  };
  on(canvas, 'touchstart', (e: TouchEvent) => { e.preventDefault(); onTouch(e); }, { passive: false });
  on(window, 'touchmove', (e: TouchEvent) => onTouch(e, true), { passive: false });
  on(window, 'touchend', handlePointerUp);
  on(window, 'touchcancel', handlePointerUp);

  return {
    getSelected: () => selectedPrismIndex,
    setSelected: (v: number | null) => { selectedPrismIndex = v; },
    getDragState: () => dragState,
    getHoverIndex: () => hoverPrismIndex,
    getHoverHandle: () => hoverHandle,
    setGetPrisms: (fn: () => Prism[]) => { getPrisms = fn; },
    updateHover,
  };
}
