# Color Journey Palette Engine
*using the OKLab color space, based on Björn Ottosson's work (MIT License)*
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/workers-ai-apis)
Color Journey is a portable, OKLab-first color generation engine and interactive playground that produces designer-quality, perceptually-aware color sequences for timelines, tracks, sections, labels, and UI accents. The core algorithms are implemented in portable C (compiled to WASM for web delivery), with a robust TypeScript runtime fallback. It exposes composable configuration for routes, dynamics, granularity, looping, and optional variation, supporting both continuous (t → Color) and discrete (N-step) palette generation. The UI is a polished, shadcn/ui-based playground with controls, live previews, and exports.
## Features
- **OKLab-Based Color Processing**: Operates in perceptually uniform OKLab space for stable lightness, chroma, and contrast, with perceptual guarantees including minimum ΔE enforcement for distinctness and midpoint vibrancy boosts to avoid muddy tones.
- **High-Performance C Core**: Core logic written in C and compiled to WebAssembly for near-native performance in the browser and on the edge.
- **Graceful Fallback**: A complete TypeScript implementation serves as an immediate fallback if WASM fails to load, ensuring identical outputs.
- **Designed Journey Routes**: Single or multi-anchor (2–5) color paths with designed non-linear pacing and easing curves to create curated, not mechanical, journeys.
- **Advanced Perceptual Dynamics**: High-level controls for lightness bias, chroma multiplier, contrast enforcement (minimum OKLab ΔE), custom Bezier curve shaping, and a single-anchor color circle mode.
- **Interactive 3D Viewer**: Visualize palettes in a quasi-3D representation of the OKLab color space to better understand perceptual relationships.
- **Seeded Variation Layer**: Optional subtle, structured perturbations for an organic feel, with deterministic outputs via a seed.
- **Interactive Playground**: Real-time previews, diagnostics (ΔE metrics, WCAG contrast), presets, and exports (CSS variables, JSON).
- **Edge API**: Cloudflare Worker endpoint for server-side generation, ensuring consistent results across platforms.
## Presets Showcase
The included presets demonstrate the engine's core perceptual guarantees:
- **High Contrast AAA**: Guarantees WCAG AAA readability by enforcing a high minimum ΔE (perceptual distance) between colors, ideal for accessible UI themes.
- **Organic Loop**: Creates a seamless, repeating palette for cyclic timelines or patterns, using sinusoidal easing and a subtle variation layer for a natural, less-mechanical feel.
- **Night Mode Deep**: Explores dark, rich tones with a ping-pong loop, showcasing how the engine maintains vibrancy and avoids muddy midpoints even in low-lightness journeys.
- **Pastel Drift & Vivid Sunset**: Highlight the engine's control over chroma (saturation) and lightness to produce soft, airy palettes or bold, energetic ones.
## Tech Stack
- **Frontend**: React 18, React Router 6, TypeScript, Vite
- **UI & Styling**: shadcn/ui, Tailwind CSS v3, Framer Motion, Lucide React
- **Core Engine**: Portable C compiled to WebAssembly via **Emscripten**, with a TypeScript fallback.
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
    cd color-journey
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
## Deployment Guide
Deploy to Cloudflare Workers for an edge-hosted playground and API.
1.  **Build the WASM module**: Ensure the Emscripten SDK is active, then run:
    ```bash
    ./src/wasm/build-wasm.sh
    ```
2.  **Build the frontend application**:
    ```bash
    bun build
    ```
3.  **Deploy via Wrangler**:
    ```bash
    bunx wrangler deploy
    ```
    Wrangler automatically bundles all static assets from the `dist` directory (including the `.js` and `.wasm` files) and the Worker script.
4.  **Test the API**: Send a POST request to your deployed worker's `/api/color-journey` endpoint to verify functionality.
## Performance Benchmarks
- **WASM**: <50ms for a 100-color palette.
- **TypeScript Fallback**: <100ms for a 100-color palette.
## Troubleshooting
- **WASM Load Failures**: If WASM fails to load, the app seamlessly uses the TypeScript fallback. To enable the high-performance WASM module, run `./src/wasm/build-wasm.sh` and refresh. In your browser's developer tools, verify that `color_journey.js` and `color_journey.wasm` are fetched from `/assets/`.
- **Vite 'browserHash' Error**: This can occur if the WASM build process interferes with Vite's file watcher. The `build-wasm.sh` script automatically clears Vite's cache to prevent this. If it persists, manually run `rm -rf node_modules/.vite` and restart the dev server.
## Determinism Verification
The system is designed to be deterministic. Given the same configuration and seed, both WASM and TypeScript implementations produce identical palettes.
To verify:
1.  Generate a palette with a specific seed (e.g., 12345).
2.  Note the output colors.
3.  Temporarily disable WASM by renaming `public/assets/color_journey.wasm`.
4.  Refresh the page. The app will use the TS fallback and produce the exact same palette.
## License & Attribution
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
The core color science is based on the OKLab color space by **Björn Ottosson**, used under the MIT License. The C engine implementation is by **Peter Nicholls**.