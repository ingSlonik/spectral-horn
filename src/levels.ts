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
  {
    id: 4,
    title: '4. Total Internal Reflection',
    subtitle: 'Critical angles: when crystal turns into a mirror',
    hint: 'Refraction alone cannot make this sharp 90° turn. Rotate into a steep angle for internal reflection!',
    emitter: {
      pos: v2(90, 240),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(340, 240),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.56,
        dispersionB: 15000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(340, 750),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.56,
        dispersionB: 15000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 780),
        radius: 28,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: 'Blue Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(480, 50), v2(520, 50), v2(520, 650), v2(480, 650)],
      },
    ],
  },
  {
    id: 5,
    title: '5. Twin Horn Relay',
    subtitle: 'Pass the photon: multi-stage crystal cascade',
    hint: 'First horn bends the beam downward under wall 1, second horn catches it and sends it over wall 2!',
    emitter: {
      pos: v2(90, 240),
      angle: 0,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(220, 240),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 20000,
        shape: 'horn',
      },
      {
        id: 2,
        pos: v2(520, 410),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.5,
        dispersionB: 20000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 420),
        radius: 25,
        minLambda: 620,
        maxLambda: 685,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(880, 465),
        radius: 25,
        minLambda: 420,
        maxLambda: 485,
        charge: 0,
        isSatisfied: false,
        name: 'Blue Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(360, 50), v2(400, 50), v2(400, 290), v2(360, 290)],
      },
      {
        id: 2,
        points: [v2(660, 470), v2(700, 470), v2(700, 950), v2(660, 950)],
      },
    ],
  },
  {
    id: 6,
    title: '6. The Celestial Mirror',
    subtitle: 'Specular reflection: keep your beam intact',
    hint: 'Mirrors don\'t split rainbows—they bounce the whole white beam like a champ.',
    emitter: {
      pos: v2(90, 750),
      angle: -1.27,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(260, 200),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.0,
        dispersionB: 0,
        shape: 'mirror',
      },
      {
        id: 2,
        pos: v2(640, 200),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.52,
        dispersionB: 26000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 328),
        radius: 24,
        minLambda: 620,
        maxLambda: 685,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(880, 368),
        radius: 24,
        minLambda: 420,
        maxLambda: 485,
        charge: 0,
        isSatisfied: false,
        name: 'Blue Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(480, 420), v2(520, 420), v2(520, 950), v2(480, 950)],
      },
    ],
  },
  {
    id: 7,
    title: '7. Chrome & Obsidian',
    subtitle: 'Bank shots in deep space: fixed mirrors meet moving horns',
    hint: 'Bounce the beam off the polished chrome wall before running it through the prism.',
    emitter: {
      pos: v2(90, 220),
      angle: 1.05,
      width: 7,
      rayCount: 50,
      minLambda: 400,
      maxLambda: 700,
    },
    prisms: [
      {
        id: 1,
        pos: v2(600, 570),
        rot: 0.05,
        scale: 1.0,
        baseIndex: 1.52,
        dispersionB: 26000,
        shape: 'horn',
      },
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 384),
        radius: 24,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: 'Red Sensor',
      },
      {
        id: 2,
        pos: v2(880, 422),
        radius: 24,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: 'Cyan Sensor',
      },
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(350, 50), v2(400, 50), v2(400, 480), v2(350, 480)],
      },
      {
        id: 2,
        points: [v2(260, 840), v2(580, 840), v2(580, 860), v2(260, 860)],
        isMirror: true,
      },
      {
        id: 3,
        points: [v2(680, 580), v2(730, 580), v2(730, 950), v2(680, 950)],
      },
    ],
  },
];
