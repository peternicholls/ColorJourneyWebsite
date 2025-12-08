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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  "Default": { anchors: ["#F38020", "#667EEA"], numColors: 12, dynamics: { lightness: 0, chroma: 1, contrast: 0.05, vibrancy: 0.5, warmth: 0, curveStyle: 'linear', curveDimensions: ['all'], curveStrength: 1 } },
  "Pastel Drift": { anchors: ["#a8e6cf", "#dcedc1", "#ffd3b6", "#ffaaa5", "#ff8b94"], numColors: 10, dynamics: { lightness: 0.1, chroma: 0.8, contrast: 0.02, vibrancy: 0.3, warmth: 0, curveStyle: 'ease-out', curveDimensions: ['all'], curveStrength: 1 } },
  "Vivid Sunset": { anchors: ["#ff7e5f", "#feb47b"], numColors: 8, dynamics: { lightness: 0, chroma: 1.2, contrast: 0.05, vibrancy: 0.6, warmth: 0.2, curveStyle: 'ease-in', curveDimensions: ['all'], curveStrength: 1 } },
  "Ocean Deep": { anchors: ["#00c9ff", "#92fe9d"], numColors: 12, dynamics: { lightness: -0.1, chroma: 1.1, contrast: 0.04, vibrancy: 0.5, warmth: -0.3, curveStyle: 'sinusoidal', curveDimensions: ['all'], curveStrength: 1 } },
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
  const handleBezierChange = (curve: 'bezierLight' | 'bezierChroma', index: number, value: string) => {
    const val = parseFloat(value);
    const newCurve = [...(config.dynamics[curve] || [0.5, 0.5])] as [number, number];
    newCurve[index] = val;
    handleDynamicsChange(curve, newCurve);
  };
  const validateBezier = (curve: 'bezierLight' | 'bezierChroma', index: number, value: string) => {
    const val = parseFloat(value);
    const newErrors = { ...bezierErrors };
    if (isNaN(val) || val < 0 || val > 1) {
      newErrors[curve][index] = true;
      toast.error('Bezier value must be between 0.0 and 1.0.');
    } else {
      newErrors[curve][index] = false;
    }
    setBezierErrors(newErrors);
  };
  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle>Color Journey Controls</CardTitle>
        <CardDescription>Craft your perfect color palette.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Bias Preset</Label>
                  <Select value={config.dynamics.biasPreset || 'neutral'} onValueChange={(v: BiasPreset) => applyBias(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(BIAS_MAP).map(b => <SelectItem key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1).replace('-', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lightness ({config.dynamics.lightness.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.lightness]} onValueChange={([v]) => handleDynamicsChange('lightness', v)} min={-1} max={1} step={0.05} />
                </div>
                <div className="space-y-2">
                  <Label>Chroma ({config.dynamics.chroma.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.chroma]} onValueChange={([v]) => handleDynamicsChange('chroma', v)} min={0} max={2} step={0.05} />
                </div>
                <div className="space-y-2">
                  <Label>Contrast ({config.dynamics.contrast.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.contrast]} onValueChange={([v]) => handleDynamicsChange('contrast', v)} min={0} max={1} step={0.01} />
                </div>
                <div className="space-y-2">
                  <Label>Midpoint Vibrancy ({config.dynamics.vibrancy.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.vibrancy]} onValueChange={([v]) => handleDynamicsChange('vibrancy', v)} min={0} max={1} step={0.05} disabled={isLoadingWasm} />
                </div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="journey-mode">
            <AccordionTrigger className="text-sm font-medium">Journey Mode (Single Anchor)</AccordionTrigger>
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label>Enable Color Circle</Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enable hue traversal after perceptual variations.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground">Extend journey via color wheel arc.</p>
                  </div>
                  <Switch checked={config.dynamics.enableColorCircle || false} onCheckedChange={checked => handleDynamicsChange('enableColorCircle', checked)} disabled={isLoadingWasm || config.anchors.length > 1} />
                </div>
                <div className="space-y-2">
                  <Label>Arc Length ({(config.dynamics.arcLength || 0).toFixed(0)}°)</Label>
                  <Slider value={[(config.dynamics.arcLength || 0)]} onValueChange={([v]) => handleDynamicsChange('arcLength', v)} min={0} max={360} step={10} disabled={!config.dynamics.enableColorCircle || isLoadingWasm || config.anchors.length > 1} />
                  <p className="text-xs text-muted-foreground">0° = perceptual variations only.</p>
                </div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="journey-traversal">
            <AccordionTrigger className="text-sm font-medium">Journey Traversal</AccordionTrigger>
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3, delay: 0.3 }}>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Traversal Style</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Select value={config.dynamics.curveStyle || 'linear'} onValueChange={(v: CurveStyle) => handleCurveStyleChange(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CURVE_STYLE_MAP).map(([key, { name, description }]) => (
                              <SelectItem key={key} value={key}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TooltipTrigger>
                      <TooltipContent><p>Controls non-linear pacing along the journey path.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {config.dynamics.curveStyle === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Bezier (P1, P2)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="number" step="0.05" min="0" max="1" value={config.dynamics.bezierLight?.[0] ?? 0.5} onChange={e => handleBezierChange('bezierLight', 0, e.target.value)} onBlur={e => validateBezier('bezierLight', 0, e.target.value)} className={cn("min-h-10", bezierErrors.bezierLight[0] && "border-destructive")} />
                            <Input type="number" step="0.05" min="0" max="1" value={config.dynamics.bezierLight?.[1] ?? 0.5} onChange={e => handleBezierChange('bezierLight', 1, e.target.value)} onBlur={e => validateBezier('bezierLight', 1, e.target.value)} className={cn("min-h-10", bezierErrors.bezierLight[1] && "border-destructive")} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent><p>Bezier control points (0.0-1.0) for custom easing curve.</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Apply To</Label>
                  <ToggleGroup type="multiple" aria-label="Traversal dimensions" value={config.dynamics.curveDimensions || []} onValueChange={(v: CurveDimension[]) => {
                    const dims = v.length > 0 ? v : [];
                    handleDynamicsChange('curveDimensions', dims);
                    if (dims.length === 0) {
                      toast.warning('Select at least one dimension for curve application.');
                    }
                  }} className="flex flex-row flex-wrap gap-4 justify-start items-center">
                    <ToggleGroupItem value="L" className="min-w-[100px] justify-center">Lightness</ToggleGroupItem>
                    <ToggleGroupItem value="C" className="min-w-[100px] justify-center">Chroma</ToggleGroupItem>
                    <ToggleGroupItem value="H" className="min-w-[100px] justify-center">Hue</ToggleGroupItem>
                    <ToggleGroupItem value="all" className="min-w-[100px] justify-center">All</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-2">
                  <Label>Strength ({(config.dynamics.curveStrength || 1).toFixed(2)})</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Slider value={[config.dynamics.curveStrength || 1]} onValueChange={([v]) => handleDynamicsChange('curveStrength', v)} min={0} max={1} step={0.05} />
                      </TooltipTrigger>
                      <TooltipContent><p>Intensity of curve effect (0=linear, 1=full).</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="variation">
            <AccordionTrigger className="text-sm font-medium">Variation</AccordionTrigger>
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
              <AccordionContent className="space-y-4 pt-2">
                <Select value={config.variation.mode} onValueChange={(v: VariationMode) => onConfigChange({ ...config, variation: { ...config.variation, mode: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="noticeable">Noticeable</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input type="number" value={config.variation.seed} onChange={(e) => onConfigChange({ ...config, variation: { ...config.variation, seed: parseInt(e.target.value, 10) || 0 } })} className="min-h-10" />
                  <Button variant="outline" size="icon" onClick={randomizeSeed}><Dices className="h-4 w-4" /></Button>
                </div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}