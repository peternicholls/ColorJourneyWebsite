import { z } from 'zod';
import { GenerateResult, ColorPoint } from "@/types/color-journey";
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
  return `:root {\n${variables}\n}`;
}
export function exportToJson(result: GenerateResult): string {
  try {
    const validatedResult = GenerateResultSchema.parse({
      ...result,
      palette: result.palette.map(p => ({ hex: p.hex, ok: p.ok })),
    });
    return JSON.stringify(validatedResult, null, 2);
  } catch (error) {
    console.error("Zod validation failed for export:", error);
    return JSON.stringify(result, null, 2);
  }
}
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Async: Could not copy text: ", err);
    return false;
  }
}
export async function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}