import { getConfig, setConfig } from '../shared/storage';
import type { SoteriaConfig, MaskMode } from '../shared/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enabled = $<HTMLInputElement>('enabled');
const maskMode = $<HTMLSelectElement>('maskMode');
const catSocial = $<HTMLInputElement>('cat-socialMedia');
const platforms = $<HTMLDivElement>('platforms');
const openOptions = $<HTMLButtonElement>('openOptions');
const status = $<HTMLSpanElement>('status');

let config: SoteriaConfig;

async function init() {
  config = await getConfig();
  render();
  enabled.addEventListener('change', async () => {
    config.enabled = enabled.checked;
    await save('Saved');
  });
  maskMode.addEventListener('change', async () => {
    config.maskMode = maskMode.value as MaskMode;
    await save('Saved');
  });
  catSocial.addEventListener('change', async () => {
    config.categories.socialMedia.enabled = catSocial.checked;
    await save('Saved');
    renderPlatforms();
  });
  openOptions.addEventListener('click', () => (globalThis as any).chrome.runtime.openOptionsPage());
}

function render() {
  enabled.checked = config.enabled;
  maskMode.value = config.maskMode;
  catSocial.checked = config.categories.socialMedia.enabled;
  renderPlatforms();
}

function renderPlatforms() {
  platforms.innerHTML = '';
  const entries = Object.values(config.platformPresets);
  for (const p of entries) {
    const row = document.createElement('div');
    row.className = 'platform';
    const left = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = p.enabled;
    cb.disabled = !config.categories.socialMedia.enabled;
    cb.addEventListener('change', async () => {
      config.platformPresets[p.id].enabled = cb.checked;
      await save('Saved');
    });
    const span = document.createElement('span');
    span.textContent = p.name;
    left.append(cb, span);
    row.append(left);
    platforms.append(row);
  }
}

async function save(msg: string) {
  await setConfig(config);
  status.textContent = msg;
  setTimeout(() => { if (status.textContent === msg) status.textContent = ''; }, 1200);
}

void init();
