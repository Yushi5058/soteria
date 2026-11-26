import defaultConfigRaw from './default-config.json';
import type { SoteriaConfig, Rule, PlatformPreset, MaskMode } from './types';

export const STORAGE_KEY = 'soteriaConfig';
export const DEFAULT_CONFIG: SoteriaConfig = structuredClone(defaultConfigRaw as SoteriaConfig);

export function isMaskMode(v: unknown): v is MaskMode {
  return v === 'blur' || v === 'scramble' || v === 'random-word';
}

export function normalizeConfig(input: unknown): SoteriaConfig {
  const d = DEFAULT_CONFIG;
  const c = (input && typeof input === 'object') ? input as Partial<SoteriaConfig> : {};
  const cfg: SoteriaConfig = {
    version: 1,
    enabled: typeof c.enabled === 'boolean' ? c.enabled : d.enabled,
    maskMode: isMaskMode(c.maskMode) ? c.maskMode : d.maskMode,
    categories: {
      apiKeys: { enabled: c.categories?.apiKeys?.enabled ?? d.categories.apiKeys.enabled },
      personalNames: { enabled: c.categories?.personalNames?.enabled ?? d.categories.personalNames.enabled },
      addressesPlaces: { enabled: c.categories?.addressesPlaces?.enabled ?? d.categories.addressesPlaces.enabled },
      socialMedia: { enabled: c.categories?.socialMedia?.enabled ?? d.categories.socialMedia.enabled },
    },
    customNames: sanitizeStringArray(c.customNames, d.customNames),
    customPlaces: sanitizeStringArray(c.customPlaces, d.customPlaces),
    customPatterns: sanitizeRules(c.customPatterns),
    platformPresets: sanitizePlatforms(c.platformPresets, d.platformPresets),
  };
  return cfg;
}

function sanitizeStringArray(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return [...fallback];
  const out = v.map((x) => String(x).trim()).filter(Boolean);
  return [...new Set(out)];
}

function sanitizeRules(v: unknown): Rule[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r, i) => {
    if (!r || typeof r !== 'object') return [];
    const rr = r as Partial<Rule>;
    if (!rr.pattern || !String(rr.pattern).trim()) return [];
    const rule: Rule = {
      id: String(rr.id || `custom-${i}`),
      category: String(rr.category || 'custom'),
      pattern: String(rr.pattern),
      literal: Boolean(rr.literal),
      caseInsensitive: rr.caseInsensitive !== false,
      mask: (rr.mask === 'blur' || rr.mask === 'scramble' || rr.mask === 'random-word' || rr.mask === 'inherit') ? rr.mask : 'inherit',
      description: rr.description ? String(rr.description) : undefined,
    };
    return [rule];
  });
}

function sanitizePlatforms(v: unknown, fallback: Record<string, PlatformPreset>): Record<string, PlatformPreset> {
  const base = structuredClone(fallback);
  if (!v || typeof v !== 'object') return base;
  const obj = v as Record<string, any>;
  for (const [k, p] of Object.entries(obj)) {
    if (!p || typeof p !== 'object') continue;
    base[k] = {
      id: String(p.id || k),
      name: String(p.name || base[k]?.name || k),
      enabled: typeof p.enabled === 'boolean' ? p.enabled : (base[k]?.enabled ?? true),
      hostPatterns: sanitizeStringArray(p.hostPatterns, base[k]?.hostPatterns ?? []),
      selectors: sanitizeStringArray(p.selectors, base[k]?.selectors ?? []),
    };
  }
  return base;
}

export function validateConfigShape(input: unknown): { ok: true; config: SoteriaConfig } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['Config must be a JSON object'] };
  const c = input as any;
  if (c.version !== 1) errors.push('version must be 1');
  if (typeof c.enabled !== 'boolean') errors.push('enabled must be boolean');
  if (!isMaskMode(c.maskMode)) errors.push('maskMode must be blur|scramble|random-word');
  const cats = ['apiKeys', 'personalNames', 'addressesPlaces', 'socialMedia'];
  if (!c.categories || typeof c.categories !== 'object') errors.push('categories must be object');
  for (const k of cats) {
    if (typeof c.categories?.[k]?.enabled !== 'boolean') errors.push(`categories.${k}.enabled must be boolean`);
  }
  for (const k of ['customNames', 'customPlaces']) {
    if (!Array.isArray(c[k]) || c[k].some((x: any) => typeof x !== 'string')) errors.push(`${k} must be string[]`);
  }
  if (!Array.isArray(c.customPatterns)) errors.push('customPatterns must be array');
  else c.customPatterns.forEach((r: any, i: number) => {
    if (!r || typeof r !== 'object') { errors.push(`customPatterns[${i}] must be object`); return; }
    if (typeof r.id !== 'string' || !r.id) errors.push(`customPatterns[${i}].id required`);
    if (typeof r.category !== 'string' || !r.category) errors.push(`customPatterns[${i}].category required`);
    if (typeof r.pattern !== 'string' || !r.pattern) errors.push(`customPatterns[${i}].pattern required`);
  });
  if (!c.platformPresets || typeof c.platformPresets !== 'object') errors.push('platformPresets must be object');
  if (errors.length) return { ok: false, errors };
  return { ok: true, config: normalizeConfig(c) };
}
