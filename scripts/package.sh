#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/build.sh
mkdir -p artifacts

# xpi/zip are both zip archives; manifest is webextension-compatible
( cd dist && zip -qr ../artifacts/soteria-v1.0.0.xpi . )
( cd dist && zip -qr ../artifacts/soteria-v1.0.0.zip . )
cp artifacts/soteria-v1.0.0.xpi ./soteria-v1.0.0.xpi
echo "[soteria] packaged artifacts/soteria-v1.0.0.xpi"
