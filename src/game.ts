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
const STORAGE_KEY = 'sh';
const getCleared = (): number[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const markCleared = (idx: number) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...getCleared(), idx])])); } catch { }
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const updateViewport = () => {
  const m = $<HTMLMetaElement>('m');
  if (m && window.screen) {
    m.content = screen.width >= 700 ? 'width=device-width,initial-scale=1' : 'width=700';
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

  // DOM Elements & Child Index Mapping:
  // Header: <header> contains [0: Logo <div class="l">, 1: Level select <select>, 2: Menu btn, 3: Reset btn, 4: Help btn, 5: Music btn, 6: SFX btn]
  const headerChildren = document.querySelector('header')!.children;
  const elLevelSelect = headerChildren[1] as HTMLSelectElement;
  const btnMenu = headerChildren[2] as HTMLButtonElement;
  const btnReset = headerChildren[3] as HTMLButtonElement;
  const btnHelp = headerChildren[4] as HTMLButtonElement;
  const btnMusic = headerChildren[5] as HTMLButtonElement;
  const btnSfx = headerChildren[6] as HTMLButtonElement;

  // Footer: <footer> contains [0: Level title <b>, 1: Level hint <span>]
  const footerChildren = document.querySelector('footer')!.children;
  const elLevelTitle = footerChildren[0] as HTMLElement;
  const elLevelHint = footerChildren[1] as HTMLElement;

  // Title screen: #ts container and play button (.bp)
  const elTitleScreen = $('ts');
  const btnPlay = elTitleScreen.querySelector('button')!;

  // Help modal: #hm container and close button (.b1)
  const elHelpModal = $('hm');
  const btnHelpClose = elHelpModal.querySelector('button')!;

  // Win modal: #wm container. Modal box (.mb) contains [0: Title (.mt), 1: Description (<p>), 2: Next button (.b1)]
  const elWinModal = $('wm');
  const winBoxChildren = elWinModal.firstElementChild!.children;
  const elWinTitle = winBoxChildren[0] as HTMLElement;
  const elWinDesc = winBoxChildren[1] as HTMLElement;
  const elNextBtn = winBoxChildren[2] as HTMLButtonElement;

  let cachedBounds = {
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

    cachedBounds = { scale, offsetX, offsetY, dpr };
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

  const setHidden = (el: HTMLElement, hide = true) => el.classList.toggle('h', hide);

  const showTitleScreen = (): void => {
    isTitleScreen = true;
    document.body.classList.add('t');
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
    document.body.classList.remove('t');
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

  const on = (t: EventTarget, ev: string, fn: any, opts?: any) => t.addEventListener(ev, fn, opts);

  const setupUI = (): void => {
    populateLevelSelect();

    const triggerAudio = () => initAudio();
    on(window, 'pointerdown', triggerAudio, { once: true });
    on(window, 'keydown', triggerAudio, { once: true });

    const bindClick = (btn: HTMLElement, action: () => void) => {
      on(btn, 'click', () => {
        initAudio();
        playClick();
        action();
      });
    };

    on(elLevelSelect, 'change', () => {
      initAudio();
      playClick();
      loadLevel(parseInt(elLevelSelect.value, 10));
    });

    bindClick(btnReset, () => (isTitleScreen ? showTitleScreen() : loadLevel(currentLevelIdx)));
    bindClick(btnMenu, () => showTitleScreen());
    bindClick(btnPlay, () => loadLevel(currentLevelIdx));
    const toggleBtn = (btn: HTMLElement, fn: () => boolean, iconOn: string, label: string) => {
      bindClick(btn, () => {
        btn.innerHTML = `${fn() ? '🔇' : iconOn}<b> ${label}</b>`;
      });
    };
    toggleBtn(btnMusic, toggleMusic, '🎵', 'Music');
    toggleBtn(btnSfx, toggleSfx, '🔊', 'SFX');
    bindClick(btnHelp, () => {
      $('htc').innerHTML = $('ts').querySelector('.tc')!.innerHTML;
      setHidden(elHelpModal, false);
    });
    bindClick(btnHelpClose, () => setHidden(elHelpModal));
    bindClick(elNextBtn, () => {
      setHidden(elWinModal);
      loadLevel((currentLevelIdx + 1) % LEVELS.length);
    });
  };

  setupUI();
  showTitleScreen();
  const onResize = () => { updateViewport(); resizeCanvas(); };
  onResize();
  on(window, 'resize', onResize);
  on(window, 'orientationchange', onResize);

  const update = (time: number): void => {
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
    renderer.clear();

    ctx.save();
    ctx.translate(bounds.offsetX * dpr, bounds.offsetY * dpr);
    ctx.scale(bounds.scale * dpr, bounds.scale * dpr);

    renderer.renderSquareBounds();

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

    if (isTitleScreen || !elHelpModal.classList.contains('h')) {
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
      const isMatch = target.isColorMatching = !!hitStats?.isMatch;
      const hasLight = target.hasLight = !!hitStats?.hasLight;
      target.sampledRgb = hitStats?.sampledRgb || [0, 0, 0];

      target.charge = isMatch
        ? min(1.0, target.charge + dt * 1.5)
        : max(0, target.charge - dt * (hasLight ? 1.2 : 0.7));
      if (!(target.isSatisfied = isMatch && target.charge >= 0.95)) allSatisfied = false;
      if (isMatch) playSensorPulse(target.charge);
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
  loop(lastTime);
}

initGame();
