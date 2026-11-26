import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfigShape, normalizeConfig, DEFAULT_CONFIG } from '../.test-dist/config.js';
import { buildActiveRules } from '../.test-dist/rules.js';

test('validateConfigShape rejects malformed config', () => {
  const res = validateConfigShape({ version: 2, enabled: 'yes' });
  assert.equal(res.ok, false);
  assert.ok(res.errors.length > 0);
});

test('validateConfigShape accepts and normalizes valid config', () => {
  const res = validateConfigShape({
    ...structuredClone(DEFAULT_CONFIG),
    customNames: [' Alice ', 'Alice', 'Bob'],
    disabledSites: ['example.com'],
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.config.customNames, ['Alice', 'Bob']);
  assert.deepEqual(res.config.disabledSites, ['example.com']);
});

test('normalizeConfig applies defaults for missing fields', () => {
  const cfg = normalizeConfig({ enabled: false });
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.version, 1);
  assert.equal(cfg.maskMode, DEFAULT_CONFIG.maskMode);
  assert.ok(Array.isArray(cfg.disabledSites));
});

test('buildActiveRules includes custom names/places and dedupes', () => {
  const cfg = structuredClone(DEFAULT_CONFIG);
  cfg.customNames = ['Yassine', 'Yassine'];
  cfg.customPlaces = ['Acme University'];
  const rules = buildActiveRules(cfg);
  const nameRules = rules.filter((r) => r.id.startsWith('name:'));
  assert.equal(nameRules.filter((r) => r.id === 'name:yassine').length, 1);
  assert.ok(rules.some((r) => r.id === 'place:acme university'));
});
