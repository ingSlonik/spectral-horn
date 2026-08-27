import { LevelDef, Emitter, Prism } from './types';
import { v2 } from './math';

// =========================================================================
// 🦄 TITLE SCENE CONFIGURATION
// All coordinates are within virtual 1000 × 1000 canvas space (center 500, 500):
// =========================================================================
export const TITLE_SCENE: { emitters: Emitter[]; prisms: Prism[] } = {
  emitters: [
    {
      pos: v2(80, 260),      // Left emitter position [X, Y]
      angle: 0.22,           // Beam angle in radians (aimed down-right)
      width: 7,              // Beam width
      rayCount: 52,          // Spectrum ray density
      minLambda: 400,        // 400 nm (violet)
      maxLambda: 700,        // 700 nm (red)
    },
    {
      pos: v2(920, 260),     // Right emitter position [X, Y]
      angle: 3,              // Beam angle in radians (aimed up-left)
      width: 7,
      rayCount: 52,
      minLambda: 400,
      maxLambda: 700,
    },
  ],
  prisms: [
    {
      id: 1,
      pos: v2(200, 300),     // Left unicorn position [X, Y]
      rot: 0,                // Default horn rotation in radians
      scale: 1,              // Scale multiplier
      baseIndex: 1.52,       // Refractive index of crystal
      dispersionB: 28000,    // Cauchy dispersion coefficient
      shape: 'horn',
      basePos: v2(200, 300), // Base anchor position for harmonic sway
      baseRot: 0.1,          // Base rotation for harmonic sway
      swayPhase: 0,          // Sway phase offset
    },
    {
      id: 2,
      pos: v2(800, 300),     // Right unicorn position [X, Y]
      rot: 0,                // Default horn rotation in radians
      scale: 1,              // Scale multiplier
      baseIndex: 1.52,       // Refractive index of crystal
      dispersionB: 28000,    // Cauchy dispersion coefficient
      shape: 'horn',
      basePos: v2(800, 300), // Base anchor position for harmonic sway
      baseRot: 0,            // Base rotation for harmonic sway
      swayPhase: Math.PI,    // Counter-phase sway
    },
  ],
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: '1. The First Horn',
    subtitle: 'Double refraction: bending light with crystal power',
    hint: 'Isaac Newton who? Rotate your horn to bend the emerald beam into the sensor.',
    emitter: {
      pos: v2(90, 420),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(440, 420),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 22000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(870, 660),
        radius: 25,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: 'Green Sensor',
      },
    ],
    obstacles: [],
  },
  {
    id: 2,
    title: '2. Rainbow Dispersion',
    subtitle: 'Cauchy dispersion: why rainbows are basically physics showing off',
    hint: 'Red bends gently, violet takes the sharpest dive. Fan out the spectrum downward to hit all three!',
    emitter: {
      pos: v2(90, 300),
      angle: 0,
      width: 7,
      rayCount: 52,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(340, 300),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.52,
        dispersionB: 32000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 620),
        radius: 24,
        minLambda: 630,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(880, 660),
        radius: 24,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: 'Green Sensor',
      },
      {
        id: 3,
        pos: v2(880, 780),
        radius: 24,
        minLambda: 400,
        maxLambda: 450,
        charge: 0,
        isSatisfied: false,
        name: 'Violet Sensor',
      },
    ],
    obstacles: [],
  },
  {
    id: 3,
    title: '3. The Obsidian Shield',
    subtitle: 'Upward refraction: slipping under the barrier',
    hint: 'The sensor is tucked behind a heavy shield. Turn your horn upside down to bend light upward into the pocket!',
    emitter: {
      pos: v2(90, 820),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(420, 820),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 22000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 590),
        radius: 25,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: 'Green Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(770, 50), v2(810, 50), v2(810, 620), v2(770, 620)],
      },
    ],
  },
];
