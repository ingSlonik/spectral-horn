/**
 * ============================================================================
 * 📸 SPECTRAL HORN — IN-GAME MARKETING & CONTEST ASSET CAPTURE HARNESS
 * ============================================================================
 *
 * PURPOSE:
 * This script is an internal development utility used to generate pixel-perfect,
 * 100% authentic in-game screenshots for the js13kGames 2026 competition submission
 * and GitHub repository presentation:
 *   - cover.png     (800 × 500 px): Panoramic hero composition with Cauchy dispersion,
 *                                   mirror reflection, spherical orb focus & charged sensors.
 *   - thumbnail.png (320 × 320 px): Square contest icon showcasing Snell's law refraction
 *                                   in the crystal horn and pure spectral rainbow fan.
 *
 * HOW TO RUN / USE:
 * 1. Bundle to dist/capture.js:
 *    npx esbuild scripts/capture.ts --bundle --format=iife --outfile=dist/capture.js
 * 2. Serve locally:
 *    npx vite preview --port 8089
 * 3. Capture headlessly via Chrome:
 *    - Cover (800x500):
 *      google-chrome --headless --screenshot=assets/cover.png --window-size=800,500 \
 *        "http://localhost:8089/capture.html?w=800&h=500&title=1"
 *    - Thumbnail (320x320):
 *      google-chrome --headless --screenshot=assets/thumbnail.png --window-size=320,320 \
 *        "http://localhost:8089/capture.html?w=320&h=320&title=1"
 *
 * NOTE ON BUNDLE SIZE:
 * This file is NOT bundled into the production 13 KB game archive (`dist/spectral-horn.zip`).
 * ============================================================================
 */

