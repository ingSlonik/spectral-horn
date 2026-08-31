let audioCtx: AudioContext | null = null,
  masterGain: GainNode | null = null,
  musicGain: GainNode | null = null,
  sfxGain: GainNode | null = null,
  filterNode: BiquadFilterNode | null = null;

let musicMuted = false,
  sfxMuted = false,
  musicPlaying = false,
  musicSchedulerTimer: number | null = null,
  nextChordTime = 0,
  currentChordIdx = 0,
  lastRotateSound = 0,
  rotateNoteIdx = 0,
  lastMoveSound = 0,
  lastChargeSound = 0;

// OPTIMIZATION (MATH DESTRUCTURING):
// Aliasing Math functions to local module scope allows Terser to mangle them into 1-letter variables.
const { sin, max, min, floor, abs, random, pow } = Math;

const note = (base: number, semi: number) => base * pow(2, semi / 12);
const CHORDS = [146.8, 98, 123.5, 110].map((r, i) =>
  [[0, 7, 11, 14, 16, 19], [0, 7, 12, 16, 19, 23], [0, 7, 10, 15, 17, 19], [0, 7, 12, 14, 19, 23]][i].map((s) => note(r, s))
);

const BELL_SCALE = [0, 2, 4, 7, 9, 12, 14, 16].map((s) => note(587.3, s));

// OPTIMIZATION (WEBAUDIO NATIVE API WRAPPERS):
// WebAudio properties (createOscillator, createGain, setValueAtTime, linearRampToValueAtTime,
// exponentialRampToValueAtTime, cancelScheduledValues) cannot be shortened by minifiers.
// Encapsulating them into concise micro-helpers 'osc()' and 'gain()' dramatically decreases
// code repetition and isolates un-mangleable browser properties.
const osc = (type: OscillatorType, freq: number, t: number, stopT: number, out?: AudioNode): OscillatorNode => {
  const o = audioCtx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (out) o.connect(out);
  o.start(t);
  o.stop(stopT);
  return o;
};

const gain = (val: number, t: number, out?: AudioNode): GainNode => {
  const g = audioCtx!.createGain();
  g.gain.setValueAtTime(val, t);
  if (out) g.connect(out);
  return g;
};

export function initAudio(): void {
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) audioCtx = new AC();
  }

  if (audioCtx && !masterGain) {
    const t = audioCtx.currentTime;
    masterGain = gain(0.85, t, audioCtx.destination);
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(650, t);
    filterNode.Q.setValueAtTime(2.5, t);
    musicGain = gain(musicMuted ? 0 : 0.38, t, masterGain);
    filterNode.connect(musicGain);
    sfxGain = gain(sfxMuted ? 0 : 0.7, t, masterGain);
  }

  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (!musicPlaying) startAmbientMusic();
}

// OPTIMIZATION: Unified helper for scheduling smooth target gain transitions across audio nodes
const setGain = (g: GainNode | null, val: number) => {
  if (g && audioCtx) {
    g.gain.cancelScheduledValues(audioCtx.currentTime);
    g.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
  }
};

export function toggleMusic(): boolean {
  musicMuted = !musicMuted;
  setGain(musicGain, musicMuted ? 0 : 0.38);
  return musicMuted;
}

export function toggleSfx(): boolean {
  sfxMuted = !sfxMuted;
  setGain(sfxGain, sfxMuted ? 0 : 0.7);
  return sfxMuted;
}

function playChordCluster(frequencies: number[], startTime: number, durationSec: number): void {
  if (!audioCtx || !filterNode) return;
  const t = max(audioCtx.currentTime, startTime);
  const fade = min(3.5, durationSec * 0.4);

  filterNode.frequency.cancelScheduledValues(t);
  filterNode.frequency.setTargetAtTime(420 + random() * 400, t, 2.2);

  frequencies.forEach((freq, i) => {
    const ng = gain(0.0001, t, filterNode!);
    const detune = (i % 2 === 0 ? 1 : -1) * (3 + i * 1.5);
    const vol = (0.07 / frequencies.length) * (i === 0 ? 1.4 : 1);
    ng.gain.linearRampToValueAtTime(vol, t + fade);
    ng.gain.setValueAtTime(vol, t + durationSec - fade);
    ng.gain.linearRampToValueAtTime(0.0001, t + durationSec);
    osc(i === 0 ? 'sine' : 'triangle', freq, t, t + durationSec + 0.15, ng);
    osc('sine', freq * pow(2, detune / 1200), t, t + durationSec + 0.15, ng);
  });
}

function scheduleMusic(): void {
  if (!musicPlaying || !audioCtx) return;
  const dur = 9.0;
  const now = audioCtx.currentTime;
  if (nextChordTime < now) nextChordTime = now;
  while (nextChordTime < now + 15) {
    playChordCluster(CHORDS[currentChordIdx], nextChordTime, dur + 2.5);
    currentChordIdx = (currentChordIdx + 1) % CHORDS.length;
    nextChordTime += dur;
  }
}

export function startAmbientMusic(): void {
  if (musicPlaying) return;
  musicPlaying = true;
  nextChordTime = audioCtx ? audioCtx.currentTime : 0;
  scheduleMusic();
  if (musicSchedulerTimer !== null) clearInterval(musicSchedulerTimer);
  musicSchedulerTimer = window.setInterval(scheduleMusic, 2000);
}

function playTone(
  f: number,
  dur = 0.15,
  gVal = 0.04,
  type: OscillatorType = 'sine',
  rampF?: number,
  delay = 0,
  outNode?: AudioNode
): void {
  if (sfxMuted || !audioCtx || !sfxGain) return;
  try {
    const t = audioCtx.currentTime + delay;
    const g = gain(gVal, t, outNode || sfxGain);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    const o = osc(type, f, t, t + dur + 0.02, g);
    if (rampF) o.frequency.exponentialRampToValueAtTime(rampF, t + dur * 0.9);
  } catch {}
}

export function playPrismRotate(rotSpeed = 1): void {
  const now = performance.now();
  if (now - lastRotateSound < 70) return;
  lastRotateSound = now;
  rotateNoteIdx = (rotateNoteIdx + max(1, floor(abs(rotSpeed) * 2))) % BELL_SCALE.length;
  const f = BELL_SCALE[rotateNoteIdx];
  playTone(f, 0.16, 0.024);
  playTone(f * 2.76, 0.16, 0.024);
}

export const playPrismMove = (_speed = 1): void => {
  const now = performance.now();
  if (now - lastMoveSound < 65) return;
  lastMoveSound = now;
  const base = 260 + sin(now * 0.005) * 60;
  playTone(base, 0.18, 0.06, 'triangle', base * 1.2);
  playTone(base * 1.5, 0.18, 0.06, 'sine', base * 1.8);
};

export const playSensorPulse = (progress: number): void => {
  const now = performance.now();
  if (now - lastChargeSound < 110) return;
  lastChargeSound = now;
  const f = 440 + progress * 440;
  playTone(f, 0.14, 0.04 + progress * 0.03, 'sine', f * 1.05);
  playTone(f / 2, 0.14, 0.03, 'triangle');
};

export const playVictory = (): void => {
  [0, 4, 7, 11, 12, 16].forEach((s, idx) => {
    const f = note(587.3, s);
    for (const m of [1, 2]) playTone(f * m, 0.65, 0.08, 'sine', undefined, idx * 0.09);
  });
};

export const playClick = (): void => {
  playTone(1046.5, 0.05, 0.04, 'sine', 523.25);
};

