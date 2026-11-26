# Soteria Workflow

## Development setup

```bash
# install toolchain
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked

# build everything
npm run build

# run tests
npm test
```

## Common commands

| Command | Purpose |
|---|---|
| `npm run build` | Build WASM + bundle extension to `dist/` |
| `npm run build:wasm` | Build only Rust/WASM engine |
| `npm run build:ext` | Build only extension bundle |
| `npm test` | Run Rust tests + extension tests/lint |
| `npm run package` | Build and create `soteria-v1.0.0.xpi`/zip artifacts |
| `make clean` | Remove generated outputs |

## Add a new platform/category preset

1. **Default config**: edit `extension/src/shared/default-config.json`.
   - Add platform under `platformPresets` with `id`, `name`, `enabled`, `hostPatterns`, `selectors`.
2. **Schema**: ensure schema allows structure (already supports arbitrary platform objects matching defs).
3. **UI**: popup/options auto-render from `platformPresets`; no hardcode needed except ordering preference.
4. **Selectors**: prefer stable attributes/text containers; avoid overly broad selectors that hide whole layout.
5. **Test**: load extension on platform, verify MutationObserver catches dynamic nodes and Shadow DOM where applicable.

## Add detection rules

- Built-in regex/literal rules: `extension/src/shared/rules.ts`.
- Keep patterns specific to reduce false positives.
- Use `mask: "scramble"` for secrets, `random-word` for names/places when layout readability matters.
- Add Rust tests in `engine/src/lib.rs` for engine behavior; extension tests in `extension/test/`.

## Build & packaging

`npm run package` produces:
- `artifacts/soteria-v1.0.0.xpi` (Firefox/Floorp installable archive)
- `artifacts/soteria-v1.0.0.zip` (Chromium/store/upload friendly)
- `./soteria-v1.0.0.xpi` convenience copy

## Testing checklist

- `cargo test` passes in `engine/`.
- `npm run lint` (tsc noEmit) passes in `extension/`.
- Manual smoke:
  - Toggle enable/mode in popup.
  - Verify custom name/place masking.
  - Verify API key/JWT/Bearer masking.
  - Verify social platform selectors on supported sites.
  - Import/export config; invalid JSON shows clear error.
  - Disable extension restores masked content.

## Release workflow

1. Bump version in `engine/Cargo.toml`, `package.json`, `extension/package.json`, `extension/src/manifest.json`.
2. Run `npm test && npm run package`.
3. Commit with Conventional Commits.
4. Tag annotated `vX.Y.Z`.
