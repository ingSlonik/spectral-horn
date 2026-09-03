import { LevelDef, Emitter, Prism, Target, Obstacle } from './types';
import { v2 } from './math';

const { PI } = Math;

const makeEmitter = (a: any): Emitter => ({
  pos: v2(a[0], a[1]),
  angle: a[2] || 0,
  width: a[3] || 7,
  rayCount: a[4] || 64,
  minLambda: a[5] || 400,
  maxLambda: a[6] || 700,
});

const makePrism = (a: any, i: number): Prism => {
  const isStr = typeof a[2] === 'string';
  const shape = isStr ? a[2] : typeof a[6] === 'string' ? a[6] : 'horn';
  const isM = shape === 'mirror';
  const isO = shape === 'orb';
  const isD = shape === 'dove';
  const r = isStr || a[2] > 100 ? 0 : a[2] || 0;
  const p = v2(a[0], a[1]);
  return {
    id: i + 1,
    pos: p,
    rot: r,
    scale: a[3] || 1,
    baseIndex: isStr ? a[4] || (isM ? 1 : isO ? 1.58 : isD ? 1.53 : 1.52) : a[4] || 1.52,
    dispersionB: isStr ? a[5] ?? (isM ? 0 : isO ? 18000 : isD ? 8000 : 22000) : a[2] > 100 ? a[2] : a[5] ?? 22000,
    shape,
    basePos: p,
    baseRot: r,
    swayPhase: typeof a[6] === 'number' ? a[6] : a[7] || 0,
  };
};

export const TITLE_SCENE: { emitters: Emitter[]; prisms: Prism[] } = {
  emitters: [[80, 260, 0.15], [920, 260, 3]].map(makeEmitter),
  prisms: [
    [200, 300, 0, 1, 1.52, 28000, 0.1],
    [800, 300, 0, 1, 1.52, 28000, PI],
  ].map(makePrism),
};

const SENSORS = 'Red~Green~Blue~Violet~Amber~Cyan~White~Blue (Top)~Green (Mid)~Red (Bot)~Magenta (Top)~Cyan (Bot)~Yellow'.split('~');

const [MIRROR, DOVE, ORB] = ['mirror', 'dove', 'orb'] as const;
const W_RGB: [number, number, number] = [255, 255, 255];

const META_STR =
  "First Horn~Let Snell's law steer green into the sensor.~" +
  "Prismatic Party~Red is lazy, blue is sharp. Hit all three targets.~" +
  "Obsidian Shield~Sensor is hidden. Flip horn upside down to bend light up.~" +
  "Periscope Trick~90° turn? Exceed critical angle for total internal reflection.~" +
  "Celestial Mirror~Bank off the mirror straight into the amber sensor.~" +
  "Cosmic Trickshot~Floor bounce into a horn split. Two targets, one beam.~" +
  "Upside-Down Rainbow~A mirror bounce flips the entire color stack.~" +
  "Hall of Mirrors~The rainbow always finds its way.~" +
  "Enter the Dove~Dove prism: flips color order, zero beam deflection.~" +
  "Prismatic Inversion~Disperse the rainbow, flip the stack with the Dove.~" +
  "Crystal Orb~If you want to focus, use the Orb.~" +
  "Squeeze & Scatter~Focus on what you already have.~" +
  "Additive Alchemy: Yellow~Subtractive makes mud, additive makes light.~" +
  "Dual Synthesis~Fatten Blue with the Orb to bridge Red and Green.~" +
  "Great Recombination~Target wants white. Use horn #2 to undo the rainbow.~" +
  "Prismatic Ensemble~Horn bends, mirror banks, Orb focuses. Run the combo.~" +
  "Grand Optical Symphony~All gear on deck. Light every target!";

const META = META_STR.split('~');

