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
      rayCount: 64,          // Spectrum ray density
      minLambda: 400,        // 400 nm (violet)
      maxLambda: 700,        // 700 nm (red)
    },
    {
      pos: v2(920, 260),     // Right emitter position [X, Y]
      angle: 3,              // Beam angle in radians (aimed up-left)
      width: 7,
      rayCount: 64,
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

// =========================================================================
// 🌈 16-LEVEL PROGRESSION CURRICULUM
// Each level introduces exactly ONE new mechanic, optical element, or rule:
// 1. Horn Refraction (Basic angle control)
// 2. Cauchy Dispersion (Rainbow splitting R/G/V)
// 3. Upward Refraction & Obstacles
// 4. Crystal Orb (Spherical lens focusing)
// 5. Focus & Disperse (Orb + Horn pairing)
// 6. The Celestial Mirror (Movable mirror reflection)
// 7. Chrome & Obsidian (Fixed mirror walls)
// 8. Inverted Spectrum (Flipping color order with mirror)
// 9. The Crystal Labyrinth (Multi-room mirror puzzle)
// 10. Additive Synthesis: Yellow (Two beams combining)
// 11. Dual Synthesis: Cyan & Magenta (3 beams secondary harmonics)
// 12. Recombining White (Reverse dispersion)
// 13. Total Internal Reflection (TIR critical angles)
// 14. Dove Prism (Optical inversion)
// 15. The Prismatic Web (Horn + Mirror + Orb chain)
// 16. The Grand Optical Symphony (Culmination of all mechanics)
// =========================================================================
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: "1. The First Horn",
    subtitle: "Double refraction: bending light with crystal power",
    hint: "Rotate your horn to bend the emerald beam into the sensor.",
    emitter: {
      pos: v2(90, 420),
      angle: 0,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(440, 420),
        rot: 0.35,
        scale: 1,
        baseIndex: 1.5,
        dispersionB: 22000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(870, 660),
        radius: 26,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      }
    ],
    obstacles: []
  },
  {
    id: 2,
    title: "2. Rainbow Dispersion",
    subtitle: "Cauchy dispersion: splitting white light into primary spectra",
    hint: "Red bends gently, violet takes the sharpest dive. Position your horn to fan out the rainbow across all three sensors!",
    emitter: {
      pos: v2(90, 300),
      angle: 0,
      width: 6,
      rayCount: 72,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 520),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 45000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 636),
        radius: 25,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(880, 679),
        radius: 25,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      },
      {
        id: 3,
        pos: v2(880, 777),
        radius: 25,
        minLambda: 400,
        maxLambda: 460,
        charge: 0,
        isSatisfied: false,
        name: "Violet Sensor"
      }
    ],
    obstacles: []
  },
  {
    id: 3,
    title: "3. The Obsidian Shield",
    subtitle: "Upward refraction: slipping under the barrier",
    hint: "The sensor is tucked behind a heavy shield. Turn your horn upside down to bend light upward into the pocket!",
    emitter: {
      pos: v2(90, 820),
      angle: 0,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 600),
        rot: 0,
        scale: 1,
        baseIndex: 1.5,
        dispersionB: 45000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 475),
        radius: 24,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(750, 50), v2(790, 50), v2(790, 510), v2(750, 510)]
      }
    ]
  },
  {
    id: 4,
    title: "4. The Crystal Orb",
    subtitle: "Spherical refraction: focusing light through the needle’s eye",
    hint: "A wide beam cannot pass through the solid wall. Move the spherical crystal orb into the beam to focus and bend the rays through the slit!",
    emitter: {
      pos: v2(90, 420),
      angle: 0,
      width: 28,
      rayCount: 72,
      minLambda: 520,
      maxLambda: 565
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 750),
        rot: 0,
        scale: 1.25,
        baseIndex: 1.58,
        dispersionB: 18000,
        shape: "orb"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 575),
        radius: 26,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(620, 50), v2(660, 50), v2(660, 490), v2(620, 490)]
      },
      {
        id: 2,
        points: [v2(620, 560), v2(660, 560), v2(660, 950), v2(620, 950)]
      }
    ]
  },
  {
    id: 5,
    title: "5. Focus & Disperse",
    subtitle: "Harmonic pairing: spherical lens meets dispersive crystal",
    hint: "First focus the broad beam through the keyhole with the Orb, then place the Horn to split the focused beam into Green and Cyan sensors!",
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 24,
      rayCount: 72,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 240),
        rot: 0,
        scale: 1.15,
        baseIndex: 1.56,
        dispersionB: 20000,
        shape: "orb"
      },
      {
        id: 2,
        pos: v2(750, 750),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 45000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 750),
        radius: 25,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      },
      {
        id: 2,
        pos: v2(880, 435),
        radius: 25,
        minLambda: 480,
        maxLambda: 520,
        charge: 0,
        isSatisfied: false,
        name: "Cyan Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(370, 50), v2(390, 50), v2(390, 485), v2(370, 485)]
      },
      {
        id: 2,
        points: [v2(370, 515), v2(390, 515), v2(390, 950), v2(370, 950)]
      }
    ]
  },
  {
    id: 6,
    title: "6. The Celestial Mirror",
    subtitle: "Specular reflection: keep your beam intact",
    hint: "Mirrors bounce the entire white beam without splitting colors. Angle the mirror to bounce the beam around the wall into the horn!",
    emitter: {
      pos: v2(90, 750),
      angle: -1.27,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(380, 300),
        rot: 0,
        scale: 1.1,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      },
      {
        id: 2,
        pos: v2(750, 300),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 45000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 335),
        radius: 22,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(880, 182),
        radius: 24,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(480, 420), v2(520, 420), v2(520, 950), v2(480, 950)]
      }
    ]
  },
  {
    id: 7,
    title: "7. Chrome & Obsidian",
    subtitle: "Bank shots in deep space: fixed mirrors meet moving horns",
    hint: "Bounce the beam off the polished chrome wall at the bottom before routing it through your prism.",
    emitter: {
      pos: v2(90, 220),
      angle: 1.05,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(300, 450),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 45000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 230),
        radius: 25,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(880, 88),
        radius: 25,
        minLambda: 400,
        maxLambda: 490,
        targetRgb: [
          0,
          240,
          255
        ],
        charge: 0,
        isSatisfied: false,
        name: "Cyan Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(350, 50), v2(400, 50), v2(400, 480), v2(350, 480)]
      },
      {
        id: 2,
        points: [v2(260, 840), v2(580, 840), v2(580, 860), v2(260, 860)],
        isMirror: true
      },
      {
        id: 3,
        points: [v2(680, 580), v2(730, 580), v2(730, 950), v2(680, 950)]
      }
    ]
  },
  {
    id: 8,
    title: "8. Inverted Spectrum",
    subtitle: "Spectral reflection: flipping color order with a mirror",
    hint: "The horn disperses Red on top and Blue below, but the sensors are inverted! Bounce the dispersed rainbow off the mirror to flip the color order.",
    emitter: {
      pos: v2(90, 200),
      angle: 0,
      width: 6,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(220, 450),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 45000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(580, 850),
        rot: 0,
        scale: 1.8,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 630),
        radius: 25,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      },
      {
        id: 2,
        pos: v2(880, 703),
        radius: 25,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(320, 50), v2(360, 50), v2(360, 260), v2(320, 260)]
      }
    ]
  },
  {
    id: 9,
    title: "9. The Crystal Labyrinth",
    subtitle: "Chamber of reflections: multi-room optical routing",
    hint: "Route the primary beam through the labyrinth using your mirrors, then let the horn split the colors into the sensor chamber!",
    emitter: {
      pos: v2(90, 180),
      angle: 0,
      width: 7,
      rayCount: 68,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(180, 450),
        rot: 0,
        scale: 1.2,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      },
      {
        id: 2,
        pos: v2(380, 450),
        rot: 0,
        scale: 1.2,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      },
      {
        id: 3,
        pos: v2(750, 750),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 45000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 534),
        radius: 25,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(880, 424),
        radius: 25,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(350, 50), v2(390, 50), v2(390, 720), v2(350, 720)]
      },
      {
        id: 2,
        points: [v2(580, 720), v2(620, 720), v2(620, 950), v2(580, 950)]
      }
    ]
  },
  {
    id: 10,
    title: "10. Additive Alchemy: Yellow",
    subtitle: "RGB synthesis: Red + Green = Golden Glow",
    hint: "Single colors won't satisfy this sensor. Intersect both beams right inside its lens!",
    emitter: [
      {
        pos: v2(90, 240),
        angle: 0,
        width: 7,
        rayCount: 52,
        minLambda: 650,
        maxLambda: 680
      },
      {
        pos: v2(90, 760),
        angle: 0,
        width: 7,
        rayCount: 52,
        minLambda: 525,
        maxLambda: 545
      }
    ],
    prisms: [
      {
        id: 1,
        pos: v2(240, 240),
        rot: 0.35,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 12000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(240, 760),
        rot: -0.35,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 12000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(870, 500),
        radius: 26,
        minLambda: 520,
        maxLambda: 680,
        targetRgb: [
          255,
          235,
          0
        ],
        charge: 0,
        isSatisfied: false,
        name: "Yellow Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(520, 360), v2(560, 360), v2(560, 640), v2(520, 640)]
      }
    ]
  },
  {
    id: 11,
    title: "11. Dual Synthesis: Cyan & Magenta",
    subtitle: "Secondary harmonics: mixing Green, Blue, and Red",
    hint: "Blue is in high demand! Mix Blue with Green for Cyan, and Blue with Red for radiant Magenta.",
    emitter: [
      {
        pos: v2(90, 200),
        angle: 0,
        width: 6,
        rayCount: 48,
        minLambda: 650,
        maxLambda: 680
      },
      {
        pos: v2(90, 500),
        angle: 0,
        width: 28,
        rayCount: 64,
        minLambda: 440,
        maxLambda: 470
      },
      {
        pos: v2(90, 800),
        angle: 0,
        width: 6,
        rayCount: 48,
        minLambda: 525,
        maxLambda: 545
      }
    ],
    prisms: [
      {
        id: 1,
        pos: v2(240, 160),
        rot: 0,
        scale: 1,
        baseIndex: 1.5,
        dispersionB: 8000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(240, 840),
        rot: 0,
        scale: 1,
        baseIndex: 1.5,
        dispersionB: 8000,
        shape: "horn"
      },
      {
        id: 3,
        pos: v2(340, 360),
        rot: 0,
        scale: 1.25,
        baseIndex: 1.58,
        dispersionB: 18000,
        shape: "orb"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 478),
        radius: 28,
        targetRgb: [
          255,
          40,
          120
        ],
        minLambda: 400,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Magenta Sensor"
      },
      {
        id: 2,
        pos: v2(880, 514),
        radius: 28,
        targetRgb: [
          0,
          255,
          140
        ],
        minLambda: 400,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Cyan Sensor"
      }
    ],
    obstacles: []
  },
  {
    id: 12,
    title: "12. Recombining White",
    subtitle: "Newton's reverse trick: putting the rainbow back together",
    hint: "Individual spectral colors are too saturated. Converge the whole rainbow back into pure white light!",
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 6,
      rayCount: 68,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 300),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 26000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(580, 850),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 26000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 664),
        radius: 28,
        targetRgb: [
          255,
          255,
          255
        ],
        minLambda: 400,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "White Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(420, 50), v2(460, 50), v2(460, 560), v2(420, 560)]
      }
    ]
  },
  {
    id: 13,
    title: "13. Total Internal Reflection",
    subtitle: "Critical angles: when crystal turns into a mirror",
    hint: "Refraction alone cannot make this sharp 90° turn. Rotate the horn into a steep angle for internal reflection!",
    emitter: {
      pos: v2(90, 240),
      angle: 0,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 240),
        rot: 0,
        scale: 1,
        baseIndex: 1.56,
        dispersionB: 15000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(240, 750),
        rot: 0,
        scale: 1,
        baseIndex: 1.56,
        dispersionB: 15000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 832),
        radius: 28,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(480, 50), v2(520, 50), v2(520, 650), v2(480, 650)]
      }
    ]
  },
  {
    id: 14,
    title: "14. Inverted Spectrum: The Dove Prism",
    subtitle: "Image inversion: flipping rainbows upside-down",
    hint: "The colors are in the wrong order! Run them through the Dove prism to flip the spectrum.",
    emitter: {
      pos: v2(90, 500),
      angle: 0,
      width: 6,
      rayCount: 68,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 300),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 26000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(540, 850),
        rot: 0,
        scale: 1.1,
        baseIndex: 1.53,
        dispersionB: 12000,
        shape: "dove"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 893),
        radius: 25,
        minLambda: 400,
        maxLambda: 485,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      },
      {
        id: 2,
        pos: v2(880, 808),
        radius: 25,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(420, 50), v2(460, 50), v2(460, 540), v2(420, 540)]
      }
    ]
  },
  {
    id: 15,
    title: "15. The Prismatic Web",
    subtitle: "Geometric synthesis: lens, mirror, and crystal in one flow",
    hint: "Bend the beam upward with your horn, bounce it off the mirror, and focus the spectrum into the sensors with your orb!",
    emitter: {
      pos: v2(90, 750),
      angle: 0,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 550),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(450, 250),
        rot: 0,
        scale: 1.5,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      },
      {
        id: 3,
        pos: v2(750, 450),
        rot: 0,
        scale: 1.25,
        baseIndex: 1.58,
        dispersionB: 18000,
        shape: "orb"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 415),
        radius: 25,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(880, 304),
        radius: 25,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(400, 680), v2(440, 680), v2(440, 950), v2(400, 950)]
      }
    ]
  },
  {
    id: 16,
    title: "16. The Grand Optical Symphony",
    subtitle: "Master of photons: the ultimate celestial harmony",
    hint: "Your entire optical toolkit is unlocked. Orchestrate all four artifacts to illuminate every sensor!",
    emitter: [
      {
        pos: v2(90, 240),
        angle: 0,
        width: 6,
        rayCount: 48,
        minLambda: 400,
        maxLambda: 700
      },
      {
        pos: v2(90, 440),
        angle: 0.12,
        width: 8,
        rayCount: 48,
        minLambda: 520,
        maxLambda: 565
      },
      {
        pos: v2(90, 760),
        angle: 0,
        width: 6,
        rayCount: 48,
        minLambda: 400,
        maxLambda: 700
      }
    ],
    prisms: [
      {
        id: 1,
        pos: v2(240, 160),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(380, 360),
        rot: 0,
        scale: 1.25,
        baseIndex: 1.58,
        dispersionB: 18000,
        shape: "orb"
      },
      {
        id: 3,
        pos: v2(240, 860),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: "horn"
      },
      {
        id: 4,
        pos: v2(560, 860),
        rot: 0,
        scale: 1.4,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 310),
        radius: 22,
        minLambda: 400,
        maxLambda: 450,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor 1"
      },
      {
        id: 2,
        pos: v2(880, 435),
        radius: 20,
        minLambda: 630,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor 1"
      },
      {
        id: 3,
        pos: v2(880, 500),
        radius: 24,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      },
      {
        id: 4,
        pos: v2(880, 560),
        radius: 20,
        minLambda: 630,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor 2"
      },
      {
        id: 5,
        pos: v2(880, 655),
        radius: 22,
        minLambda: 400,
        maxLambda: 450,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor 2"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(450, 50), v2(490, 50), v2(490, 220), v2(450, 220)]
      },
      {
        id: 2,
        points: [v2(450, 780), v2(490, 780), v2(490, 950), v2(450, 950)]
      }
    ]
  }
];
