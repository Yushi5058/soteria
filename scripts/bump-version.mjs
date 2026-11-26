import fs from 'node:fs';
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) {
  console.error('usage: node scripts/bump-version.mjs X.Y.Z');
  process.exit(1);
}
for (const p of ['package.json', 'extension/package.json']) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8')); j.version = v; fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}
const mPath = 'extension/src/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8')); m.version = v; fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
const cPath = 'engine/Cargo.toml';
let c = fs.readFileSync(cPath, 'utf8');
c = c.replace(/^version\s*=\s*"[^"]+"/m, `version = "${v}"`);
fs.writeFileSync(cPath, c);
console.log('bumped to', v);
