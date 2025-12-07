import type { ColorJourneyConfig, GenerateResult, OKLabColor, RGBColor, ColorPoint } from '@/types/color-journey';
// --- WASM Loader and State ---
let wasmModule: WebAssembly.Instance | null = null;
let wasmApi: {
  generate: (configPtr: number, anchorsPtr: number) => number;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
  memory: WebAssembly.Memory;
} | null = null;
let isLoadingWasm = true;
async function initWasm() {
  try {
    const response = await fetch('/assets/color_journey.wasm');
    const module = await WebAssembly.instantiateStreaming(response, {});
    wasmModule = module.instance;
    const exports = wasmModule.exports;
    wasmApi = {
      generate: exports.generate_discrete_palette as (configPtr: number, anchorsPtr: number) => number,
      malloc: exports.wasm_malloc as (size: number) => number,
      free: exports.wasm_free as (ptr: number) => void,
      memory: exports.memory as WebAssembly.Memory,
    };
    console.log("🎨 Color Journey WASM module loaded successfully.");
  } catch (e) {
    console.warn("⚠️ Color Journey WASM module failed to load. Falling back to TypeScript implementation.", e);
    wasmModule = null;
    wasmApi = null;
  } finally {
    isLoadingWasm = false;
  }
}
initWasm();
// --- TypeScript Fallback Implementation ---
const M1 = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]];
const M2 = [[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]];
function srgbToLinear(c: number): number { return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }
function linearToSrgb(c: number): number { return c > 0.0031308 ? 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055 : 12.92 * c; }
function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : { r: 0, g: 0, b: 0 };
}
function rgbToHex(rgb: RGBColor): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}
function srgbToOklab(rgb: RGBColor): OKLabColor {
  const r_ = srgbToLinear(rgb.r), g_ = srgbToLinear(rgb.g), b_ = srgbToLinear(rgb.b);
  const l = M1[0][0] * r_ + M1[0][1] * g_ + M1[0][2] * b_;
  const m = M1[1][0] * r_ + M1[1][1] * g_ + M1[1][2] * b_;
  const s = M1[2][0] * r_ + M1[2][1] * g_ + M1[2][2] * b_;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return { l: M2[0][0] * l_ + M2[0][1] * m_ + M2[0][2] * s_, a: M2[1][0] * l_ + M2[1][1] * m_ + M2[1][2] * s_, b: M2[2][0] * l_ + M2[2][1] * m_ + M2[2][2] * s_ };
}
function oklabToSrgb(ok: OKLabColor): RGBColor {
  const l_ = ok.l + 0.3963377774 * ok.a + 0.2158037573 * ok.b;
  const m_ = ok.l - 0.1055613458 * ok.a - 0.0638541728 * ok.b;
  const s_ = ok.l - 0.0894841775 * ok.a - 1.2914855480 * ok.b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const r_ = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g_ = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_ = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return { r: linearToSrgb(r_), g: linearToSrgb(g_), b: linearToSrgb(b_) };
}
function deltaEOK(c1: OKLabColor, c2: OKLabColor): number {
  const dL = c1.l - c2.l, da = c1.a - c2.a, db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}
