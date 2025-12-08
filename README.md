# Color Journey Palette Engine
*using the OKLab color space, based on Björn Ottosson's work (MIT License)*
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})
[cloudflarebutton]
Color Journey is a portable, OKLab-first color generation engine and interactive playground that produces designer-quality, perceptually-aware color sequences for timelines, tracks, sections, labels, and UI accents. The core algorithms are implemented in portable C (compiled to WASM for web delivery), with a robust TypeScript runtime fallback. It exposes composable configuration for routes, dynamics, granularity, looping, and optional variation, supporting both continuous (t → Color) and discrete (N-step) palette generation. The UI is a polished, shadcn/ui-based playground with controls, live previews, and exports.
## Features
- **OKLab-Based Color Processing**: Operates in perceptually uniform OKLab space for stable lightness, chroma, and contrast, with perceptual guarantees including minimum ΔE enforcement for distinctness and midpoint vibrancy boosts to avoid muddy tones.
- **High-Performance C Core**: Core logic written in C and compiled to WebAssembly for near-native performance in the browser and on the edge.
- **Graceful Fallback**: A complete TypeScript implementation serves as an immediate fallback if WASM fails to load, ensuring identical outputs.
- **Journey Routes**: Single or multi-anchor (2–5) color paths with designed non-linear pacing and easing curves to create curated, not mechanical, journeys.
- **Perceptual Dynamics**: High-level controls for lightness bias, chroma multiplier, contrast enforcement (minimum OKLab ΔE), and more.
- **Perceptual Enforcement**: Iterative ΔE nudges ensure minimum color separation with adaptive reuse for large palettes.
- **Advanced Dynamics**: Bezier curves for path shaping, preset biases, and midpoint vibrancy boosts.
- **Granularity Modes**: Continuous gradients or discrete quantized palettes with patterned reuse for large sets.
- **Seeded Variation Layer**: Optional subtle, structured perturbations for an organic feel, with deterministic outputs via a seed.
- **Interactive Playground**: Real-time previews, diagnostics (ΔE metrics, WCAG contrast), presets, and exports (CSS variables, JSON).
- **Curated Presets**: Includes **Default**, **Pastel Drift**, **Vivid Sunset**, **Ocean Deep**, **High Contrast AAA** (emphasizes WCAG AAA contrast), **Organic Loop** (demonstrates closed looping and subtle variation), and **Night Mode Deep** (showcases dark tones with ping-pong traversal).
- **Edge API**: Cloudflare Worker endpoint for server-side generation, ensuring consistent results across platforms.
## Tech Stack
- **Frontend**: React 18, React Router 6, TypeScript, Vite
- **UI & Styling**: shadcn/ui, Tailwind CSS v3, Framer Motion, Lucide React
- **Core Engine**: Portable C compiled to WebAssembly via **Emscripten**, with a TypeScript fallback. Based on the OKLab color space matrix conversion by Björn Ottosson (MIT License), with custom optimizations including a fast cube root implementation. Core C engine by Peter Nicholls.
- **Backend/Edge**: Cloudflare Workers, Hono (routing), with WASM integration.
- **Build & Deployment**: Bun, Wrangler (Cloudflare CLI), Emscripten (C to WASM)
## Quick Start
### Prerequisites
- Node.js 18+ (or Bun for faster setup)
- Cloudflare account (free tier is sufficient)
- **Emscripten SDK**: Required for compiling the C core to WASM.
### Installation
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd color-journey-palette-engine
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  **Install Emscripten SDK**:
    Follow the official guide: [emscripten.org/docs/getting_started/downloads.html](https://emscripten.org/docs/getting_started/downloads.html). After installation, activate it in your terminal session:
    ```bash
    # Navigate to your emsdk directory
    ./emsdk activate latest
    source ./emsdk_env.sh
    ```
4.  **Build the WebAssembly Module**:
    Run the build script to compile the C core.
    ```bash
    ./src/wasm/build-wasm.sh
    ```
    This will create `color_journey.js` and `color_journey.wasm` in the `public/assets/` directory.
### Development
1.  Start the development server:
    ```bash
    bun dev
    ```
    The app will be available at `http://localhost:3000`.
2.  (Optional) In a separate terminal, start the Worker for API testing:
    ```bash
    bunx wrangler dev
    ```
    The edge API will be at `http://localhost:8787/api/color-journey`.
### Built-in Presets Showcase
The included presets demonstrate the engine's core perceptual guarantees:
- **High Contrast AAA**: Guarantees WCAG AAA readability by enforcing a high minimum ΔE (perceptual distance) between colors, ideal for accessible UI themes.
- **Organic Loop**: Creates a seamless, repeating palette for cyclic timelines or patterns, using sinusoidal easing and a subtle variation layer for a natural, less-mechanical feel.
- **Night Mode Deep**: Explores dark, rich tones with a ping-pong loop, showcasing how the engine maintains vibrancy and avoids muddy midpoints even in low-lightness journeys.
- **Pastel Drift & Vivid Sunset**: Highlight the engine's control over chroma (saturation) and lightness to produce soft, airy palettes or bold, energetic ones.
## Building the C Core (WebAssembly)
### Build Script (`src/wasm/build-wasm.sh`)
A convenience script is provided to simplify compilation. Run `./src/wasm/build-wasm.sh` after activating the Emscripten SDK. This generates both the `color_journey.js` loader and the `color_journey.wasm` binary.
## Deployment
Deploy to Cloudflare Workers for an edge-hosted playground and API.
1.  Build the WASM module:
    ```bash
    ./src/wasm/build-wasm.sh
    ```
2.  Build the frontend application:
    ```bash
    bun build
    ```
3.  Deploy via Wrangler:
    ```bash
    bunx wrangler deploy
    ```
    Wrangler automatically bundles all static assets from the output directory (including the `.js` and `.wasm` files) and the Worker script.
## Performance Benchmarks
- **WASM**: <50ms for a 100-color palette.
- **TypeScript Fallback**: <100ms for a 100-color palette.
## Troubleshooting
- **Radix UI Ref Warnings**: These warnings are generally benign and relate to internal ref forwarding within `shadcn/ui` primitives. They do not affect functionality. Ensure your dependencies are up to date.
- **WASM Load Failures**: If WASM fails to load, the app seamlessly uses the TypeScript fallback with identical outputs. To enable the high-performance WASM module, run `./src/wasm/build-wasm.sh` and refresh the page. In your browser's developer tools Network tab, verify that `color_journey.js` and `color_journey.wasm` are successfully fetched from `/assets/`.
- **Vite 'browserHash' Error**: This can occur during dependency updates if the WASM build process interferes with Vite's file watcher, leading to a `TypeError`. To fix:
  1.  Ensure the Emscripten SDK is active: `source ./emsdk_env.sh`
  2.  Clear Vite's cache: `rm -rf node_modules/.vite`
  3.  Rebuild the WASM module: `./src/wasm/build-wasm.sh`
  4.  Restart the development server: `bun dev`
## Determinism Verification
The system is designed to be deterministic. Given the same configuration object and seed, both the WASM and TypeScript implementations are verified to produce identical palettes.
To verify:
1.  Generate a palette with a specific seed (e.g., 12345).
2.  Note the output colors.
3.  Temporarily disable WASM by renaming `public/assets/color_journey.wasm`.
4.  Refresh the page. The app will use the TS fallback and produce the exact same palette.
## Deployment Checklist
0.  **Clear caches and verify Emscripten** to prevent build-time TypeErrors.
1.  Run `./src/wasm/build-wasm.sh` to compile the C core.
2.  Run `bun build` to build the frontend application.
3.  Run `wrangler deploy` to deploy to Cloudflare Workers.
4.  Test the live deployment by sending a POST request to `/api/color-journey` with a sample configuration. Expect a `{ "success": true, "data": {...} }` response.
## API Response Schema
```json
{
  "success": true,
  "data": {
    "palette": [
      {
        "hex": "#rrggbb",
        "ok": { "l": 0.5, "a": 0.1, "b": 0.05 }
      }
    ],
    "config": {
      "anchors": ["#F38020"],
      "numColors": 12,
      "loop": "open",
      "dynamics": { "...": "..." },
      "variation": { "mode": "off", "seed": 12345 }
    },
    "diagnostics": {
      "minDeltaE": 0.05,
      "enforcementIters": 2,
      "traversalStrategy": "perceptual"
    }
  }
}
```
[cloudflarebutton]
---
**Based on the OKLab color space matrix conversion by Björn Ottosson ([MIT License](LICENSE)), with custom optimizations including a fast cube root implementation. Core C engine by Peter Nicholls.**
**Copyright © 2025 Peter Nicholls.** This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.