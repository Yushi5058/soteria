# Publishing

## Build artifacts
- `npm run release` produces:
  - `dist/`
  - `artifacts/soteria-vX.Y.Z.xpi`
  - `artifacts/soteria-vX.Y.Z.zip`
  - `./soteria-vX.Y.Z.xpi`

## Firefox / Floorp (AMO)
1. Bump version + changelog.
2. `npm run release`.
3. Submit `artifacts/soteria-vX.Y.Z.zip` (or xpi) to AMO.
4. AMO signs package for self-distribution/listing as required.
5. Verify `browser_specific_settings.gecko.id` is stable (`soteria@yushi.dev`).

## Chromium / Chrome Web Store
1. `npm run release`.
2. Upload `artifacts/soteria-vX.Y.Z.zip` to Chrome Web Store dashboard.
3. Fill privacy disclosures: local-only processing, no remote data exfiltration by extension.
4. Review permissions justification: `storage`, `activeTab`, `tabs`, `<all_urls>` for on-page masking.

## GitHub / Codeberg release
1. Tag `vX.Y.Z` and push tag.
2. Release workflow uploads build artifacts.
3. Attach `.xpi` and `.zip`, paste changelog section.
