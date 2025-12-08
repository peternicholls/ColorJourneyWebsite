import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from '@/components/ui/sonner';
import { ColorJourneyControls } from '@/components/color/ColorJourneyControls';
import { PaletteViewer } from '@/components/color/PaletteViewer';
import { ColorJourneyEngine } from '@/lib/color-journey';
import type { ColorJourneyConfig, GenerateResult } from '@/types/color-journey';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
const initialConfig: ColorJourneyConfig = {
  anchors: ["#F38020", "#667EEA"],
  numColors: 12,
  loop: 'open',
  granularity: 'discrete',
  dynamics: {
    lightness: 0,
    chroma: 1.0,
    contrast: 0.05,
    vibrancy: 0.5,
    warmth: 0,
    biasPreset: 'neutral',
    bezierLight: [0.5, 0.5],
    bezierChroma: [0.5, 0.5],
    enableColorCircle: false,
    arcLength: 0,
    curveStyle: 'linear',
    curveDimensions: ['L','C','H'],
    curveStrength: 1.0,
  },
  variation: {
    mode: 'off',
    seed: 12345,
  },
  ui: {
    show3D: false,
  },
};
export function HomePage() {
  const [config, setConfig] = useState<ColorJourneyConfig>(() => {
    try {
      const savedUi = localStorage.getItem('cj-ui-prefs');
      if (savedUi) {
        return { ...initialConfig, ui: JSON.parse(savedUi) };
      }
    } catch (e) {
      console.warn('Could not parse UI preferences from localStorage', e);
    }
    return initialConfig;
  });
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWasm, setIsLoadingWasm] = useState(true);
  const debouncedConfig = useDebounce(config, 200);
  useEffect(() => {
    const startTime = Date.now();
    const checkWasmLoading = () => {
      const engineLoading = ColorJourneyEngine.isLoadingWasm();
      setIsLoadingWasm(engineLoading);
      if (!engineLoading) {
        clearInterval(wasmCheckInterval);
      } else if (Date.now() - startTime > 5000) {
        setIsLoadingWasm(false);
        toast.info('Using TypeScript engine for compatibility.');
        clearInterval(wasmCheckInterval);
      }
    };
    const wasmCheckInterval = setInterval(checkWasmLoading, 100);
    checkWasmLoading();
    return () => clearInterval(wasmCheckInterval);
  }, []);
  useEffect(() => {
    if (isLoadingWasm) return;
    setIsLoading(true);
    const generate = async () => {
      try {
        const res = await ColorJourneyEngine.generate(debouncedConfig);
        setResult(res);
      } catch (e) {
        console.error('Palette generation failed:', e);
        toast.error('Failed to generate palette. Please check console.');
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    };
    generate();
  }, [debouncedConfig, isLoadingWasm]);
  const handleConfigChange = (newConfig: ColorJourneyConfig) => {
    setConfig(newConfig);
    if (newConfig.ui) {
      localStorage.setItem('cj-ui-prefs', JSON.stringify(newConfig.ui));
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-12 lg:py-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-balance leading-tight bg-clip-text text-transparent bg-gradient-hero bg-[length:200%_100%] animate-gradient-shift">
                Color Journey Palette Engine
              </h2>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
                Generate designer-grade, perceptually-aware color sequences with fine-tuned controls, guaranteed contrast, and optional organic variation.
              </p>
            </div>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } },
                hidden: {},
              }}
            >
              <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} className="md:col-span-1">
                <ColorJourneyControls config={config} onConfigChange={handleConfigChange} isLoadingWasm={isLoadingWasm} />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="md:col-span-2">
                {isLoadingWasm ? (
                  <Card>
                    <CardContent className="p-8 center-col gap-4">
                      <Skeleton className="w-full h-40 rounded-lg" />
                      <p className="text-sm text-muted-foreground animate-pulse">Optimizing color engine...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <PaletteViewer
                    result={result}
                    isLoading={isLoading}
                    config={config}
                    onConfigChange={handleConfigChange}
                  />
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ at Cloudflare. Based on the OKLab color space by Björn Ottosson (<a href="/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">MIT License</a>). Core C engine by Peter Nicholls.</p>
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}