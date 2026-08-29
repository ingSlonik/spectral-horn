// Procedural Web Audio API Ambient Music & Sound Generator
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

// Harmonic scale notes (D major pentatonic / Lydian ethereal palette in Hz)
const CHORDS: number[][] = [
  // 1. Dmaj9: D3, A3, C#4, E4, F#4, A4
  [146.83, 220.00, 277.18, 329.63, 369.99, 440.00],
  // 2. Gmaj9: G2, D3, G3, B3, D4, F#4
  [98.00, 146.83, 196.00, 246.94, 293.66, 369.99],
  // 3. Bm11: B2, F#3, A3, D4, E4, F#4
  [123.47, 185.00, 220.00, 293.66, 329.63, 369.99],
  // 4. Aadd9: A2, E3, A3, B3, E4, G#4
  [110.00, 164.81, 220.00, 246.94, 329.63, 415.30],
];

const BELL_SCALE = [
  587.33, 659.25, 739.99, 880.00, 987.77, 1174.66, 1318.51, 1479.98,
]; // D5, E5, F#5, A5, B5, D6, E6, F#6

let currentChordIdx = 0;

export function initAudio(): void {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && !masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Music routing with gentle resonant lowpass filter
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(650, audioCtx.currentTime);
    filterNode.Q.setValueAtTime(2.5, audioCtx.currentTime);

    musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(musicMuted ? 0 : 0.38, audioCtx.currentTime);

    filterNode.connect(musicGain);
    musicGain.connect(masterGain);

    // SFX routing
    sfxGain = audioCtx.createGain();
    sfxGain.gain.setValueAtTime(sfxMuted ? 0 : 0.7, audioCtx.currentTime);
    sfxGain.connect(masterGain);
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (!musicPlaying) {
    startAmbientMusic();
  }
}

export function isMusicMuted(): boolean {
  return musicMuted;
}

export function isSfxMuted(): boolean {
  return sfxMuted;
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

/**
 * Procedural ambient chord pad engine.
 * Plays slow, lush breathing chord clusters that crossfade smoothly.
 */
function playChordCluster(frequencies: number[], startTime: number, durationSec: number): void {
  if (!audioCtx || !filterNode) return;
  const t = Math.max(audioCtx.currentTime, startTime);
  const fadeTime = Math.min(3.5, durationSec * 0.4);

  // Modulate filter cutoff softly with each chord
  const lfoTarget = 420 + Math.random() * 400;
  filterNode.frequency.cancelScheduledValues(t);
  filterNode.frequency.setTargetAtTime(lfoTarget, t, 2.2);

  frequencies.forEach((freq, i) => {
    const osc1 = audioCtx!.createOscillator();
    const osc2 = audioCtx!.createOscillator();
    const noteGain = audioCtx!.createGain();

    osc1.type = i === 0 ? 'sine' : 'triangle';
    osc2.type = 'sine';

    // Sub-cent detuning for celestial chorusing
    const detuneCents = (i % 2 === 0 ? 1 : -1) * (3 + i * 1.5);
    osc1.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * Math.pow(2, detuneCents / 1200), t);

    // Amplitude envelope with smooth crossfade
    const noteVol = (0.07 / frequencies.length) * (i === 0 ? 1.4 : 1.0);
    noteGain.gain.setValueAtTime(0.0001, t);
    noteGain.gain.linearRampToValueAtTime(noteVol, t + fadeTime);
    noteGain.gain.setValueAtTime(noteVol, t + durationSec - fadeTime);
    noteGain.gain.linearRampToValueAtTime(0.0001, t + durationSec);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(filterNode!);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + durationSec + 0.15);
    osc2.stop(t + durationSec + 0.15);
  });
}

/**
 * Rock-solid continuous scheduler for ambient music.
 * Schedules ahead of time using Web Audio timeline so it never drifts or stops.
 */
function scheduleMusic(): void {
  if (!musicPlaying || !audioCtx) return;

  const chordDuration = 9.0; // Seconds per chord
  const currentTime = audioCtx.currentTime;

  // If initial start or fell behind (e.g. tab sleep), reset timeline
  if (nextChordTime < currentTime) {
    nextChordTime = currentTime;
  }

  // Schedule chords up to 15 seconds ahead
  while (nextChordTime < currentTime + 15) {
    const chord = CHORDS[currentChordIdx];
    playChordCluster(chord, nextChordTime, chordDuration + 2.5); // 2.5s crossfade overlap
    currentChordIdx = (currentChordIdx + 1) % CHORDS.length;
    nextChordTime += chordDuration;
  }
}

