# Color Journey Palette Engine
*using the OKLab color space, based on Björn Ottosson's work (MIT License)*
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})
[cloudflarebutton]
Color Journey is a portable, OKLab-first color generation engine and interactive playground that produces designer-quality, perceptually-aware color sequences for timelines, tracks, sections, labels, and UI accents. The core algorithms are implemented in portable C (compiled to WASM for web delivery), with a robust TypeScript runtime fallback. It exposes composable configuration for routes, dynamics, granularity, looping, and optional variation, supporting both continuous (t → Color) and discrete (N-step) palette generation. The UI is a polished, shadcn/ui-based playground with controls, live previews, and exports.
## Features
- **OKLab-Based Color Processing**: Operates in perceptually uniform OKLab space for stable lightness, chroma, and contrast, with perceptual guarantees including minimum ΔE enforcement for distinctness and midpoint vibrancy boosts to avoid muddy tones.
- **High-Performance C Core**: Core logic written in C and compiled to WebAssembly for near-native performance in the browser and on the edge.
- **Graceful Fallback**: A complete TypeScript implementation serves as an immediate fallback if WASM fails to load.
- **Journey Routes**: Single or multi-anchor (2–5) color paths with designed non-linear pacing and easing curves to create curated, not mechanical, journeys.
- **Perceptual Dynamics**: High-level controls for lightness bias, chroma multiplier, contrast enforcement (minimum OKLab ΔE), and more.
- **Perceptual Enforcement**: Iterative ΔE nudges ensure minimum color separation with adaptive reuse for large palettes.
- **Advanced Dynamics**: Bezier curves for path shaping, preset biases, and midpoint vibrancy boosts.
- **Granularity Modes**: Continuous gradients or discrete quantized palettes with patterned reuse for large sets.
- **Seeded Variation Layer**: Optional subtle, structured perturbations for an organic feel, with deterministic outputs via a seed.
- **Interactive Playground**: Real-time previews, diagnostics (ΔE metrics, WCAG contrast), presets, and exports (CSS variables, JSON).
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
## Building the C Core (WebAssembly)
### Build Script (`src/wasm/build-wasm.sh`)
A convenience script is provided to simplify compilation. Run `./src/wasm/build-wasm.sh` after activating the Emscripten SDK. This generates both the `color_journey.js` loader and the `color_journey.wasm` binary.
### Troubleshooting WASM
- **Build Fails**: Ensure the Emscripten SDK is correctly installed and activated in your current shell session (`emcc` command should be available).
- **Loading Fails in Browser**: Open your browser's developer tools. In the Network tab, check if `color_journey.js` and `color_journey.wasm` are successfully fetched from `/assets/`. A 404 error means the files are not being served correctly by Vite. Ensure they exist in the `public/assets/` directory. The application will automatically use the TypeScript implementation if the WASM module cannot be loaded.
### Performance Testing
Open the developer console in your browser. When you adjust parameters, a `wasm-gen` timer will log the time taken to generate the palette. With the WASM module loaded, generating a 100-color palette should consistently take **<50ms**.
### Determinism
The system is designed to be deterministic. Given the same configuration object and seed, both the WASM and TypeScript implementations are verified to produce identical palettes. You can verify this by running the app, noting a generated palette, then disabling WASM (e.g., by renaming the file) and refreshing to see the TS fallback produce the same result.
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
[cloudflarebutton]
---
**Copyright © 2025 Peter Nicholls.** This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.