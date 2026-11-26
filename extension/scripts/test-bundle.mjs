import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
mkdirSync('.test-dist', { recursive: true });
await build({
  entryPoints: ['src/shared/config.ts', 'src/shared/rules.ts'],
  outdir: '.test-dist',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  logLevel: 'silent',
});
console.log('test bundle ok');
