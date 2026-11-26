# Soteria Overview

## Vision

Soteria protects users during screen sharing by automatically masking sensitive information in web pages. It targets real-time collaboration scenarios: demos, support calls, livestreams, recordings, and meetings where private data can leak through browser tabs.

## Threat model (screen-share anti-doxxing)

### In scope
- Accidental exposure of personal names, handles, DMs/chat participant names, profile labels.
- Exposure of addresses, schools/universities, workplaces, institutions, and location clues.
- Exposure of secrets/tokens visible in dashboards, logs, admin panels, or devtools-adjacent web UIs.
- Dynamic SPA updates where sensitive text appears after initial load.
- Social/contact surfaces where names/phone numbers appear (e.g. WhatsApp chat headers, contact info, group participant labels), including unknown contacts.
- Profile imagery (best-effort heuristic blur for likely avatar/profile photos).

### Out of scope / limitations
- Native apps outside browser.
- Canvas-rendered text, images/video OCR, or audio.
- Encrypted/obfuscated content not present as DOM text/attributes.
- Guaranteed detection of all PII/secrets; rules are best-effort and configurable.

## Core capabilities

- **High-performance matching**: Rust/WASM engine with Aho-Corasick + RegexSet for linear-time multi-pattern scans.
- **DOM-safe masking**: batch processing, MutationObserver debouncing, weak-set tracking, skip script/style/noscript and masked nodes.
- **Modern web coverage**: open Shadow DOM traversal and attribute scanning.
- **Configurable privacy**: category toggles, custom names/places, custom rules, per-platform social media presets.
- **Friendly UX**: popup quick controls and options page with JSON import/export + validation.

## Feature roadmap

- v1.0.0: core engine, social presets, popup/options, docs, packaging.
- v1.1.x: site-specific rule packs, per-domain allow/deny lists, better selector heuristics, stronger name/phone heuristics.
- v1.2.x: optional OCR/canvas hooks (explicit opt-in), enterprise policy export, audit log.
- v2.x: browser-native ML-assisted entity detection (local-only), synced profiles.

## Notes

- Custom name matching is case-insensitive.
- Phone/profile heuristics are best-effort; false positives/negatives possible. Tune selectors/rules in `extension/src/shared/`.
