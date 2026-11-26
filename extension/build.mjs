import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const dist = path.join(root, 'dist');
const src = path.join(root, 'src');

async function copyStatic() {
  await mkdir(dist, { recursive: true });
  await mkdir(path.join(dist, 'popup'), { recursive: true });
  await mkdir(path.join(dist, 'options'), { recursive: true });
  await mkdir(path.join(dist, 'assets'), { recursive: true });
  await mkdir(path.join(dist, 'wasm'), { recursive: true });

  const manifest = JSON.parse(await readFile(path.join(src, 'manifest.json'), 'utf8'));
  await writeFile(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

  for (const [from, to] of [
    [path.join(src, 'popup/popup.html'), path.join(dist, 'popup/popup.html')],
    [path.join(src, 'popup/popup.css'), path.join(dist, 'popup/popup.css')],
    [path.join(src, 'options/options.html'), path.join(dist, 'options/options.html')],
    [path.join(src, 'options/options.css'), path.join(dist, 'options/options.css')],
    [path.join(src, 'styles/content.css'), path.join(dist, 'content.css')],
  ]) {
    if (existsSync(from)) await cp(from, to);
  }

  const assetsDir = path.join(src, 'assets');
  if (existsSync(assetsDir)) await cp(assetsDir, path.join(dist, 'assets'), { recursive: true });

  const wasmPkg = path.join(src, 'wasm/pkg');
  if (existsSync(wasmPkg)) {
    await cp(wasmPkg, path.join(dist, 'wasm'), { recursive: true });
  }

  const schemaSrc = path.join(src, 'shared/config.schema.json');
  if (existsSync(schemaSrc)) await cp(schemaSrc, path.join(dist, 'config.schema.json'));

  const defaultSrc = path.join(src, 'shared/default-config.json');
  if (existsSync(defaultSrc)) await cp(defaultSrc, path.join(dist, 'default-config.json'));
}

const common = {
  bundle: true,
  format: 'esm',
  target: ['chrome114', 'firefox115'],
  sourcemap: false,
  logLevel: 'info',
};

async function run() {
  await rm(dist, { recursive: true, force: true });
  await copyStatic();
  await build({
    ...common,
    entryPoints: [path.join(src, 'background/background.ts')],
    outfile: path.join(dist, 'background.js'),
  });
  await build({
    ...common,
    entryPoints: [path.join(src, 'content/content.ts')],
    outfile: path.join(dist, 'content.js'),
  });
  await build({
    ...common,
    entryPoints: [path.join(src, 'popup/popup.ts')],
    outfile: path.join(dist, 'popup/popup.js'),
  });
  await build({
    ...common,
    entryPoints: [path.join(src, 'options/options.ts')],
    outfile: path.join(dist, 'options/options.js'),
  });
  console.log('extension build complete');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
