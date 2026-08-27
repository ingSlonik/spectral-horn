import { LevelDef, Prism, Target, Emitter } from './types';
import { LEVELS, TITLE_SCENE } from './levels';
import { traceScene } from './raytracer';
import { GameRenderer } from './renderer';
import { InputHandler } from './input';
import { v2 } from './math';
import { initAudio, playVictory, playSensorPulse, playClick, toggleMute, isMuted } from './audio';

const STORAGE_COMPLETED_KEY = 'spectral_horn_completed_levels';

function getCompletedLevels(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_COMPLETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markLevelCompleted(idx: number): void {
  try {
    const set = new Set<number>(getCompletedLevels());
    set.add(idx);
    localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

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
  private elLevelTitle: HTMLElement;
  private elLevelHint: HTMLElement;
  private elLevelSelect: HTMLSelectElement;
  private elMenuBtn: HTMLButtonElement;
  private elMuteBtn: HTMLButtonElement;
  private elResetBtn: HTMLButtonElement;
  private elWinModal: HTMLElement;
  private elNextBtn: HTMLButtonElement;
  private elTitleScreen: HTMLElement;
  private elPlayBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.renderer = new GameRenderer(this.ctx);

    // DOM UI bindings
    this.elLevelTitle = document.getElementById('lvl-title')!;
    this.elLevelHint = document.getElementById('lvl-hint')!;
    this.elLevelSelect = document.getElementById('lvl-select') as HTMLSelectElement;
    this.elMenuBtn = document.getElementById('menu-btn') as HTMLButtonElement;
    this.elMuteBtn = document.getElementById('mute-btn') as HTMLButtonElement;
    this.elResetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.elWinModal = document.getElementById('win-modal')!;
    this.elNextBtn = document.getElementById('next-btn') as HTMLButtonElement;
    this.elTitleScreen = document.getElementById('title-screen')!;
    this.elPlayBtn = document.getElementById('play-btn') as HTMLButtonElement;

    this.input = new InputHandler(this.canvas);
    this.input.getPrisms = () => this.prisms;

    this.setupUI();
    this.showTitleScreen();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start game loop
    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      this.update(dt, time);
      this.render(time);
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
    }
  }

  private populateLevelSelect(): void {
    const completed = new Set(getCompletedLevels());
    this.elLevelSelect.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
      const opt = document.createElement('option');
      opt.value = idx.toString();
      const isDone = completed.has(idx);
      opt.textContent = isDone ? `✓ ${lvl.title}` : `○ ${lvl.title}`;
      if (isDone) {
        opt.style.color = '#4ade80';
        opt.style.fontWeight = 'bold';
      } else {
        opt.style.color = '#cbd5e1';
      }
      this.elLevelSelect.appendChild(opt);
    });
    this.elLevelSelect.value = this.currentLevelIdx.toString();
  }

  private setupUI(): void {
    this.populateLevelSelect();

    this.elLevelSelect.addEventListener('change', (e) => {
      playClick();
      this.isTitleScreen = false;
      this.elTitleScreen.classList.add('hidden');
      this.loadLevel(parseInt((e.target as HTMLSelectElement).value, 10));
    });

    this.elResetBtn.addEventListener('click', () => {
      playClick();
      if (this.isTitleScreen) {
        this.showTitleScreen();
      } else {
        this.loadLevel(this.currentLevelIdx);
      }
    });

    this.elMenuBtn.addEventListener('click', () => {
      playClick();
      this.showTitleScreen();
    });

    this.elPlayBtn.addEventListener('click', () => {
      initAudio();
      playClick();
      this.startGame();
    });

    this.elMuteBtn.addEventListener('click', () => {
      playClick();
      const muted = toggleMute();
      this.elMuteBtn.innerHTML = muted
        ? '<span class="btn-icon">🔇</span><span class="btn-text"> Sound</span>'
        : '<span class="btn-icon">🔊</span><span class="btn-text"> Sound</span>';
    });

    this.elNextBtn.addEventListener('click', () => {
      playClick();
      this.elWinModal.classList.add('hidden');
      if (this.currentLevelIdx < LEVELS.length - 1) {
        this.loadLevel(this.currentLevelIdx + 1);
      } else {
        this.loadLevel(0);
      }
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

    this.elLevelTitle.textContent = '✨ Cosmic Playground';
    this.elLevelHint.textContent = 'Rainbows cross at the center. Feel free to drag and twist the unicorn horns!';
    this.populateLevelSelect();
  }

  public startGame(): void {
    this.isTitleScreen = false;
    document.body.classList.remove('is-title');
    this.elTitleScreen.classList.add('hidden');
    this.loadLevel(this.currentLevelIdx);
  }

  public loadLevel(idx: number): void {
    this.isTitleScreen = false;
    document.body.classList.remove('is-title');
    this.elTitleScreen.classList.add('hidden');
    this.currentLevelIdx = Math.max(0, Math.min(LEVELS.length - 1, idx));
    this.level = LEVELS[this.currentLevelIdx];

    // Deep clone prisms & targets
    this.prisms = JSON.parse(JSON.stringify(this.level.prisms));
    this.targets = JSON.parse(JSON.stringify(this.level.targets));

    // Auto-select first movable prism
    const firstMovable = this.prisms.findIndex((p) => !p.locked);
    this.input.selectedPrismIndex = firstMovable !== -1 ? firstMovable : null;

    this.isLevelComplete = false;
    this.winDelay = 0;
    this.elWinModal.classList.add('hidden');

    this.elLevelTitle.textContent = this.level.title;
    this.elLevelHint.textContent = this.level.hint;
    this.populateLevelSelect();
  }

  private getViewportBounds() {
    const rect = this.canvas.getBoundingClientRect();
    const side = Math.min(rect.width, rect.height) || 1000;
    const offsetX = (rect.width - side) / 2;
    const offsetY = (rect.height - side) / 2;
    const scale = side / 1000;

    const minX = -offsetX / scale;
    const minY = -offsetY / scale;
    const maxX = 1000 + offsetX / scale;
    const maxY = 1000 + offsetY / scale;
    const width = maxX - minX;
    const height = maxY - minY;

    return { minX, minY, maxX, maxY, width, height, scale, offsetX, offsetY };
  }

  private update(dt: number, time: number): void {
    this.renderer.updateParticles();

    if (this.isTitleScreen) {
      // Harmonic gentle swaying for title unicorn horns
      for (let i = 0; i < this.prisms.length; i++) {
        const prism = this.prisms[i];
        if (this.input.dragState.prismIndex !== i) {
          const phase = prism.swayPhase ?? (i * Math.PI);
          const baseRot = prism.baseRot ?? prism.rot;
          const baseY = prism.basePos ? prism.basePos.y : prism.pos.y;
          prism.rot = baseRot + Math.sin(time * 0.0018 + phase) * 0.05;
          prism.pos.y = baseY + Math.sin(time * 0.0022 + phase) * 3.5;
        }
      }
      return;
    }

    // 1. Ray-trace the scene across full viewport bounds
    const bounds = this.getViewportBounds();
    const traceResult = traceScene(
      this.level.emitter,
      this.prisms,
      this.level.obstacles,
      this.targets,
      bounds
    );

    // 2. Update Target Sensor charges
    let allSatisfied = true;

    for (const target of this.targets) {
      const hit = traceResult.targetHits.get(target.id) || { valid: 0, total: 0, avgWavelength: 0 };

      if (hit.valid >= 2) {
        // Correct spectrum hitting sensor!
        target.charge = Math.min(1.0, target.charge + dt * 1.5);
        if (target.charge >= 0.95) {
          target.isSatisfied = true;
        }
        playSensorPulse(target.charge);
      } else if (hit.total > 0) {
        // Wrong spectrum hitting sensor -> discharge faster
        target.charge = Math.max(0, target.charge - dt * 2.0);
        target.isSatisfied = false;
      } else {
        // No rays -> slow discharge
        target.charge = Math.max(0, target.charge - dt * 0.7);
        target.isSatisfied = false;
      }

      if (!target.isSatisfied) {
        allSatisfied = false;
      }
    }

    // 3. Level Complete condition
    if (allSatisfied && !this.isLevelComplete) {
      this.winDelay += dt;
      if (this.winDelay > 0.4) {
        this.isLevelComplete = true;
        markLevelCompleted(this.currentLevelIdx);
        this.populateLevelSelect();
        playVictory();
        this.elWinModal.classList.remove('hidden');
      }
    } else if (!allSatisfied) {
      this.winDelay = 0;
    }
  }

  private render(time: number): void {
    this.resizeCanvas();

    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = this.getViewportBounds();

    // 1. Set centered 1:1 square virtual viewport [0..1000, 0..1000]
    ctx.save();
    ctx.translate(bounds.offsetX * dpr, bounds.offsetY * dpr);
    ctx.scale(bounds.scale * dpr, bounds.scale * dpr);

    // 2. Clear entire canvas with cosmic background and grid spanning minX..maxX, minY..maxY
    this.renderer.clear(bounds.minX, bounds.minY, bounds.width, bounds.height);

    // 3. Subtle arena bounds for 1000x1000 play area
    this.renderer.renderSquareBounds(1000);

    if (this.isTitleScreen) {
      // 1. Render 2 emitters
      this.renderer.renderEmitters(TITLE_SCENE.emitters, time);

      // 2. Render swaying unicorn prisms
      for (let i = 0; i < this.prisms.length; i++) {
        const prism = this.prisms[i];
        const isSelected = this.input.selectedPrismIndex === i;
        const isHovered = this.input.hoverPrismIndex === i;
        const isDragged = this.input.dragState.prismIndex === i;
        const handle = isHovered ? this.input.hoverHandle : null;
        const dragMode = isDragged ? this.input.dragState.mode : null;
        this.renderer.renderPrism(
          prism,
          isHovered,
          isDragged,
          handle,
          time,
          isSelected,
          dragMode
        );
      }

      // 3. Render rays on top of unicorns extending all the way to screen edges
      const traceResult = traceScene(
        TITLE_SCENE.emitters,
        this.prisms,
        [],
        [],
        bounds
      );
      this.renderer.renderRays(traceResult.segments);

      // 4. Render particles
      this.renderer.renderParticles();
      ctx.restore();
      return;
    }

    // 2. Obstacles (Obsidian walls & Mirrors)
    for (const obs of this.level.obstacles) {
      this.renderer.renderObstacle(obs);
    }

    // 3. Emitter
    this.renderer.renderEmitter(this.level.emitter, time);

    // 4. Prisms
    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      const isSelected = this.input.selectedPrismIndex === i;
      const isHovered = this.input.hoverPrismIndex === i;
      const isDragged = this.input.dragState.prismIndex === i;
      const handle = isHovered ? this.input.hoverHandle : null;
      const dragMode = isDragged ? this.input.dragState.mode : null;
      this.renderer.renderPrism(
        prism,
        isHovered,
        isDragged,
        handle,
        time,
        isSelected,
        dragMode
      );
    }

    // 5. Targets
    for (const target of this.targets) {
      this.renderer.renderTarget(target, time);
    }

    // 6. Ray-tracing & rendering extending all the way to browser window edges
    const traceResult = traceScene(
      this.level.emitter,
      this.prisms,
      this.level.obstacles,
      this.targets,
      bounds
    );
    this.renderer.renderRays(traceResult.segments);

    // 7. Particles
    this.renderer.renderParticles();

    ctx.restore();
  }
}

// Entrypoint
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