function lerp(a: number, b: number, t: number): number { return a * (1 - t) + b * t; }
function lerpOK(c1: OKLabColor, c2: OKLabColor, t: number): OKLabColor { return { l: lerp(c1.l, c2.l, t), a: lerp(c1.a, c2.a, t), b: lerp(c1.b, c2.b, t) }; }
class SeededRNG {
  private s: [number, number, number, number];
  constructor(seed: number) { this.s = [seed, seed, seed, seed]; }
  next(): number { let t = this.s[0]; const s = this.s[1]; this.s[0] = s; t ^= t << 11; t ^= t >>> 8; this.s[1] = this.s[2]; this.s[2] = this.s[3]; this.s[3] = t ^ s ^ (t >>> 19) ^ (s >>> 5); return (this.s[3] >>> 0) / 0x100000000; }
}
function cubicBezier(t: number, p1: number, p2: number): number {
  const C = (t: number, p1: number, p2: number) => 3 * p1 * (1 - t) * (1 - t) * t + 3 * p2 * (1 - t) * t * t + t * t * t;
  return C(t, p1, p2);
}
function getRelativeLuminance(rgb: RGBColor): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function getContrastRatio(rgb1: RGBColor, rgb2: RGBColor): number {
  const l1 = getRelativeLuminance(rgb1), l2 = getRelativeLuminance(rgb2);
  return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
}
async function generatePaletteTS(config: ColorJourneyConfig): Promise<GenerateResult> {
  const { anchors, numColors, loop, dynamics, variation } = config;
  const palette: ColorPoint[] = [];
  if (anchors.length === 0) return { palette, config, diagnostics: { minDeltaE: 0, maxDeltaE: 0, contrastViolations: 0, wcagMinRatio: 1, wcagViolations: 0 } };
  const okAnchors = anchors.map((hex: string) => srgbToOklab(hexToRgb(hex)));
  const rng = new SeededRNG(variation.seed);
  const [bl1, bl2] = dynamics.bezierLight || [0.5, 0.5];
  const [bc1, bc2] = dynamics.bezierChroma || [0.5, 0.5];
  for (let i = 0; i < numColors; i++) {
    let t = numColors > 1 ? i / (numColors - 1) : 0.5;
    if (loop === 'closed' && numColors > 1) t = i / numColors;
    if (loop === 'ping-pong') { t *= 2; if (t > 1) t = 2 - t; }
    let currentOK: OKLabColor;
    if (okAnchors.length === 1) {
      const anchor = okAnchors[0];
      const hue = Math.atan2(anchor.b, anchor.a), chroma = Math.sqrt(anchor.a * anchor.a + anchor.b * anchor.b);
      const newHue = hue + t * 2 * Math.PI + dynamics.warmth * 0.5;
      currentOK = { l: anchor.l, a: Math.cos(newHue) * chroma, b: Math.sin(newHue) * chroma };
    } else {
      const numSegments = loop === 'closed' ? okAnchors.length : okAnchors.length - 1;
      const segmentT = t * numSegments, segmentIdx = Math.floor(segmentT), localT = segmentT - segmentIdx;
      const startAnchor = okAnchors[segmentIdx], endAnchor = okAnchors[(segmentIdx + 1) % okAnchors.length];
      currentOK = lerpOK(startAnchor, endAnchor, localT);
    }
    currentOK.l = lerp(currentOK.l, currentOK.l + dynamics.lightness * 0.2, cubicBezier(t, bl1, bl2));
    const chroma = Math.sqrt(currentOK.a * currentOK.a + currentOK.b * currentOK.b), hue = Math.atan2(currentOK.b, currentOK.a);
    const newChroma = lerp(chroma, chroma * dynamics.chroma, cubicBezier(t, bc1, bc2));
    let finalChroma = newChroma;
    if (Math.abs(t - 0.5) < 0.2) {
      finalChroma *= (1 + dynamics.vibrancy * 0.2 * (1 - Math.abs(t - 0.5) / 0.2));
    }
    currentOK.a = Math.cos(hue) * finalChroma; currentOK.b = Math.sin(hue) * finalChroma;
    if (numColors > 50) {
        currentOK.l += Math.sin(i * (variation.seed % 100) / 100) * 0.03;
        currentOK.l = Math.max(0, Math.min(1, currentOK.l));
    } else if (numColors > 20 && okAnchors.length > 1) {
      const cycle = Math.floor(i / okAnchors.length);
      currentOK.l += (cycle % 2 === 0 ? 1 : -1) * 0.02;
    }
    if (variation.mode !== 'off') {
      const strength = variation.mode === 'subtle' ? 0.01 : 0.03;
      currentOK.l += (rng.next() - 0.5) * strength * 0.5;
      currentOK.a += (rng.next() - 0.5) * strength;
      currentOK.b += (rng.next() - 0.5) * strength;
    }
    palette.push({ ok: currentOK, rgb: oklabToSrgb(currentOK), hex: '' });
  }
  // Contrast Enforcement
  const minDeltaE = dynamics.contrast * 0.1;
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 1; i < palette.length; i++) {
      const dE = deltaEOK(palette[i - 1].ok, palette[i].ok);
      if (dE < minDeltaE) {
        const nudge = (minDeltaE - dE) * 0.5;
        palette[i].ok.l += nudge;
        palette[i].ok.l = Math.max(0, Math.min(1, palette[i].ok.l));
      }
    }
  }
  palette.forEach(p => { p.rgb = oklabToSrgb(p.ok); p.hex = rgbToHex(p.rgb); });
  const diagnostics = { minDeltaE: Infinity, maxDeltaE: 0, contrastViolations: 0, wcagMinRatio: Infinity, wcagViolations: 0, aaaCompliant: false };
  const white = { r: 1, g: 1, b: 1 }, black = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < palette.length; i++) {
    if (i > 0) {
      const deltaE = deltaEOK(palette[i - 1].ok, palette[i].ok);
      diagnostics.minDeltaE = Math.min(diagnostics.minDeltaE, deltaE);
      diagnostics.maxDeltaE = Math.max(diagnostics.maxDeltaE, deltaE);
      if (deltaE < minDeltaE) diagnostics.contrastViolations++;
    }
    const ratioWhite = getContrastRatio(palette[i].rgb, white);
    const ratioBlack = getContrastRatio(palette[i].rgb, black);
    const betterRatio = Math.max(ratioWhite, ratioBlack);
    diagnostics.wcagMinRatio = Math.min(diagnostics.wcagMinRatio, betterRatio);
    if (betterRatio < 4.5) diagnostics.wcagViolations++;
  }
  if (diagnostics.wcagMinRatio >= 7) {
    diagnostics.aaaCompliant = true;
  }
  return { palette, config, diagnostics };
}
export const ColorJourneyEngine = {
  generate: async (config: ColorJourneyConfig): Promise<GenerateResult> => {
    // For Phase 1, always use TS. WASM path is for Phase 2.
    // In a real Phase 2, we would use the wasmApi if available.
    return generatePaletteTS(config);
  },
  isWasmReady: () => !!wasmApi,
  isLoadingWasm: () => isLoadingWasm,
};