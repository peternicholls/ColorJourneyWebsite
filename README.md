# Color Journey — OKLab Palette Engine
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})
[cloudflarebutton]
Color Journey is a portable, OKLab-first color generation engine and interactive playground that produces designer-quality, perceptually-aware color sequences for timelines, tracks, sections, labels, and UI accents. The core algorithms are implemented in portable C (compiled to WASM for web delivery), with a robust TypeScript runtime fallback. It exposes composable configuration for routes, dynamics, granularity, looping, and optional variation, supporting both continuous (t → Color) and discrete (N-step) palette generation. The UI is a polished, shadcn/ui-based playground with controls, live previews, and exports.
## Features
- **OKLab-Based Color Processing**: Operates in perceptually uniform OKLab space for stable lightness, chroma, and contrast.
- **High-Performance C Core**: Core logic written in C and compiled to WebAssembly for near-native performance in the browser and on the edge.
- **Graceful Fallback**: A complete TypeScript implementation serves as an immediate fallback if WASM fails to load.
- **Journey Routes**: Single or multi-anchor (2–5) color paths with designed non-linear pacing and easing curves.
- **Perceptual Dynamics**: High-level controls for lightness bias, chroma multiplier, contrast enforcement (minimum OKLab ΔE), and more.
- **Granularity Modes**: Continuous gradients or discrete quantized palettes with patterned reuse for large sets.
- **Seeded Variation Layer**: Optional subtle, structured perturbations for an organic feel, with deterministic outputs via a seed.
- **Interactive Playground**: Real-time previews, diagnostics (ΔE metrics), presets, and exports (CSS variables, JSON).
- **Edge API**: Cloudflare Worker endpoint for server-side generation, ensuring consistent results across platforms.
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
    ./build-wasm.sh
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
## Building the C Core (WebAssembly)
The portable C implementation handles all core logic. Sources are in `/src/wasm/`.
### Build Script (`build-wasm.sh`)
A convenience script is provided to simplify compilation.
```bash
#!/bin/bash
# build-wasm.sh
# Ensure Emscripten SDK is active in your environment
if ! command -v emcc &> /dev/null
then
    echo "emcc command not found. Please install and activate the Emscripten SDK."
    exit
fi
echo "Building Color Journey WASM module..."
emcc src/wasm/oklab.c src/wasm/color_journey.c \
  -o public/assets/color_journey.js \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s USE_ES6_IMPORT_META=0 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
  -s EXPORTED_FUNCTIONS='["_generate_discrete_palette", "_wasm_malloc", "_wasm_free"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O3
echo "✅ Build complete. Output files are in public/assets/"
```
### Manual Compilation
You can also run the `emcc` command directly:
```bash
emcc src/wasm/oklab.c src/wasm/color_journey.c \
  -o public/assets/color_journey.js \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s USE_ES6_IMPORT_META=0 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
  -s EXPORTED_FUNCTIONS='["_generate_discrete_palette", "_wasm_malloc", "_wasm_free"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O3
```
## Deployment
Deploy to Cloudflare Workers for an edge-hosted playground and API.
1.  Build the WASM module:
    ```bash
    ./build-wasm.sh
    ```
2.  Build the frontend application:
    ```bash
    bun build
    ```
3.  Deploy via Wrangler:
    ```bash
    bunx wrangler deploy
    ```
    Wrangler automatically bundles all static assets from the output directory (including the `.wasm` file) and the Worker script.
[cloudflarebutton]