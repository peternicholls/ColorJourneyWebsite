import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'sonner';
import { ColorJourneyConfig } from '@/types/color-journey';
import { exportToJson, copyToClipboard, downloadFile } from '@/lib/utils/color-export';
import { ColorJourneyEngine } from '@/lib/color-journey';
import { Header } from '@/components/layout/Header';
const BUILT_IN_PRESETS: { name: string; config: ColorJourneyConfig }[] = [
  {
    name: "Vivid Sunset",
    config: { anchors: ["#ff7e5f", "#feb47b"], numColors: 8, loop: 'open', granularity: 'discrete', dynamics: { lightness: 0, chroma: 1.2, contrast: 0.05, vibrancy: 0.6, warmth: 0.2, biasPreset: 'vivid', enableColorCircle: false, arcLength: 0, curveStyle: 'ease-in', curveDimensions: ['all'], curveStrength: 1 }, variation: { mode: 'subtle', seed: 42 } }
  },
  {
    name: "Ocean Deep",
    config: { anchors: ["#00c9ff", "#92fe9d"], numColors: 12, loop: 'open', granularity: 'discrete', dynamics: { lightness: -0.1, chroma: 1.1, contrast: 0.04, vibrancy: 0.5, warmth: -0.3, biasPreset: 'cool', enableColorCircle: false, arcLength: 0, curveStyle: 'sinusoidal', curveDimensions: ['all'], curveStrength: 1 }, variation: { mode: 'off', seed: 123 } }
  },
  {
    name: "Pastel Drift",
    config: { anchors: ["#a8e6cf", "#dcedc1", "#ffd3b6"], numColors: 10, loop: 'closed', granularity: 'discrete', dynamics: { lightness: 0.1, chroma: 0.8, contrast: 0.02, vibrancy: 0.3, warmth: 0, biasPreset: 'lighter', enableColorCircle: false, arcLength: 0, curveStyle: 'ease-out', curveDimensions: ['all'], curveStrength: 0.8 }, variation: { mode: 'subtle', seed: 2024 } }
  },
];
const PRESETS_STORAGE_KEY = 'cj-presets';
export function PresetsExportPage() {
  const [customPresets, setCustomPresets] = useState<{ name: string; config: ColorJourneyConfig }[]>([]);
  const [editingPreset, setEditingPreset] = useState<string>('');
  const [presetName, setPresetName] = useState('');
  const [isLoadingWasm, setIsLoadingWasm] = useState(true);
  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (storedPresets) {
        setCustomPresets(JSON.parse(storedPresets));
      }
    } catch (error) {
      console.error("Failed to load presets from localStorage", error);
      toast.error("Could not load custom presets.");
    }
    const checkWasmLoading = () => {
      const engineLoading = ColorJourneyEngine.isLoadingWasm();
      setIsLoadingWasm(engineLoading);
      if (!engineLoading) {
        clearInterval(wasmCheckInterval);
      }
    };
    const wasmCheckInterval = setInterval(checkWasmLoading, 100);
    checkWasmLoading();
    return () => clearInterval(wasmCheckInterval);
  }, []);
  const savePreset = () => {
    if (isLoadingWasm) {
      toast.info('Engine is still loading, please wait a moment.');
      return;
    }
    if (!presetName || !editingPreset) {
      toast.error("Preset name and configuration are required.");
      return;
    }
    try {
      const config = JSON.parse(editingPreset);
      const newPresets = [...customPresets, { name: presetName, config }];
      setCustomPresets(newPresets);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
      toast.success(`Preset "${presetName}" saved!`);
      setPresetName('');
      setEditingPreset('');
    } catch (error) {
      toast.error("Invalid JSON configuration.");
    }
  };
  const deletePreset = (index: number) => {
    const newPresets = customPresets.filter((_, i) => i !== index);
    setCustomPresets(newPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
    toast.success("Preset deleted.");
  };
  const handleCopy = (preset: { name: string; config: ColorJourneyConfig }) => {
    const mockDiagnostics = { minDeltaE: 0, maxDeltaE: 0, contrastViolations: 0, wcagMinRatio: preset.config.dynamics.contrast > 0.08 ? 7.1 : 4.5, wcagViolations: 0, aaaCompliant: preset.config.dynamics.contrast > 0.08 };
    const content = exportToJson({ config: preset.config, palette: [], diagnostics: mockDiagnostics });
    copyToClipboard(content).then(success => {
      if (success) toast.success(`JSON for "${preset.name}" copied!`);
      else toast.error(`Failed to copy.`);
    });
  };
  const handleDownload = (preset: { name: string; config: ColorJourneyConfig }) => {
    const mockDiagnostics = { minDeltaE: 0, maxDeltaE: 0, contrastViolations: 0, wcagMinRatio: preset.config.dynamics.contrast > 0.08 ? 7.1 : 4.5, wcagViolations: 0, aaaCompliant: preset.config.dynamics.contrast > 0.08 };
    const content = exportToJson({ config: preset.config, palette: [], diagnostics: mockDiagnostics });
    downloadFile(content, `${preset.name.replace(/\s+/g, '-')}.json`, 'application/json');
    toast.success(`Downloaded ${preset.name}.json`);
  };
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-balance bg-clip-text text-transparent bg-gradient-to-r from-[#F38020] via-[#667EEA] to-[#14B8A6]">Presets & Export</h2>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
                Save, share, and export your favorite color journey configurations to use in any project.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Preset Library</CardTitle>
                  <CardDescription>Load a built-in preset or one of your own.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Built-in Presets</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {BUILT_IN_PRESETS.map((preset) => (
                        <motion.div key={preset.name} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                          <Card className="overflow-hidden">
                            <div className="h-16" style={{ background: `linear-gradient(to right, ${preset.config.anchors.join(', ')})` }} />
                            <CardHeader className="p-4">
                              <CardTitle className="text-base">{preset.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 flex gap-2">
                              <Button size="sm" variant="outline" className="w-full" onClick={() => handleCopy(preset)}>
                                <Copy className="mr-2 h-4 w-4" /> JSON
                              </Button>
                              <Button size="sm" variant="outline" className="w-full" onClick={() => handleDownload(preset)}>
                                <Download className="mr-2 h-4 w-4" /> Export
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">My Presets</h3>
                    {customPresets.length > 0 ? (
                      <div className="space-y-2">
                        {customPresets.map((preset, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                            <div className="flex-1 font-medium">{preset.name}</div>
                            <Button size="sm" variant="ghost" onClick={() => handleCopy(preset)}><Copy className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deletePreset(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">You haven't saved any presets yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Create or Import Preset</CardTitle>
                  <CardDescription>Paste a JSON configuration to save it as a new preset.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input id="preset-name" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g., My Awesome Palette" />
                  </div>
                  <div>
                    <Label htmlFor="preset-config">JSON Configuration</Label>
                    <Textarea id="preset-config" value={editingPreset} onChange={(e) => setEditingPreset(e.target.value)} rows={10} placeholder='Paste your ColorJourneyConfig JSON here...' />
                  </div>
                  <Button className="w-full" onClick={savePreset} disabled={isLoadingWasm}>
                    <Save className="mr-2 h-4 w-4" /> Save Preset
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
          <p>Copyright © 2025 Peter Nicholls. Powered by the OKLab color space (Björn Ottosson, <a href="/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-foreground">MIT License</a>). This project is licensed under the MIT License.</p>
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}