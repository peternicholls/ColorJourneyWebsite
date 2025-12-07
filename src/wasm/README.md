# Color Journey C Core & WebAssembly Build Guide
This document outlines the process for compiling the C core of the Color Journey engine into a WebAssembly (`.wasm`) module for use in the browser and on Cloudflare Workers.
## Phase 2 Goal
The objective is to replace the TypeScript fallback implementation in `src/lib/color-journey/index.ts` with a high-performance, portable C implementation compiled to WASM. The public JavaScript API exposed by the wrapper must remain identical.
## Build Toolchain
We recommend using the **Emscripten SDK (emsdk)** for compiling C to WASM, as it provides robust tooling and JS glue code generation.
1.  **Install Emscripten:**
    Follow the official instructions at https://emscripten.org/docs/getting_started/downloads.html
2.  **Activate the SDK:**
    ```bash
    # Navigate to your emsdk directory
    ./emsdk activate latest
    source ./emsdk_env.sh
    ```
## Compilation Command
The following command compiles `color_journey.c` into a `.wasm` file and a JavaScript loader (`.js`) file.
```bash
emcc src/wasm/color_journey.c \
  -o public/assets/color_journey.js \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s USE_ES6_IMPORT_META=0 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
  -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_generate_discrete_palette"]' \
  -O3
```
**Command Breakdown:**
-   `emcc ...`: The Emscripten compiler.
-   `-o public/assets/color_journey.js`: The output path. The app expects to find `color_journey.wasm` and its loader in `/assets/`. **Note:** The template uses `public` directory for static assets.
-   `-s WASM=1`: Ensures WASM output.
-   `-s MODULARIZE=1`, `-s EXPORT_ES6=1`: Wraps the output in a modern ES6 module.
-   `-s EXPORTED_RUNTIME_METHODS='["cwrap"]'`: Exports the `cwrap` function, which is essential for creating a typed JS wrapper around a C function.
-   `-s EXPORTED_FUNCTIONS='...'`: A list of C functions to expose to the JavaScript environment. `_malloc` and `_free` are needed for memory management.
-   `-O3`: Aggressive optimization level for performance.
## C API Contract
The C code must expose a function with the following signature. This function will receive a configuration object, allocate memory for the output palette, and return a pointer to it.
**`color_journey.c`:**
```c
#include <stdint.h>
// Expected input structure (packed for consistency)
typedef struct {
    // ... fields matching ColorJourneyConfig ...
    double lightness;
    double chroma;
    // ... etc.
    uint32_t seed;
    int num_colors;
    int num_anchors;
} CJ_Config;
// Output structure
typedef struct {
    double l, a, b; // OKLab values
    uint8_t r, g, b; // sRGB values
} CJ_ColorPoint;
/**
 * @brief Generates a discrete color palette.
 * @param config Pointer to the configuration struct.
 * @param anchors Pointer to an array of anchor colors (e.g., packed RGB floats).
 * @return A pointer to an array of CJ_ColorPoint structs. The caller in JS is responsible for freeing this memory.
 *         The first element of the array contains metadata (e.g., palette size).
 */
CJ_ColorPoint* generate_discrete_palette(CJ_Config* config, double* anchors);
```
## JavaScript Integration
The `src/lib/color-journey/index.ts` wrapper will be responsible for:
1.  Loading the WASM module.
2.  Using `cwrap` to create a type-safe JavaScript function that calls `_generate_discrete_palette`.
3.  Allocating memory in the WASM heap for the `config` and `anchors` using `_malloc`.
4.  Copying the configuration data from the JS object into the allocated WASM memory.
5.  Calling the wrapped C function.
6.  Reading the resulting `CJ_ColorPoint` array from the WASM heap.
7.  Freeing the allocated memory using `_free`.
8.  Formatting the data into the `GenerateResult` object.
**Example JS Snippet:**
```typescript
// Inside src/lib/color-journey/index.ts after loading the module
const wasmApi = {
  generate: Module.cwrap('generate_discrete_palette', 'number', ['number', 'number']),
  malloc: Module._malloc,
  free: Module._free,
};
// ... inside the generate function ...
// 1. Allocate memory
const configPtr = wasmApi.malloc(configSize);
const anchorsPtr = wasmApi.malloc(anchorsSize);
// 2. Write data to WASM memory
// Module.HEAPF64.set(...) or similar
// 3. Call C function
const resultPtr = wasmApi.generate(configPtr, anchorsPtr);
// 4. Read data from resultPtr
// new Float64Array(Module.HEAPF64.buffer, resultPtr, numColors * 6)
// 5. Free memory
wasmApi.free(configPtr);
wasmApi.free(anchorsPtr);
wasmApi.free(resultPtr);