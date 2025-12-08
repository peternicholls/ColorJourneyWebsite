#!/bin/bash
# build-wasm.sh
# Ensures the Emscripten SDK is active in your environment before running.
# Check if emcc command is available
if ! command -v emcc &> /dev/null
then
    echo "emcc command not found. Please install and activate the Emscripten SDK."
    echo "See: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi
echo "Building Color Journey WASM module..."
# Create output directory if it doesn't exist
mkdir -p public/assets
# Compile C sources to a standalone WASM module
emcc src/wasm/oklab.c src/wasm/color_journey.c \
  -o public/assets/color_journey.wasm \
  -s WASM=1 \
  -s STANDALONE_WASM \
  -s EXPORTED_FUNCTIONS='["_generate_discrete_palette", "_wasm_malloc", "_wasm_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
  -O3
# Check if the build was successful
if [ -f "public/assets/color_journey.wasm" ]; then
  echo "✅ Build complete. Output files are in public/assets/"
else
  echo "❌ Build failed. Please check the emcc output for errors."
  exit 1
fi