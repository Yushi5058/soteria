#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(node -p "require('./package.json').version")}"
XPI="artifacts/soteria-v${VERSION}.xpi"
ZIP="artifacts/soteria-v${VERSION}.zip"

bash scripts/build.sh
mkdir -p artifacts

package_zip() {
  local out="$1"
  local abs="$ROOT/$out"
  rm -f "$abs"
  if command -v zip >/dev/null 2>&1; then
    (cd dist && zip -qr "$abs" .)
  elif command -v 7z >/dev/null 2>&1; then
    (cd dist && 7z a -tzip -mx=9 "$abs" . >/dev/null)
  elif command -v 7za >/dev/null 2>&1; then
    (cd dist && 7za a -tzip -mx=9 "$abs" . >/dev/null)
  elif command -v 7zz >/dev/null 2>&1; then
    (cd dist && 7zz a -tzip -mx=9 "$abs" . >/dev/null)
  elif command -v bsdtar >/dev/null 2>&1; then
    bsdtar --format=zip -cf "$abs" -C dist .
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$abs" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk('dist'):
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, 'dist'))
PY
  else
    echo "[soteria] no archiver found (zip/7z/7za/7zz/bsdtar/python3)" >&2
    exit 1
  fi
}

package_zip "$XPI"
package_zip "$ZIP"
cp "$XPI" "./soteria-v${VERSION}.xpi"
echo "[soteria] packaged $XPI"
