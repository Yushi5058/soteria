import { DEFAULT_CONFIG, validateConfigShape } from '../shared/config';
import { getConfig, setConfig } from '../shared/storage';
import type { SoteriaConfig, MaskMode } from '../shared/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let config: SoteriaConfig;

async function init() {
  config = await getConfig();
  bind();
  render();
}

function bind() {
  (['apiKeys', 'personalNames', 'addressesPlaces', 'socialMedia'] as const).forEach((k) => {
    $<HTMLInputElement>(`cat-${k}`).addEventListener('change', async (e) => {
      config.categories[k].enabled = (e.target as HTMLInputElement).checked;
      await persist('Saved category settings.');
      renderPlatforms();
    });
  });
  $<HTMLSelectElement>('maskMode').addEventListener('change', async (e) => {
    config.maskMode = (e.target as HTMLSelectElement).value as MaskMode;
    await persist('Saved masking mode.');
  });
  $<HTMLButtonElement>('saveNames').addEventListener('click', async () => {
    config.customNames = parseList($<HTMLTextAreaElement>('customNames').value);
    await persist(`Saved ${config.customNames.length} custom names.`);
  });
  $<HTMLButtonElement>('savePlaces').addEventListener('click', async () => {
    config.customPlaces = parseList($<HTMLTextAreaElement>('customPlaces').value);
    await persist(`Saved ${config.customPlaces.length} custom places/institutions.`);
  });
  $<HTMLButtonElement>('saveSites').addEventListener('click', async () => {
    config.disabledSites = parseList($<HTMLTextAreaElement>('disabledSites').value).map(normalizeHost).filter(Boolean);
    await persist(`Saved ${config.disabledSites.length} disabled sites.`);
    render();
  });
  $<HTMLButtonElement>('exportBtn').addEventListener('click', exportConfig);
  $<HTMLInputElement>('importInput').addEventListener('change', importConfig);
  $<HTMLButtonElement>('resetBtn').addEventListener('click', resetDefaults);
}

function render() {
  (['apiKeys', 'personalNames', 'addressesPlaces', 'socialMedia'] as const).forEach((k) => {
    $<HTMLInputElement>(`cat-${k}`).checked = config.categories[k].enabled;
  });
  $<HTMLSelectElement>('maskMode').value = config.maskMode;
  $<HTMLTextAreaElement>('customNames').value = config.customNames.join('\n');
  $<HTMLTextAreaElement>('customPlaces').value = config.customPlaces.join('\n');
  $<HTMLTextAreaElement>('disabledSites').value = (config.disabledSites || []).join('\n');
  renderPlatforms();
}

function renderPlatforms() {
  const root = $<HTMLDivElement>('platforms');
  root.innerHTML = '';
  for (const p of Object.values(config.platformPresets)) {
    const row = document.createElement('div');
    row.className = 'platform';
    const name = document.createElement('span');
    name.textContent = p.name;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = p.enabled;
    cb.disabled = !config.categories.socialMedia.enabled;
    cb.addEventListener('change', async () => {
      config.platformPresets[p.id].enabled = cb.checked;
      await persist(`Saved ${p.name} setting.`);
    });
    row.append(name, cb);
    root.append(row);
  }
}

function parseList(text: string): string[] {
  return [...new Set(text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
}

function normalizeHost(v: string): string {
  const s = v.trim().toLowerCase();
  if (!s) return '';
  try {
    const url = s.includes('://') ? new URL(s) : new URL('https://' + s);
    return url.hostname.toLowerCase();
  } catch {
    return s.replace(/^\.+|\.+$/g, '');
  }
}

async function persist(msg: string) {
  await setConfig(config);
  setStatus(msg);
}

function setStatus(msg: string) {
  $<HTMLDivElement>('status').textContent = msg;
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'soteria-config.json';
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Exported config JSON.');
}

async function importConfig(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const res = validateConfigShape(parsed);
    if (!res.ok) {
      setStatus('Import failed:\n- ' + res.errors.join('\n- '));
      return;
    }
    config = res.config;
    await setConfig(config);
    render();
    setStatus('Imported config successfully.');
  } catch (err: any) {
    setStatus('Import failed: invalid JSON.\n' + (err?.message || String(err)));
  } finally {
    input.value = '';
  }
}

async function resetDefaults() {
  config = structuredClone(DEFAULT_CONFIG);
  await setConfig(config);
  render();
  setStatus('Reset to default config.');
}

void init();
