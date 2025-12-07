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
import { Checkbox } from '@/components/ui/checkbox';
import { ColorJourneyConfig, LoopMode, VariationMode, BiasPreset, DynamicsConfig, CurveStyle, CurveDimension } from '@/types/color-journey';
import { Plus, Trash2, Dices } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const PRESETS: { [key: string]: Partial<ColorJourneyConfig> } = {
  "Default": { anchors: ["#F38020", "#667EEA"], numColors: 12, dynamics: { lightness: 0, chroma: 1, contrast: 0.05, vibrancy: 0.5, warmth: 0, curveStyle: 'linear', curveDimensions: ['all'], curveStrength: 1 } },
  "Pastel Drift": { anchors: ["#a8e6cf", "#dcedc1", "#ffd3b6"], numColors: 10, loop: 'closed', dynamics: { lightness: 0.1, chroma: 0.8, contrast: 0.02, vibrancy: 0.3, warmth: 0, curveStyle: 'ease-out', curveDimensions: ['all'], curveStrength: 0.8 } },
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
const motionVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};
export interface ColorJourneyControlsProps {
  config: ColorJourneyConfig;
  onConfigChange: (config: ColorJourneyConfig) => void;
  isLoadingWasm?: boolean;
}

export function ColorJourneyControls({ config, onConfigChange, isLoadingWasm }: ColorJourneyControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const handleValueChange = (key: keyof ColorJourneyConfig, value: any) => onConfigChange({ ...config, [key]: value });
  const handleDynamicsChange = (key: keyof DynamicsConfig, value: any) => onConfigChange({ ...config, dynamics: { ...config.dynamics, [key]: value } });
  const handleMultipleDynamicsChange = (updates: Partial<DynamicsConfig>) => onConfigChange({ ...config, dynamics: { ...config.dynamics, ...updates } });
  const handleAnchorChange = (index: number, value: string) => {
    const newAnchors = [...config.anchors];
    newAnchors[index] = value;
    handleValueChange('anchors', newAnchors);
  };
  const addAnchor = () => config.anchors.length < 5 && handleValueChange('anchors', [...config.anchors, '#ffffff']);
  const removeAnchor = (index: number) => config.anchors.length > 1 && handleValueChange('anchors', config.anchors.filter((_, i) => i !== index));
  const randomizeSeed = () => onConfigChange({ ...config, variation: { ...config.variation, seed: Math.floor(Math.random() * 1_000_000) } });
  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) onConfigChange({ ...config, ...preset, dynamics: { ...config.dynamics, ...(preset.dynamics || {}) } });
  };
  const applyBias = (biasName: BiasPreset) => handleMultipleDynamicsChange({ ...BIAS_MAP[biasName], biasPreset: biasName });

  // small helper to clamp numeric inputs safely
  const clamp = (v: number, min = 0, max = 1) => {
    const n = Number.isFinite(v) ? v : 0;
    return Math.min(Math.max(n, min), max);
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
              <Input type="color" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="p-1 h-10 w-12 min-h-10" aria-label={`Anchor color ${index + 1} color picker`} />
              <Input type="text" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="font-mono min-h-10" aria-label={`Anchor color ${index + 1} hex code`} />
              <Button variant="ghost" size="icon" onClick={() => removeAnchor(index)} disabled={config.anchors.length <= 1} aria-label={`Remove anchor ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
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
        <Accordion type="multiple" defaultValue={['dynamics','journey-traversal']} className="w-full">
          <AccordionItem value="dynamics">
            <AccordionTrigger className="text-sm font-medium">Dynamics</AccordionTrigger>
            <motion.div initial="hidden" animate="visible" exit="hidden" variants={{ visible: { opacity: 1, height: 'auto' }, hidden: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, staggerChildren: 0.05 }}>
              <AccordionContent className="space-y-4 pt-2">
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Bias Preset</Label>
                  <Select value={config.dynamics.biasPreset || 'neutral'} onValueChange={(v: BiasPreset) => applyBias(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(BIAS_MAP).map(b => <SelectItem key={b} value={b} className={cn(config.dynamics.biasPreset === b && "shadow-glow")}>{b.charAt(0).toUpperCase() + b.slice(1).replace('-', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Lightness ({config.dynamics.lightness.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.lightness]} onValueChange={([v]) => handleDynamicsChange('lightness', v)} min={-1} max={1} step={0.05} aria-label="Lightness" />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Chroma ({config.dynamics.chroma.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.chroma]} onValueChange={([v]) => handleDynamicsChange('chroma', v)} min={0} max={2} step={0.05} aria-label="Chroma" />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Contrast ({config.dynamics.contrast.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.contrast]} onValueChange={([v]) => handleDynamicsChange('contrast', v)} min={0} max={1} step={0.01} aria-label="Contrast" />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Midpoint Vibrancy ({config.dynamics.vibrancy.toFixed(2)})</Label>
                  <Slider value={[config.dynamics.vibrancy]} onValueChange={([v]) => handleDynamicsChange('vibrancy', v)} min={0} max={1} step={0.05} disabled={isLoadingWasm} aria-label="Midpoint Vibrancy" />
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
                  <Select value={config.dynamics.curveStyle} onValueChange={(v) => handleDynamicsChange('curveStyle', v as CurveStyle)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="ease-in">Ease In</SelectItem>
                      <SelectItem value="ease-out">Ease Out</SelectItem>
                      <SelectItem value="sinusoidal">Sinusoidal</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Apply To</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={(config.dynamics.curveDimensions || []).includes('L')}
                        onCheckedChange={(checked: boolean | "indeterminate") => {
                          const isChecked = checked === true;
                          const current = Array.isArray(config.dynamics.curveDimensions) ? config.dynamics.curveDimensions.slice() : [];
                          let next = isChecked ? Array.from(new Set([...current.filter(d => d !== 'all'), 'L'])) : current.filter(d => d !== 'L');
                          if (next.length === 0) next = ['all'];
                          handleMultipleDynamicsChange({ curveDimensions: next as CurveDimension[] });
                        }}
                      />
                      <span className="text-sm">L</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={(config.dynamics.curveDimensions || []).includes('C')}
                        onCheckedChange={(checked: boolean | "indeterminate") => {
                          const isChecked = checked === true;
                          const current = Array.isArray(config.dynamics.curveDimensions) ? config.dynamics.curveDimensions.slice() : [];
                          let next = isChecked ? Array.from(new Set([...current.filter(d => d !== 'all'), 'C'])) : current.filter(d => d !== 'C');
                          if (next.length === 0) next = ['all'];
                          handleMultipleDynamicsChange({ curveDimensions: next as CurveDimension[] });
                        }}
                      />
                      <span className="text-sm">C</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={(config.dynamics.curveDimensions || []).includes('H')}
                        onCheckedChange={(checked: boolean | "indeterminate") => {
                          const isChecked = checked === true;
                          const current = Array.isArray(config.dynamics.curveDimensions) ? config.dynamics.curveDimensions.slice() : [];
                          let next = isChecked ? Array.from(new Set([...current.filter(d => d !== 'all'), 'H'])) : current.filter(d => d !== 'H');
                          if (next.length === 0) next = ['all'];
                          handleMultipleDynamicsChange({ curveDimensions: next as CurveDimension[] });
                        }}
                      />
                      <span className="text-sm">H</span>
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => handleMultipleDynamicsChange({ curveDimensions: ['L', 'C', 'H'] })}>Select All</Button>
                  </div>
                </motion.div>

                {config.dynamics.curveStyle === 'custom' && (
                  <>
                    <motion.div variants={motionVariants} className="space-y-2">
                      <Label>Bezier Light Controls</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input type="number" step="0.01" value={(config.dynamics.bezierLight && config.dynamics.bezierLight[0]) ?? 0} onChange={(e) => {
                            const v = clamp(parseFloat(e.target.value || '0'), 0, 1);
                            handleMultipleDynamicsChange({ bezierLight: [v, (config.dynamics.bezierLight && config.dynamics.bezierLight[1]) ?? 0] });
                          }} className="min-h-10" />
                          <Slider value={[(config.dynamics.bezierLight && config.dynamics.bezierLight[0]) ?? 0]} onValueChange={([v]) => handleMultipleDynamicsChange({ bezierLight: [clamp(v, 0, 1), (config.dynamics.bezierLight && config.dynamics.bezierLight[1]) ?? 0] })} min={0} max={1} step={0.01} aria-label="Bezier Light CP1" />
                        </div>
                        <div className="flex-1">
                          <Input type="number" step="0.01" value={(config.dynamics.bezierLight && config.dynamics.bezierLight[1]) ?? 0} onChange={(e) => {
                            const v = clamp(parseFloat(e.target.value || '0'), 0, 1);
                            handleMultipleDynamicsChange({ bezierLight: [(config.dynamics.bezierLight && config.dynamics.bezierLight[0]) ?? 0, v] });
                          }} className="min-h-10" />
                          <Slider value={[(config.dynamics.bezierLight && config.dynamics.bezierLight[1]) ?? 0]} onValueChange={([v]) => handleMultipleDynamicsChange({ bezierLight: [(config.dynamics.bezierLight && config.dynamics.bezierLight[0]) ?? 0, clamp(v, 0, 1)] })} min={0} max={1} step={0.01} aria-label="Bezier Light CP2" />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={motionVariants} className="space-y-2">
                      <Label>Bezier Chroma Controls</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input type="number" step="0.01" value={(config.dynamics.bezierChroma && config.dynamics.bezierChroma[0]) ?? 0} onChange={(e) => {
                            const v = clamp(parseFloat(e.target.value || '0'), 0, 1);
                            handleMultipleDynamicsChange({ bezierChroma: [v, (config.dynamics.bezierChroma && config.dynamics.bezierChroma[1]) ?? 0] });
                          }} className="min-h-10" />
                          <Slider value={[(config.dynamics.bezierChroma && config.dynamics.bezierChroma[0]) ?? 0]} onValueChange={([v]) => handleMultipleDynamicsChange({ bezierChroma: [clamp(v, 0, 1), (config.dynamics.bezierChroma && config.dynamics.bezierChroma[1]) ?? 0] })} min={0} max={1} step={0.01} aria-label="Bezier Chroma CP1" />
                        </div>
                        <div className="flex-1">
                          <Input type="number" step="0.01" value={(config.dynamics.bezierChroma && config.dynamics.bezierChroma[1]) ?? 0} onChange={(e) => {
                            const v = clamp(parseFloat(e.target.value || '0'), 0, 1);
                            handleMultipleDynamicsChange({ bezierChroma: [(config.dynamics.bezierChroma && config.dynamics.bezierChroma[0]) ?? 0, v] });
                          }} className="min-h-10" />
                          <Slider value={[(config.dynamics.bezierChroma && config.dynamics.bezierChroma[1]) ?? 0]} onValueChange={([v]) => handleMultipleDynamicsChange({ bezierChroma: [(config.dynamics.bezierChroma && config.dynamics.bezierChroma[0]) ?? 0, clamp(v, 0, 1)] })} min={0} max={1} step={0.01} aria-label="Bezier Chroma CP2" />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div variants={motionVariants} className="space-y-2">
                      <Label>Curve Strength ({(config.dynamics.curveStrength ?? 1).toFixed ? (config.dynamics.curveStrength ?? 1).toFixed(2) : String(config.dynamics.curveStrength ?? 1)})</Label>
                      <Slider value={[config.dynamics.curveStrength ?? 1]} onValueChange={([v]) => handleDynamicsChange('curveStrength', v)} min={0} max={2} step={0.05} aria-label="Curve Strength" />
                    </motion.div>

                    <motion.div variants={motionVariants} className="space-y-2">
                      <Label>Bezier Preview</Label>
                      {typeof document !== 'undefined' && (
                        <svg viewBox="0 0 100 100" className="w-full h-16">
                          {(() => {
                            const bl = config.dynamics.bezierLight && config.dynamics.bezierLight.length === 2 ? config.dynamics.bezierLight : [0.25, 0.75];
                            const bc = config.dynamics.bezierChroma && config.dynamics.bezierChroma.length === 2 ? config.dynamics.bezierChroma : [0.2, 0.8];
                            const bl_cp1x = Math.max(0, Math.min(100, bl[0] * 100));
                            const bl_cp2x = Math.max(0, Math.min(100, bl[1] * 100));
                            const bc_cp1x = Math.max(0, Math.min(100, bc[0] * 100));
                            const bc_cp2x = Math.max(0, Math.min(100, bc[1] * 100));
                            const dLight = `M0 100 C ${bl_cp1x} 100, ${bl_cp2x} 0, 100 0`;
                            const dChroma = `M0 80 C ${bc_cp1x} 80, ${bc_cp2x} 20, 100 20`;
                            return (
                              <>
                                <path d={dLight} fill="none" stroke="rgba(99,102,241,0.95)" strokeWidth={2.5} />
                                <circle cx={bl_cp1x} cy={100} r={2} fill="rgba(99,102,241,0.95)" />
                                <circle cx={bl_cp2x} cy={0} r={2} fill="rgba(99,102,241,0.95)" />

                                <path d={dChroma} fill="none" stroke="rgba(16,185,129,0.95)" strokeWidth={2.5} />
                                <circle cx={bc_cp1x} cy={80} r={2} fill="rgba(16,185,129,0.95)" />
                                <circle cx={bc_cp2x} cy={20} r={2} fill="rgba(16,185,129,0.95)" />
                              </>
                            );
                          })()}
                        </svg>
                      )}
                    </motion.div>
                  </>
                )}
              </AccordionContent>
            </motion.div>
          </AccordionItem>
          <AccordionItem value="journey-mode">
            <AccordionTrigger className="text-sm font-medium">Journey Mode (Single Anchor)</AccordionTrigger>
            <motion.div initial="hidden" animate="visible" exit="hidden" variants={{ visible: { opacity: 1, height: 'auto' }, hidden: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, staggerChildren: 0.05 }}>
              <AccordionContent className="space-y-4 pt-2">
                <motion.div variants={motionVariants} className="flex items-center justify-between">
                  <Label className="m-0">Enable Color Circle</Label>
                  <Switch checked={Boolean(config.dynamics.enableColorCircle)} onCheckedChange={(checked: boolean | "indeterminate") => handleMultipleDynamicsChange({ enableColorCircle: Boolean(checked) })} />
                </motion.div>
                <motion.div variants={motionVariants} className="space-y-2">
                  <Label>Arc Length ({config.dynamics.arcLength ?? 360}°)</Label>
                  <Slider value={[config.dynamics.arcLength ?? 360]} onValueChange={([v]) => handleMultipleDynamicsChange({ arcLength: clamp(Math.round(v), 0, 360) })} min={0} max={360} step={1} aria-label="Arc Length" />
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
                  <Input type="number" value={config.variation.seed} onChange={(e) => onConfigChange({ ...config, variation: { ...config.variation, seed: parseInt(e.target.value, 10) || 0 } })} className="min-h-10" aria-label="Variation seed" />
                  <Button variant="outline" size="icon" onClick={randomizeSeed} aria-label="Randomize seed"><Dices className="h-4 w-4" /></Button>
                </motion.div>
              </AccordionContent>
            </motion.div>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}