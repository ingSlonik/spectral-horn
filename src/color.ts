export function getRefractiveIndex(baseIndex: number, dispersionB: number, wavelengthNm: number): number {
  return baseIndex + dispersionB / (wavelengthNm * wavelengthNm);
}

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

  const adj = (c: number) => (c <= 0 ? 0 : Math.round(255 * Math.pow(c * f, 0.8)));
  return [adj(r), adj(g), adj(b)];
}

export function wavelengthToHex(wavelength: number): string {
  const [r, g, b] = wavelengthToRGB(wavelength);
  return rgbToHex(r, g, b);
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

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
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }

  return [h, s, v];
}

export function checkColorMatch(
  sampledRgbRaw: [number, number, number],
  targetRgb: [number, number, number],
  bgRgb: [number, number, number] = [0, 0, 0]
): { isMatch: boolean; hasLight: boolean; intensity: number } {
  const r = Math.max(0, sampledRgbRaw[0] - bgRgb[0]);
  const g = Math.max(0, sampledRgbRaw[1] - bgRgb[1]);
  const b = Math.max(0, sampledRgbRaw[2] - bgRgb[2]);

  const maxChannel = Math.max(r, g, b);
  const hasLight = maxChannel >= 14 || (r + g + b) / 3 >= 8;

  const [sH, sS, sV] = rgbToHsv(r, g, b);
  const [tH, tS] = rgbToHsv(targetRgb[0], targetRgb[1], targetRgb[2]);

  const diff = Math.abs(sH - tH) % 360;
  const hueDiff = diff > 180 ? 360 - diff : diff;

  let isMatch = false;
  if (hasLight) {
    if (tS > 0.4) {
      isMatch = sS >= 0.28 && hueDiff <= 32;
    } else {
      isMatch = sS < 0.4 && sV >= 0.2;
    }
  }

  return { isMatch, hasLight, intensity: maxChannel };
}
