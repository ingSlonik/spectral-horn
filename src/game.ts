import { LevelDef, Prism, Target } from './types';
import { LEVELS, TITLE_SCENE } from './levels';
import { traceScene } from './raytracer';
import { createRenderer } from './renderer';
import { createInput } from './input';
import {
  initAudio,
  playVictory,
  playSensorPulse,
  playClick,
  toggleMusic,
  toggleSfx,
} from './audio';

const { sin, min, max, round, PI } = Math;

// OPTIMIZATION: Short localStorage key + Set for deduplicating cleared level indices
const STORAGE_KEY = 'sh_clr';
const getCleared = (): number[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const markCleared = (idx: number) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...getCleared(), idx])])); } catch {}
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const updateViewport = () => {
  const m = $<HTMLMetaElement>('vpmeta');
  if (m && window.screen) {
    m['content'] = screen.width >= 700 ? 'width=device-width,initial-scale=1' : 'width=700';
  }
};

export function initGame(): void {
  updateViewport();
  const canvas = $<HTMLCanvasElement>('c');
  const ctx = canvas.getContext('2d')!;
  const renderer = createRenderer(ctx);

  let isTitleScreen = true;
  let currentLevelIdx = 0;
  let level: LevelDef;
  let prisms: Prism[] = [];
  let targets: Target[] = [];
  let isLevelComplete = false;
  let winDelay = 0;

  // DOM Elements
  const elLevelTitle = $('lvl-title');
  const elLevelHint = $('lvl-hint');
  const elLevelSelect = $<HTMLSelectElement>('lvl-select');
  const elWinModal = $('win-modal');
  const elWinTitle = $('win-title');
  const elWinDesc = $('win-desc');
  const elHelpModal = $('help-modal');
  const elNextBtn = $<HTMLButtonElement>('next-btn');
  const elTitleScreen = $('title-screen');

  const cardsHtml = [
    ['🎮 Horn Controls & Steering', 'card-horn-c', [
      ['cyan', '💫 Orbit Drag Ring', 'Drag outer ring to rotate horn'],
      ['gold', '↺ ↻ Step Buttons', 'Click for precise 0.5° angle nudges'],
      ['green', '✥ Drag Body', 'Move unicorn position across canvas'],
    ]],
    ['🎯 Target Sensors: Objective', 'card-sensor-c', [
      ['green', '🌈 Target Spectrum (λ)', 'Sensor demands exact color/wavelength'],
      ['cyan', '🔬 Sensor Photodiode', 'Split white light & aim matching beam into lens'],
      ['gold', '🏆 Charge to 100%', 'Hold steady beam until locked — charge all to win!'],
    ]],
  ].map(([hdr, cid, lbs]) => `
    <div class="glass-card">
      <div class="card-header">${hdr}</div>
      <div class="card-body">
        <canvas id="${cid}" class="card-canvas" width="160" height="175"></canvas>
        <div class="card-labels">
          ${(lbs as string[][]).map(([c, h, s]) => `<div class="card-lb ${c}"><div class="th">${h}</div><div class="ts">${s}</div></div>`).join('')}
        </div>
      </div>
    </div>
  `).join('');

  ['title-cards-container', 'modal-cards-container'].forEach((id) => {
    const el = $(id);
    if (el) el.innerHTML = cardsHtml;
  });

  let cachedBounds = {
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 1000,
    width: 1000,
    height: 1000,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dpr: 1,
  };

  const input = createInput(canvas);
  input.setGetPrisms(() => prisms);

  const resizeCanvas = (): void => {
    const dpr = min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const targetW = round(rect.width * dpr);
    const targetH = round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const side = min(rect.width, rect.height) || 1000;
    const offsetX = (rect.width - side) / 2;
    const offsetY = (rect.height - side) / 2;
    const scale = side / 1000;

    cachedBounds = {
      minX: -offsetX / scale,
      minY: -offsetY / scale,
      maxX: 1000 + offsetX / scale,
      maxY: 1000 + offsetY / scale,
      width: (1000 + 2 * offsetX) / scale,
      height: (1000 + 2 * offsetY) / scale,
      scale,
      offsetX,
      offsetY,
      dpr,
    };
  };

  const populateLevelSelect = (): void => {
    const cleared = new Set(getCleared());
    elLevelSelect.innerHTML = LEVELS.map(
      (lvl, idx) => `<option value="${idx}" style="color:${cleared.has(idx) ? '#4ade80' : '#cbd5e1'}">${cleared.has(idx) ? '✓' : '○'} ${lvl.title}</option>`
    ).join('');
    elLevelSelect.value = `${currentLevelIdx}`;
  };

  const clonePrisms = (list: Prism[]) =>
    list.map((p) => ({ ...p, pos: { ...p.pos }, basePos: p.basePos ? { ...p.basePos } : undefined }));

  const setHidden = (el: HTMLElement, hide = true) => el.classList.toggle('hidden', hide);

  const showTitleScreen = (): void => {
    isTitleScreen = true;
    document.body.classList.add('is-title');
    prisms = clonePrisms(TITLE_SCENE.prisms);
    targets = [];
    isLevelComplete = false;
    winDelay = 0;
    input.setSelected(0);

    setHidden(elTitleScreen, false);
    setHidden(elWinModal);
    setHidden(elHelpModal);

    elLevelTitle.textContent = '✨ Cosmic Sandbox';
    elLevelHint.textContent = 'Where photons collide and unicorns test optics. Drag and twist freely!';
    populateLevelSelect();
  };

  const loadLevel = (idx: number): void => {
    isTitleScreen = false;
    document.body.classList.remove('is-title');
    setHidden(elTitleScreen);
    setHidden(elHelpModal);
    currentLevelIdx = max(0, min(LEVELS.length - 1, idx));
    level = LEVELS[currentLevelIdx];

    prisms = clonePrisms(level.prisms);
    targets = level.targets.map((t) => ({ ...t, pos: { ...t.pos } }));

    const firstMovable = prisms.findIndex((p) => !p.locked);
    input.setSelected(firstMovable !== -1 ? firstMovable : null);

    isLevelComplete = false;
    winDelay = 0;
    setHidden(elWinModal);

    elLevelTitle.textContent = level.title;
    elLevelHint.textContent = level.hint;
    populateLevelSelect();
  };

  const setupUI = (): void => {
    populateLevelSelect();

    // OPTIMIZATION: '{ once: true }' automatically unbinds the listener after first user gesture,
    // avoiding the need for manual 'window.removeEventListener(...)' boilerplate.
    const triggerAudio = () => initAudio();
    window.addEventListener('pointerdown', triggerAudio, { once: true });
    window.addEventListener('keydown', triggerAudio, { once: true });

    const bindClick = (id: string, action: () => void) => {
      $(id).addEventListener('click', () => {
        initAudio();
        playClick();
        action();
      });
    };

    elLevelSelect.addEventListener('change', (e) => {
      initAudio();
      playClick();
      loadLevel(parseInt((e.target as HTMLSelectElement).value, 10));
    });

    bindClick('reset-btn', () => (isTitleScreen ? showTitleScreen() : loadLevel(currentLevelIdx)));
    bindClick('menu-btn', () => showTitleScreen());
    bindClick('play-btn', () => loadLevel(currentLevelIdx));
    const toggleBtn = (id: string, fn: () => boolean, iconOn: string, label: string) => {
      bindClick(id, () => {
        $(id).innerHTML = `${fn() ? '🔇' : iconOn}<span class="btn-text"> ${label}</span>`;
      });
    };
    toggleBtn('music-btn', toggleMusic, '🎵', 'Music');
    toggleBtn('sfx-btn', toggleSfx, '🔊', 'SFX');
    bindClick('help-btn', () => setHidden(elHelpModal, false));
    bindClick('help-close-btn', () => setHidden(elHelpModal));
    bindClick('next-btn', () => {
      setHidden(elWinModal);
      loadLevel((currentLevelIdx + 1) % LEVELS.length);
    });
  };

  setupUI();
  showTitleScreen();
  const onResize = () => { updateViewport(); resizeCanvas(); };
  onResize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  const update = (time: number): void => {
    renderer.updateDust(time);

    if (isTitleScreen) {
      for (let i = 0; i < prisms.length; i++) {
        const prism = prisms[i];
        if (input.getDragState().prismIndex !== i) {
          const phase = prism.swayPhase ?? i * PI;
          const baseRot = prism.baseRot ?? prism.rot;
          const baseY = prism.basePos ? prism.basePos.y : prism.pos.y;
          prism.rot = baseRot + sin(time * 0.0018 + phase) * 0.05;
          prism.pos.y = baseY + sin(time * 0.0022 + phase) * 3.5;
        }
      }
    }
  };

  const render = (dt: number, time: number): void => {
    const bounds = cachedBounds;
    const dpr = bounds.dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderer.clear(ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(bounds.offsetX * dpr, bounds.offsetY * dpr);
    ctx.scale(bounds.scale * dpr, bounds.scale * dpr);

    renderer.renderSquareBounds(1000);

    const hoverIdx = input.getHoverIndex();
    const hoverHandle = input.getHoverHandle();
    const dragState = input.getDragState();
    const selIdx = input.getSelected();

    const drawPrisms = () => {
      for (let i = 0; i < prisms.length; i++) {
        renderer.renderPrism(
          prisms[i],
          hoverIdx === i,
          dragState.prismIndex === i,
          hoverIdx === i ? hoverHandle : null,
          time,
          selIdx === i,
          dragState.prismIndex === i ? dragState.mode : null
        );
      }
    };

    // OPTIMIZATION: Unified render pipeline between Title Screen and Level gameplay.
    // Instead of two separate duplicated blocks running traceScene, renderRays, and renderDust,
    // we parameterize input objects (curEmitters, curObstacles) to execute a single shared pass.
    const curEmitters = isTitleScreen ? TITLE_SCENE.emitters : level.emitter;
    const curObstacles = isTitleScreen ? [] : level.obstacles;

    curObstacles.forEach(renderer.renderObstacle);
    renderer.renderEmitters(curEmitters, time);
    drawPrisms();

    const traceResult = traceScene(curEmitters, prisms, curObstacles, targets);
    renderer.renderRays(traceResult.rays, bounds);
    renderer.renderDust(traceResult.segments, time);

    if (isTitleScreen || !elHelpModal.classList.contains('hidden')) {
      renderer.renderCardPreview(time);
    }

    if (isTitleScreen) {
      renderer.renderParticles();
      ctx.restore();
      return;
    }

    let allSatisfied = true;

    for (const target of targets) {
      const hitStats = traceResult.targetHits.get(target.id);
      const isMatch = !!hitStats?.isMatch;
      const hasLight = !!hitStats?.hasLight;

      target.sampledRgb = hitStats?.sampledRgb || [0, 0, 0];
      target.isColorMatching = isMatch;
      target.hasLight = hasLight;

      target.charge = isMatch
        ? min(1.0, target.charge + dt * 1.5)
        : max(0, target.charge - dt * (hasLight ? 1.2 : 0.7));
      target.isSatisfied = isMatch && target.charge >= 0.95;
      if (isMatch) playSensorPulse(target.charge);
      if (!target.isSatisfied) allSatisfied = false;
    }

    targets.forEach((t) => renderer.renderTarget(t, time));

    if (allSatisfied && !isLevelComplete) {
      winDelay += dt;
      if (winDelay > 0.4) {
        isLevelComplete = true;
        markCleared(currentLevelIdx);
        populateLevelSelect();
        playVictory();
        const isLast = currentLevelIdx === LEVELS.length - 1;
        elWinTitle.textContent = isLast ? '✨ MASTER OF PHOTONS! ✨' : '✨ LEVEL COMPLETE! ✨';
        elWinDesc.textContent = isLast
          ? 'You synthesized every wavelength in the cosmos!'
          : 'All spectral sensors charged. Photons tamed... for now.';
        elNextBtn.textContent = isLast ? 'Play Again ↺' : 'Next Experiment ➔';
        setHidden(elWinModal, false);
      }
    } else if (!allSatisfied) {
      winDelay = 0;
    }

    renderer.renderParticles();
    ctx.restore();
  };

  let lastTime = performance.now();
  const loop = (time: number) => {
    const dt = min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    update(time);
    render(dt, time);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', initGame);
