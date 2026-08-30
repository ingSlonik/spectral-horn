let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;

let musicMuted = false;
let sfxMuted = false;
let musicPlaying = false;
let musicSchedulerTimer: number | null = null;
let nextChordTime = 0;
let currentChordIdx = 0;
let lastRotateSound = 0;
let rotateNoteIdx = 0;
let lastMoveSound = 0;
let lastChargeSound = 0;

const CHORDS = [
  [146.83, 220, 277.18, 329.63, 369.99, 440],
  [98, 146.83, 196, 246.94, 293.66, 369.99],
  [123.47, 185, 220, 293.66, 329.63, 369.99],
  [110, 164.81, 220, 246.94, 329.63, 415.3],
];

const BELL_SCALE = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98];

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


export function toggleMusic(): boolean {
  musicMuted = !musicMuted;
  if (musicGain && audioCtx) {
    musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
    musicGain.gain.setTargetAtTime(musicMuted ? 0 : 0.38, audioCtx.currentTime, 0.05);
  }
  return musicMuted;
}

export function toggleSfx(): boolean {
  sfxMuted = !sfxMuted;
  if (sfxGain && audioCtx) {
    sfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
    sfxGain.gain.setTargetAtTime(sfxMuted ? 0 : 0.7, audioCtx.currentTime, 0.05);
  }
  return sfxMuted;
}

function playChordCluster(frequencies: number[], startTime: number, durationSec: number): void {
  if (!audioCtx || !filterNode) return;
  const t = Math.max(audioCtx.currentTime, startTime);
  const fade = Math.min(3.5, durationSec * 0.4);

  filterNode.frequency.cancelScheduledValues(t);
  filterNode.frequency.setTargetAtTime(420 + Math.random() * 400, t, 2.2);

  frequencies.forEach((freq, i) => {
    const ng = gain(0.0001, t, filterNode!);
    const detune = (i % 2 === 0 ? 1 : -1) * (3 + i * 1.5);
    const vol = (0.07 / frequencies.length) * (i === 0 ? 1.4 : 1);
    ng.gain.linearRampToValueAtTime(vol, t + fade);
    ng.gain.setValueAtTime(vol, t + durationSec - fade);
    ng.gain.linearRampToValueAtTime(0.0001, t + durationSec);
    osc(i === 0 ? 'sine' : 'triangle', freq, t, t + durationSec + 0.15, ng);
    osc('sine', freq * Math.pow(2, detune / 1200), t, t + durationSec + 0.15, ng);
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
  rotateNoteIdx = (rotateNoteIdx + Math.max(1, Math.floor(Math.abs(rotSpeed) * 2))) % BELL_SCALE.length;
  const f = BELL_SCALE[rotateNoteIdx];
  playTone(f, 0.16, 0.024);
  playTone(f * 2.76, 0.16, 0.024);
}

export function playPrismMove(_speed = 1): void {
  const now = performance.now();
  if (now - lastMoveSound < 65) return;
  lastMoveSound = now;
  const base = 260 + Math.sin(now * 0.005) * 60;
  playTone(base, 0.18, 0.06, 'triangle', base * 1.2);
  playTone(base * 1.5, 0.18, 0.06, 'sine', base * 1.8);
}

export function playSensorPulse(progress: number): void {
  const now = performance.now();
  if (now - lastChargeSound < 110) return;
  lastChargeSound = now;
  const f = 440 + progress * 440;
  playTone(f, 0.14, 0.04 + progress * 0.03, 'sine', f * 1.05);
  playTone(f / 2, 0.14, 0.03, 'triangle');
}

export function playVictory(): void {
  [587.33, 739.99, 880, 1108.73, 1174.66, 1479.98].forEach((f, idx) => {
    playTone(f, 0.65, 0.08, 'sine', undefined, idx * 0.09);
    playTone(f * 2, 0.65, 0.08, 'sine', undefined, idx * 0.09);
  });
}

export function playClick(): void {
  playTone(1046.5, 0.05, 0.04, 'sine', 523.25);
}
