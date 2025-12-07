import type { ColorJourneyConfig, GenerateResult, OKLabColor, RGBColor, ColorPoint } from '@/types/color-journey';
// --- OKLab Math Constants & Conversions (TypeScript Implementation) ---
// Based on the official OKLab specification by Björn Ottosson
const M1 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const M2 = [
  [0.2104542553, 0.7936177850, -0.0040720468],
  [1.9779984951, -2.4285922050, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.8086757660],
];
const M2_INV = [
  [1.0000000, 0.3963377774, 0.2158037573],
  [1.0000000, -0.1055613458, -0.0638541728],
  [1.0000000, -0.0894841775, -1.2914855480],
];
function srgbToLinear(c: number): number {
  return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
}
function linearToSrgb(c: number): number {
  return c > 0.0031308 ? 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055 : 12.92 * c;
}
function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}
function rgbToHex(rgb: RGBColor): string {
  const toHex = (c: number) => {
    const hex = Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}
function srgbToOklab(rgb: RGBColor): OKLabColor {
  const r_ = srgbToLinear(rgb.r);
  const g_ = srgbToLinear(rgb.g);
  const b_ = srgbToLinear(rgb.b);
  const l = M1[0][0] * r_ + M1[0][1] * g_ + M1[0][2] * b_;
  const m = M1[1][0] * r_ + M1[1][1] * g_ + M1[1][2] * b_;
  const s = M1[2][0] * r_ + M1[2][1] * g_ + M1[2][2] * b_;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    l: M2[0][0] * l_ + M2[0][1] * m_ + M2[0][2] * s_,
    a: M2[1][0] * l_ + M2[1][1] * m_ + M2[1][2] * s_,
    b: M2[2][0] * l_ + M2[2][1] * m_ + M2[2][2] * s_,
  };
}
function oklabToSrgb(ok: OKLabColor): RGBColor {
  const l_ = ok.l + M2_INV[0][1] * ok.a + M2_INV[0][2] * ok.b;
  const m_ = ok.l + M2_INV[1][1] * ok.a + M2_INV[1][2] * ok.b;
  const s_ = ok.l + M2_INV[2][1] * ok.a + M2_INV[2][2] * ok.b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const r_ = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g_ = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_ = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return {
    r: linearToSrgb(r_),
    g: linearToSrgb(g_),
    b: linearToSrgb(b_),
  };
}
function deltaEOK(c1: OKLabColor, c2: OKLabColor): number {
  const dL = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
// --- Journey Engine ---
function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}
function lerpOK(c1: OKLabColor, c2: OKLabColor, t: number): OKLabColor {
  return {
    l: lerp(c1.l, c2.l, t),
    a: lerp(c1.a, c2.a, t),
    b: lerp(c1.b, c2.b, t),
  };
}
// Simple seeded PRNG (xorshift128+)
class SeededRNG {
  private s: [number, number, number, number];
  constructor(seed: number) {
    this.s = [seed, seed, seed, seed];
  }
  next(): number {
    let t = this.s[0];
    const s = this.s[1];
    this.s[0] = s;
    t ^= t << 11;
    t ^= t >>> 8;
    this.s[1] = this.s[2];
    this.s[2] = this.s[3];
    this.s[3] = t ^ s ^ (t >>> 19) ^ (s >>> 5);
    return (this.s[3] >>> 0) / 0x100000000;
  }
}
async function generatePalette(config: ColorJourneyConfig): Promise<GenerateResult> {
  const { anchors, numColors, loop, dynamics, variation } = config;
  const palette: ColorPoint[] = [];
  const diagnostics = { minDeltaE: Infinity, maxDeltaE: 0, contrastViolations: 0 };
  if (anchors.length === 0) {
    return { palette, config, diagnostics };
  }
  const okAnchors = anchors.map(hex => srgbToOklab(hexToRgb(hex)));
  const rng = new SeededRNG(variation.seed);
  for (let i = 0; i < numColors; i++) {
    let t = numColors > 1 ? i / (numColors - 1) : 0.5;
    if (loop === 'closed' && numColors > 1) {
      t = i / numColors;
    }
    let currentOK: OKLabColor;
    const numSegments = loop === 'closed' ? okAnchors.length : okAnchors.length - 1;
    if (okAnchors.length === 1) {
      const anchor = okAnchors[0];
      const hue = Math.atan2(anchor.b, anchor.a);
      const chroma = Math.sqrt(anchor.a * anchor.a + anchor.b * anchor.b);
      const newHue = hue + t * 2 * Math.PI;
      currentOK = {
        l: anchor.l,
        a: Math.cos(newHue) * chroma,
        b: Math.sin(newHue) * chroma,
      };
    } else {
      const segmentT = t * numSegments;
      const segmentIdx = Math.floor(segmentT);
      const localT = segmentT - segmentIdx;
      const startAnchor = okAnchors[segmentIdx];
      const endAnchor = okAnchors[(segmentIdx + 1) % okAnchors.length];
      currentOK = lerpOK(startAnchor, endAnchor, localT);
    }
    // Apply Dynamics
    currentOK.l += dynamics.lightness * 0.1;
    const chroma = Math.sqrt(currentOK.a * currentOK.a + currentOK.b * currentOK.b);
    const hue = Math.atan2(currentOK.b, currentOK.a);
    const newChroma = chroma * dynamics.chroma;
    currentOK.a = Math.cos(hue) * newChroma;
    currentOK.b = Math.sin(hue) * newChroma;
    // Apply Variation
    if (variation.mode !== 'off') {
      const strength = variation.mode === 'subtle' ? 0.01 : 0.03;
      currentOK.l += (rng.next() - 0.5) * strength * 0.5;
      currentOK.a += (rng.next() - 0.5) * strength;
      currentOK.b += (rng.next() - 0.5) * strength;
    }
    const rgb = oklabToSrgb(currentOK);
    const hex = rgbToHex(rgb);
    palette.push({ ok: currentOK, rgb, hex });
  }
  // Diagnostics
  for (let i = 1; i < palette.length; i++) {
    const deltaE = deltaEOK(palette[i - 1].ok, palette[i].ok);
    diagnostics.minDeltaE = Math.min(diagnostics.minDeltaE, deltaE);
    diagnostics.maxDeltaE = Math.max(diagnostics.maxDeltaE, deltaE);
    if (deltaE < dynamics.contrast * 0.1) {
      diagnostics.contrastViolations++;
    }
  }
  return { palette, config, diagnostics };
}
// --- Public API ---
// The API is async to allow for future WASM loading without changing the interface.
export const ColorJourneyEngine = {
  generate: (config: ColorJourneyConfig): Promise<GenerateResult> => {
    return new Promise((resolve) => {
      // In a real scenario, we might check for a WASM module here.
      // For Phase 1, we directly call the TS implementation.
      resolve(generatePalette(config));
    });
  },
};