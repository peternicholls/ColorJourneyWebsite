import { z } from 'zod';
import { GenerateResult, ColorPoint } from "@/types/color-journey";
const ColorJourneyConfigSchema = z.object({
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
  }),
  variation: z.object({
    mode: z.enum(['off', 'subtle', 'noticeable']),
    seed: z.number().int(),
  }),
});
const GenerateResultSchema = z.object({
  config: ColorJourneyConfigSchema,
  palette: z.array(z.object({
    hex: z.string(),
    ok: z.object({ l: z.number(), a: z.number(), b: z.number() }),
  })),
  diagnostics: z.object({
    minDeltaE: z.number(),
    maxDeltaE: z.number(),
    contrastViolations: z.number(),
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
    // Fallback to non-validated export if schema fails
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