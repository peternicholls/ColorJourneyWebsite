#!/bin/bash
# build-wasm.sh
# Ensures the Emscripten SDK is active in your environment before running.
# This script compiles the C core into a JavaScript loader and a .wasm file.
# Check if emcc command is available
if ! command -v emcc &> /dev/null
then
    echo "❌ emcc command not found. Please install and activate the Emscripten SDK."
    echo "See: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi
echo "Building Color Journey WASM module..."
# Create output directory if it doesn't exist
mkdir -p public
# Compile C sources to a JS loader + WASM file
emcc src/wasm/oklab.c src/wasm/color_journey.c \
  -o public/color_journey.js \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s USE_ES6_IMPORT_META=0 \
  -s EXPORTED_FUNCTIONS='["_generate_discrete_palette", "_wasm_malloc", "_wasm_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O3
# Check if the build was successful and files have a reasonable size
JS_SIZE=$(stat -c%s public/color_journey.js 2>/dev/null || echo 0)
WASM_SIZE=$(stat -c%s public/color_journey.wasm 2>/dev/null || echo 0)
if [[ $JS_SIZE -lt 10240 || $WASM_SIZE -lt 51200 ]]; then
  echo "❌ Build incomplete: Files are too small or missing."
  echo "   - JS size: $JS_SIZE bytes (expected >10KB)"
  echo "   - WASM size: $WASM_SIZE bytes (expected >50KB)"
  echo "   Ensure Emscripten SDK is active: run 'source ./emsdk_env.sh' in your emsdk directory."
  exit 1
fi
echo "✅ WASM built successfully:"
echo "   - public/color_journey.js ($(du -h public/color_journey.js | cut -f1))"
echo "   - public/color_journey.wasm ($(du -h public/color_journey.wasm | cut -f1))"