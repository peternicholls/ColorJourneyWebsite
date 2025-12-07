export type RGBColor = { r: number; g: number; b: number };
export type OKLabColor = { l: number; a: number; b: number };
export type ColorPoint = { ok: OKLabColor; rgb: RGBColor; hex: string };
export type LoopMode = 'open' | 'closed' | 'ping-pong';
export type GranularityMode = 'continuous' | 'discrete';
export type VariationMode = 'off' | 'subtle' | 'noticeable';
export type BiasPreset = 'neutral' | 'lighter' | 'darker' | 'muted' | 'vivid' | 'warm' | 'cool' | 'aaa-safe';
export interface DynamicsConfig {
  lightness: number; // -1 to 1 (darker to lighter)
  chroma: number; // 0 to 2 (muted to vivid)
  contrast: number; // 0 to 1 (low to high)
  vibrancy: number; // 0 to 1 (midpoint boost)
  warmth: number; // -1 to 1 (cool to warm)
  biasPreset?: BiasPreset;
  /** Bezier curve control points for lightness. Defaults to [0.5, 0.5] */
  bezierLight?: [number, number];
  /** Bezier curve control points for chroma. Defaults to [0.5, 0.5] */
  bezierChroma?: [number, number];
}
export interface VariationConfig {
  mode: VariationMode;
  seed: number;
}
export interface ColorJourneyConfig {
  /** sRGB hex strings, e.g., "#F38020". Must match /^#[0-9a-fA-F]{6}$/ */
  anchors: string[];
  numColors: number;
  loop: LoopMode;
  granularity: GranularityMode;
  dynamics: DynamicsConfig;
  variation: VariationConfig;
}
export interface GenerateResult {
  palette: ColorPoint[];
  config: ColorJourneyConfig;
  diagnostics: {
    minDeltaE: number;
    maxDeltaE: number;
    contrastViolations: number;
    wcagMinRatio: number;
    wcagViolations: number;
    aaaCompliant?: boolean;
  };
}