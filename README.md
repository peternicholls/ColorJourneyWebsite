# Color Journey — OKLab Palette Engine

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})  
[cloudflarebutton]

Color Journey is a portable, OKLab-first color generation engine and interactive playground that produces designer-quality, perceptually-aware color sequences for timelines, tracks, sections, labels, and UI accents. The core algorithms are implemented in portable C (compiled to WASM for web delivery), with a robust TypeScript runtime fallback. It exposes composable configuration for routes, dynamics, granularity, looping, and optional variation, supporting both continuous (t → Color) and discrete (N-step) palette generation. The UI is a polished, shadcn/ui-based playground with controls, live previews, and exports.

## Features

- **OKLab-Based Color Processing**: Operates in perceptually uniform OKLab space for stable lightness, chroma, and contrast, avoiding issues with traditional RGB/HSV models.
- **Journey Routes**: Single or multi-anchor (2–5) color paths with designed non-linear pacing, easing curves, and shaped chroma/lightness envelopes.
- **Perceptual Dynamics**: High-level controls for lightness bias, chroma multiplier, contrast enforcement (minimum OKLab ΔE), mid-journey vibrancy, and warm/cool balance.
- **Granularity Modes**: Continuous gradients for smooth flows or discrete quantization for distinct palettes, with patterned reuse for large sets.
- **Looping Support**: Open sequences, seamless closed loops, or ping-pong reversals, ensuring perceptual continuity.
- **Seeded Variation Layer**: Optional subtle, structured perturbations (hue, lightness, chroma) for organic feel, with deterministic outputs via seed.
- **Interactive Playground**: Real-time previews of gradients and swatches, diagnostics (ΔE metrics), presets, and exports (CSS variables, JSON).
- **Portability & Performance**: C core compiled to WASM for browser/edge execution; TypeScript fallback for instant loading.
- **Edge API**: Cloudflare Worker endpoint for server-side generation, with caching and rate limiting.
- **Visual Excellence**: Responsive, accessible UI with smooth interactions, micro-animations, and professional polish.

## Tech Stack

- **Frontend**: React 18, React Router 6, TypeScript, Vite (build tool)
- **UI & Styling**: shadcn/ui, Tailwind CSS v3, Framer Motion (animations), Lucide React (icons)
- **State Management**: Zustand (for configuration and previews)
- **Core Engine**: Portable C (compiled to WebAssembly), with TypeScript fallback for OKLab math, interpolation, RNG (xorshift/PCG), and gamut mapping.
- **Backend/Edge**: Cloudflare Workers, Hono (routing), with WASM integration for server-side palette generation.
- **Utilities**: Zod (validation), React Hook Form (forms), React Query (optional API caching), Immer (immutable updates)
- **Testing**: Vitest (recommended for unit tests, including WASM harness)
- **Build & Deployment**: Bun (package manager), Wrangler (Cloudflare CLI), Emscripten (C to WASM compilation)

## Quick Start

### Prerequisites

- Node.js 18+ (or Bun for faster setup)
- Cloudflare account (free tier sufficient for Workers)
- Emscripten toolchain (for local WASM builds; see Build section)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd color-journey
   ```

2. Install dependencies using Bun:
   ```
   bun install
   ```

3. Set up Cloudflare credentials (for deployment):
   ```
   bunx wrangler login
   ```

### Development

1. Start the development server:
   ```
   bun dev
   ```
   The app will be available at `http://localhost:3000`.

2. In a separate terminal, start the Worker (for API testing):
   ```
   bunx wrangler dev
   ```
   The edge API will be available at `http://localhost:8787/api/color-journey`.

3. Build for production:
   ```
   bun build
   ```

4. Preview the build:
   ```
   bun preview
   ```

