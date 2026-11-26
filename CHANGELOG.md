# Changelog

## 1.0.0 - 2026-11-26

### Added
- Rust/WASM matching engine with Aho-Corasick + RegexSet batched scanning.
- Deterministic scramble/random-word masking for consistent session redaction.
- Content script with MutationObserver batching, open Shadow DOM traversal, and attribute scanning.
- Social media presets for YouTube, Instagram, LinkedIn, WhatsApp Web, Facebook, X.
- PII/secret rules: API keys, tokens, JWT/Bearer, emails, phones, addresses, institutions, custom names/places.
- Popup quick controls and options page with category toggles, custom lists, JSON import/export validation, reset.
- Per-site disable controls (popup + options) and disabledSites config.
- Build/package scripts with zip/7z/bsdtar/python fallback, docs, and CI workflow.
