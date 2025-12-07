import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, Github } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ColorJourneyControls } from '@/components/color/ColorJourneyControls';
import { PaletteViewer } from '@/components/color/PaletteViewer';
import { ColorJourneyEngine } from '@/lib/color-journey';
import type { ColorJourneyConfig, GenerateResult } from '@/types/color-journey';
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
  },
  variation: {
    mode: 'off',
    seed: 12345,
  },
};
export function HomePage() {
  const [config, setConfig] = useState<ColorJourneyConfig>(initialConfig);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWasm, setIsLoadingWasm] = useState(true);
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
    checkWasmLoading();
    return () => clearInterval(wasmCheckInterval);
  }, []);
  useEffect(() => {
    setIsLoading(true);
    ColorJourneyEngine.generate(debouncedConfig).then((res) => {
      setResult(res);
      setIsLoading(false);
    });
  }, [debouncedConfig]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F38020] to-[#E55A1B] flex items-center justify-center shadow-primary">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-display font-bold">
                Color Journey
              </h1>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/presets" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Presets</Link>
              <Link to="/docs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">API Docs</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://github.com/cloudflare/workers-ai-apis" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                </a>
              </Button>
              <ThemeToggle className="relative top-0 right-0" />
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-4xl md:text-5xl font-display font-bold text-balance leading-tight"
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-blue-500 to-teal-500">
                  OKLab Palette Engine
                </span>
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty"
              >
                Generate designer-grade, perceptually-aware color sequences with fine-tuned controls and optional organic variation.
              </motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              <div className="md:col-span-1">
                <ColorJourneyControls config={config} onConfigChange={setConfig} isLoadingWasm={isLoadingWasm} />
              </div>
              <div className="md:col-span-2">
                <PaletteViewer result={result} isLoading={isLoading || isLoadingWasm} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ at Cloudflare</p>
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}
// Debounce hook to prevent excessive re-renders on slider drag
function useDebounce<T>(value: T, delay: number): T {
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