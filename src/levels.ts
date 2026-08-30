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
// 🌟 16 EXPANDED PROGRESSION LEVELS
// Carefully calibrated with strict optics & no auto-solving on startup.
// =========================================================================
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: "1. The First Horn",
    subtitle: "Double refraction: bending light with crystal power",
    hint: "Rotate your horn to bend the celestial rainbow beam into the sensor.",
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
    subtitle: "Upward refraction: slipping under the lowered barrier",
    hint: "The sensor is tucked behind a lowered shield. Turn your horn upside down to bend light upward into the pocket!",
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
    title: "4. The Celestial Mirror",
    subtitle: "Specular zig-zag: mirror reflection meets horn refraction",
    hint: "Bounce the beam down between the barriers with the mirror, then use your horn to bend it back up into the sensor!",
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
    id: 5,
    title: "5. Chrome & Obsidian",
    subtitle: "Bank shots in deep space: fixed mirrors meet moving horns",
    hint: "Bounce the beam off the polished chrome floor before routing it through your prism.",
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
    id: 6,
    title: "6. Inverted Spectrum",
    subtitle: "Spectral reflection: flipping 3-color order with a mirror",
    hint: "The horn disperses Red on top and Blue below, but the three sensors are inverted! Bounce the rainbow off the mirror to reverse the spectrum.",
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
    id: 7,
    title: "7. The Crystal Labyrinth",
    subtitle: "Chamber of reflections: static mirror maze with single rainbow beam",
    hint: "Angle your horn to send the rainbow into the floor mirror, bouncing it through the ceiling reflector into both sensors!",
    emitter: {
      pos: v2(90, 200),
      angle: 0,
      width: 7,
      rayCount: 64,
      minLambda: 400,
      maxLambda: 700
    },
    prisms: [
      {
        id: 1,
        pos: v2(240, 500),
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
        pos: v2(880, 350),
        radius: 25,
        minLambda: 440,
        maxLambda: 490,
        charge: 0,
        isSatisfied: false,
        name: "Cyan Sensor"
      },
      {
        id: 2,
        pos: v2(880, 480),
        radius: 25,
        minLambda: 400,
        maxLambda: 440,
        charge: 0,
        isSatisfied: false,
        name: "Violet Sensor"
      }
    ],
    obstacles: [
      {
        id: 1,
        points: [v2(380, 840), v2(600, 840), v2(600, 860), v2(380, 860)],
        isMirror: true
      },
      {
        id: 2,
        points: [v2(660, 60), v2(880, 60), v2(880, 80), v2(660, 80)],
        isMirror: true
      },
      {
        id: 3,
        points: [v2(340, 50), v2(380, 50), v2(380, 280), v2(340, 280)]
      },
      {
        id: 4,
        points: [v2(540, 50), v2(580, 50), v2(580, 360), v2(540, 360)]
      },
      {
        id: 5,
        points: [v2(600, 580), v2(640, 580), v2(640, 840), v2(600, 840)]
      }
    ]
  },
  {
    id: 8,
    title: "8. The Crystal Orb",
    subtitle: "Spherical refraction: focusing full rainbow through the needle’s eye",
    hint: "A broad rainbow beam cannot pass through the narrow slit. Focus it with the Crystal Orb, then bend it to the target with your horn!",
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
    id: 9,
    title: "9. Focus & Disperse",
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
        points: [v2(370, 50), v2(390, 50), v2(390, 492), v2(370, 492)]
      },
      {
        id: 2,
        points: [v2(370, 508), v2(390, 508), v2(390, 950), v2(370, 950)]
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
    id: 11,
    title: "11. Dual Synthesis: Cyan & Magenta",
    subtitle: "Secondary harmonics: mixing Green, Blue, and Red across distance",
    hint: "Blue is in high demand! Use the Orb to expand Blue light so it combines with Red at the top and Green at the bottom.",
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
    id: 13,
    title: "13. Total Internal Reflection",
    subtitle: "Critical angles: 90° periscope turns inside crystal",
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
    id: 14,
    title: "14. Inverted Spectrum: The Dove Prism",
    subtitle: "Image inversion: flipping spectra without angular deflection",
    hint: "The colors are inverted inside the horizontal tunnel! A horn will deflect into the walls — only the Dove prism can flip the colors horizontally.",
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
    id: 15,
    title: "15. The Prismatic Web",
    subtitle: "Geometric synthesis: Horn, Mirror, and Orb in full harmony",
    hint: "Bend the beam upward with the Horn, bounce it off the Mirror, and focus the spectrum into the sensors with your Orb!",
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
