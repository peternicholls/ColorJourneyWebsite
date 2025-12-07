import { z } from 'zod';
import { GenerateResult, ColorPoint } from "../../types/color-journey";
export const ColorJourneyConfigSchema = z.object({
  anchors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)),
  numColors: z.number().int().min(1),
  loop: z.enum(['open', 'closed', 'ping-pong']),
  granularity: z.enum(['continuous', 'discrete']),
  dynamics: z.object({
    lightness: z.number(),
    chroma: z.number(),
    contrast: z.number(),
    vibrancy: z.number(),
    warmth: z.number(),
    biasPreset: z.enum(['neutral', 'lighter', 'darker', 'muted', 'vivid', 'warm', 'cool', 'aaa-safe']).optional(),
    bezierLight: z.tuple([z.number(), z.number()]).optional(),
    bezierChroma: z.tuple([z.number(), z.number()]).optional(),
    enableColorCircle: z.boolean().optional(),
    arcLength: z.number().optional(),
    curveStyle: z.enum(['linear', 'ease-in', 'ease-out', 'sinusoidal', 'stepped', 'custom']).optional(),
    curveDimensions: z.array(z.enum(['L', 'C', 'H', 'all'])).optional(),
    curveStrength: z.number().optional(),
  }),
  variation: z.object({
    mode: z.enum(['off', 'subtle', 'noticeable']),
    seed: z.number().int(),
  }),
  ui: z.object({
    show3D: z.boolean().optional(),
  }).optional(),
});
export const GenerateResultSchema = z.object({
  config: ColorJourneyConfigSchema,
  palette: z.array(z.object({
    hex: z.string(),
    ok: z.object({ l: z.number(), a: z.number(), b: z.number() }),
  })),
  diagnostics: z.object({
    minDeltaE: z.number(),
    maxDeltaE: z.number(),
    contrastViolations: z.number(),
    wcagMinRatio: z.number(),
    wcagViolations: z.number(),
    aaaCompliant: z.boolean().optional(),
    perceptualStepCount: z.number().optional(),
    arcUsage: z.number().optional(),
    curveApplied: z.object({
        style: z.string(),
        dimensions: z.array(z.string()),
        strength: z.number(),
    }).optional(),
    enforcementIters: z.number().optional(),
    traversalStrategy: z.enum(['perceptual', 'multi-dim']).optional(),
  }),
});
export function exportToCssVariables(palette: ColorPoint[]): string {
  if (!palette || palette.length === 0) return "";
  const variables = palette
    .map((color, index) => `  --cj-${index + 1}: ${color.hex};`)
    .join("\n");
  return `:root {\n${variables}\n}\n`;
}
export function exportToJson(result: GenerateResult): string {
  try {
    const validatedResult = GenerateResultSchema.parse({
      ...result,
      palette: result.palette.map((p: ColorPoint) => ({ hex: p.hex, ok: p.ok })),
    });
    return JSON.stringify(validatedResult, null, 2);
  } catch (error) {
    console.error("Zod validation failed for export:", error);
    return JSON.stringify(result, null, 2);
  }
}
export async function copyToClipboard(text: string): Promise<boolean> {
  const gNav = (globalThis as any).navigator;
  const doc = (globalThis as any).document;
  const hasClipboard = typeof gNav !== "undefined" && "clipboard" in gNav;
  if (!hasClipboard) {
    if (typeof doc !== "undefined") {
      try {
        const textArea = doc.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        doc.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        doc.execCommand("copy");
        doc.body.removeChild(textArea);
        return true;
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
        return false;
      }
    } else {
      console.warn("copyToClipboard: document not available in this environment");
      return false;
    }
  }
  try {
    await (gNav as any).clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Async: Could not copy text: ", err);
    return false;
  }
}
export async function downloadFile(content: string, filename: string, type = 'text/plain') {
  const doc = (globalThis as any).document;
  const gWindow = (globalThis as any).window;
  const gURL = (globalThis as any).URL;
  if (typeof doc === 'undefined' || typeof gWindow === 'undefined' || typeof gURL === 'undefined') {
    console.warn('downloadFile: DOM not available in this environment; skipping download.');
    return;
  }
  const blob = new (gWindow as any).Blob([content], { type });
  const url = gURL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
  gURL.revokeObjectURL(url);
}