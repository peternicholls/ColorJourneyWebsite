import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/sonner';
import { ColorJourneyControls } from '@/components/color/ColorJourneyControls';
import { PaletteViewer } from '@/components/color/PaletteViewer';
import { ColorJourneyEngine } from '@/lib/color-journey';
import type { ColorJourneyConfig, GenerateResult } from '@/types/color-journey';
import { Header } from '@/components/layout/Header';
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
  const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
  }
  const debouncedConfig = useDebounce(config, 200);
  useEffect(() => {
    const checkWasmLoading = () => {
      const engineLoading = ColorJourneyEngine.isLoadingWasm();
      setIsLoadingWasm(engineLoading);
      if (!engineLoading) {
        clearInterval(wasmCheckInterval);
      }
    };
    const wasmCheckInterval = setInterval(checkWasmLoading, 100);
    const wasmLoadTimeout = setTimeout(() => {
        if (ColorJourneyEngine.isLoadingWasm()) {
            console.warn("WASM module is taking a long time to load. Check network or build script.");
        }
    }, 10000);
    checkWasmLoading();
    return () => {
        clearInterval(wasmCheckInterval);
        clearTimeout(wasmLoadTimeout);
    };
  }, []);
  useEffect(() => {
    if (isLoadingWasm) return;
    setIsLoading(true);
    ColorJourneyEngine.generate(debouncedConfig).then((res) => {
      setResult(res);
      setIsLoading(false);
    });
  }, [debouncedConfig, isLoadingWasm]);
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-4xl md:text-5xl font-display font-bold text-balance leading-tight"
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#F38020] via-[#667EEA] to-[#14B8A6]">
                  Color Journey Palette Engine
                </span>
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
                <PaletteViewer
                  result={result}
                  isLoading={isLoading}
                  isLoadingWasm={isLoadingWasm}
                />
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