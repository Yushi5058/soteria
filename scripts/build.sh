#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[soteria] building WASM engine"
if command -v wasm-pack >/dev/null 2>&1; then
  (cd engine && wasm-pack build --target web --out-dir ../extension/src/wasm/pkg --release)
else
  echo "wasm-pack not found; attempting cargo build + wasm-bindgen fallback"
  rustup target add wasm32-unknown-unknown >/dev/null
  (cd engine && cargo build --release --target wasm32-unknown-unknown)
  mkdir -p extension/src/wasm/pkg
  if command -v wasm-bindgen >/dev/null 2>&1; then
    wasm-bindgen --target web --out-dir extension/src/wasm/pkg engine/target/wasm32-unknown-unknown/release/soteria_engine.wasm
  else
    echo "Missing wasm-bindgen CLI for fallback. Install wasm-pack or wasm-bindgen-cli." >&2
    exit 1
  fi
fi

echo "[soteria] building extension"
(cd extension && npm install)
(cd extension && npm run build)

echo "[soteria] assembling dist"
rm -rf dist
mkdir -p dist
cp -r extension/dist/. dist/

# normalize wasm file names expected by content script
if [ -f dist/wasm/soteria_engine_bg.wasm ] && [ ! -f dist/wasm/soteria_engine_bg.wasm ]; then :; fi

echo "[soteria] build complete -> dist/"