For WASM compilation (C core):
- Install Emscripten: Follow [official docs](https://emscripten.org/docs/getting_started/downloads.html).
- Run the build script: `./build-wasm.sh` (creates `/public/assets/color_journey.wasm`).
- Update `vite.config.ts` if needed for asset handling.

### Usage Examples

#### Playground Interaction
- Navigate to `/` (Playground view).
- Input anchor colors (sRGB hex) or select a preset (e.g., "Pastel Drift").
- Adjust sliders: Lightness Bias (-1 to +1), Chroma Multiplier (0.5–2.0), Contrast Threshold (10–50 ΔE).
- Toggle Variation (Off/Subtle/Noticeable) and set a seed (e.g., 42 for determinism).
- Preview: Drag the t-slider for continuous gradient; set N (e.g., 12) for discrete swatches.
- Diagnostics: View min ΔE between neighbors; export CSS vars like `--color-1: #ff6b35;`.

#### API Usage (Edge Compute)
Send a POST to `/api/color-journey`:
```json
{
  "anchors": ["#F38020", "#667EEA"],
  "mode": "discrete",
  "nSteps": 8,
  "lightnessBias": 0.2,
  "chromaMultiplier": 1.1,
  "seed": 42,
  "loopMode": "closed"
}
```
Response:
```json
{
  "success": true,
  "palettes": [
    {
      "srgb": "#f38020",
      "oklab": { "L": 0.75, "a": 0.12, "b": 0.25 },
      "deltaE": 25.3
    }
  ]
}
```

#### Presets & Export
- Visit `/presets` to load/save custom journeys.
- Export: Copy CSS block (`:root { --journey-1: #f38020; ... }`) or JSON config for integration.

For integration in your app:
```tsx
// Example: Use the engine in a React component
import { useColorJourney } from '@/hooks/useColorJourney';

const MyComponent = () => {
  const { generatePalette, isLoading } = useColorJourney();
  const palette = generatePalette({ anchors: ['#F38020'], nSteps: 5 });

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  return (
    <div className="grid grid-cols-5 gap-2">
      {palette.map((color, i) => (
        <div key={i} className="h-16 rounded-lg" style={{ backgroundColor: color.srgb }} />
      ))}
    </div>
  );
};
```

## Building the C Core

The portable C implementation handles OKLab conversions, interpolation, dynamics, and variation. Sources are in `/src/core/` (add if needed).

1. Ensure Emscripten is installed and activated.
2. Compile:
   ```
   emcc src/core/oklab_engine.c src/core/journey.c src/core/variation.c \
     -o public/assets/color_journey.wasm \
     -s EXPORTED_FUNCTIONS='["_generate_palette", "_oklab_to_srgb"]' \
     -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
     -s MODULARIZE=1 -s EXPORT_NAME='ColorJourneyModule' \
     -O3 --closure 1
   ```
3. Load in TS: See `/src/lib/wasm-loader.ts` for async instantiation.

Test WASM outputs match TS fallback using Vitest:
```
bun test --wasm
```

## Deployment

Deploy to Cloudflare Workers for edge-hosted playground and API:

1. Build the app:
   ```
   bun build
   ```

2. Deploy via Wrangler:
   ```
   bunx wrangler deploy
   ```
   This bundles the static assets and Worker script.

3. For custom domains or advanced config, edit `wrangler.toml` (e.g., add KV bindings for presets).

The playground will be served from your Worker URL (e.g., `https://color-journey.your-subdomain.workers.dev`). API endpoint: `/api/color-journey`.

[cloudflarebutton]

## Contributing

1. Fork the repo and create a feature branch (`git checkout -b feat/amazing-feature`).
2. Commit changes (`git commit -m 'Add some amazing feature'`).
3. Push to the branch (`git push origin feat/amazing-feature`).
4. Open a Pull Request.

Ensure code follows:
- TypeScript strict mode.
- ESLint rules (run `bun lint`).
- Tests pass (`bun test`).

For C/WASM contributions, include Emscripten build updates and cross-verify with TS fallback.

## License

This project is MIT licensed. See [LICENSE](LICENSE) for details.