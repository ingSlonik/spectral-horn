import { LevelDef, Emitter, Prism } from './types';
import { v2 } from './math';

const { PI } = Math;

export const TITLE_SCENE: { emitters: Emitter[]; prisms: Prism[] } = {
  emitters: [[80, 260, 0.15], [920, 260, 3]].map(([x, y, angle]) => ({
    pos: v2(x, y), angle, width: 7, rayCount: 64, minLambda: 400, maxLambda: 700
  })),
  prisms: [200, 800].map((x, i) => ({
    id: i + 1,
    pos: v2(x, 300),
    rot: 0,
    scale: 1,
    baseIndex: 1.52,
    dispersionB: 28000,
    shape: 'horn' as const,
    basePos: v2(x, 300),
    baseRot: 0,
    swayPhase: i ? PI : 0.1,
  })),
};

// OPTIMIZATION (STRING DEDUPLICATION):
// Sensor names share the ' Sensor' suffix. Consolidating into an array with '.map(s => s + " Sensor")'
// saves 13 repeated occurrences of the string literal ' Sensor' in the unminified JS source.
const [RS, GS, BS, VS, AS, CS, WS, BST, GSM, RSB, MST, CSB, YS] = [
  'Red', 'Green', 'Blue', 'Violet', 'Amber', 'Cyan', 'White',
  'Blue (Top)', 'Green (Mid)', 'Red (Bot)', 'Magenta (Top)', 'Cyan (Bot)', 'Yellow'
].map((s) => s + ' Sensor');

const [MIRROR, DOVE, ORB] = ['mirror', 'dove', 'orb'] as const;

