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
// 🌟 17 EXPANDED PROGRESSION LEVELS
// Carefully calibrated with strict optics & no auto-solving on startup.
// =========================================================================
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: "1. The First Horn",
    subtitle: "Double refraction: Snell's law meets celestial horn",
    hint: "Rotate your unicorn horn into the white beam. Snell's law will bend the green photons straight into the sensor.",
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
        pos: v2(400, 600),
        rot: 0.85,
        scale: 1,
        baseIndex: 1.5,
        dispersionB: 22000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(870, 644),
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
    title: "2. The Prismatic Party",
    subtitle: "Cauchy dispersion: White light was a rainbow party all along",
    hint: "Red bends gently, violet takes a sharp dive. Angle your horn so the fanned-out rainbow hits all three sensors simultaneously!",
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
    subtitle: "Upward refraction: Sneaking photons past dark barriers",
    hint: "The sensor is hiding behind heavy obsidian. Flip your horn upside down to refract the beam upward into the pocket!",
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
        pos: v2(340, 820),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 22000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 528),
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
        points: [v2(700, 50), v2(740, 50), v2(740, 660), v2(700, 660)]
      }
    ]
  },
  {
    id: 4,
    title: "4. The Periscope Trick",
    subtitle: "Total Internal Reflection: Trapping light at critical angles",
    hint: "Refraction alone can't make a sharp 90° turn. Tilt the horn past the critical angle to bounce light 100% internally!",
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
        pos: v2(880, 856),
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
    id: 5,
    title: "5. The Celestial Mirror",
    subtitle: "Specular zig-zag: Polished chrome meets crystal refraction",
    hint: "Bank the beam down with the mirror, then use your horn to scoop the photons back up into the amber sensor.",
    emitter: {
      pos: v2(90, 550),
      angle: -1.1,
      width: 7,
      rayCount: 48,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 750),
        rot: 0,
        scale: 1.4,
        baseIndex: 1,
        dispersionB: 0,
        shape: "mirror"
      },
      {
        id: 2,
        pos: v2(240, 850),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 22000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 521),
        radius: 25,
        minLambda: 500,
        maxLambda: 600,
        charge: 0,
        isSatisfied: false,
        name: "Amber Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(540, 50), v2(580, 50), v2(580, 600), v2(540, 600)]
      },

    ]
  },
  {
    id: 6,
    title: "6. Cosmic Trickshot",
    subtitle: "Bank shots: Fixed mirrors, dark obstacles, and movable horns",
    hint: "Bank the incoming beam off the mirror floor, then position your horn to split the rebound across both sensors.",
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
    id: 7,
    title: "7. Upside-Down Rainbow",
    subtitle: "Spectral inversion: Mirrors flip the rainbow upside down",
    hint: "The horn puts Red on top and Blue below, but the sensors want the exact opposite. Bounce the rainbow off the mirror to flip its order!",
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
        radius: 24,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor (Top)"
      },
      {
        id: 2,
        pos: v2(880, 668),
        radius: 22,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor (Mid)"
      },
      {
        id: 3,
        pos: v2(880, 705),
        radius: 24,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor (Bot)"
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
    id: 8,
    title: "8. Hall of Mirrors",
    subtitle: "Multi-bounce pinball: Wrangling photons in a reflective maze",
    hint: "Aim for the floor mirror to trigger a wild ricochet into the green sensor, while clipping the red sensor along the way!",
    emitter: {
      pos: v2(90, 200),
      angle: -0.2,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 500),
        rot: 0.5,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(340, 700),
        radius: 26,
        minLambda: 620,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(750, 180),
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
        // Left side mirror (entire left wall)
        points: [v2(30, 50), v2(50, 50), v2(50, 760), v2(30, 760)],
        isMirror: true
      },
      {
        id: 2,
        // Bottom mirror (entire floor)
        points: [v2(100, 840), v2(800, 840), v2(800, 860), v2(100, 860)],
        isMirror: true
      },
      {
        id: 3,
        // Right side mirror (entire right wall)
        points: [v2(930, 50), v2(950, 50), v2(950, 760), v2(930, 760)],
        isMirror: true
      },
      {
        id: 4,
        // Middle vertical mirror (from ceiling down to ~3/4 height)
        points: [v2(490, 50), v2(510, 50), v2(510, 520), v2(490, 520)],
        isMirror: true
      }
    ]
  },
  {
    id: 9,
    title: "9. Enter the Dove Prism",
    subtitle: "Dove mechanics: Flipping beam order without deflecting the path",
    hint: "The colors are upside down in a narrow tunnel! A horn will steer into the walls—only the Dove prism flips order without bending the beam.",
    emitter: [
      {
        pos: v2(90, 485),
        angle: 0,
        width: 4,
        rayCount: 32,
        minLambda: 650,
        maxLambda: 680
      },
      {
        pos: v2(90, 515),
        angle: 0,
        width: 4,
        rayCount: 32,
        minLambda: 440,
        maxLambda: 470
      }
    ],
    prisms: [
      {
        id: 1,
        pos: v2(300, 750),
        rot: 2,
        scale: 1.6,
        baseIndex: 1.53,
        dispersionB: 12000,
        shape: "dove"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 485),
        radius: 20,
        minLambda: 440,
        maxLambda: 470,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor (Top)"
      },
      {
        id: 2,
        pos: v2(880, 515),
        radius: 20,
        minLambda: 650,
        maxLambda: 680,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor (Bot)"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(480, 50), v2(880, 50), v2(880, 465), v2(480, 465)]
      },
      {
        id: 2,
        points: [v2(480, 535), v2(880, 535), v2(880, 950), v2(480, 950)]
      }
    ]
  },
  {
    id: 10,
    title: "10. The Prismatic Inversion",
    subtitle: "Double optical combo: Cauchy dispersion plus Dove inversion",
    hint: "Fan out the white beam into a full rainbow with your horn, then send it through the Dove prism to reverse the color stack.",
    emitter: {
      pos: v2(90, 480),
      angle: 0,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 750),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: "horn"
      },
      {
        id: 2,
        pos: v2(560, 750),
        rot: 0,
        scale: 1.6,
        baseIndex: 1.53,
        dispersionB: 8000,
        shape: "dove"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 530),
        radius: 24,
        minLambda: 400,
        maxLambda: 480,
        charge: 0,
        isSatisfied: false,
        name: "Blue Sensor"
      },
      {
        id: 2,
        pos: v2(880, 480),
        radius: 22,
        minLambda: 520,
        maxLambda: 565,
        charge: 0,
        isSatisfied: false,
        name: "Green Sensor"
      },
      {
        id: 3,
        pos: v2(880, 430),
        radius: 24,
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
        points: [v2(650, 50), v2(880, 50), v2(880, 390), v2(650, 390)]
      },
      {
        id: 2,
        points: [v2(650, 570), v2(880, 570), v2(880, 950), v2(650, 950)]
      }
    ]
  },
  {
    id: 11,
    title: "11. The Crystal Orb",
    subtitle: "Spherical refraction: Threading photons through the needle's eye",
    hint: "That beam is way too fat for the slit! Focus it to a sharp point with the Crystal Orb, then steer the exit ray with your horn.",
    emitter: {
      pos: v2(90, 300),
      angle: 0,
      width: 28,
      rayCount: 72,
      minLambda: 400,
      maxLambda: 700
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
      },
      {
        id: 2,
        pos: v2(580, 750),
        rot: 0,
        scale: 1,
        baseIndex: 1.52,
        dispersionB: 35000,
        shape: "horn"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 473),
        radius: 26,
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
        points: [v2(420, 50), v2(460, 50), v2(460, 292), v2(420, 292)]
      },
      {
        id: 2,
        points: [v2(420, 308), v2(460, 308), v2(460, 950), v2(420, 950)]
      },
      {
        id: 3,
        points: [v2(700, 250), v2(740, 250), v2(740, 350), v2(700, 350)]
      }
    ]
  },
  {
    id: 12,
    title: "12. Squeeze & Scatter",
    subtitle: "Optical tag-team: Spherical focusing into crystalline dispersion",
    hint: "Squeeze the wide beam through the keyhole with the Orb, then catch the focal point with your horn to split Green and Cyan.",
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
        points: [v2(370, 50), v2(390, 50), v2(390, 492), v2(370, 492)]
      },
      {
        id: 2,
        points: [v2(370, 508), v2(390, 508), v2(390, 950), v2(370, 950)]
      }
    ]
  },
  {
    id: 13,
    title: "13. Additive Alchemy: Yellow",
    subtitle: "Color synthesis: Red + Green = 100% Golden Yellow",
    hint: "Single wavelengths won't satisfy this picky sensor. Intersect both Red and Green beams right inside its lens!",
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
        radius: 45,
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
        points: [v2(520, 50), v2(560, 50), v2(560, 260), v2(520, 260)]
      },
      {
        id: 2,
        points: [v2(520, 740), v2(560, 740), v2(560, 950), v2(520, 950)]
      }
    ]
  },
  {
    id: 14,
    title: "14. Dual Synthesis",
    subtitle: "Photon cocktail: Mixing Cyan and Magenta on demand",
    hint: "Blue is in high demand! Use the Orb to broaden the Blue beam so it pairs with Red at the top and Green at the bottom.",
    emitter: [
      {
        pos: v2(90, 180),
        angle: 0,
        width: 6,
        rayCount: 48,
        minLambda: 650,
        maxLambda: 680
      },
      {
        pos: v2(90, 500),
        angle: 0,
        width: 36,
        rayCount: 64,
        minLambda: 440,
        maxLambda: 470
      },
      {
        pos: v2(90, 820),
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
        pos: v2(320, 200),
        rot: 0,
        scale: 1.35,
        baseIndex: 1.58,
        dispersionB: 18000,
        shape: "orb"
      }
    ],
    targets: [
      {
        id: 1,
        pos: v2(880, 296),
        radius: 30,
        targetRgb: [
          255,
          40,
          120
        ],
        minLambda: 400,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Magenta Sensor (Top)"
      },
      {
        id: 2,
        pos: v2(880, 690),
        radius: 30,
        targetRgb: [
          0,
          255,
          140
        ],
        minLambda: 400,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Cyan Sensor (Bot)"
      }
    ],
    obstacles: []
  },
  {
    id: 15,
    title: "15. The Great Recombination",
    subtitle: "Additive recombination: Merging the rainbow back to white",
    hint: "Single colors are too moody for this sensor. Use the second horn to re-converge the dispersed rainbow into pure white light!",
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
        pos: v2(880, 670),
        radius: 40,
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
    id: 16,
    title: "16. The Prismatic Ensemble",
    subtitle: "Three-way synergy: Horn, Mirror, and Orb in concert",
    hint: "Send photons on a grand tour: bend up with the horn, bank off the mirror, and focus into both sensors with the Orb.",
    emitter: {
      pos: v2(90, 750),
      angle: 0,
      width: 7,
      rayCount: 48,
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
        pos: v2(740, 850),
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
        pos: v2(880, 405),
        radius: 26,
        minLambda: 580,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "Red Sensor"
      },
      {
        id: 2,
        pos: v2(880, 770),
        radius: 26,
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
    id: 17,
    title: "17. The Grand Optical Symphony",
    subtitle: "Master of photons: The ultimate multi-spectral finale",
    hint: "The complete optical laboratory is yours. Orchestrate Horns, Mirrors, Orb, and Dove prism to illuminate every sensor—including the central White core!",
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
      },
      {
        id: 5,
        pos: v2(380, 640),
        rot: 0,
        scale: 1.4,
        baseIndex: 1.53,
        dispersionB: 8000,
        shape: "dove"
      },
      {
        id: 6,
        pos: v2(560, 160),
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
      },
      {
        id: 6,
        pos: v2(500, 500),
        radius: 35,
        targetRgb: [
          255,
          255,
          255
        ],
        minLambda: 400,
        maxLambda: 700,
        charge: 0,
        isSatisfied: false,
        name: "White Sensor (Core)"
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
