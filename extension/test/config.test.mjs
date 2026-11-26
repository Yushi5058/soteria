import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = JSON.parse(fs.readFileSync(new URL('../src/shared/config.schema.json', import.meta.url)));
const defaults = JSON.parse(fs.readFileSync(new URL('../src/shared/default-config.json', import.meta.url)));

test('default config has required top-level keys', () => {
  for (const k of schema.required) assert.ok(k in defaults, `missing ${k}`);
  assert.equal(defaults.version, 1);
  assert.ok(Array.isArray(defaults.disabledSites));
});

test('default config includes required platforms', () => {
  for (const p of ['youtube','instagram','linkedin','whatsapp','facebook','x']) {
    assert.ok(defaults.platformPresets[p], `missing platform ${p}`);
    assert.ok(Array.isArray(defaults.platformPresets[p].selectors));
  }
});

test('default custom names include starter names', () => {
  for (const n of ['Yassine','Roa','Elias']) assert.ok(defaults.customNames.includes(n));
});
