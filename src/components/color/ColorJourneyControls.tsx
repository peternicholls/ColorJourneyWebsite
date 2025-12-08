import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { ColorJourneyConfig, LoopMode, VariationMode, BiasPreset, DynamicsConfig, CurveStyle, CurveDimension } from '@/types/color-journey';
import { Plus, Trash2, Dices, Orbit } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
interface ColorJourneyControlsProps {
  config: ColorJourneyConfig;
  onConfigChange: (newConfig: ColorJourneyConfig) => void;
  isLoadingWasm: boolean;
}
const PRESETS: { [key: string]: Partial<ColorJourneyConfig> } = {
  "Default": { anchors: ["#F38020", "#667EEA"], numColors: 12, dynamics: { lightness: 0, chroma: 1, contrast: 0.05, vibrancy: 0.5, warmth: 0, curveStyle: 'linear', curveDimensions: ['L','C','H'] as CurveDimension[], curveStrength: 1 } },
  "Pastel Drift": { anchors: ["#a8e6cf", "#dcedc1", "#ffd3b6", "#ffaaa5", "#ff8b94"], numColors: 10, dynamics: { lightness: 0.1, chroma: 0.8, contrast: 0.02, vibrancy: 0.3, warmth: 0, curveStyle: 'ease-out', curveDimensions: ['L','C','H'] as CurveDimension[], curveStrength: 1 } },
  "Vivid Sunset": { anchors: ["#ff7e5f", "#feb47b"], numColors: 8, dynamics: { lightness: 0, chroma: 1.2, contrast: 0.05, vibrancy: 0.6, warmth: 0.2, curveStyle: 'ease-in', curveDimensions: ['L','C','H'] as CurveDimension[], curveStrength: 1 } },
  "Ocean Deep": { anchors: ["#00c9ff", "#92fe9d"], numColors: 12, dynamics: { lightness: -0.1, chroma: 1.1, contrast: 0.04, vibrancy: 0.5, warmth: -0.3, curveStyle: 'sinusoidal', curveDimensions: ['L','C','H'] as CurveDimension[], curveStrength: 1 } },
};
const BIAS_MAP: { [key in BiasPreset]: Partial<DynamicsConfig> } = {
  neutral: { lightness: 0, chroma: 1.0, warmth: 0 },
  lighter: { lightness: 0.2, chroma: 0.9, warmth: 0 },
  darker: { lightness: -0.2, chroma: 0.9, warmth: 0 },
  muted: { lightness: 0, chroma: 0.7, warmth: 0, vibrancy: 0.2 },
  vivid: { lightness: 0, chroma: 1.4, warmth: 0, vibrancy: 0.7 },
  warm: { lightness: 0, chroma: 1.1, warmth: 0.3 },
  cool: { lightness: 0, chroma: 1.1, warmth: -0.3 },
  'aaa-safe': { lightness: 0.1, chroma: 1.0, contrast: 0.1, vibrancy: 0.4, warmth: 0 },
};
const CURVE_STYLE_MAP: { [key in CurveStyle]: { name: string, description: string, bezier: [number, number] } } = {
  'linear': { name: 'Linear', description: 'Uniform pacing for a consistent transition.', bezier: [0.5, 0.5] },
  'ease-in': { name: 'Ease-In', description: 'Starts slow and accelerates. Good for build-ups.', bezier: [0.42, 0] },
  'ease-out': { name: 'Ease-Out', description: 'Starts fast and decelerates. Creates a soft landing.', bezier: [0, 0.58] },
  'sinusoidal': { name: 'Sinusoidal', description: 'A smooth, wave-like ease-in and ease-out.', bezier: [0.37, 0] },
  'stepped': { name: 'Stepped', description: 'Creates discrete jumps for segmented palettes.', bezier: [0, 0] },
  'custom': { name: 'Custom', description: 'Manually define the Bezier curve points.', bezier: [0.5, 0.5] },
};
const motionVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};
export function ColorJourneyControls({ config, onConfigChange, isLoadingWasm }: ColorJourneyControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [bezierErrors, setBezierErrors] = useState({ bezierLight: [false, false], bezierChroma: [false, false] });
  const handleValueChange = (key: keyof ColorJourneyConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };
  const handleDynamicsChange = (key: keyof DynamicsConfig, value: any) => {
    onConfigChange({ ...config, dynamics: { ...config.dynamics, [key]: value } });
  };
  const handleMultipleDynamicsChange = (updates: Partial<DynamicsConfig>) => {
    onConfigChange({ ...config, dynamics: { ...config.dynamics, ...updates } });
  };
  const handleAnchorChange = (index: number, value: string) => {
    const newAnchors = [...config.anchors];
    newAnchors[index] = value;
    handleValueChange('anchors', newAnchors);
  };
  const addAnchor = () => {
    if (config.anchors.length < 5) handleValueChange('anchors', [...config.anchors, '#ffffff']);
  };
  const removeAnchor = (index: number) => {
    if (config.anchors.length > 1) handleValueChange('anchors', config.anchors.filter((_, i) => i !== index));
  };
  const randomizeSeed = () => {
    onConfigChange({ ...config, variation: { ...config.variation, seed: Math.floor(Math.random() * 1_000_000) } });
  };
  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      onConfigChange({ ...config, ...preset, dynamics: { ...config.dynamics, ...(preset.dynamics || {}) } });
    }
  };
  const applyBias = (biasName: BiasPreset) => {
    const bias = BIAS_MAP[biasName];
    handleMultipleDynamicsChange({ ...bias, biasPreset: biasName });
  };
  const handleCurveStyleChange = (style: CurveStyle) => {
    const mapping = CURVE_STYLE_MAP[style];
    handleMultipleDynamicsChange({
      bezierLight: mapping.bezier,
      bezierChroma: mapping.bezier,
      curveStyle: style,
    });
  };
  const handleBezierChange = (curve: 'bezierLight' | 'bezierChroma', index: number, value: string | number) => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    const clamped = isNaN(parsed) ? 0.5 : Math.min(1, Math.max(0, parsed));
    const newCurve = [...(config.dynamics[curve] || [0.5, 0.5])] as [number, number];
    newCurve[index] = clamped;
    // update error state for this control
    const newErrors = { ...bezierErrors };
    newErrors[curve][index] = isNaN(parsed) || parsed < 0 || parsed > 1;
    setBezierErrors(newErrors);
    handleDynamicsChange(curve, newCurve);
  };
  const validateBezier = (curve: 'bezierLight' | 'bezierChroma', index: number, value: string | number) => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    const newErrors = { ...bezierErrors };
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      newErrors[curve][index] = true;
      toast.error('Bezier value must be between 0.0 and 1.0.');
      // persist a clamped safe value
      const safe = isNaN(parsed) ? 0.5 : Math.min(1, Math.max(0, parsed));
      const newCurve = [...(config.dynamics[curve] || [0.5, 0.5])] as [number, number];
      newCurve[index] = safe;
      handleDynamicsChange(curve, newCurve);
    } else {
      newErrors[curve][index] = false;
      // persist exact valid value
      const newCurve = [...(config.dynamics[curve] || [0.5, 0.5])] as [number, number];
      newCurve[index] = parsed;
      handleDynamicsChange(curve, newCurve);
    }
    setBezierErrors(newErrors);
  };
  const handleCurveDimensionChange = (dim: CurveDimension, checked: boolean) => {
    // Normalize incoming dimensions: expand 'all' to explicit axes and dedupe
    const normalize = (dims?: CurveDimension[]) => {
      if (!dims) return [] as CurveDimension[];
      if (dims.includes('all')) return ['L', 'C', 'H'] as CurveDimension[];
      return Array.from(new Set(dims));
    };
    const currentDims = normalize(config.dynamics.curveDimensions);
    let newDims: CurveDimension[];
    if (checked) {
      newDims = currentDims.includes(dim) ? currentDims : [...currentDims, dim];
    } else {
      newDims = currentDims.filter(d => d !== dim);
    }
    const updates: Partial<DynamicsConfig> = { curveDimensions: newDims };
    if (newDims.length === 0) {
      updates.curveStyle = 'linear';
      updates.curveStrength = 0;
      toast.info('Curve effect disabled. Traversal is now linear.');
    }
    handleMultipleDynamicsChange(updates);
  };
  const handleSelectAllCurve = () => {
    handleMultipleDynamicsChange({
      curveDimensions: ['L', 'C', 'H'],
      curveStrength: 1,
    });
  };
  const curveDimensions = ((): CurveDimension[] => {
    const dims = config.dynamics.curveDimensions || [];
    if (dims.includes('all')) return ['L', 'C', 'H'];
    return Array.from(new Set(dims));
  })();

  // Bezier preview helper values (used by the inline SVG preview)
  const bezierLight = config.dynamics.bezierLight ?? [0.5, 0.5];
  const bezierChroma = config.dynamics.bezierChroma ?? [0.5, 0.5];
  const svgWidth = 200;
  const svgHeight = 50;
  const cp1x = svgWidth * 0.25;
  const cp2x = svgWidth * 0.75;
  const blPath = `M0,${svgHeight} C ${cp1x},${svgHeight - bezierLight[0] * svgHeight} ${cp2x},${svgHeight - bezierLight[1] * svgHeight} ${svgWidth},${svgHeight}`;
  const bcPath = `M0,${svgHeight} C ${cp1x},${svgHeight - bezierChroma[0] * svgHeight} ${cp2x},${svgHeight - bezierChroma[1] * svgHeight} ${svgWidth},${svgHeight}`;

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle>Color Journey Controls</CardTitle>
        <CardDescription>Craft your perfect color palette.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TooltipProvider>
        <div className="space-y-2">
          <Label>Presets</Label>
          <Select value={selectedPreset} onValueChange={(val) => { applyPreset(val); setSelectedPreset(val); }}>
            <SelectTrigger><SelectValue placeholder="Load a preset..." /></SelectTrigger>
            <SelectContent>{Object.keys(PRESETS).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="space-y-3">
          <Label>Anchor Colors</Label>
          {config.anchors.map((anchor, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input type="color" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="p-1 h-10 w-12 min-h-10" />
              <Input type="text" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="font-mono min-h-10" />
              <Button variant="ghost" size="icon" onClick={() => removeAnchor(index)} disabled={config.anchors.length <= 1}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAnchor} disabled={config.anchors.length >= 5}><Plus className="mr-2 h-4 w-4" /> Add Anchor</Button>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="numColors">Number of Colors</Label>
          <Input id="numColors" type="number" min="2" max="100" value={config.numColors} onChange={(e) => handleValueChange('numColors', parseInt(e.target.value, 10))} className="min-h-10" />
        </div>
        <div className="space-y-2">
          <Label>Loop Mode</Label>
          <Select value={config.loop} onValueChange={(v: LoopMode) => handleValueChange('loop', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed Loop</SelectItem>
              <SelectItem value="ping-pong">Ping-Pong</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <Accordion type="multiple" defaultValue={['dynamics']} className="w-full">
          <AccordionItem value="dynamics">
            <AccordionTrigger className="text-sm font-medium">Dynamics</AccordionTrigger>
            <motion.div initial="hidden" animate="visible" exit="hidden" variants={{ visible: { opacity: 1, height: 'auto' }, hidden: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, staggerChildren: 0.05 }}>
              <AccordionContent className="space-y-4 pt-2">
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Bias Preset</Label>
                  <Select value={config.dynamics.biasPreset || 'neutral'} onValueChange={(v: BiasPreset) => applyBias(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(BIAS_MAP).map(b => <SelectItem key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1).replace('-', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Lightness ({config.dynamics.lightness.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.lightness]} onValueChange={([v]) => handleDynamicsChange('lightness', v)} min={-1} max={1} step={0.05} />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Chroma ({config.dynamics.chroma.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.chroma]} onValueChange={([v]) => handleDynamicsChange('chroma', v)} min={0} max={2} step={0.05} />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Contrast ({config.dynamics.contrast.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.contrast]} onValueChange={([v]) => handleDynamicsChange('contrast', v)} min={0} max={1} step={0.01} />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Midpoint Vibrancy ({config.dynamics.vibrancy.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.vibrancy]} onValueChange={([v]) => handleDynamicsChange('vibrancy', v)} min={0} max={1} step={0.05} disabled={isLoadingWasm} />
                </motion.div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="journey-mode">
            <AccordionTrigger className="text-sm font-medium">Journey Mode (Single Anchor)</AccordionTrigger>
            <motion.div initial="hidden" animate="visible" exit="hidden" variants={{ visible: { opacity: 1, height: 'auto' }, hidden: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, staggerChildren: 0.05 }}>
              <AccordionContent className="space-y-4 pt-2">
                <motion.div variants={motionVariants} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild><Label>Enable Color Circle</Label></TooltipTrigger>
                        <TooltipContent><p>Enable hue traversal after perceptual variations.</p></TooltipContent>
                      </Tooltip>
                    <p className="text-xs text-muted-foreground">Extend journey via color wheel arc.</p>
                  </div>
                  <Switch checked={config.dynamics.enableColorCircle || false} onCheckedChange={checked => handleDynamicsChange('enableColorCircle', checked)} disabled={isLoadingWasm || config.anchors.length > 1} />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Arc Length ({(config.dynamics.arcLength || 0).toFixed(0)}°)</Label>
                  <Slider value={[(config.dynamics.arcLength || 0)]} onValueChange={([v]) => handleDynamicsChange('arcLength', v)} min={0} max={360} step={10} disabled={!config.dynamics.enableColorCircle || isLoadingWasm || config.anchors.length > 1} />
                  <p className="text-xs text-muted-foreground">0° = perceptual variations only.</p>
                </motion.div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="journey-traversal">
            <AccordionTrigger className="text-sm font-medium">Journey Traversal</AccordionTrigger>
            <motion.div initial="hidden" animate="visible" exit="hidden" variants={{ visible: { opacity: 1, height: 'auto' }, hidden: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, staggerChildren: 0.05 }}>
              <AccordionContent className="space-y-4 pt-2">
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Traversal Style</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={config.dynamics.curveStyle || 'linear'} onValueChange={(v: CurveStyle) => handleCurveStyleChange(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(CURVE_STYLE_MAP).map(([key, { name }]) => (
                                <SelectItem key={key} value={key} className={cn(config.dynamics.curveStyle === key && "shadow-glow")}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p>Controls non-linear pacing along the journey path.</p></TooltipContent>
                    </Tooltip>

                    <div className="mt-4 mb-4">
                      <svg width="200" height="50" viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bezier preview">
                        {/* Paths: M0,H C cp1x,cp1y cp2x,cp2y W,H */}
                        <path d={blPath} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
                        <path d={bcPath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
                        {/* Control point handles for bezierLight (purple) */}
                        <circle cx={cp1x} cy={svgHeight - (bezierLight[0] * svgHeight)} r="3" fill="#4f46e5" />
                        <circle cx={cp2x} cy={svgHeight - (bezierLight[1] * svgHeight)} r="3" fill="#4f46e5" />
                        {/* Control point handles for bezierChroma (teal) */}
                        <circle cx={cp1x} cy={svgHeight - (bezierChroma[0] * svgHeight)} r="3" fill="#06b6d4" />
                        <circle cx={cp2x} cy={svgHeight - (bezierChroma[1] * svgHeight)} r="3" fill="#06b6d4" />
                      </svg>
                    </div>
                </motion.div>
                {config.dynamics.curveStyle === 'custom' && (
                  <motion.div variants={motionVariants} className="space-y-4">
                    <Label>Custom Bezier (P1, P2)</Label>

                    {/* Bezier Light controls */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Light Curve (bezierLight)</p>
                        <div className="text-xs text-muted-foreground">P1 / P2</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Input type="number" step="0.01" min="0" max="1" value={config.dynamics.bezierLight?.[0] ?? 0.5} onChange={e => handleBezierChange('bezierLight', 0, e.target.value)} onBlur={e => validateBezier('bezierLight', 0, e.target.value)} className={cn("min-h-10", bezierErrors.bezierLight[0] && "border-destructive")} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Slider value={[config.dynamics.bezierLight?.[0] ?? 0.5]} onValueChange={([v]) => handleBezierChange('bezierLight', 0, v)} min={0} max={1} step={0.01} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Drag to adjust curve handle</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="space-y-1">
                          <Input type="number" step="0.01" min="0" max="1" value={config.dynamics.bezierLight?.[1] ?? 0.5} onChange={e => handleBezierChange('bezierLight', 1, e.target.value)} onBlur={e => validateBezier('bezierLight', 1, e.target.value)} className={cn("min-h-10", bezierErrors.bezierLight[1] && "border-destructive")} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Slider value={[config.dynamics.bezierLight?.[1] ?? 0.5]} onValueChange={([v]) => handleBezierChange('bezierLight', 1, v)} min={0} max={1} step={0.01} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Drag to adjust curve handle</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    {/* Bezier Chroma controls */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Chroma Curve (bezierChroma)</p>
                        <div className="text-xs text-muted-foreground">P1 / P2</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Input type="number" step="0.01" min="0" max="1" value={config.dynamics.bezierChroma?.[0] ?? 0.5} onChange={e => handleBezierChange('bezierChroma', 0, e.target.value)} onBlur={e => validateBezier('bezierChroma', 0, e.target.value)} className={cn("min-h-10", bezierErrors.bezierChroma[0] && "border-destructive")} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Slider value={[config.dynamics.bezierChroma?.[0] ?? 0.5]} onValueChange={([v]) => handleBezierChange('bezierChroma', 0, v)} min={0} max={1} step={0.01} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Drag to adjust curve handle</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="space-y-1">
                          <Input type="number" step="0.01" min="0" max="1" value={config.dynamics.bezierChroma?.[1] ?? 0.5} onChange={e => handleBezierChange('bezierChroma', 1, e.target.value)} onBlur={e => validateBezier('bezierChroma', 1, e.target.value)} className={cn("min-h-10", bezierErrors.bezierChroma[1] && "border-destructive")} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Slider value={[config.dynamics.bezierChroma?.[1] ?? 0.5]} onValueChange={([v]) => handleBezierChange('bezierChroma', 1, v)} min={0} max={1} step={0.01} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Drag to adjust curve handle</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Apply To</Label>
                  <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 sm:gap-2 justify-start items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="flex items-center gap-2 min-w-[80px]"><input type="checkbox" aria-label="Apply curve to Lightness" checked={curveDimensions.includes('L')} onChange={(e) => handleCurveDimensionChange('L', e.target.checked)} className="h-4 w-4" /><span className="ml-2">Lightness</span></label>
                        </TooltipTrigger>
                        <TooltipContent><p>Non-linear pacing of perceived brightness (OKLab L) for tonal curves.</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="flex items-center gap-2 min-w-[80px]"><input type="checkbox" aria-label="Apply curve to Chroma" checked={curveDimensions.includes('C')} onChange={(e) => handleCurveDimensionChange('C', e.target.checked)} className="h-4 w-4" /><span className="ml-2">Chroma</span></label>
                        </TooltipTrigger>
                        <TooltipContent><p>Shapes saturation (OKLab chroma) for richer/muted transitions.</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="flex items-center gap-2 min-w-[80px]"><input type="checkbox" aria-label="Apply curve to Hue" checked={curveDimensions.includes('H')} onChange={(e) => handleCurveDimensionChange('H', e.target.checked)} className="h-4 w-4" /><span className="ml-2">Hue</span></label>
                        </TooltipTrigger>
                        <TooltipContent><p>Modulates color angle (OKLab a/b) for warm/cool emphasis.</p></TooltipContent>
                      </Tooltip>
                    <Button variant="ghost" size="sm" onClick={handleSelectAllCurve}>Select All</Button>
                  </div>
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Strength ({(config.dynamics.curveStrength || 1).toFixed(2)})</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Slider value={[config.dynamics.curveStrength || 1]} onValueChange={([v]) => handleDynamicsChange('curveStrength', v)} min={0} max={1} step={0.05} />
                      </TooltipTrigger>
                      <TooltipContent><p>Intensity of curve effect (0=linear, 1=full).</p></TooltipContent>
                    </Tooltip>
                </motion.div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="variation">
            <AccordionTrigger className="text-sm font-medium">Variation</AccordionTrigger>
            <motion.div initial="hidden" animate="visible" exit="hidden" variants={{ visible: { opacity: 1, height: 'auto' }, hidden: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, staggerChildren: 0.05 }}>
              <AccordionContent className="space-y-4 pt-2">
                <motion.div variants={motionVariants}>
                  <Select value={config.variation.mode} onValueChange={(v: VariationMode) => onConfigChange({ ...config, variation: { ...config.variation, mode: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="noticeable">Noticeable</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
                <motion.div variants={motionVariants} className="flex items-center gap-2">
                  <Input type="number" value={config.variation.seed} onChange={(e) => onConfigChange({ ...config, variation: { ...config.variation, seed: parseInt(e.target.value, 10) || 0 } })} className="min-h-10" />
                  <Button variant="outline" size="icon" onClick={randomizeSeed}><Dices className="h-4 w-4" /></Button>
                </motion.div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
        </Accordion>
      </TooltipProvider>
      </CardContent>
    </Card>
  );
}