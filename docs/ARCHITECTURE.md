# Soteria Architecture

## High-level pipeline

```text
DOM mutations/text/attributes
        │
        ▼
Content Script (TS)
  - MutationObserver collects nodes
  - debounce + requestIdleCallback/requestAnimationFrame
  - Shadow DOM traversal
  - attribute scan: aria-label/title/alt/placeholder
  - WeakSet/WeakMap dedupe
        │  batched ScanInput[]
        ▼
WASM Engine (Rust)
  - Aho-Corasick for literal/custom names/places
  - RegexSet for regex rules (secrets, addresses, institutions)
  - deterministic scramble/random-word mapping (session-stable)
        │  ScanResult[] with replacements
        ▼
DOM Applier (TS)
  - replace text ranges with <span.soteria-mask>
  - mode: blur / scramble / random-word
  - preserve originals in data attributes for disable/reset restore
```

## Rust/WASM engine (`/engine`)

- Crate: `soteria-engine`, built via `wasm-pack --target web`.
- Dependencies: `regex`, `aho-corasick`, `serde/serde_json`, `wasm-bindgen`.
- API:
  - `init_engine(rules_json)`: compiles literal + regex rules once.
  - `scan_batch(input_json, mode)`: scans array of `{id,text}` in one WASM boundary crossing.
  - `clear_session()`: resets deterministic mapping cache.
- Matching:
  - Literals use case-insensitive Aho-Corasick automaton.
  - Regex rules compiled individually and filtered through `RegexSet` for fast candidate selection.
  - Overlaps resolved by earliest/longest match policy.
- Deterministic masking:
  - FNV-1a hash + session `HashMap` cache.
  - Random-word mode maps to fixed word list; scramble mode deterministically permutes alphabetic chars while preserving punctuation/case shape.

## TypeScript DOM layer (`/extension/src/content`)

- `MutationObserver` watches `childList`, `characterData`, `attributes`.
- Debounce 50ms, then idle/frame flush to avoid blocking main thread during SPA bursts.
- Batched scan payload: collects changed text nodes + attrs and also targeted platform selectors.
- Skips: `SCRIPT, STYLE, NOSCRIPT, TEXTAREA, INPUT, OPTION`, already masked nodes.
- Shadow DOM: recurses into `element.shadowRoot` when open.
- Unmask/restore: stores original text in `data-soteria-original` and original attr values in WeakMap; full restore on disable/config reset requiring remask.

## Config & rules

- Schema: `config.schema.json` / `extension/src/shared/config.schema.json`.
- Categories: `apiKeys`, `personalNames`, `addressesPlaces`, `socialMedia`.
- Built-ins in `extension/src/shared/rules.ts`; custom names/places compiled as escaped regex/literals.
- Platform presets in default config with host-pattern gating.

## Performance considerations

- Single WASM call per flush batch.
- Dedup via `WeakSet<Text>` and processed attribute sets.
- Minimal DOM writes: only matched ranges replaced.
- Deterministic cache avoids re-generating masks.
- Release profile: `opt-level=s`, `lto=true`, `codegen-units=1`.

## Security notes

- No network calls for scanning/masking.
- Config stored in `chrome.storage.local`.
- Import validation prevents malformed config from breaking runtime.