// Positional tuple formats:
// - Emitter:  [x, y, angle=0, width=7, rayCount=64, minLambda=400, maxLambda=700]
// - Prism:    [x, y, rot=0, scale=1, baseIndex=1.52, dispersionB=22000, shape='horn', swayPhase=0]
//             Smart shape tokens: [x, y, 'mirror'|'dove'|'orb', scale, ...] auto-configures defaults.
//             Smart dispersion: [x, y, 45000] treats numbers > 100 as dispersionB.
// - Target:   [x, y, minLambda, maxLambda, name='', radius=25, targetRgb?]
// - Obstacle: [x1, y1, x2, y2, isMirror=false]
const RAW_LEVELS: any[] = [
  [
    [90, 420],
    [[400, 600, -0.2, 1, 1.5]],
    [[870, 644, 520, 565, 1]],
  ],
  [
    [90, 300, 0, 6, 72],
    [[240, 520, 45000]],
    [
      [880, 636, 620, 700, 0],
      [880, 679, 520, 565, 1],
      [880, 777, 400, 460, 3],
    ],
  ],
  [
    [90, 820],
    [[340, 820]],
    [[880, 528, 520, 565, 1]],
    [[600, 50, 640, 660]],
  ],
  [
    [90, 240],
    [[240, 240, 0, 1, 1.56, 15000], [240, 750, 0, 1, 1.56, 15000]],
    [[880, 856, 400, 480, 2]],
    [[480, 50, 520, 650]],
  ],
  [
    [90, 550, -1.1, 7, 48],
    [[240, 750, MIRROR, 1.4], [240, 850]],
    [[880, 521, 500, 600, 4]],
    [[540, 50, 580, 600]],
  ],
  [
    [90, 220, 1.05],
    [[300, 450, 45000]],
    [
      [880, 230, 620, 700, 0],
      [880, 88, 400, 490, 5, 25, [0, 240, 255]],
    ],
    [[350, 50, 400, 480], [260, 840, 580, 860, 1], [680, 580, 730, 950]],
  ],
  [
    [90, 200, 0, 6],
    [[220, 450, 45000], [580, 850, MIRROR, 1.8]],
    [
      [880, 630, 400, 480, 7],
      [880, 668, 520, 565, 8],
      [880, 705, 620, 700, 9],
    ],
    [[320, 50, 360, 260]],
  ],
  [
    [90, 200, -0.2],
    [[240, 500, 0.5, 1, 1.52, 35000]],
    [
      [340, 700, 620, 700, 0],
      [750, 180, 520, 565, 1],
    ],
    [
      [30, 50, 50, 760, 1],
      [100, 840, 800, 860, 1],
      [930, 50, 950, 760, 1],
      [490, 50, 510, 520, 1],
    ],
  ],
  [
    [[90, 485, 0, 4, 32, 650, 680], [90, 515, 0, 4, 32, 440, 470]],
    [[300, 750, 2, 1.6, 1.53, 12000, DOVE]],
    [
      [880, 485, 440, 470, 7, 20],
      [880, 515, 650, 680, 9, 20],
    ],
    [[480, 50, 880, 465], [480, 535, 880, 950]],
  ],
  [
    [90, 480],
    [[240, 750, 35000], [560, 750, DOVE, 1.6]],
    [
      [880, 530, 400, 480, 2],
      [880, 480, 520, 565, 1],
      [880, 430, 620, 700, 0],
    ],
    [[650, 50, 880, 390], [650, 570, 880, 950]],
  ],
  [
    [90, 300, 0, 28, 72],
    [[240, 750, ORB, 1.25], [580, 750, 35000]],
    [[880, 473, 620, 700, 0]],
    [[420, 50, 460, 292], [420, 308, 460, 950], [700, 250, 740, 350]],
  ],
  [
    [90, 500, 0, 24, 72],
    [[240, 240, ORB, 1.15, 1.56, 20000], [750, 750, 45000]],
    [
      [880, 750, 520, 565, 1],
      [880, 435, 480, 520, 5],
    ],
    [[370, 50, 390, 492], [370, 508, 390, 950]],
  ],
  [
    [[90, 240, 0, 7, 52, 650, 680], [90, 760, 0, 7, 52, 525, 545]],
    [[240, 240, 0.35, 1, 1.52, 12000], [240, 760, -0.35, 1, 1.52, 12000]],
    [[870, 500, 520, 680, 12, 45, [255, 235, 0]]],
    [[520, 50, 560, 260], [520, 740, 560, 950]],
  ],
  [
    [
      [90, 180, 0, 6, 48, 650, 680],
      [90, 500, 0, 36, 64, 440, 470],
      [90, 820, 0, 6, 48, 525, 545],
    ],
    [
      [240, 160, 0, 1, 1.5, 8000],
      [240, 840, 0, 1, 1.5, 8000],
      [320, 200, ORB, 1.35],
    ],
    [
      [880, 296, 400, 700, 10, 30, [255, 40, 120]],
      [880, 690, 400, 700, 11, 30, [0, 255, 140]],
    ],
  ],
  [
    [90, 500, 0, 6, 68],
    [[240, 300, 26000], [580, 850, 26000]],
    [[880, 670, 400, 700, 6, 40, W_RGB]],
    [[420, 50, 460, 560]],
  ],
  [
    [90, 750, 0, 7, 48],
    [
      [240, 550, 35000],
      [450, 250, MIRROR, 1.5],
      [740, 850, ORB, 1.25],
    ],
    [
      [880, 405, 580, 700, 0],
      [880, 770, 400, 480, 2],
    ],
    [[400, 680, 440, 950]],
  ],
  [
    [[90, 240, 0, 6, 48], [90, 440, 0.12, 8, 48, 520, 565], [90, 760, 0, 6, 48]],
    [
      [240, 160, 35000],
      [380, 360, ORB, 1.25],
      [240, 860, 35000],
      [560, 860, MIRROR, 1.4],
      [380, 640, DOVE, 1.4],
      [560, 160, MIRROR, 1.4],
    ],
    [
      [880, 310, 400, 450, 2, 22],
      [880, 435, 630, 700, 0, 20],
      [880, 500, 520, 565, 1, 24],
      [880, 560, 630, 700, 0, 20],
      [880, 655, 400, 450, 2, 22],
      [500, 500, 400, 700, 6, 35, W_RGB],
    ],
    [[450, 50, 490, 220], [450, 780, 490, 950]],
  ],
];

const makeTarget = (a: any, i: number): Target => ({
  id: i + 1,
  pos: v2(a[0], a[1]),
  minLambda: a[2],
  maxLambda: a[3],
  name: typeof a[4] === 'number' ? SENSORS[a[4]] + ' Sensor' : a[4] || '',
  radius: a[5] || 25,
  targetRgb: a[6],
  charge: 0,
  isSatisfied: false,
});

const makeObstacle = (a: any, i: number): Obstacle => ({
  id: i + 1,
  points: [v2(a[0], a[1]), v2(a[2], a[1]), v2(a[2], a[3]), v2(a[0], a[3])],
  isMirror: !!a[4],
});

// OPTIMIZATION: Transform concise level definitions into full typed structures
export const LEVELS: LevelDef[] = RAW_LEVELS.map(([ems, prs, tgs, obs], idx) => {
  const emList = typeof ems[0] === 'number' ? [ems] : ems;
  return {
    id: idx + 1,
    title: `${idx + 1}. ${META[idx * 2]}`,
    hint: META[idx * 2 + 1],
    emitter: emList.map(makeEmitter),
    prisms: prs.map(makePrism),
    targets: tgs.map(makeTarget),
    obstacles: (obs || []).map(makeObstacle),
  };
});