export function startAmbientMusic(): void {
  if (musicPlaying) return;
  musicPlaying = true;
  nextChordTime = audioCtx ? audioCtx.currentTime : 0;
  scheduleMusic();

  if (musicSchedulerTimer !== null) clearInterval(musicSchedulerTimer);
  musicSchedulerTimer = window.setInterval(() => {
    scheduleMusic();
  }, 2000);
}

export function stopAmbientMusic(): void {
  musicPlaying = false;
  if (musicSchedulerTimer !== null) {
    clearInterval(musicSchedulerTimer);
    musicSchedulerTimer = null;
  }
}

// Gentle crystal chime when rotating a prism (harmonic bell)
let lastRotateSound = 0;
let rotateNoteIdx = 0;
export function playPrismRotate(rotSpeed: number = 1): void {
  if (sfxMuted || !audioCtx || !sfxGain) return;
  const now = performance.now();
  if (now - lastRotateSound < 70) return;
  lastRotateSound = now;

  try {
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const overtone = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    rotateNoteIdx = (rotateNoteIdx + Math.max(1, Math.floor(Math.abs(rotSpeed) * 2))) % BELL_SCALE.length;
    const baseFreq = BELL_SCALE[rotateNoteIdx];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(baseFreq * 2.76, t);

    // Softer rotation bell chime
    gain.gain.setValueAtTime(0.024, t);
    gain.gain.exponentialRampToValueAtTime(0.0003, t + 0.16);

    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(sfxGain);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + 0.18);
    overtone.stop(t + 0.18);
  } catch {}
}

// Ethereal cosmic glide sound when moving/dragging a prism (richer and louder)
let lastMoveSound = 0;
export function playPrismMove(speed: number = 1): void {
  if (sfxMuted || !audioCtx || !sfxGain) return;
  const now = performance.now();
  if (now - lastMoveSound < 65) return;
  lastMoveSound = now;

  try {
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc2.type = 'sine';

    const baseFreq = 260 + (Math.sin(now * 0.005) * 60); // Warm cosmic glide
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, t + 0.16);

    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, t + 0.16);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.1);
    filter.Q.setValueAtTime(2.0, t);

    // Louder, clearly audible movement glide
    gain.gain.setValueAtTime(0.085, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.2);
    osc2.stop(t + 0.2);
  } catch {}
}

// Soft energy crystal pulse when sensor charges
let lastChargeSound = 0;
export function playSensorPulse(progress: number): void {
  if (sfxMuted || !audioCtx || !sfxGain) return;
  const now = performance.now();
  if (now - lastChargeSound < 110) return;
  lastChargeSound = now;

  try {
    const osc = audioCtx.createOscillator();
    const subOsc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;

    osc.type = 'sine';
    subOsc.type = 'triangle';

    const freq = 440 + progress * 440; // A4 to A5
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.12);

    subOsc.frequency.setValueAtTime(freq / 2, t);

    gain.gain.setValueAtTime(0.04 + progress * 0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(sfxGain);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + 0.15);
    subOsc.stop(t + 0.15);
  } catch {}
}

// Sparkling victory arpeggio on level completion
export function playVictory(): void {
  if (sfxMuted || !audioCtx || !sfxGain) return;

  try {
    const notes = [587.33, 739.99, 880.00, 1108.73, 1174.66, 1479.98];
    const t0 = audioCtx.currentTime;

    notes.forEach((freq, index) => {
      const t = t0 + index * 0.09;
      const osc = audioCtx!.createOscillator();
      const overtone = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.65);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(sfxGain!);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + 0.7);
      overtone.stop(t + 0.7);
    });
  } catch {}
}

// Soft crystal droplet click for UI buttons
export function playClick(): void {
  if (sfxMuted || !audioCtx || !sfxGain) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, t); // C6
    osc.frequency.exponentialRampToValueAtTime(523.25, t + 0.04);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  } catch {}
}
