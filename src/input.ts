import { Vec2, Prism } from './types';
import { v2, vDist, clamp } from './math';
import { initAudio, playPrismRotate, playPrismMove } from './audio';

const { min, atan2, abs, sign, PI } = Math;

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
        const s = p.scale || 1;
        if (vDist(pos, v2(p.pos.x - 78 * s, p.pos.y)) <= 18 * s) return { idx: selectedPrismIndex, handle: 'step-ccw' };
        if (vDist(pos, v2(p.pos.x + 78 * s, p.pos.y)) <= 18 * s) return { idx: selectedPrismIndex, handle: 'step-cw' };
        const dCenter = vDist(pos, p.pos);
        if (vDist(pos, v2(p.pos.x, p.pos.y + 82 * s)) <= 34 * s || dCenter <= 40 * s) {
          return { idx: selectedPrismIndex, handle: 'body' };
        }
        if (dCenter >= 45 * s && dCenter <= 110 * s) return { idx: selectedPrismIndex, handle: 'rot' };
      }
    }

    for (let i = prisms.length - 1; i >= 0; i--) {
      const p = prisms[i];
      if (p.locked || i === selectedPrismIndex) continue;
      if (vDist(pos, p.pos) <= 75 * (p.scale || 1)) return { idx: i, handle: 'body' };
    }
    return null;
  };

  const updateHover = (prisms: Prism[]): void => {
    const hit = hitTest(mousePos, prisms);
    hoverPrismIndex = hit ? hit.idx : null;
    hoverHandle = hit ? hit.handle : null;
    canvas.style.cursor = !hit ? 'default' : hit.handle === 'body' ? 'move' : hit.handle === 'rot' ? 'grab' : 'pointer';
  };

  const handlePointerDown = (pos: Vec2, isRightClick: boolean, isTouch: boolean): void => {
    initAudio();
    mousePos = pos;
    const prisms = getPrisms();
    const hit = hitTest(pos, prisms);

    if (hit) {
      selectedPrismIndex = hit.idx;
      const p = prisms[hit.idx];
      const mode = isRightClick || hit.handle === 'rot' ? 'rotate' : hit.handle === 'body' ? 'move' : hit.handle;

      if (mode === 'step-ccw' || mode === 'step-cw') {
        const delta = (mode === 'step-ccw' ? -0.5 : 0.5) * (PI / 180);
        p.rot += delta;
        if (p.baseRot !== undefined) p.baseRot = p.rot;
        playPrismRotate(0.5);
        startStepAutoRepeat(delta, p);
      }

      dragState = {
        prismIndex: hit.idx,
        mode,
        dragOffset: mode === 'move'
          ? v2(p.pos.x - pos.x, p.pos.y - (isTouch ? pos.y - TOUCH_OFFSET_Y : pos.y))
          : v2(0, 0),
        lastAngle: mode === 'rotate' ? atan2(pos.y - p.pos.y, pos.x - p.pos.x) : 0,
        isTouch,
      };
      canvas.style.cursor = mode === 'rotate' ? 'grabbing' : mode === 'move' ? 'move' : 'pointer';
    } else {
      if (!prisms.some((p) => vDist(pos, p.pos) <= 115 * (p.scale || 1))) selectedPrismIndex = null;
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
        if (dragState.mode === 'move') {
          const y = isTouch ? pos.y - TOUCH_OFFSET_Y : pos.y;
          p.pos.x = clamp(pos.x + dragState.dragOffset.x, 60, 940);
          p.pos.y = clamp(y + dragState.dragOffset.y, 60, 940);
          if (p.basePos) { p.basePos.x = p.pos.x; p.basePos.y = p.pos.y; }
          playPrismMove(0.2);
        } else if (dragState.mode === 'rotate') {
          if (vDist(pos, p.pos) >= 10) {
            const cur = atan2(pos.y - p.pos.y, pos.x - p.pos.x);
            let d = cur - dragState.lastAngle;
            while (d > PI) d -= PI * 2;
            while (d < -PI) d += PI * 2;
            p.rot += d;
            dragState.lastAngle = cur;
            if (p.baseRot !== undefined) p.baseRot = p.rot;
            playPrismRotate(abs(d) * 8);
          }
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
      canvas.style.cursor = 'default';
      updateHover(getPrisms());
      onStateChange?.();
    }
  };

  canvas.addEventListener('mousedown', (e) => handlePointerDown(getCanvasPos(e), e.button === 2, false));
  window.addEventListener('mousemove', (e) => handlePointerMove(getCanvasPos(e), false));
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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

  const onTouch = (e: TouchEvent, isMove = false) => {
    if (e.touches[0]) (isMove ? handlePointerMove : handlePointerDown)(getCanvasPos(e.touches[0]), false, true);
  };
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onTouch(e); }, { passive: false });
  window.addEventListener('touchmove', (e) => onTouch(e, true), { passive: false });
  window.addEventListener('touchend', handlePointerUp);
  window.addEventListener('touchcancel', handlePointerUp);

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
