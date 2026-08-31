const { max, min, round, abs, pow } = Math;

/**
 * OPTICAL LAW: Cauchy's Dispersion Equation
 * Empirical formula modeling the wavelength dependence of refractive index in transparent media:
 *   n(λ) = n_0 + B / λ^2
 * Shorter wavelengths (violet ~400nm) encounter higher refractive indices and bend more sharply,
 * while longer wavelengths (red ~700nm) encounter lower refractive indices and bend more gently.
 */
export const getRefractiveIndex = (baseIndex: number, dispersionB: number, wl: number) =>
  baseIndex + dispersionB / (wl * wl);

/**
 * OPTICAL APPROXIMATION: Physical Wavelength (380nm - 750nm) to sRGB
 * Based on Dan Bruton's colorimetric piecewise approximation of CIE tristimulus curves:
 * - 380nm - 440nm: Violet / Blue transition
 * - 440nm - 490nm: Cyan / Blue transition
 * - 490nm - 510nm: Pure Green ramp
 * - 510nm - 580nm: Green / Yellow transition
 * - 580nm - 645nm: Amber / Orange / Red transition
 * - 645nm - 750nm: Deep Red
 * Includes human eye photopic luminosity attenuation curves at spectral extremes (<420nm & >680nm).
 */
export function wavelengthToRGB(wl: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (wl >= 380 && wl < 440) { r = (440 - wl) / 60; b = 1; }
  else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
  else if (wl < 515) { g = 1; b = (515 - wl) / 25; }
  else if (wl < 550) { g = 1; }
  else if (wl < 585) { r = (wl - 550) / 35; g = 1; }
  else if (wl < 640) { r = 1; g = (640 - wl) / 55; }
  else if (wl <= 750) { r = 1; }

  let f = 1.0;
  if (wl < 420) f = 0.3 + (0.7 * (wl - 380)) / 40;
  else if (wl > 680) f = 0.3 + (0.7 * (750 - wl)) / 70;

  const adj = (c: number) => (c <= 0 ? 0 : round(255 * pow(c * f, 0.8)));
  return [adj(r), adj(g), adj(b)];
}

export const rgbToHex = (r: any, g = 0, b = 0): string =>
  '#' + ((1 << 24) + (round(r[0] ?? r) << 16) + (round(r[1] ?? g) << 8) + round(r[2] ?? b)).toString(16).slice(1);

export const wavelengthToHex = (wl: number) => rgbToHex(wavelengthToRGB(wl));

/**
 * Color conversion: RGB (0-255) to HSV (H: 0-360°, S: 0-1, V: 0-1)
 * Used to evaluate perceived dominant hue regardless of beam intensity.
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const mx = max(rn, gn, bn), mn = min(rn, gn, bn), d = mx - mn;
  let h = 0;
  if (d) {
    h = (mx === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : mx === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4) * 60;
  }
  return [h, mx ? d / mx : 0, mx];
}

/**
 * OPTICAL SENSING: Additive Spectral Matching
 * Compares integrated photon flux in a sensor lens against target chromaticity in HSV space.
 * Matches pure monochromatic beams as well as synthesized composite beams (e.g. Red + Green = Yellow).
 */
export function checkColorMatch(
  sRgb: [number, number, number],
  tRgb: [number, number, number]
): { isMatch: boolean; hasLight: boolean; intensity: number } {
  const [r, g, b] = sRgb;
  const maxChannel = max(r, g, b);
  const hasLight = maxChannel >= 14 || (r + g + b) / 3 >= 8;

  const [sH, sS, sV] = rgbToHsv(r, g, b);
  const [tH, tS] = rgbToHsv(tRgb[0], tRgb[1], tRgb[2]);

  const diff = abs(sH - tH) % 360;
  const hueDiff = diff > 180 ? 360 - diff : diff;
  const isMatch = hasLight && (tS > 0.4 ? sS >= 0.28 && hueDiff <= 32 : sS < 0.4 && sV >= 0.2);

  return { isMatch, hasLight, intensity: maxChannel };
}
