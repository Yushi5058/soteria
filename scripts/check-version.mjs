import fs from 'node:fs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pkg = readJson('package.json');
const extPkg = readJson('extension/package.json');
const manifest = readJson('extension/src/manifest.json');
const cargo = fs.readFileSync('engine/Cargo.toml', 'utf8');
const cargoMatch = cargo.match(/^version\s*=\s*"([^"]+)"/m);
const cargoVersion = cargoMatch?.[1];
const versions = {
  'package.json': pkg.version,
  'extension/package.json': extPkg.version,
  'extension/src/manifest.json': manifest.version,
  'engine/Cargo.toml': cargoVersion,
};
const all = Object.entries(versions);
const expected = pkg.version;
const bad = all.filter(([, v]) => v !== expected);
if (bad.length) {
  console.error('Version mismatch:');
  for (const [k, v] of all) console.error(`- ${k}: ${v}`);
  process.exit(1);
}
console.log(`version ok: ${expected}`);
