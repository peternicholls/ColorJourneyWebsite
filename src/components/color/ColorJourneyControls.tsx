import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ColorJourneyConfig, LoopMode, VariationMode } from '@/types/color-journey';
import { Palette, Plus, Trash2, Dices } from 'lucide-react';
interface ColorJourneyControlsProps {
  config: ColorJourneyConfig;
  onConfigChange: (newConfig: ColorJourneyConfig) => void;
}
const PRESETS = {
  "Default": { anchors: ["#F38020", "#667EEA"], numColors: 12 },
  "Pastel Drift": { anchors: ["#a8e6cf", "#dcedc1", "#ffd3b6", "#ffaaa5", "#ff8b94"], numColors: 10 },
  "Vivid Sunset": { anchors: ["#ff7e5f", "#feb47b"], numColors: 8 },
  "Ocean Deep": { anchors: ["#00c9ff", "#92fe9d"], numColors: 12 },
};
export function ColorJourneyControls({ config, onConfigChange }: ColorJourneyControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const handleValueChange = (key: keyof ColorJourneyConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };
  const handleDynamicsChange = (key: keyof ColorJourneyConfig['dynamics'], value: number) => {
    onConfigChange({ ...config, dynamics: { ...config.dynamics, [key]: value } });
  };
  const handleVariationChange = (key: keyof ColorJourneyConfig['variation'], value: any) => {
    onConfigChange({ ...config, variation: { ...config.variation, [key]: value } });
  };
  const handleAnchorChange = (index: number, value: string) => {
    const newAnchors = [...config.anchors];
    newAnchors[index] = value;
    handleValueChange('anchors', newAnchors);
  };
  const addAnchor = () => {
    if (config.anchors.length < 5) {
      handleValueChange('anchors', [...config.anchors, '#ffffff']);
    }
  };
  const removeAnchor = (index: number) => {
    if (config.anchors.length > 1) {
      const newAnchors = config.anchors.filter((_, i) => i !== index);
      handleValueChange('anchors', newAnchors);
    }
  };
  const randomizeSeed = () => {
    handleVariationChange('seed', Math.floor(Math.random() * 1_000_000));
  };
  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    onConfigChange({ ...config, ...preset });
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
          <Select
            value={selectedPreset}
            onValueChange={(val) => {
              const presetKey = val as keyof typeof PRESETS;
              applyPreset(presetKey);
              setSelectedPreset(val);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Load a preset..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PRESETS).map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="space-y-3">
          <Label>Anchor Colors</Label>
          {config.anchors.map((anchor, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input type="color" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="p-1 h-10 w-12" />
              <Input type="text" value={anchor} onChange={(e) => handleAnchorChange(index, e.target.value)} className="font-mono" />
              <Button variant="ghost" size="icon" onClick={() => removeAnchor(index)} disabled={config.anchors.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAnchor} disabled={config.anchors.length >= 5}>
            <Plus className="mr-2 h-4 w-4" /> Add Anchor
          </Button>
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
        <div className="space-y-4">
            <h3 className="text-sm font-medium">Dynamics</h3>
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
        </div>
        <Separator />
        <div className="space-y-4">
            <h3 className="text-sm font-medium">Variation</h3>
            <Select value={config.variation.mode} onValueChange={(v: VariationMode) => handleVariationChange('mode', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="noticeable">Noticeable</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
                <Input type="number" value={config.variation.seed} onChange={(e) => handleVariationChange('seed', parseInt(e.target.value, 10))} />
                <Button variant="outline" size="icon" onClick={randomizeSeed}>
                    <Dices className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}