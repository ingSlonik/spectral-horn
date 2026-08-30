import { LevelDef, Emitter, Prism } from './types';
import { v2 } from './math';

export const TITLE_SCENE: { emitters: Emitter[]; prisms: Prism[] } = {
  emitters: [
    { pos: v2(80, 260), angle: 0.15, width: 7, rayCount: 64, minLambda: 400, maxLambda: 700 },
    { pos: v2(920, 260), angle: 3, width: 7, rayCount: 64, minLambda: 400, maxLambda: 700 },
  ],
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
    swayPhase: i ? Math.PI : 0.1,
  })),
};

const [RS, GS, BS, VS, AS, CS, WS] = [
  'Red Sensor',
  'Green Sensor',
  'Blue Sensor',
  'Violet Sensor',
  'Amber Sensor',
  'Cyan Sensor',
  'White Sensor',
];

const RAW_LEVELS: any[] = [
  [
    'The First Horn',
    "Rotate your horn into the white beam. Snell's law bends green photons straight into the sensor.",
    [90, 420],
    [[400, 600, 0.85, 1, 1.5]],
    [[870, 644, 520, 565, 26, GS]],
  ],
  [
    'The Prismatic Party',
    'Red bends gently, violet sharply. Angle your horn so the fanned rainbow hits all three sensors simultaneously!',
    [90, 300, 0, 6, 72],
    [[240, 520, 0, 1, 1.52, 45000]],
    [
      [880, 636, 620, 700, 25, RS],
      [880, 679, 520, 565, 25, GS],
      [880, 777, 400, 460, 25, VS],
    ],
  ],
  [
    'The Obsidian Shield',
    'The sensor hides behind obsidian. Flip your horn upside down to refract the beam upward into the pocket!',
    [90, 820],
    [[340, 820]],
    [[880, 528, 520, 565, 26, GS]],
    [[700, 50, 740, 660]],
  ],
  [
    'The Periscope Trick',
    "Refraction alone can't turn 90°. Tilt the horn past the critical angle to bounce light 100% internally!",
    [90, 240],
    [[240, 240, 0, 1, 1.56, 15000], [240, 750, 0, 1, 1.56, 15000]],
    [[880, 856, 400, 480, 28, BS]],
    [[480, 50, 520, 650]],
  ],
  [
    'The Celestial Mirror',
    'Bank the beam down with the mirror, then use your horn to scoop photons back up into the amber sensor.',
    [90, 550, -1.1, 7, 48],
    [[240, 750, 0, 1.4, 1, 0, 'mirror'], [240, 850, 0, 1, 1.52, 22000]],
    [[880, 521, 500, 600, 25, AS]],
    [[540, 50, 580, 600]],
  ],
  [
    'Cosmic Trickshot',
    'Bank incoming light off the mirror floor, then position your horn to split the rebound across both sensors.',
    [90, 220, 1.05],
    [[300, 450, 0, 1, 1.52, 45000]],
    [
      [880, 230, 620, 700, 25, RS],
      [880, 88, 400, 490, 25, CS, [0, 240, 255]],
    ],
    [[350, 50, 400, 480], [260, 840, 580, 860, true], [680, 580, 730, 950]],
  ],
  [
    'Upside-Down Rainbow',
    'The horn puts Red on top and Blue below. Bounce the rainbow off the mirror to invert the color order!',
    [90, 200, 0, 6],
    [[220, 450, 0, 1, 1.52, 45000], [580, 850, 0, 1.8, 1, 0, 'mirror']],
    [
      [880, 630, 400, 480, 24, 'Blue Sensor (Top)'],
      [880, 668, 520, 565, 22, 'Green Sensor (Mid)'],
      [880, 705, 620, 700, 24, 'Red Sensor (Bot)'],
    ],
    [[320, 50, 360, 260]],
  ],
  [
    'Hall of Mirrors',
    'Aim at the floor mirror to trigger a ricochet into the green sensor, clipping the red sensor along the way!',
    [90, 200, -0.2],
    [[240, 500, 0.5, 1, 1.52, 35000]],
    [
      [340, 700, 620, 700, 26, RS],
      [750, 180, 520, 565, 26, GS],
    ],
    [
      [30, 50, 50, 760, true],
      [100, 840, 800, 860, true],
      [930, 50, 950, 760, true],
      [490, 50, 510, 520, true],
    ],
  ],
  [
    'Enter the Dove Prism',
    'Colors are inverted in a narrow tunnel! The Dove prism flips color order without bending the beam path.',
    [[90, 485, 0, 4, 32, 650, 680], [90, 515, 0, 4, 32, 440, 470]],
    [[300, 750, 2, 1.6, 1.53, 12000, 'dove']],
    [
      [880, 485, 440, 470, 20, 'Blue Sensor (Top)'],
      [880, 515, 650, 680, 20, 'Red Sensor (Bot)'],
    ],
    [[480, 50, 880, 465], [480, 535, 880, 950]],
  ],
  [
    'The Prismatic Inversion',
    'Fan out a rainbow with your horn, then pass it through the Dove prism to reverse the color stack.',
    [90, 480],
    [[240, 750, 0, 1, 1.52, 35000], [560, 750, 0, 1.6, 1.53, 8000, 'dove']],
    [
      [880, 530, 400, 480, 24, BS],
      [880, 480, 520, 565, 22, GS],
      [880, 430, 620, 700, 24, RS],
    ],
    [[650, 50, 880, 390], [650, 570, 880, 950]],
  ],
  [
    'The Crystal Orb',
    'Beam is too wide for the slit! Focus it to a point with the Orb, then steer the exit ray with your horn.',
    [90, 300, 0, 28, 72],
    [[240, 750, 0, 1.25, 1.58, 18000, 'orb'], [580, 750, 0, 1, 1.52, 35000]],
    [[880, 473, 620, 700, 26, RS]],
    [[420, 50, 460, 292], [420, 308, 460, 950], [700, 250, 740, 350]],
  ],
  [
    'Squeeze & Scatter',
    'Squeeze the wide beam through the keyhole with the Orb, then catch the focal point to split Green and Cyan.',
    [90, 500, 0, 24, 72],
    [[240, 240, 0, 1.15, 1.56, 20000, 'orb'], [750, 750, 0, 1, 1.52, 45000]],
    [
      [880, 750, 520, 565, 25, GS],
      [880, 435, 480, 520, 25, CS],
    ],
    [[370, 50, 390, 492], [370, 508, 390, 950]],
  ],
  [
    'Additive Alchemy: Yellow',
    "Single wavelengths won't satisfy this sensor. Intersect both Red and Green beams inside its lens!",
    [[90, 240, 0, 7, 52, 650, 680], [90, 760, 0, 7, 52, 525, 545]],
    [[240, 240, 0.35, 1, 1.52, 12000], [240, 760, -0.35, 1, 1.52, 12000]],
    [[870, 500, 520, 680, 45, 'Yellow Sensor', [255, 235, 0]]],
    [[520, 50, 560, 260], [520, 740, 560, 950]],
  ],
  [
    'Dual Synthesis',
    'Blue is in demand! Use the Orb to broaden the Blue beam so it pairs with Red at top and Green at bottom.',
    [
      [90, 180, 0, 6, 48, 650, 680],
      [90, 500, 0, 36, 64, 440, 470],
      [90, 820, 0, 6, 48, 525, 545],
    ],
    [
      [240, 160, 0, 1, 1.5, 8000],
      [240, 840, 0, 1, 1.5, 8000],
      [320, 200, 0, 1.35, 1.58, 18000, 'orb'],
    ],
    [
      [880, 296, 400, 700, 30, 'Magenta Sensor (Top)', [255, 40, 120]],
      [880, 690, 400, 700, 30, 'Cyan Sensor (Bot)', [0, 255, 140]],
    ],
  ],
  [
    'The Great Recombination',
    'This sensor requires pure white light! Use the second horn to re-converge the dispersed rainbow.',
    [90, 500, 0, 6, 68],
    [[240, 300, 0, 1, 1.52, 26000], [580, 850, 0, 1, 1.52, 26000]],
    [[880, 670, 400, 700, 40, WS, [255, 255, 255]]],
    [[420, 50, 460, 560]],
  ],
  [
    'The Prismatic Ensemble',
    'Grand optical tour: bend up with the horn, bank off the mirror, and focus into both sensors with the Orb.',
    [90, 750, 0, 7, 48],
    [
      [240, 550, 0, 1, 1.52, 35000],
      [450, 250, 0, 1.5, 1, 0, 'mirror'],
      [740, 850, 0, 1.25, 1.58, 18000, 'orb'],
    ],
    [
      [880, 405, 580, 700, 26, RS],
      [880, 770, 400, 480, 26, BS],
    ],
    [[400, 680, 440, 950]],
  ],
  [
    'The Grand Optical Symphony',
    'Orchestrate Horns, Mirrors, Orb, and Dove prism to illuminate every sensor—including the central White core!',
    [[90, 240, 0, 6, 48], [90, 440, 0.12, 8, 48, 520, 565], [90, 760, 0, 6, 48]],
    [
      [240, 160, 0, 1, 1.52, 35000],
      [380, 360, 0, 1.25, 1.58, 18000, 'orb'],
      [240, 860, 0, 1, 1.52, 35000],
      [560, 860, 0, 1.4, 1, 0, 'mirror'],
      [380, 640, 0, 1.4, 1.53, 8000, 'dove'],
      [560, 160, 0, 1.4, 1, 0, 'mirror'],
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
    prisms: prs.map((a: any, i: number) => ({
      id: i + 1,
      pos: v2(a[0], a[1]),
      rot: a[2] || 0,
      scale: a[3] || 1,
      baseIndex: a[4] || 1.52,
      dispersionB: a[5] !== undefined ? a[5] : 22000,
      shape: a[6] || 'horn',
      basePos: v2(a[0], a[1]),
      baseRot: a[2] || 0,
      swayPhase: a[7] || 0,
    })),
    targets: tgs.map((a: any, i: number) => ({
      id: i + 1,
      pos: v2(a[0], a[1]),
      minLambda: a[2],
      maxLambda: a[3],
      radius: a[4] || 26,
      name: a[5] || '',
      targetRgb: a[6],
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
