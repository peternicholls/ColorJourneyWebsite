import type { ColorJourneyConfig, GenerateResult, OKLabColor, RGBColor, ColorPoint } from '@/types/color-journey';
// --- WASM Loader and State ---
let wasmModule: WebAssembly.Instance | null = null;
let wasmApi: {
  generate: (configPtr: number, anchorsPtr: number) => number;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
  memory: WebAssembly.Memory;
} | null = null;
async function initWasm() {
  if (wasmModule) return;
  try {
    // Fetch and instantiate the WASM module directly.
    // This avoids Vite's dynamic import resolution issues with Emscripten's JS glue.
    // The .wasm file must be in the `public` directory.
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
    console.log("✅ Color Journey WASM module loaded successfully.");
  } catch (e) {
    console.warn("⚠️ Color Journey WASM module failed to load. Falling back to TypeScript implementation.", e);
    wasmModule = null; // Ensure it's marked as failed
    wasmApi = null;
  }
}
// Eagerly start loading the WASM module
initWasm();
// --- TypeScript Fallback Implementation ---
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
async function generatePaletteTS(config: ColorJourneyConfig): Promise<GenerateResult> {
  const { anchors, numColors, loop, dynamics, variation } = config;
  const palette: ColorPoint[] = [];
  if (anchors.length === 0) return { palette, config, diagnostics: { minDeltaE: 0, maxDeltaE: 0, contrastViolations: 0 } };
  const okAnchors = anchors.map((hex: string) => srgbToOklab(hexToRgb(hex)));
  const rng = new SeededRNG(variation.seed);
  for (let i = 0; i < numColors; i++) {
    let t = numColors > 1 ? i / (numColors - 1) : 0.5;
    if (loop === 'closed' && numColors > 1) t = i / numColors;
    if (loop === 'ping-pong') { t *= 2; if (t > 1) t = 2 - t; }
    let currentOK: OKLabColor;
    if (okAnchors.length === 1) {
      const anchor = okAnchors[0];
      const hue = Math.atan2(anchor.b, anchor.a), chroma = Math.sqrt(anchor.a * anchor.a + anchor.b * anchor.b);
      const newHue = hue + t * 2 * Math.PI;
      currentOK = { l: anchor.l, a: Math.cos(newHue) * chroma, b: Math.sin(newHue) * chroma };
    } else {
      const numSegments = loop === 'closed' ? okAnchors.length : okAnchors.length - 1;
      const segmentT = t * numSegments, segmentIdx = Math.floor(segmentT), localT = segmentT - segmentIdx;
      const startAnchor = okAnchors[segmentIdx], endAnchor = okAnchors[(segmentIdx + 1) % okAnchors.length];
      currentOK = lerpOK(startAnchor, endAnchor, localT);
    }
    currentOK.l += dynamics.lightness * 0.1;
    const chroma = Math.sqrt(currentOK.a * currentOK.a + currentOK.b * currentOK.b), hue = Math.atan2(currentOK.b, currentOK.a);
    const newChroma = chroma * dynamics.chroma;
    currentOK.a = Math.cos(hue) * newChroma; currentOK.b = Math.sin(hue) * newChroma;
    if (variation.mode !== 'off') {
      const strength = variation.mode === 'subtle' ? 0.01 : 0.03;
      currentOK.l += (rng.next() - 0.5) * strength * 0.5;
      currentOK.a += (rng.next() - 0.5) * strength;
      currentOK.b += (rng.next() - 0.5) * strength;
    }
    const rgb = oklabToSrgb(currentOK);
    palette.push({ ok: currentOK, rgb, hex: rgbToHex(rgb) });
  }
  const diagnostics = { minDeltaE: Infinity, maxDeltaE: 0, contrastViolations: 0 };
  for (let i = 1; i < palette.length; i++) {
    const deltaE = deltaEOK(palette[i - 1].ok, palette[i].ok);
    diagnostics.minDeltaE = Math.min(diagnostics.minDeltaE, deltaE);
    diagnostics.maxDeltaE = Math.max(diagnostics.maxDeltaE, deltaE);
    if (deltaE < dynamics.contrast * 0.1) diagnostics.contrastViolations++;
  }
  return { palette, config, diagnostics };
}
// --- WASM Implementation ---
async function generatePaletteWasm(config: ColorJourneyConfig): Promise<GenerateResult> {
  if (!wasmApi) throw new Error("WASM API not initialized");
  const okAnchors = config.anchors.map((hex: string) => srgbToOklab(hexToRgb(hex)));
  const configSize = 96;
  const configPtr = wasmApi.malloc(configSize);
  const anchorsPtr = wasmApi.malloc(okAnchors.length * 24);
  try {
    const loopModeMap: { [key in typeof config.loop]: number } = { 'open': 0, 'closed': 1, 'ping-pong': 2 };
    const variationModeMap: { [key in typeof config.variation.mode]: number } = { 'off': 0, 'subtle': 1, 'noticeable': 2 };
    const configView = new DataView(wasmApi.memory.buffer, configPtr, configSize);
    configView.setFloat64(0, config.dynamics.lightness, true);
    configView.setFloat64(8, config.dynamics.chroma, true);
    configView.setFloat64(16, config.dynamics.contrast, true);
    configView.setFloat64(24, config.dynamics.vibrancy, true); // Added
    configView.setFloat64(32, config.dynamics.warmth, true);   // Added
    configView.setUint32(40, config.variation.seed, true);
    configView.setInt32(44, config.numColors, true);
    configView.setInt32(48, okAnchors.length, true);
    configView.setInt32(52, loopModeMap[config.loop], true);
    configView.setInt32(56, variationModeMap[config.variation.mode], true);
    const anchorsView = new Float64Array(wasmApi.memory.buffer, anchorsPtr, okAnchors.length * 3);
    okAnchors.forEach((anchor: OKLabColor, i: number) => {
      anchorsView.set([anchor.l, anchor.a, anchor.b], i * 3);
    });
    const resultPtr = wasmApi.generate(configPtr, anchorsPtr);
    if (resultPtr === 0) throw new Error("WASM palette generation failed");
    const palette: ColorPoint[] = [];
    const colorPointSize = 32;
    for (let i = 0; i < config.numColors; i++) {
        const colorPtr = resultPtr + i * colorPointSize;
        const okView = new Float64Array(wasmApi.memory.buffer, colorPtr, 3);
        const rgbView = new Uint8Array(wasmApi.memory.buffer, colorPtr + 24, 3);
        const ok: OKLabColor = { l: okView[0], a: okView[1], b: okView[2] };
        const rgb: RGBColor = { r: rgbView[0] / 255, g: rgbView[1] / 255, b: rgbView[2] / 255 };
        palette.push({ ok, rgb, hex: rgbToHex(rgb) });
    }
    wasmApi.free(resultPtr);
    const diagnostics = { minDeltaE: Infinity, maxDeltaE: 0, contrastViolations: 0 };
    for (let i = 1; i < palette.length; i++) {
      const deltaE = deltaEOK(palette[i - 1].ok, palette[i].ok);
      diagnostics.minDeltaE = Math.min(diagnostics.minDeltaE, deltaE);
      diagnostics.maxDeltaE = Math.max(diagnostics.maxDeltaE, deltaE);
      if (deltaE < config.dynamics.contrast * 0.1) diagnostics.contrastViolations++;
    }
    return { palette, config, diagnostics };
  } finally {
    wasmApi.free(configPtr);
    wasmApi.free(anchorsPtr);
  }
}
// --- Public API ---
export const ColorJourneyEngine = {
  generate: async (config: ColorJourneyConfig): Promise<GenerateResult> => {
    if (wasmApi) {
      try {
        return await generatePaletteWasm(config);
      } catch (e) {
        console.error("WASM execution failed, falling back to TS.", e);
        return generatePaletteTS(config);
      }
    }
    return generatePaletteTS(config);
  },
  isWasmReady: () => !!wasmApi,
};