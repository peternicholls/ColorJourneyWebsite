export type RGBColor = { r: number; g: number; b: number };
export type OKLabColor = { l: number; a: number; b: number };
export type ColorPoint = { ok: OKLabColor; rgb: RGBColor; hex: string };
export type LoopMode = 'open' | 'closed' | 'ping-pong';
export type GranularityMode = 'continuous' | 'discrete';
export type VariationMode = 'off' | 'subtle' | 'noticeable';
export type BiasPreset = 'neutral' | 'lighter' | 'darker' | 'muted' | 'vivid' | 'warm' | 'cool' | 'aaa-safe';
export type CurveStyle = 'linear' | 'ease-in' | 'ease-out' | 'sinusoidal' | 'stepped' | 'custom';
export type CurveDimension = 'L' | 'C' | 'H' | 'all';
export interface DynamicsConfig {
  lightness: number; // -1 to 1 (darker to lighter)
  chroma: number; // 0 to 2 (muted to vivid)
  contrast: number; // 0 to 1 (low to high)
  vibrancy: number; // 0 to 1 (midpoint boost)
  warmth: number; // -1 to 1 (cool to warm)
  biasPreset?: BiasPreset;
  bezierLight?: [number, number];
  bezierChroma?: [number, number];
  enableColorCircle?: boolean;
  arcLength?: number;
  curveStyle?: CurveStyle;
  curveDimensions?: CurveDimension[];
  curveStrength?: number;
}
export interface VariationConfig {
  mode: VariationMode;
  seed: number;
}
export interface ColorJourneyConfig {
  anchors: string[];
  numColors: number;
  loop: LoopMode;
  granularity: GranularityMode;
  dynamics: DynamicsConfig;
  variation: VariationConfig;
  ui?: {
    show3D?: boolean;
  };
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
    perceptualStepCount?: number;
    arcUsage?: number;
    curveApplied?: {
      style: string;
      dimensions: string[];
      strength: number;
    };
    enforcementIters?: number;
    traversalStrategy?: 'perceptual' | 'multi-dim';
  };
}