// OPTIMIZATION (COMPACT TUPLE ENCODING):
// Why tuples instead of object literals?
// Object literals like `{ title: "...", emitter: [{ pos: { x, y }, angle: 0, width: 7, ... }] }`
// require property names to remain in the bundle unless unsafe property mangling is used.
// By using positional array tuples `[title, hint, emitters, prisms, targets, obstacles]`, all property
// key strings are eliminated entirely from the data representation.
//
// Positional tuple formats:
// - Emitter:  [x, y, angle=0, width=7, rayCount=64, minLambda=400, maxLambda=700]
// - Prism:    [x, y, rot=0, scale=1, baseIndex=1.52, dispersionB=22000, shape='horn', swayPhase=0]
//             Smart shape tokens: [x, y, 'mirror'|'dove'|'orb', scale, ...] auto-configures defaults.
//             Smart dispersion: [x, y, 45000] treats numbers > 100 as dispersionB.
// - Target:   [x, y, minLambda, maxLambda, radius=25, name='', targetRgb?]
// - Obstacle: [x1, y1, x2, y2, isMirror=false]
const RAW_LEVELS: any[] = [
  [
    'First Horn',
    "Rotate your horn into the beam. Snell's law refracts green photons directly into the sensor.",
    [90, 420],
    [[400, 600, 0.85, 1, 1.5]],
    [[870, 644, 520, 565, GS]],
  ],
  [
    'Prismatic Party',
    'Red bends gently, violet sharply. Fan the rainbow across all three sensors simultaneously!',
    [90, 300, 0, 6, 72],
    [[240, 520, 45000]],
    [
      [880, 636, 620, 700, RS],
      [880, 679, 520, 565, GS],
      [880, 777, 400, 460, VS],
    ],
  ],
  [
    'Obsidian Shield',
    'The sensor hides behind obsidian. Flip your horn upside down to refract photons upward!',
    [90, 820],
    [[340, 820]],
    [[880, 528, 520, 565, GS]],
    [[700, 50, 740, 660]],
  ],
  [
    'Periscope Trick',
    "Refraction can't turn 90°. Tilt past the critical angle for total internal reflection!",
    [90, 240],
    [[240, 240, 0, 1, 1.56, 15000], [240, 750, 0, 1, 1.56, 15000]],
    [[880, 856, 400, 480, BS]],
    [[480, 50, 520, 650]],
  ],
  [
    'Celestial Mirror',
    'Bank the beam off the mirror, then scoop photons back up into the amber sensor.',
    [90, 550, -1.1, 7, 48],
    [[240, 750, MIRROR, 1.4], [240, 850]],
    [[880, 521, 500, 600, AS]],
    [[540, 50, 580, 600]],
  ],
  [
    'Cosmic Trickshot',
    'Bank off the floor mirror, then position your horn to split the rebound into both sensors.',
    [90, 220, 1.05],
    [[300, 450, 45000]],
    [
      [880, 230, 620, 700, RS],
      [880, 88, 400, 490, CS, [0, 240, 255]],
    ],
    [[350, 50, 400, 480], [260, 840, 580, 860, true], [680, 580, 730, 950]],
  ],
  [
    'Upside-Down Rainbow',
    'The horn puts Red on top and Blue below. Bounce off the mirror to invert the colors!',
    [90, 200, 0, 6],
    [[220, 450, 45000], [580, 850, MIRROR, 1.8]],
    [
      [880, 630, 400, 480, BST],
      [880, 668, 520, 565, GSM],
      [880, 705, 620, 700, RSB],
    ],
    [[320, 50, 360, 260]],
  ],
  [
    'Hall of Mirrors',
    'Ricochet off the floor mirror into the green sensor, clipping the red sensor en route!',
    [90, 200, -0.2],
    [[240, 500, 0.5, 1, 1.52, 35000]],
    [
      [340, 700, 620, 700, RS],
      [750, 180, 520, 565, GS],
    ],
    [
      [30, 50, 50, 760, true],
      [100, 840, 800, 860, true],
      [930, 50, 950, 760, true],
      [490, 50, 510, 520, true],
    ],
  ],
  [
    'Enter the Dove',
    'Colors inverted in a tunnel! The Dove prism flips color order without bending the beam.',
    [[90, 485, 0, 4, 32, 650, 680], [90, 515, 0, 4, 32, 440, 470]],
    [[300, 750, 2, 1.6, 1.53, 12000, DOVE]],
    [
      [880, 485, 440, 470, 20, BST],
      [880, 515, 650, 680, 20, RSB],
    ],
    [[480, 50, 880, 465], [480, 535, 880, 950]],
  ],
  [
    'Prismatic Inversion',
    'Fan out a rainbow, then pass through the Dove prism to reverse the color stack.',
    [90, 480],
    [[240, 750, 35000], [560, 750, DOVE, 1.6, 1.53, 8000]],
    [
      [880, 530, 400, 480, BS],
      [880, 480, 520, 565, GS],
      [880, 430, 620, 700, RS],
    ],
    [[650, 50, 880, 390], [650, 570, 880, 950]],
  ],
  [
    'Crystal Orb',
    'Beam too wide! Focus to a point with the Orb, then steer the exit ray with your horn.',
    [90, 300, 0, 28, 72],
    [[240, 750, ORB, 1.25, 1.58, 18000], [580, 750, 35000]],
    [[880, 473, 620, 700, RS]],
    [[420, 50, 460, 292], [420, 308, 460, 950], [700, 250, 740, 350]],
  ],
  [
    'Squeeze & Scatter',
    'Squeeze through the keyhole with the Orb, then catch the focal point to split colors.',
    [90, 500, 0, 24, 72],
    [[240, 240, ORB, 1.15, 1.56, 20000], [750, 750, 45000]],
    [
      [880, 750, 520, 565, GS],
      [880, 435, 480, 520, CS],
    ],
    [[370, 50, 390, 492], [370, 508, 390, 950]],
  ],
  [
    'Additive Alchemy: Yellow',
    'Pure wavelengths won\'t satisfy this sensor. Intersect Red and Green beams in its lens!',
    [[90, 240, 0, 7, 52, 650, 680], [90, 760, 0, 7, 52, 525, 545]],
    [[240, 240, 0.35, 1, 1.52, 12000], [240, 760, -0.35, 1, 1.52, 12000]],
    [[870, 500, 520, 680, 45, YS, [255, 235, 0]]],
    [[520, 50, 560, 260], [520, 740, 560, 950]],
  ],
  [
    'Dual Synthesis',
    'Broaden the Blue beam with the Orb so it pairs with Red at top and Green at bottom.',
    [
      [90, 180, 0, 6, 48, 650, 680],
      [90, 500, 0, 36, 64, 440, 470],
      [90, 820, 0, 6, 48, 525, 545],
    ],
    [
      [240, 160, 0, 1, 1.5, 8000],
      [240, 840, 0, 1, 1.5, 8000],
      [320, 200, ORB, 1.35, 1.58, 18000],
    ],
    [
      [880, 296, 400, 700, 30, MST, [255, 40, 120]],
      [880, 690, 400, 700, 30, CSB, [0, 255, 140]],
    ],
  ],
  [
    'Great Recombination',
    'Pure white light required! Use the second horn to re-converge the dispersed rainbow.',
    [90, 500, 0, 6, 68],
    [[240, 300, 26000], [580, 850, 26000]],
    [[880, 670, 400, 700, 40, WS, [255, 255, 255]]],
    [[420, 50, 460, 560]],
  ],
  [
    'Prismatic Ensemble',
    'Optical tour: bend up with the horn, bank off the mirror, and focus with the Orb.',
    [90, 750, 0, 7, 48],
    [
      [240, 550, 35000],
      [450, 250, MIRROR, 1.5],
      [740, 850, ORB, 1.25, 1.58, 18000],
    ],
    [
      [880, 405, 580, 700, RS],
      [880, 770, 400, 480, BS],
    ],
    [[400, 680, 440, 950]],
  ],
  [
    'Grand Optical Symphony',
    'Orchestrate Horns, Mirrors, Orb, and Dove to light every sensor and the White core!',
    [[90, 240, 0, 6, 48], [90, 440, 0.12, 8, 48, 520, 565], [90, 760, 0, 6, 48]],
    [
      [240, 160, 35000],
      [380, 360, ORB, 1.25, 1.58, 18000],
      [240, 860, 35000],
      [560, 860, MIRROR, 1.4],
      [380, 640, DOVE, 1.4, 1.53, 8000],
      [560, 160, MIRROR, 1.4],
    ],
    [
      [880, 310, 400, 450, 22, BS],
      [880, 435, 630, 700, 20, RS],
      [880, 500, 520, 565, 24, GS],
      [880, 560, 630, 700, 20, RS],
      [880, 655, 400, 450, 22, BS],
      [500, 500, 400, 700, 35, WS, [255, 255, 255]],
    ],
    [[450, 50, 490, 220], [450, 780, 490, 950]],
  ],
];

