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
    {
      id: 4,
      pos: v2(640, 500),
      rot: 0,
      scale: 1.15,
      baseIndex: 1.56,
      dispersionB: 24000,
      shape: 'orb',
    },
  ],
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: '1. The First Horn',
    subtitle: 'Double refraction through a crystal horn',
    hint: 'Rotate the unicorn horn so green light (540 nm) strikes the sensor.',
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(440, 500),
        rot: 0.1,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 22000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(860, 660),
        radius: 24,
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
    subtitle: 'Splitting the spectrum onto dual sensors',
    hint: 'Red bends less, blue bends more. Guide both colors into their matching targets!',
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(400, 500),
        rot: 0.38,
        scale: 1.0,
        baseIndex: 1.52,
        dispersionB: 28000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(850, 340),
        radius: 24,
        minLambda: 620,
        maxLambda: 680,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(860, 720),
        radius: 24,
        minLambda: 430,
        maxLambda: 485,
        charge: 0,
        isSatisfied: false,
        name: 'Blue Sensor',
      },
    ],
    obstacles: [],
  },
  {
    id: 3,
    title: '3. Total Reflection & Periscope',
    subtitle: 'Harnessing Total Internal Reflection (TIR) around obstacles',
    hint: 'Use the first horn to bounce light downward via TIR, then guide it around the wall to the goal.',
    emitter: {
      pos: v2(90, 260),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(360, 260),
        rot: -0.78,
        scale: 1.0,
        baseIndex: 1.56,
        dispersionB: 20000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(640, 760),
        rot: 0.78,
        scale: 1.0,
        baseIndex: 1.56,
        dispersionB: 20000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(870, 760),
        radius: 24,
        minLambda: 570,
        maxLambda: 615,
        charge: 0,
        isSatisfied: false,
        name: 'Yellow Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [
          v2(480, 120),
          v2(530, 120),
          v2(530, 660),
          v2(480, 660),
        ],
      },
    ],
  },
  {
    id: 4,
    title: '4. Double Horn Relay',
    subtitle: 'Cascading refraction around obsidian barriers',
    hint: 'First horn splits the beam, second horn bends it past obstacles into the sensors.',
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(280, 500),
        rot: 0.4,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 26000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(620, 320),
        rot: -0.3,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 24000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 300),
        radius: 23,
        minLambda: 480,
        maxLambda: 530,
        charge: 0,
        isSatisfied: false,
        name: 'Cyan Sensor',
      },
      {
        id: 2,
        pos: v2(880, 760),
        radius: 23,
        minLambda: 590,
        maxLambda: 640,
        charge: 0,
        isSatisfied: false,
        name: 'Orange Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [
          v2(440, 300),
          v2(500, 300),
          v2(500, 700),
          v2(440, 700),
        ],
      },
    ],
  },
  {
    id: 5,
    title: '5. Trichromatic Harmony',
    subtitle: 'Violet, green, and red alignment',
    hint: 'Disperse the spectrum wide enough to charge all three sensors simultaneously!',
    emitter: {
      pos: v2(90, 500),
      angle: -0.02,
      width: 7,
      rayCount: 52,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(360, 500),
        rot: 0.45,
        scale: 1.0,
        baseIndex: 1.52,
        dispersionB: 32000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(630, 640),
        rot: -0.2,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 28000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 260),
        radius: 23,
        minLambda: 630,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(880, 500),
        radius: 23,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: 'Green Sensor',
      },
      {
        id: 3,
        pos: v2(880, 780),
        radius: 23,
        minLambda: 400,
        maxLambda: 450,
        charge: 0,
        isSatisfied: false,
        name: 'Violet Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [
          v2(480, 420),
          v2(520, 420),
          v2(520, 580),
          v2(480, 580),
        ],
      },
    ],
  },
  {
    id: 6,
    title: '6. Crystal Labyrinth',
    subtitle: 'The grand optical finale',
    hint: 'Combine multi-stage refraction, chrome mirror reflection, and dispersion to illuminate every sensor.',
    emitter: {
      pos: v2(90, 260),
      angle: 0.15,
      width: 7,
      rayCount: 52,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(320, 320),
        rot: 0.6,
        scale: 1.0,
        baseIndex: 1.54,
        dispersionB: 30000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(640, 700),
        rot: -0.5,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 26000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(870, 240),
        radius: 23,
        minLambda: 620,
        maxLambda: 680,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(870, 500),
        radius: 23,
        minLambda: 530,
        maxLambda: 575,
        charge: 0,
        isSatisfied: false,
        name: 'Green Sensor',
      },
      {
        id: 3,
        pos: v2(870, 800),
        radius: 23,
        minLambda: 440,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: 'Blue Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [
          v2(470, 120),
          v2(510, 120),
          v2(510, 440),
          v2(470, 440),
        ],
      },
      {
        id: 2,
        points: [
          v2(470, 620),
          v2(510, 620),
          v2(510, 880),
          v2(470, 880),
        ],
      },
      {
        id: 3,
        points: [
          v2(480, 440),
          v2(500, 440),
          v2(500, 620),
          v2(480, 620),
        ],
        isMirror: true,
      },
    ],
  },
  {
    id: 7,
    title: '7. The Optical Playground',
    subtitle: 'Grand Finale: Horn, Mirror, Dove Prism & Crystal Orb',
    hint: 'A grand optical sandbox! Route the spectrum through celestial instruments to charge all targets.',
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 8,
      rayCount: 56,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 500),
        rot: 0.18,
        scale: 1.0,
        baseIndex: 1.52,
        dispersionB: 28000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(440, 260),
        rot: -0.62,
        scale: 1.0,
        baseIndex: 1.0,
        dispersionB: 0,
        shape: 'mirror',
      },
      {
        id: 3,
        pos: v2(450, 720),
        rot: 0.35,
        scale: 1.0,
        baseIndex: 1.53,
        dispersionB: 18000,
        shape: 'dove',
      },
      {
        id: 4,
        pos: v2(640, 500),
        rot: 0,
        scale: 1.15,
        baseIndex: 1.56,
        dispersionB: 24000,
        shape: 'orb',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 200),
        radius: 24,
        minLambda: 620,
        maxLambda: 685,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(880, 370),
        radius: 24,
        minLambda: 575,
        maxLambda: 615,
        charge: 0,
        isSatisfied: false,
        name: 'Gold Sensor',
      },
      {
        id: 3,
        pos: v2(880, 500),
        radius: 24,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: 'Green Sensor',
      },
      {
        id: 4,
        pos: v2(880, 650),
        radius: 24,
        minLambda: 470,
        maxLambda: 515,
        charge: 0,
        isSatisfied: false,
        name: 'Cyan Sensor',
      },
      {
        id: 5,
        pos: v2(880, 820),
        radius: 24,
        minLambda: 400,
        maxLambda: 450,
        charge: 0,
        isSatisfied: false,
        name: 'Violet Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [
          v2(500, 460),
          v2(540, 460),
          v2(540, 540),
          v2(500, 540),
        ],
      },
    ],
  },
];
