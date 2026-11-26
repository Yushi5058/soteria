# Firefox / AMO Submission

## Build

```bash
npm run release
npx -y web-ext lint --source-dir=dist
```

## Expected web-ext warnings

- **BACKGROUND_SERVICE_WORKER_IGNORED**: intentional cross-browser manifest. Chrome uses `background.service_worker`; Firefox uses `background.scripts`. Keep both.
- **UNSAFE_VAR_ASSIGNMENT** on `content.js` dynamic import: required to load wasm-pack web glue from extension URL at runtime. URL is derived from `chrome.runtime.getURL('wasm/')` (extension-controlled), not user input.

## AMO checklist

- [ ] `browser_specific_settings.gecko.id` stable: `soteria@yushi.dev`
- [ ] `data_collection_permissions.required = ["none"]` present
- [ ] `strict_min_version` set (140.0+ for data collection key)
- [ ] Privacy policy/description: local-only processing, no data transmission
- [ ] Upload `artifacts/soteria-vX.Y.Z.zip`
- [ ] If AMO requests source: provide repo URL/commit and build instructions (`npm run build`)

## Live testing

1. `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `dist/manifest.json`
2. Test on real WhatsApp Web, LinkedIn, YouTube.
3. Verify options: custom names case-insensitive, disabled/allowed sites, import/export.