// OPTIMIZATION: Transform concise level definitions into full typed structures
export const LEVELS: LevelDef[] = RAW_LEVELS.map(([title, hint, ems, prs, tgs, obs], idx) => {
  const emList = typeof ems[0] === 'number' ? [ems] : ems;
  return {
    id: idx + 1,
    title: `${idx + 1}. ${title}`,
    hint,
    emitter: emList.map((a: any) => ({
      pos: v2(a[0], a[1]),
      angle: a[2] || 0,
      width: a[3] || 7,
      rayCount: a[4] || 64,
      minLambda: a[5] || 400,
      maxLambda: a[6] || 700,
    })),
    prisms: prs.map((a: any, i: number) => {
      const isStr = typeof a[2] === 'string';
      const shape = isStr ? a[2] : a[6] || 'horn';
      const isMirror = shape === 'mirror';
      const r = isStr || a[2] > 100 ? 0 : a[2] || 0;
      return {
        id: i + 1,
        pos: v2(a[0], a[1]),
        rot: r,
        scale: a[3] || 1,
        baseIndex: isStr ? a[4] || (isMirror ? 1 : 1.52) : a[4] || 1.52,
        dispersionB: isStr ? a[5] ?? (isMirror ? 0 : 22000) : a[2] > 100 ? a[2] : a[5] ?? 22000,
        shape,
        basePos: v2(a[0], a[1]),
        baseRot: r,
        swayPhase: a[7] || 0,
      };
    }),
    targets: tgs.map((a: any, i: number) => ({
      id: i + 1,
      pos: v2(a[0], a[1]),
      minLambda: a[2],
      maxLambda: a[3],
      radius: typeof a[4] === 'number' ? a[4] : 25,
      name: typeof a[4] === 'string' ? a[4] : a[5] || '',
      targetRgb: typeof a[4] === 'number' ? a[6] : a[5],
      charge: 0,
      isSatisfied: false,
    })),
    obstacles: (obs || []).map((a: any, i: number) => ({
      id: i + 1,
      points: [v2(a[0], a[1]), v2(a[2], a[1]), v2(a[2], a[3]), v2(a[0], a[3])],
      isMirror: a[4],
    })),
  };
});
