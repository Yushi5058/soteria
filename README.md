# Soteria

Soteria is a high-performance, privacy-first browser extension for **Firefox/Floorp** and **Chromium** that hides sensitive information during screen sharing. It masks PII, secrets, and social-media identity signals directly in the page DOM before they leak into calls, recordings, or demos.

## Repository

- **Primary (Codeberg)**: `ssh://git@codeberg.org/yushi_61/soteria.git`
- **Mirror (GitHub)**: `https://github.com/Yushi5058/soteria.git`

Codeberg is the default remote. Pushes to `origin` auto-mirror to GitHub (configured via multiple push URLs).

## Key features

- **Rust/WASM matching engine**: linear-time multi-pattern scanning with `aho-corasick` and `regex::RegexSet`.
- **Batched DOM scanning**: content script batches text/attribute work, debounces mutation bursts, and schedules flushes with `requestIdleCallback`/`requestAnimationFrame`.
- **Shadow DOM support**: traverses open `shadowRoot`s and scans visible attributes (`aria-label`, `title`, `alt`, `placeholder`).
- **Screen-share anti-doxxing presets**: social media selectors for YouTube, Instagram, LinkedIn, WhatsApp Web, Facebook, and X.
- **PII & secret detection**: GitHub/Stripe/AWS/Bearer/JWT/generic secrets, custom names, emails, phone numbers, addresses, postal codes, institutions/workplaces.
- **Deterministic masking**: same value maps to same scramble/random word during a session for visual consistency.
- **User-friendly config**: popup quick controls, options page category toggles, custom name/place lists, JSON import/export with validation, reset to default.
- **Cross-browser packaging**: MV3 manifest with Firefox compatibility settings; outputs `dist/` and `soteria-v1.0.0.xpi`.

## Repository layout

```text
.
├── engine/                 # Rust/WASM matching engine
├── extension/              # TypeScript extension (background/content/popup/options)
├── docs/                   # Architecture, overview, workflow
├── scripts/                # Build/package/test scripts
├── config.schema.json      # Root schema (mirrors extension schema)
└── dist/                   # Build output (generated)
```

## Install (development)

### Firefox / Floorp
1. Build: `npm run build`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...**
4. Select `dist/manifest.json` (or load packaged `soteria-v1.0.0.xpi` where supported)

### Chromium / Chrome / Edge / Brave
1. Build: `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select `dist/`

## Build from source

### Prerequisites
- Rust stable + `cargo`
- `wasm-pack` (`cargo install wasm-pack --locked`)
- Node.js 20+ and npm
- `zip` (for packaging `.xpi`/`.zip`)

### Commands

```bash
# full build (WASM + extension + dist)
npm run build

# tests
npm test

# package release artifacts
npm run package
# outputs: artifacts/soteria-v<version>.xpi, artifacts/soteria-v<version>.zip, ./soteria-v<version>.xpi
```

## Usage

1. Click the Soteria toolbar icon.
2. Enable protection and choose masking mode: **Blur**, **Scramble Letters**, or **Random Word**.
3. Toggle Social Media category/platforms for the current workflow.
4. Open **Settings** to manage categories, add custom names/places, or import/export JSON config.

## Configuration

- Schema: `config.schema.json`
- Default config: `extension/src/shared/default-config.json`
- Import/export uses schema validation and reports clear errors in Options UI.

## Security & privacy model

- Runs locally in browser; no remote exfiltration by extension code.
- Designed for screen-share anti-doxxing, not a substitute for data-loss prevention or backend redaction.
- Regex/literal detection is best-effort; validate with your own threat model.
- Host permissions are broad (`<all_urls>`) for masking coverage; use per-site disable in popup/options where not wanted.

## Development

See:
- [`docs/OVERVIEW.md`](docs/OVERVIEW.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md)
- [`docs/RELEASE.md`](docs/RELEASE.md)
- [`docs/PUBLISHING.md`](docs/PUBLISHING.md)

## License

[MIT](LICENSE)
