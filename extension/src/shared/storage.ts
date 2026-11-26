import { DEFAULT_CONFIG, STORAGE_KEY, normalizeConfig } from './config';
import type { SoteriaConfig } from './types';

const api: typeof chrome | undefined = (globalThis as any).chrome;

export async function getConfig(): Promise<SoteriaConfig> {
  if (!api?.storage?.local) return structuredClone(DEFAULT_CONFIG);
  const raw = await api.storage.local.get(STORAGE_KEY);
  return normalizeConfig(raw[STORAGE_KEY]);
}

export async function setConfig(config: SoteriaConfig): Promise<void> {
  if (!api?.storage?.local) return;
  await api.storage.local.set({ [STORAGE_KEY]: config });
}

export async function updateConfig(patch: Partial<SoteriaConfig>): Promise<SoteriaConfig> {
  const current = await getConfig();
  const next = normalizeConfig({ ...current, ...patch, categories: { ...current.categories, ...patch.categories }, platformPresets: { ...current.platformPresets, ...patch.platformPresets } });
  await setConfig(next);
  return next;
}

export function observeConfig(cb: (config: SoteriaConfig) => void): () => void {
  if (!api?.storage?.onChanged) return () => {};
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    cb(normalizeConfig(changes[STORAGE_KEY].newValue));
  };
  api.storage.onChanged.addListener(listener);
  return () => api.storage.onChanged.removeListener(listener);
}
