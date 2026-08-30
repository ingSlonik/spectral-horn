import { LevelDef, Prism, Target } from './types';
import { LEVELS, TITLE_SCENE } from './levels';
import { traceScene } from './raytracer';
import { GameRenderer } from './renderer';
import { InputHandler } from './input';
import {
  initAudio,
  playVictory,
  playSensorPulse,
  playClick,
  toggleMusic,
  toggleSfx,
} from './audio';

const STORAGE_KEY = 'spectral_horn';
const getCleared = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const markCleared = (idx: number) => {
  try {
    const s = new Set(getCleared());
    s.add(idx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch { }
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private input: InputHandler;

  private isTitleScreen = true;
  private currentLevelIdx = 0;
  private level!: LevelDef;
  private prisms: Prism[] = [];
  private targets: Target[] = [];
  private isLevelComplete = false;
  private winDelay = 0;

  // DOM Elements
  private elLevelTitle = $('lvl-title');
  private elLevelHint = $('lvl-hint');
  private elLevelSelect = $<HTMLSelectElement>('lvl-select');
  private elWinModal = $('win-modal');
  private elWinTitle = $('win-title');
  private elWinDesc = $('win-desc');
  private elHelpModal = $('help-modal');
  private elNextBtn = $<HTMLButtonElement>('next-btn');
  private elTitleScreen = $('title-screen');

  private cachedBounds = {
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

  constructor() {
    this.canvas = $<HTMLCanvasElement>('c');
    this.ctx = this.canvas.getContext('2d')!;
    this.renderer = new GameRenderer(this.ctx);

    const titleCards = this.elTitleScreen.querySelector('.title-cards');
    const modalCards = $('modal-cards-container');
    if (titleCards && modalCards) modalCards.innerHTML = titleCards.innerHTML;

    this.input = new InputHandler(this.canvas);
    this.input.getPrisms = () => this.prisms;

    this.setupUI();
    this.showTitleScreen();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      this.update(time);
      this.render(dt, time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.renderer.resize(targetW, targetH);
    }

    const side = Math.min(rect.width, rect.height) || 1000;
    const offsetX = (rect.width - side) / 2;
    const offsetY = (rect.height - side) / 2;
    const scale = side / 1000;

    this.cachedBounds = {
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
  }

  private populateLevelSelect(): void {
    const cleared = new Set(getCleared());
    this.elLevelSelect.innerHTML = LEVELS.map(
      (lvl, idx) => `<option value="${idx}" style="color:${cleared.has(idx) ? '#4ade80' : '#cbd5e1'}">${cleared.has(idx) ? '✓' : '○'} ${lvl.title}</option>`
    ).join('');
    this.elLevelSelect.value = `${this.currentLevelIdx}`;
  }

  private setupUI(): void {
    this.populateLevelSelect();

    const triggerAudio = () => {
      initAudio();
      window.removeEventListener('pointerdown', triggerAudio);
      window.removeEventListener('keydown', triggerAudio);
    };
    window.addEventListener('pointerdown', triggerAudio, { once: true });
    window.addEventListener('keydown', triggerAudio, { once: true });

    const bindClick = (id: string, action: () => void) => {
      $(id).addEventListener('click', () => {
        initAudio();
        playClick();
        action();
      });
    };

    this.elLevelSelect.addEventListener('change', (e) => {
      initAudio();
      playClick();
      this.loadLevel(parseInt((e.target as HTMLSelectElement).value, 10));
    });

    bindClick('reset-btn', () => (this.isTitleScreen ? this.showTitleScreen() : this.loadLevel(this.currentLevelIdx)));
    bindClick('menu-btn', () => this.showTitleScreen());
    bindClick('play-btn', () => this.startGame());

    const musicBtn = $('music-btn');
    bindClick('music-btn', () => {
      const m = toggleMusic();
      musicBtn.innerHTML = `<span class="btn-icon">${m ? '🔇' : '🎵'}</span><span class="btn-text"> Music</span>`;
    });

    const sfxBtn = $('sfx-btn');
    bindClick('sfx-btn', () => {
      const s = toggleSfx();
      sfxBtn.innerHTML = `<span class="btn-icon">${s ? '🔇' : '🔊'}</span><span class="btn-text"> SFX</span>`;
    });

    bindClick('help-btn', () => this.elHelpModal.classList.remove('hidden'));
    bindClick('help-close-btn', () => this.elHelpModal.classList.add('hidden'));

    this.elNextBtn.addEventListener('click', () => {
      initAudio();
      playClick();
      this.elWinModal.classList.add('hidden');
      this.loadLevel((this.currentLevelIdx + 1) % LEVELS.length);
    });
  }

  public showTitleScreen(): void {
    this.isTitleScreen = true;
    document.body.classList.add('is-title');
    this.prisms = JSON.parse(JSON.stringify(TITLE_SCENE.prisms));
    this.targets = [];
    this.isLevelComplete = false;
    this.winDelay = 0;
    this.input.selectedPrismIndex = 0;

    this.elTitleScreen.classList.remove('hidden');
    this.elWinModal.classList.add('hidden');
    this.elHelpModal.classList.add('hidden');

    this.elLevelTitle.textContent = '✨ Cosmic Sandbox';
    this.elLevelHint.textContent = 'Where photons collide and unicorns test theoretical optics. Drag and twist freely!';
    this.populateLevelSelect();
  }

  public startGame(): void {
    this.loadLevel(this.currentLevelIdx);
  }

  public loadLevel(idx: number): void {
    this.isTitleScreen = false;
    document.body.classList.remove('is-title');
    this.elTitleScreen.classList.add('hidden');
    this.elHelpModal.classList.add('hidden');
    this.currentLevelIdx = Math.max(0, Math.min(LEVELS.length - 1, idx));
    this.level = LEVELS[this.currentLevelIdx];

    this.prisms = JSON.parse(JSON.stringify(this.level.prisms));
    this.targets = JSON.parse(JSON.stringify(this.level.targets));

    const firstMovable = this.prisms.findIndex((p) => !p.locked);
    this.input.selectedPrismIndex = firstMovable !== -1 ? firstMovable : null;

    this.isLevelComplete = false;
    this.winDelay = 0;
    this.elWinModal.classList.add('hidden');

    this.elLevelTitle.textContent = this.level.title;
    this.elLevelHint.textContent = this.level.hint;
    this.populateLevelSelect();
  }

  private update(time: number): void {
    this.renderer.updateParticles();
    this.renderer.updateDust(time);

    if (this.isTitleScreen) {
      for (let i = 0; i < this.prisms.length; i++) {
        const prism = this.prisms[i];
        if (this.input.dragState.prismIndex !== i) {
          const phase = prism.swayPhase ?? i * Math.PI;
          const baseRot = prism.baseRot ?? prism.rot;
          const baseY = prism.basePos ? prism.basePos.y : prism.pos.y;
          prism.rot = baseRot + Math.sin(time * 0.0018 + phase) * 0.05;
          prism.pos.y = baseY + Math.sin(time * 0.0022 + phase) * 3.5;
        }
      }
    }
  }

  private render(dt: number, time: number): void {
    const ctx = this.ctx;
    const bounds = this.cachedBounds;
    const dpr = bounds.dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.renderer.clear(ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(bounds.offsetX * dpr, bounds.offsetY * dpr);
    ctx.scale(bounds.scale * dpr, bounds.scale * dpr);

    this.renderer.renderSquareBounds(1000);

    if (this.isTitleScreen) {
      this.renderer.renderEmitters(TITLE_SCENE.emitters, time);

      for (let i = 0; i < this.prisms.length; i++) {
        this.renderer.renderPrism(
          this.prisms[i],
          this.input.hoverPrismIndex === i,
          this.input.dragState.prismIndex === i,
          this.input.hoverPrismIndex === i ? this.input.hoverHandle : null,
          time,
          this.input.selectedPrismIndex === i,
          this.input.dragState.prismIndex === i ? this.input.dragState.mode : null
        );
      }

      const traceResult = traceScene(
        TITLE_SCENE.emitters,
        this.prisms,
        [],
        [],
        bounds
      );

      this.renderer.renderRays(traceResult.rays, bounds);
      this.renderer.renderDust(traceResult.segments, time);
      this.renderer.renderParticles();
      this.renderer.renderCardPreview(time);

      ctx.restore();
      return;
    }

    if (!this.elHelpModal.classList.contains('hidden')) {
      this.renderer.renderCardPreview(time);
    }

    for (const obs of this.level.obstacles) {
      this.renderer.renderObstacle(obs);
    }

    this.renderer.renderEmitters(this.level.emitter, time);

    for (let i = 0; i < this.prisms.length; i++) {
      this.renderer.renderPrism(
        this.prisms[i],
        this.input.hoverPrismIndex === i,
        this.input.dragState.prismIndex === i,
        this.input.hoverPrismIndex === i ? this.input.hoverHandle : null,
        time,
        this.input.selectedPrismIndex === i,
        this.input.dragState.prismIndex === i ? this.input.dragState.mode : null
      );
    }

    const traceResult = traceScene(
      this.level.emitter,
      this.prisms,
      this.level.obstacles,
      this.targets,
      bounds
    );

    this.renderer.renderRays(traceResult.rays, bounds);
    this.renderer.renderDust(traceResult.segments, time);

    let allSatisfied = true;

    for (const target of this.targets) {
      const hitStats = traceResult.targetHits.get(target.id);
      const isMatch = !!hitStats?.isMatch;
      const hasLight = !!hitStats?.hasLight;

      target.sampledRgb = hitStats?.sampledRgb || [0, 0, 0];
      target.isColorMatching = isMatch;
      target.hasLight = hasLight;

      target.charge = isMatch
        ? Math.min(1.0, target.charge + dt * 1.5)
        : Math.max(0, target.charge - dt * (hasLight ? 1.2 : 0.7));
      target.isSatisfied = isMatch && target.charge >= 0.95;
      if (isMatch) playSensorPulse(target.charge);
      if (!target.isSatisfied) allSatisfied = false;
    }

    for (const target of this.targets) {
      this.renderer.renderTarget(target, time);
    }

    if (allSatisfied && !this.isLevelComplete) {
      this.winDelay += dt;
      if (this.winDelay > 0.4) {
        this.isLevelComplete = true;
        markCleared(this.currentLevelIdx);
        this.populateLevelSelect();
        playVictory();
        const isLast = this.currentLevelIdx === LEVELS.length - 1;
        this.elWinTitle.textContent = isLast ? '✨ MASTER OF PHOTONS! ✨' : '✨ LEVEL COMPLETE! ✨';
        this.elWinDesc.textContent = isLast
          ? 'You have bent, dispersed, reflected, and synthesized every wavelength in the cosmos!'
          : 'All spectral sensors are fully charged. Photons behave themselves... for now.';
        this.elNextBtn.textContent = isLast ? 'Play Again ↺' : 'Next Experiment ➔';
        this.elWinModal.classList.remove('hidden');
      }
    } else if (!allSatisfied) {
      this.winDelay = 0;
    }

    this.renderer.renderParticles();
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
