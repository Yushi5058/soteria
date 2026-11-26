# Release Checklist

## Pre-release
- [ ] `node scripts/check-version.mjs` passes
- [ ] `npm test` passes (engine + extension)
- [ ] `npm run build` produces `dist/`
- [ ] `npm run package` produces `artifacts/soteria-vX.Y.Z.xpi` and `.zip`
- [ ] Manual smoke test in Firefox/Floorp and Chromium

## Manual smoke matrix
- [ ] Popup: enable/disable, mode switch, platform toggles, per-site disable
- [ ] Options: category toggles, custom names/places, disabled sites, import/export invalid JSON error, reset
- [ ] Masking: API keys/JWT/Bearer, emails/phones/addresses/institutions, custom names
- [ ] Sites: YouTube, Instagram, LinkedIn, WhatsApp Web, Facebook, X
- [ ] Dynamic: SPA updates, chat/message streams, Shadow DOM components
- [ ] Disable restores original text/attributes

## Publish
- [ ] Update `CHANGELOG.md`
- [ ] Conventional commits, clean git status
- [ ] Annotated tag `vX.Y.Z`
- [ ] Attach `.xpi` and `.zip` to release
- [ ] Firefox AMO signing/upload as needed
