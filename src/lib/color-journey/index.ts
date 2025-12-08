import type { ColorJourneyConfig, GenerateResult, OKLabColor, RGBColor, ColorPoint, CurveStyle, CurveDimension } from '../../types/color-journey';
// --- WASM Loader and State ---
let wasmApi: {
  generate: (configPtr: number, anchorsPtr: number) => number;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
  memory: ArrayBuffer;
} | null = null;
let isLoadingWasm = true;
let wasmLoadPromise: Promise<void> | null = null;
function initWasm() {
    if (wasmLoadPromise) return wasmLoadPromise;
    wasmLoadPromise = (async () => {
        try {
            // Use a variable URL to avoid static Vite/TS resolution.
            const wasmUrl = '/assets/color_journey.js';
            // 1. Pre-flight HEAD check with timeout
            const headController = new AbortController();
            const headTimeout = setTimeout(() => headController.abort(), 3000);
            let headOk = false;
            try {
                const headResp = await fetch(wasmUrl, { method: 'HEAD', signal: headController.signal });
                headOk = headResp && headResp.ok;
            } catch (e) {
                headOk = false;
            } finally {
                clearTimeout(headTimeout);
            }
            if (!headOk) {
                // Informative message for developers, then fall back to TS impl without throwing.
                console.info('Using TS engine for compatibility. For performance, run ./src/wasm/build-wasm.sh');
                wasmApi = null;
                return;
            }
            // 2. Dynamic import with an enforced timeout via Promise.race
            const importPromise = import(wasmUrl);
            const importTimeout = new Promise((_res, rej) => setTimeout(() => rej(new Error('WASM import timeout')), 5000));
            const mod = await Promise.race([importPromise, importTimeout]);
            const Module = (mod && (mod.default || mod)) as any;
            const moduleInstance = await Module({ noInitialRun: true });
            wasmApi = {
                generate: moduleInstance.cwrap('generate_discrete_palette', 'number', ['number', 'number']),
                malloc: moduleInstance._wasm_malloc,
                free: moduleInstance._wasm_free,
                memory: moduleInstance.HEAPU8.buffer,
            };
            console.log("🎨 Color Journey WASM module loaded successfully.");
        } catch (e) {
            console.debug("WASM fallback active. Color Journey WASM module failed to load.", e);
            wasmApi = null;
        } finally {
            isLoadingWasm = false;
        }
    })();
    return wasmLoadPromise;
}
initWasm();
// --- TypeScript Fallback Implementation (unchanged from previous state) ---
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
  let perceptualStepCount = 0;
  for (let i = 0; i < numColors; i++) {
    let t = numColors > 1 ? i / (numColors - 1) : 0.5;
    if (loop === 'closed' && numColors > 1) t = i / numColors;
    if (loop === 'ping-pong') { t *= 2; if (t > 1) t = 2 - t; }
    let currentOK: OKLabColor;
    let segmentLocalT = t;
    if (anchors.length > 1) {
      const numSegments = loop === 'closed' ? okAnchors.length : okAnchors.length - 1;
      const segmentT = t * numSegments;
      const segmentIdx = Math.min(Math.floor(segmentT), numSegments - 1);
      segmentLocalT = segmentT - segmentIdx;
      const startAnchor = okAnchors[segmentIdx];
      const endAnchor = okAnchors[(segmentIdx + 1) % okAnchors.length];
      currentOK = lerpOK(startAnchor, endAnchor, segmentLocalT);
    } else {
      currentOK = { ...okAnchors[0] };
    }
    const getEasedT = (localT: number, style: CurveStyle = 'linear', bezier: [number, number] = [0.5, 0.5]): number => {
      switch (style) {
        case 'ease-in': return cubicBezier(localT, 0.42, 0);
        case 'ease-out': return cubicBezier(localT, 0, 0.58);
        case 'sinusoidal': return 0.5 - 0.5 * Math.cos(localT * Math.PI);
        case 'stepped': return Math.floor(localT * 5) / 4;
        case 'custom': return cubicBezier(localT, bezier[0], bezier[1]);
        default: return localT;
      }
    };
    const easedT = getEasedT(segmentLocalT, dynamics.curveStyle, dynamics.bezierLight);
    const strength = dynamics.curveStrength ?? 1.0;
    const dims = dynamics.curveDimensions || ['all'];
    const applyL = dims.includes('L') || dims.includes('all');
    const applyC = dims.includes('C') || dims.includes('all');
    const applyH = dims.includes('H') || dims.includes('all');
    const baseChroma = Math.sqrt(currentOK.a * currentOK.a + currentOK.b * currentOK.b);
    let baseHue = Math.atan2(currentOK.b, currentOK.a);
    if (applyL) { currentOK.l += lerp(0, dynamics.lightness * 0.2, easedT * strength); } else { currentOK.l += dynamics.lightness * 0.2 * segmentLocalT; }
    let finalChroma = baseChroma;
    if (applyC) { finalChroma = lerp(baseChroma, baseChroma * dynamics.chroma, easedT * strength); } else { finalChroma = lerp(baseChroma, baseChroma * dynamics.chroma, segmentLocalT); }
    if (anchors.length === 1) {
      if (dynamics.enableColorCircle) {
        const arc = (dynamics.arcLength || 0) / 360 * 2 * Math.PI;
        const hueMod = applyH ? easedT * strength : t;
        baseHue += hueMod * arc + dynamics.warmth * 0.5;
      } else {
        perceptualStepCount = Math.min(numColors, 20);
        const stepT = perceptualStepCount > 1 ? i / (perceptualStepCount - 1) : 0.5;
        currentOK.l += Math.sin(stepT * Math.PI) * 0.1 * dynamics.lightness;
        finalChroma += Math.cos(stepT * Math.PI) * 0.05 * (dynamics.chroma - 1);
      }
    }
    const proximity = Math.abs(segmentLocalT - 0.5);
    const radius = 0.35;
    const boost = 1 + dynamics.vibrancy * 0.6 * Math.max(0, 1 - proximity / radius);
    finalChroma *= boost;
    currentOK.a = Math.cos(baseHue) * finalChroma;
    currentOK.b = Math.sin(baseHue) * finalChroma;
    if (variation.mode !== 'off') {
      let varStrength = variation.mode === 'subtle' ? 0.01 : 0.03;
      if (i > 0 && deltaEOK(palette[i - 1]?.ok ?? currentOK, currentOK) < (dynamics.contrast * 0.1)) { varStrength *= 0.8; }
      currentOK.l += (rng.next() - 0.5) * varStrength * 0.5;
      currentOK.a += (rng.next() - 0.5) * varStrength;
      currentOK.b += (rng.next() - 0.5) * varStrength;
    }
    palette.push({ ok: currentOK, rgb: oklabToSrgb(currentOK), hex: '' });
  }
  const traversalStrategy = numColors > 20 ? 'multi-dim' : 'perceptual';
  if (traversalStrategy === 'multi-dim') {
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const altL = Math.sin(i * Math.PI / 10) * 0.05;
      p.ok.l = Math.max(0, Math.min(1, p.ok.l + altL));
      const pulseC = 1 + 0.1 * Math.cos(i * Math.PI / 5);
      const chroma = Math.sqrt(p.ok.a * p.ok.a + p.ok.b * p.ok.b);
      const hue = Math.atan2(p.ok.b, p.ok.a);
      const hueOffset = 0.05 * (i % 12);
      const newChroma = chroma * pulseC;
      p.ok.a = Math.cos(hue + hueOffset) * newChroma;
      p.ok.b = Math.sin(hue + hueOffset) * newChroma;
    }
  }
  const minDeltaE = Math.max(dynamics.contrast * 0.1, 0.01);
  let totalIters = 0;
  for (let iter = 0; iter < 5; iter++) {
    let adjusted = false;
    for (let i = 1; i < palette.length; i++) {
      let dE = deltaEOK(palette[i - 1].ok, palette[i].ok);
      if (dE < minDeltaE) {
        adjusted = true;
        totalIters++;
        const nudge = (minDeltaE - dE) * 0.1;
        palette[i].ok.l = Math.max(0, Math.min(1, palette[i].ok.l + nudge));
        dE = deltaEOK(palette[i - 1].ok, palette[i].ok);
        if (dE < minDeltaE) {
          const chromaI = Math.sqrt(palette[i].ok.a ** 2 + palette[i].ok.b ** 2);
          if (chromaI > 1e-5) {
            const scale = 1 + nudge / chromaI;
            palette[i].ok.a *= scale;
            palette[i].ok.b *= scale;
          }
        }
      }
    }
    if (!adjusted) break;
  }
  palette.forEach(p => { p.rgb = oklabToSrgb(p.ok); p.hex = rgbToHex(p.rgb); });
  const diagnostics: GenerateResult['diagnostics'] = { minDeltaE: Infinity, maxDeltaE: 0, contrastViolations: 0, wcagMinRatio: Infinity, wcagViolations: 0, enforcementIters: totalIters, traversalStrategy };
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
  return { palette, config, diagnostics };
}
async function generatePaletteWasm(config: ColorJourneyConfig): Promise<GenerateResult> {
    if (!wasmApi) return generatePaletteTS(config);
    const { malloc, free, memory, generate } = wasmApi;
    const configSize = 129; // Increased size for new fields
    const configPtr = malloc(configSize);
    const okAnchors = config.anchors.map(hex => srgbToOklab(hexToRgb(hex)));
    const anchorsPtr = malloc(okAnchors.length * 24); // 3 doubles * 8 bytes
    try {
        const configView = new DataView(memory, configPtr, configSize);
        const heapU8 = new Uint8Array(memory);
        configView.setFloat64(0, config.dynamics.lightness, true);
        configView.setFloat64(8, config.dynamics.chroma, true);
        configView.setFloat64(16, config.dynamics.contrast, true);
        configView.setFloat64(24, config.dynamics.vibrancy, true);
        configView.setFloat64(32, config.dynamics.warmth, true);
        configView.setFloat64(40, config.dynamics.bezierLight?.[0] ?? 0.5, true);
        configView.setFloat64(48, config.dynamics.bezierLight?.[1] ?? 0.5, true);
        configView.setFloat64(56, config.dynamics.bezierChroma?.[0] ?? 0.5, true);
        configView.setFloat64(64, config.dynamics.bezierChroma?.[1] ?? 0.5, true);
        configView.setUint32(72, config.variation.seed, true);
        configView.setInt32(76, config.numColors, true);
        configView.setInt32(80, okAnchors.length, true);
        const loopModes = { open: 0, closed: 1, 'ping-pong': 2 };
        configView.setInt32(84, loopModes[config.loop], true);
        const curveStyleBytes = new TextEncoder().encode(config.dynamics.curveStyle || 'linear');
        heapU8.set(curveStyleBytes, configPtr + 88);
        const dims = config.dynamics.curveDimensions || ['all'];
        const dimBitflag = (dims.includes('L') ? 1 : 0) | (dims.includes('C') ? 2 : 0) | (dims.includes('H') ? 4 : 0) | (dims.includes('all') ? 8 : 0);
        configView.setInt32(104, dimBitflag, true);
        configView.setFloat64(108, config.dynamics.curveStrength || 1.0, true);
        const varModes = { off: 0, subtle: 1, noticeable: 2 };
        configView.setInt32(116, varModes[config.variation.mode], true);
        // New fields
        configView.setUint8(120, config.dynamics.enableColorCircle ? 1 : 0);
        configView.setFloat64(121, config.dynamics.arcLength || 0, true); // Aligned to 121, C struct will handle padding
        const anchorsView = new Float64Array(memory, anchorsPtr, okAnchors.length * 3);
        okAnchors.forEach((c, i) => anchorsView.set([c.l, c.a, c.b], i * 3));
        const resultPtr = generate(configPtr, anchorsPtr);
        const palette: ColorPoint[] = [];
        let totalIters = 0;
        const resultView = new DataView(memory, resultPtr);
        const colorPointSize = 32; // 24 for oklab, 4 for rgb (padded), 4 for iters
        for (let i = 0; i < config.numColors; i++) {
            const offset = i * colorPointSize;
            const ok: OKLabColor = {
                l: resultView.getFloat64(offset, true),
                a: resultView.getFloat64(offset + 8, true),
                b: resultView.getFloat64(offset + 16, true),
            };
            const rgb: RGBColor = {
                r: resultView.getUint8(offset + 24) / 255,
                g: resultView.getUint8(offset + 25) / 255,
                b: resultView.getUint8(offset + 26) / 255,
            };
            const iters = resultView.getInt32(offset + 28, true);
            totalIters += iters;
            palette.push({ ok, rgb, hex: rgbToHex(rgb) });
        }
        free(resultPtr);
        const diagnostics: GenerateResult['diagnostics'] = { minDeltaE: Infinity, maxDeltaE: 0, contrastViolations: 0, wcagMinRatio: Infinity, wcagViolations: 0, enforcementIters: totalIters, traversalStrategy: config.numColors > 20 ? 'multi-dim' : 'perceptual' };
        // Calculate diagnostics similar to TS version
        return { palette, config, diagnostics };
    } finally {
        free(configPtr);
        free(anchorsPtr);
    }
}
export const ColorJourneyEngine = {
  generate: async (config: ColorJourneyConfig): Promise<GenerateResult> => {
    await initWasm();
    if (wasmApi) {
        console.time('wasm-gen');
        const result = await generatePaletteWasm(config);
        console.timeEnd('wasm-gen');
        return result;
    }
    return generatePaletteTS(config);
  },
  isWasmReady: () => !!wasmApi,
  isLoadingWasm: () => isLoadingWasm,
  isWasmFallback: () => !wasmApi,
};