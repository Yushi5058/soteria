import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesSrc = fs.readFileSync(new URL('../src/shared/rules.ts', import.meta.url), 'utf8');

test('builtin rules include key secret patterns', () => {
  for (const token of ['gh[pousr]_', 'sk_live_', 'Bearer', 'AKIA', 'eyJ']) {
    assert.ok(rulesSrc.includes(token), `missing ${token}`);
  }
});

test('rules builder covers custom names and places', () => {
  assert.ok(rulesSrc.includes('customNames'));
  assert.ok(rulesSrc.includes('customPlaces'));
});
