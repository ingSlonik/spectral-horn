import { LevelDef, Emitter, Prism } from './types';
import { v2 } from './math';

export const TITLE_SCENE: { emitters: Emitter[]; prisms: Prism[] } = {
  emitters: [
    { pos: v2(80, 260), angle: 0.15, width: 7, rayCount: 64, minLambda: 400, maxLambda: 700 },
    { pos: v2(920, 260), angle: 3, width: 7, rayCount: 64, minLambda: 400, maxLambda: 700 },
  ],
  prisms: [
    { id: 1, pos: v2(200, 300), rot: 0, scale: 1, baseIndex: 1.52, dispersionB: 28000, shape: 'horn', basePos: v2(200, 300), baseRot: 0, swayPhase: 0.1 },
    { id: 2, pos: v2(800, 300), rot: 0, scale: 1, baseIndex: 1.52, dispersionB: 28000, shape: 'horn', basePos: v2(800, 300), baseRot: 0, swayPhase: Math.PI },
  ],
};

const RAW_LEVELS: any[] = [
  [
    '1. The First Horn',
    "Rotate your unicorn horn into the white beam. Snell's law will bend the green photons straight into the sensor.",
    [90, 420],
    [[400, 600, 0.85, 1, 1.5]],
    [[870, 644, 520, 565, 26, 'Green Sensor']],
  ],
  [
    '2. The Prismatic Party',
    'Red bends gently, violet takes a sharp dive. Angle your horn so the fanned-out rainbow hits all three sensors simultaneously!',
    [90, 300, 0, 6, 72],
    [[240, 520, 0, 1, 1.52, 45000]],
    [
      [880, 636, 620, 700, 25, 'Red Sensor'],
      [880, 679, 520, 565, 25, 'Green Sensor'],
      [880, 777, 400, 460, 25, 'Violet Sensor'],
    ],
  ],
  [
    '3. The Obsidian Shield',
    'The sensor is hiding behind heavy obsidian. Flip your horn upside down to refract the beam upward into the pocket!',
    [90, 820],
    [[340, 820]],
    [[880, 528, 520, 565, 26, 'Green Sensor']],
    [[700, 50, 740, 660]],
  ],
  [
    '4. The Periscope Trick',
    "Refraction alone can't make a sharp 90° turn. Tilt the horn past the critical angle to bounce light 100% internally!",
    [90, 240],
    [[240, 240, 0, 1, 1.56, 15000], [240, 750, 0, 1, 1.56, 15000]],
    [[880, 856, 400, 480, 28, 'Blue Sensor']],
    [[480, 50, 520, 650]],
  ],
  [
    '5. The Celestial Mirror',
    'Bank the beam down with the mirror, then use your horn to scoop the photons back up into the amber sensor.',
    [90, 550, -1.1, 7, 48],
    [[240, 750, 0, 1.4, 1, 0, 'mirror'], [240, 850, 0, 1, 1.52, 22000]],
    [[880, 521, 500, 600, 25, 'Amber Sensor']],
    [[540, 50, 580, 600]],
  ],
  [
    '6. Cosmic Trickshot',
    'Bank the incoming beam off the mirror floor, then position your horn to split the rebound across both sensors.',
    [90, 220, 1.05],
    [[300, 450, 0, 1, 1.52, 45000]],
    [
      [880, 230, 620, 700, 25, 'Red Sensor'],
      [880, 88, 400, 490, 25, 'Cyan Sensor', [0, 240, 255]],
    ],
    [[350, 50, 400, 480], [260, 840, 580, 860, true], [680, 580, 730, 950]],
  ],
  [
    '7. Upside-Down Rainbow',
    'The horn puts Red on top and Blue below, but the sensors want the exact opposite. Bounce the rainbow off the mirror to flip its order!',
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
    '8. Hall of Mirrors',
    'Aim for the floor mirror to trigger a wild ricochet into the green sensor, while clipping the red sensor along the way!',
    [90, 200, -0.2],
    [[240, 500, 0.5, 1, 1.52, 35000]],
    [
      [340, 700, 620, 700, 26, 'Red Sensor'],
      [750, 180, 520, 565, 26, 'Green Sensor'],
    ],
    [
      [30, 50, 50, 760, true],
      [100, 840, 800, 860, true],
      [930, 50, 950, 760, true],
      [490, 50, 510, 520, true],
    ],
  ],
  [
    '9. Enter the Dove Prism',
    'The colors are upside down in a narrow tunnel! A horn will steer into the walls—only the Dove prism flips order without bending the beam.',
    [[90, 485, 0, 4, 32, 650, 680], [90, 515, 0, 4, 32, 440, 470]],
    [[300, 750, 2, 1.6, 1.53, 12000, 'dove']],
    [
      [880, 485, 440, 470, 20, 'Blue Sensor (Top)'],
      [880, 515, 650, 680, 20, 'Red Sensor (Bot)'],
    ],
    [[480, 50, 880, 465], [480, 535, 880, 950]],
  ],
  [
    '10. The Prismatic Inversion',
    'Fan out the white beam into a full rainbow with your horn, then send it through the Dove prism to reverse the color stack.',
    [90, 480],
    [[240, 750, 0, 1, 1.52, 35000], [560, 750, 0, 1.6, 1.53, 8000, 'dove']],
    [
      [880, 530, 400, 480, 24, 'Blue Sensor'],
      [880, 480, 520, 565, 22, 'Green Sensor'],
      [880, 430, 620, 700, 24, 'Red Sensor'],
    ],
    [[650, 50, 880, 390], [650, 570, 880, 950]],
  ],
  [
    '11. The Crystal Orb',
    'That beam is way too fat for the slit! Focus it to a sharp point with the Crystal Orb, then steer the exit ray with your horn.',
    [90, 300, 0, 28, 72],
    [[240, 750, 0, 1.25, 1.58, 18000, 'orb'], [580, 750, 0, 1, 1.52, 35000]],
    [[880, 473, 620, 700, 26, 'Red Sensor']],
    [[420, 50, 460, 292], [420, 308, 460, 950], [700, 250, 740, 350]],
  ],
  [
    '12. Squeeze & Scatter',
    'Squeeze the wide beam through the keyhole with the Orb, then catch the focal point with your horn to split Green and Cyan.',
    [90, 500, 0, 24, 72],
    [[240, 240, 0, 1.15, 1.56, 20000, 'orb'], [750, 750, 0, 1, 1.52, 45000]],
    [
      [880, 750, 520, 565, 25, 'Green Sensor'],
      [880, 435, 480, 520, 25, 'Cyan Sensor'],
    ],
    [[370, 50, 390, 492], [370, 508, 390, 950]],
  ],
  [
    '13. Additive Alchemy: Yellow',
    "Single wavelengths won't satisfy this picky sensor. Intersect both Red and Green beams right inside its lens!",
    [[90, 240, 0, 7, 52, 650, 680], [90, 760, 0, 7, 52, 525, 545]],
    [[240, 240, 0.35, 1, 1.52, 12000], [240, 760, -0.35, 1, 1.52, 12000]],
    [[870, 500, 520, 680, 45, 'Yellow Sensor', [255, 235, 0]]],
    [[520, 50, 560, 260], [520, 740, 560, 950]],
  ],
  [
    '14. Dual Synthesis',
    'Blue is in high demand! Use the Orb to broaden the Blue beam so it pairs with Red at the top and Green at the bottom.',
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
    '15. The Great Recombination',
    'Single colors are too moody for this sensor. Use the second horn to re-converge the dispersed rainbow into pure white light!',
    [90, 500, 0, 6, 68],
    [[240, 300, 0, 1, 1.52, 26000], [580, 850, 0, 1, 1.52, 26000]],
    [[880, 670, 400, 700, 40, 'White Sensor', [255, 255, 255]]],
    [[420, 50, 460, 560]],
  ],
  [
    '16. The Prismatic Ensemble',
    'Send photons on a grand tour: bend up with the horn, bank off the mirror, and focus into both sensors with the Orb.',
    [90, 750, 0, 7, 48],
    [
      [240, 550, 0, 1, 1.52, 35000],
      [450, 250, 0, 1.5, 1, 0, 'mirror'],
      [740, 850, 0, 1.25, 1.58, 18000, 'orb'],
    ],
    [
      [880, 405, 580, 700, 26, 'Red Sensor'],
      [880, 770, 400, 480, 26, 'Blue Sensor'],
    ],
    [[400, 680, 440, 950]],
  ],
  [
    '17. The Grand Optical Symphony',
    'The complete optical laboratory is yours. Orchestrate Horns, Mirrors, Orb, and Dove prism to illuminate every sensor—including the central White core!',
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
      [880, 310, 400, 450, 22, 'Blue Sensor 1'],
      [880, 435, 630, 700, 20, 'Red Sensor 1'],
      [880, 500, 520, 565, 24, 'Green Sensor'],
      [880, 560, 630, 700, 20, 'Red Sensor 2'],
      [880, 655, 400, 450, 22, 'Blue Sensor 2'],
      [500, 500, 400, 700, 35, 'White Sensor (Core)', [255, 255, 255]],
    ],
    [[450, 50, 490, 220], [450, 780, 490, 950]],
  ],
];

export const LEVELS: LevelDef[] = RAW_LEVELS.map(([title, hint, ems, prs, tgs, obs], idx) => {
  const emList = typeof ems[0] === 'number' ? [ems] : ems;
  return {
    id: idx + 1,
    title,
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
