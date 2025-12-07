import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ColorJourneyConfig, LoopMode, VariationMode, BiasPreset, DynamicsConfig } from '@/types/color-journey.ts';
import { Plus, Trash2, Dices } from 'lucide-react';
interface ColorJourneyControlsProps {
  config: ColorJourneyConfig;
  onConfigChange: (newConfig: ColorJourneyConfig) => void;
}
const PRESETS: { [key: string]: Partial<ColorJourneyConfig> } = {
  "Default": { anchors: ["#F38020", "#667EEA"], numColors: 12 },
  "Pastel Drift": { anchors: ["#a8e6cf", "#dcedc1", "#ffd3b6", "#ffaaa5", "#ff8b94"], numColors: 10, dynamics: { lightness: 0.1, chroma: 0.8, contrast: 0.02, vibrancy: 0.3, warmth: 0 } },
  "Vivid Sunset": { anchors: ["#ff7e5f", "#feb47b"], numColors: 8, dynamics: { lightness: 0, chroma: 1.2, contrast: 0.05, vibrancy: 0.6, warmth: 0.2 } },
  "Ocean Deep": { anchors: ["#00c9ff", "#92fe9d"], numColors: 12, dynamics: { lightness: -0.1, chroma: 1.1, contrast: 0.04, vibrancy: 0.5, warmth: -0.3 } },
};
const BIAS_MAP: { [key in BiasPreset]: Partial<DynamicsConfig> } = {
  neutral: { lightness: 0, chroma: 1.0, warmth: 0 },
  lighter: { lightness: 0.2, chroma: 0.9, warmth: 0 },
  darker: { lightness: -0.2, chroma: 0.9, warmth: 0 },
  muted: { lightness: 0, chroma: 0.7, warmth: 0, vibrancy: 0.2 },
  vivid: { lightness: 0, chroma: 1.4, warmth: 0, vibrancy: 0.7 },
  warm: { lightness: 0, chroma: 1.1, warmth: 0.3 },
  cool: { lightness: 0, chroma: 1.1, warmth: -0.3 },
};
export function ColorJourneyControls({ config, onConfigChange }: ColorJourneyControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState('');
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
  const handleBezierChange = (curve: 'bezierLight' | 'bezierChroma', index: number, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const newCurve = [...(config.dynamics[curve] || [0.5, 0.5, 0.5, 0.5])] as [number, number, number, number];
    newCurve[index] = Math.max(0, Math.min(1, val));
    handleDynamicsChange(curve, newCurve);
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
              <Input type="color" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="p-1 h-10 w-12" />
              <Input type="text" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="font-mono" />
              <Button variant="ghost" size="icon" onClick={() => removeAnchor(index)} disabled={config.anchors.length <= 1}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAnchor} disabled={config.anchors.length >= 5}><Plus className="mr-2 h-4 w-4" /> Add Anchor</Button>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="numColors">Number of Colors</Label>
          <Input id="numColors" type="number" min="2" max="100" value={config.numColors} onChange={(e) => handleValueChange('numColors', parseInt(e.target.value, 10))} />
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
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Bias Preset</Label>
                <Select value={config.dynamics.biasPreset || 'neutral'} onValueChange={(v: BiasPreset) => applyBias(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(BIAS_MAP).map(b => <SelectItem key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</SelectItem>)}</SelectContent>
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
                <Slider value={[config.dynamics.vibrancy]} onValueChange={([v]) => handleDynamicsChange('vibrancy', v)} min={0} max={1} step={0.05} />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="curves">
            <AccordionTrigger className="text-sm font-medium">Advanced Curves</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Lightness Curve (Bezier P1, P2)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" step="0.05" value={config.dynamics.bezierLight?.[0] ?? 0.5} onChange={e => handleBezierChange('bezierLight', 0, e.target.value)} />
                  <Input type="number" step="0.05" value={config.dynamics.bezierLight?.[1] ?? 0.5} onChange={e => handleBezierChange('bezierLight', 1, e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chroma Curve (Bezier P1, P2)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" step="0.05" value={config.dynamics.bezierChroma?.[0] ?? 0.5} onChange={e => handleBezierChange('bezierChroma', 0, e.target.value)} />
                  <Input type="number" step="0.05" value={config.dynamics.bezierChroma?.[1] ?? 0.5} onChange={e => handleBezierChange('bezierChroma', 1, e.target.value)} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="variation">
            <AccordionTrigger className="text-sm font-medium">Variation</AccordionTrigger>
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
                <Input type="number" value={config.variation.seed} onChange={(e) => onConfigChange({ ...config, variation: { ...config.variation, seed: parseInt(e.target.value, 10) || 0 } })} />
                <Button variant="outline" size="icon" onClick={randomizeSeed}><Dices className="h-4 w-4" /></Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}