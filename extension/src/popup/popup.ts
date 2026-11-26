import { getConfig, setConfig } from '../shared/storage';
import type { SoteriaConfig, MaskMode } from '../shared/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enabled = $<HTMLInputElement>('enabled');
const maskMode = $<HTMLSelectElement>('maskMode');
const catSocial = $<HTMLInputElement>('cat-socialMedia');
const platforms = $<HTMLDivElement>('platforms');
const openOptions = $<HTMLButtonElement>('openOptions');
const status = $<HTMLSpanElement>('status');
const siteToggle = $<HTMLButtonElement>('siteToggle');
const siteHost = $<HTMLParagraphElement>('siteHost');

let config: SoteriaConfig;
let currentHost = '';

async function init() {
  config = await getConfig();
  await resolveHost();
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
  siteToggle.addEventListener('click', async () => {
    if (!currentHost) return;
    if ((config.siteMode || 'blocklist') === 'allowlist') {
      const set = new Set(config.allowedSites || []);
      if (set.has(currentHost)) { set.delete(currentHost); await save('Removed from allowlist'); }
      else { set.add(currentHost); await save('Added to allowlist'); }
      config.allowedSites = [...set];
    } else {
      const set = new Set(config.disabledSites || []);
      if (set.has(currentHost)) { set.delete(currentHost); await save('Enabled on site'); }
      else { set.add(currentHost); await save('Disabled on site'); }
      config.disabledSites = [...set];
    }
    await setConfig(config);
    renderSite();
  });
  openOptions.addEventListener('click', () => (globalThis as any).chrome.runtime.openOptionsPage());
}

async function resolveHost() {
  try {
    const api = (globalThis as any).chrome;
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || '');
    currentHost = url.hostname || '';
  } catch { currentHost = ''; }
}

function render() {
  enabled.checked = config.enabled;
  maskMode.value = config.maskMode;
  catSocial.checked = config.categories.socialMedia.enabled;
  renderPlatforms();
  renderSite();
}

function renderSite() {
  siteHost.textContent = currentHost || 'No active site';
  const mode = config.siteMode || 'blocklist';
  if (!currentHost) { siteToggle.textContent = 'Unavailable'; siteToggle.disabled = true; return; }
  if (mode === 'allowlist') {
    const allowed = (config.allowedSites || []).includes(currentHost);
    siteToggle.textContent = allowed ? 'Remove from allowlist' : 'Allow this site';
  } else {
    const disabled = (config.disabledSites || []).includes(currentHost);
    siteToggle.textContent = disabled ? 'Enable here' : 'Disable here';
  }
  siteToggle.disabled = false;
}

function renderPlatforms() {
  platforms.replaceChildren();
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
