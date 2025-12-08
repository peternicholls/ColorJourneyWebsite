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
  -O3
# Check if the build was successful
if [[ -f "public/color_journey.js" && -f "public/color_journey.wasm" ]]; then
  echo "✅ Build complete. Output files are in public/"
else
  echo "❌ Build failed. Please check the emcc output for errors. Required files not found."
  exit 1
fi