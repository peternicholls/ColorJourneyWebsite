import { GenerateResult, ColorPoint } from "@/types/color-journey";
export function exportToCssVariables(palette: ColorPoint[]): string {
  if (!palette || palette.length === 0) return "";
  return palette
    .map((color, index) => `  --cj-${index + 1}: ${color.hex};`)
    .join("\n");
}
export function exportToJson(result: GenerateResult): string {
  return JSON.stringify(
    {
      config: result.config,
      palette: result.palette.map(p => ({ hex: p.hex, ok: p.ok })),
      diagnostics: result.diagnostics,
    },
    null,
    2
  );
}
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
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