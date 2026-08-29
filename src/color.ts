// Cauchy's dispersion equation: n(lambda) = n_base + B / lambda^2
export function getRefractiveIndex(baseIndex: number, dispersionB: number, wavelengthNm: number): number {
  return baseIndex + dispersionB / (wavelengthNm * wavelengthNm);
}

// Convert wavelength (in nm, 380 - 750) to [r, g, b] in range [0, 255]
export function wavelengthToRGB(wavelength: number): [number, number, number] {
  const wl = Math.max(380, Math.min(750, wavelength));
  let r = 0;
  let g = 0;
  let b = 0;

  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wl >= 440 && wl < 490) {
    r = 0;
    g = (wl - 440) / (490 - 440);
    b = 1;
  } else if (wl >= 490 && wl < 515) {
    r = 0;
    g = 1;
    b = -(wl - 515) / (515 - 490);
  } else if (wl >= 515 && wl < 550) {
    // Pure Emerald Green
    r = 0;
    g = 1;
    b = 0;
  } else if (wl >= 550 && wl < 585) {
    // Yellow-Green to Yellow
    r = (wl - 550) / (585 - 550);
    g = 1;
    b = 0;
  } else if (wl >= 585 && wl < 640) {
    // Yellow to Orange
    r = 1;
    g = -(wl - 640) / (640 - 585);
    b = 0;
  } else if (wl >= 640 && wl <= 750) {
    // Pure Red
    r = 1;
    g = 0;
    b = 0;
  }

  // Smooth edge falloff
  let factor = 1.0;
  if (wl >= 380 && wl < 420) {
    factor = 0.3 + (0.7 * (wl - 380)) / (420 - 380);
  } else if (wl >= 680 && wl <= 750) {
    factor = 0.3 + (0.7 * (750 - wl)) / (750 - 680);
  }

  const gamma = 0.8;
  const adjust = (c: number) => (c <= 0 ? 0 : Math.round(255 * Math.pow(c * factor, gamma)));

  return [adjust(r), adjust(g), adjust(b)];
}

// Convert wavelength to RGBA string with custom alpha for additive blending
export function wavelengthToRGBA(wavelength: number, alpha: number = 0.08): string {
  const [r, g, b] = wavelengthToRGB(wavelength);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// Get bright CSS color hex/rgb for UI and target icons
export function wavelengthToHex(wavelength: number): string {
  const [r, g, b] = wavelengthToRGB(wavelength);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Spectral classification helper
export function getSpectrumName(wl: number): string {
  if (wl < 430) return 'Violet';
  if (wl < 485) return 'Blue';
  if (wl < 515) return 'Cyan';
  if (wl < 565) return 'Green';
  if (wl < 595) return 'Yellow';
  if (wl < 630) return 'Orange';
  return 'Red';
}

export function rgbToHex(r: number, g: number, b: number): string {
  const hex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Convert RGB [0..255] to HSV [H: 0..360, S: 0..1, V: 0..1]
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = Math.max(0, Math.min(255, r)) / 255;
  const gn = Math.max(0, Math.min(255, g)) / 255;
  const bn = Math.max(0, Math.min(255, b)) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      case bn:
        h = ((rn - gn) / d + 4) * 60;
        break;
    }
  }

  return [h, s, v];
}

// Circular hue difference in degrees [0..180]
export function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export interface ColorMatchResult {
  isMatch: boolean;
  hasLight: boolean;
  intensity: number;
  hueDiff: number;
  sampledRgb: [number, number, number];
  targetRgb: [number, number, number];
  sampledHue: number;
  targetHue: number;
}

// Compare sampled RGB to target RGB
export function checkColorMatch(
  sampledRgbRaw: [number, number, number],
  targetRgb: [number, number, number],
  bgRgb: [number, number, number] = [0, 0, 0]
): ColorMatchResult {
  // 1. Subtract background light
  const r = Math.max(0, sampledRgbRaw[0] - bgRgb[0]);
  const g = Math.max(0, sampledRgbRaw[1] - bgRgb[1]);
  const b = Math.max(0, sampledRgbRaw[2] - bgRgb[2]);

  const maxChannel = Math.max(r, g, b);
  const avgIntensity = (r + g + b) / 3;
  const hasLight = maxChannel >= 14 || avgIntensity >= 8;

  const [sH, sS, sV] = rgbToHsv(r, g, b);
  const [tH, tS] = rgbToHsv(targetRgb[0], targetRgb[1], targetRgb[2]);

  const hueDiff = hueDistance(sH, tH);

  let isMatch = false;
  if (hasLight) {
    // If target is colorful (high saturation), required light must also have sufficient saturation
    // and matching hue angle within tolerance
    if (tS > 0.4) {
      const hueTolerance = 20; // 20 degrees tolerance
      const isSaturatedEnough = sS >= 0.35;
      isMatch = isSaturatedEnough && hueDiff <= hueTolerance;
    } else {
      // For white/neutral targets
      isMatch = sS < 0.35 && sV >= 0.2;
    }
  }

  return {
    isMatch,
    hasLight,
    intensity: maxChannel,
    hueDiff,
    sampledRgb: [r, g, b],
    targetRgb,
    sampledHue: sH,
    targetHue: tH,
  };
}
