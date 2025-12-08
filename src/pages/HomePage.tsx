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
    curveDimensions: ['all'],
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
  const [config, setConfig] = useState<ColorJourneyConfig>(initialConfig);
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
        // If still loading after 5s, assume fallback
        setIsLoadingWasm(false);
        toast.warning('Using TypeScript engine for optimal compatibility.');
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
        toast.error('Failed to generate palette. Using fallback.');
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    };
    generate();
  }, [debouncedConfig, isLoadingWasm]);
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-12 lg:py-16">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-4xl md:text-5xl font-display font-bold text-balance leading-tight"
              >
                <motion.span
                  className="bg-clip-text text-transparent bg-gradient-primary bg-[length:200%_100%]"
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                >
                  Color Journey Palette Engine
                </motion.span>
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty"
              >
                Generate designer-grade, perceptually-aware color sequences with fine-tuned controls, guaranteed contrast, and optional organic variation.
              </motion.p>
            </div>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
              initial="hidden"
              animate="show"
            >
              <motion.div
                variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.5 }}
                className="md:col-span-1"
              >
                <ColorJourneyControls config={config} onConfigChange={setConfig} isLoadingWasm={isLoadingWasm} />
              </motion.div>
              <motion.div
                className="md:col-span-2"
                variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.5 }}
              >
                {isLoadingWasm ? (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-4">
                          <Skeleton className="w-64 h-4" />
                          <Skeleton className="w-full h-32 rounded-lg" />
                          <p className="text-sm text-muted-foreground">Optimizing color engine for production...</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <PaletteViewer
                    result={result}
                    isLoading={isLoading}
                    isLoadingWasm={isLoadingWasm}
                  />
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ at Cloudflare. Powered by the OKLab color space (Björn Ottosson, <a href="/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">MIT License</a>). Copyright © 2025 Peter Nicholls.</p>
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}