import { TITLE_SCENE } from '../src/levels';
import { traceScene } from '../src/raytracer';
import { createRenderer } from '../src/renderer';
import { v2 } from '../src/math';
import { Emitter, Prism, Target, Obstacle } from '../src/types';

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const width = parseInt(params.get('w') || '800', 10);
  const height = parseInt(params.get('h') || '500', 10);
  const showTitle = params.get('title') !== '0';

  const canvas = document.createElement('canvas');
  canvas.id = 'capture-canvas';
  canvas.width = width;
  canvas.height = height;
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#020309';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const renderer = createRenderer(ctx);

  let emitters: Emitter[] = [];
  let prisms: Prism[] = [];
  let targets: Target[] = [];
  let obstacles: Obstacle[] = [];
  let bounds = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };

  const isThumbnail = width === height;

  if (isThumbnail) {
    const homePony = { ...TITLE_SCENE.prisms[1], rot: 0 };
    const homeEmitter = { ...TITLE_SCENE.emitters[1], pos: v2(920, 264), rayCount: 28, width: 0.5 };

    emitters = [homeEmitter];
    prisms = [homePony];
    targets = [];

    const scale = 1.72;
    const offsetX = 180 - 800 * scale;
    const offsetY = 22 - 262 * scale;
    bounds = { scale, offsetX, offsetY, dpr: 1 };
  } else {
    // 800x500 Panoramic Hero Composition (Approved cover)
    emitters = [
      { pos: v2(30, 285), angle: 0, width: 8, rayCount: 220, minLambda: 400, maxLambda: 700 }
    ];
    prisms = [
      {
        id: 1,
        pos: v2(160, 285),
        rot: 0.04,
        scale: 1.5,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(300, 360),
        rot: (-2 * Math.PI) / 180,
        scale: 1.7,
        baseIndex: 1.0,
        dispersionB: 0,
        shape: 'mirror',
      },
      {
        id: 3,
        pos: v2(460, 250),
        rot: 0,
        scale: 1.6,
        baseIndex: 1.58,
        dispersionB: 12000,
        shape: 'orb',
      }
    ];
    targets = [
      {
        id: 1,
        pos: v2(735, 100),
        radius: 23,
        minLambda: 620,
        maxLambda: 700,
        charge: 0.44,
        name: 'Red 660nm',
        isSatisfied: false,
        isColorMatching: true,
        hasLight: true,
        sampledRgb: [255, 45, 45]
      },
      {
        id: 2,
        pos: v2(735, 135),
        radius: 23,
        minLambda: 520,
        maxLambda: 570,
        charge: 0.40,
        name: 'Green 535nm',
        isSatisfied: false,
        isColorMatching: true,
        hasLight: true,
        sampledRgb: [50, 255, 90]
      },
      {
        id: 3,
        pos: v2(735, 210),
        radius: 23,
        minLambda: 400,
        maxLambda: 480,
        charge: 0.38,
        name: 'Violet 430nm',
        isSatisfied: false,
        isColorMatching: true,
        hasLight: true,
        sampledRgb: [170, 70, 255]
      }
    ];
    bounds = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };
  }

  const renderFrame = (time: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderer.clear(width, height);

    ctx.save();
    ctx.translate(bounds.offsetX, bounds.offsetY);
    ctx.scale(bounds.scale, bounds.scale);

    obstacles.forEach(renderer.renderObstacle);
    renderer.renderEmitters(emitters, time);

    for (let i = 0; i < prisms.length; i++) {
      renderer.renderPrism(prisms[i], false, false, null, time, false, null, ctx);
    }

    const traceResult = traceScene(emitters, prisms, obstacles, targets);

    renderer.renderRays(traceResult.rays, bounds);

    renderer.renderDust(traceResult.segments, time);

    for (const target of targets) {
      const hit = traceResult.targetHits.get(target.id);
      if (hit) {
        target.isColorMatching = !!hit.isMatch;
        target.hasLight = !!hit.hasLight;
        target.sampledRgb = hit.sampledRgb || target.sampledRgb;
      }
      renderer.renderTarget(target, time, ctx);
    }

    renderer.renderParticles();
    ctx.restore();

    // In-game typography and glassmorphic badges
    if (showTitle) {
      ctx.save();
      if (width === height) {
        // Thumbnail bottom banner with intro gradient title
        const titleH = 44;
        const gradBg = ctx.createLinearGradient(0, height - titleH - 18, 0, height);
        gradBg.addColorStop(0, 'rgba(2,3,9,0)');
        gradBg.addColorStop(0.4, 'rgba(2,3,9,0.82)');
        gradBg.addColorStop(1, 'rgba(2,3,9,0.96)');
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, height - titleH - 18, width, titleH + 18);

        const titleGrad = ctx.createLinearGradient(width * 0.1, 0, width * 0.9, 0);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.33, '#ff7b00');
        titleGrad.addColorStop(0.66, '#ec4899');
        titleGrad.addColorStop(1, '#38bdf8');

        ctx.textAlign = 'center';
        ctx.font = '900 20px -apple-system, system-ui, sans-serif';
        ctx.shadowColor = '#ffd70066';
        ctx.shadowBlur = 8;
        ctx.fillStyle = titleGrad;
        ctx.fillText('✨ SPECTRAL HORN ✨', width / 2, height - 15);
      } else {
        // Cover image header:
        const titleGrad = ctx.createLinearGradient(36, 0, 490, 0);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.33, '#ff7b00');
        titleGrad.addColorStop(0.66, '#ec4899');
        titleGrad.addColorStop(1, '#38bdf8');

        ctx.textAlign = 'left';
        ctx.font = '900 34px -apple-system, system-ui, sans-serif';
        ctx.shadowColor = '#ffd70055';
        ctx.shadowBlur = 14;
        ctx.fillStyle = titleGrad;
        ctx.fillText('✨ SPECTRAL HORN ✨', 36, 48);

        ctx.shadowBlur = 0;

        // Subtitle / Contest category
        ctx.font = '700 12.5px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('2D OPTICAL PHYSICS PUZZLE • JS13KGAMES 2026', 38, 72);

        const drawPill = (x: number, y: number, w: number, h: number, borderCol: string, bgCol: string) => {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 8);
          ctx.fillStyle = bgCol;
          ctx.fill();
          ctx.strokeStyle = borderCol;
          ctx.lineWidth = 1;
          ctx.stroke();
        };

        // Tech Badge 1: 2D Canvas & 13 KB limit
        drawPill(36, 84, 348, 22, 'rgba(74, 222, 128, 0.45)', 'rgba(10, 24, 38, 0.65)');
        ctx.font = 'bold 10.5px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#4ade80';
        ctx.fillText('⚡ 100% PROCEDURAL CANVAS 2D • BUNDLE SIZE ≤ 13 KB', 44, 99);

        // Tech Badge 2: All physical laws
        drawPill(36, 112, 475, 22, 'rgba(56, 189, 248, 0.45)', 'rgba(10, 18, 42, 0.65)');
        ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#bae6fd';
        ctx.fillText('🔬 SNELL • CAUCHY DISPERSION • TIR • SPECULAR REFLECTION • ADDITIVE ALCHEMY', 44, 127);
      }
      ctx.restore();
    }
  };

  for (let t = 0; t < 1200; t += 50) {
    renderFrame(t);
  }
  renderFrame(1400);

  (window as any).RENDER_READY = true;
});
