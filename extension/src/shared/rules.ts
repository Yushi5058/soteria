import type { Rule, SoteriaConfig } from './types';

export const BUILTIN_RULES: Rule[] = [
  { id: 'gh-token', category: 'apiKeys', pattern: '\\bgh[pousr]_[A-Za-z0-9]{36,255}\\b', mask: 'scramble', description: 'GitHub token' },
  { id: 'github-pat', category: 'apiKeys', pattern: '\\bgithub_pat_[A-Za-z0-9_]{22,255}\\b', mask: 'scramble', description: 'GitHub fine-grained PAT' },
  { id: 'stripe-live', category: 'apiKeys', pattern: '\\bsk_live_[A-Za-z0-9]{16,}\\b', mask: 'scramble', description: 'Stripe live secret' },
  { id: 'stripe-rk', category: 'apiKeys', pattern: '\\brk_live_[A-Za-z0-9]{16,}\\b', mask: 'scramble', description: 'Stripe restricted key' },
  { id: 'aws-akid', category: 'apiKeys', pattern: '\\bAKIA[0-9A-Z]{16}\\b', mask: 'scramble', description: 'AWS access key id' },
  { id: 'aws-secret', category: 'apiKeys', pattern: '\\b(?:aws)?_?secret(?:_access)?_?key\\b\\s*[:=]\\s*[A-Za-z0-9/+=]{40}\\b', mask: 'scramble', description: 'AWS secret key assignment' },
  { id: 'bearer', category: 'apiKeys', pattern: '\\bBearer\\s+[A-Za-z0-9\\-._~+/]+=*\\b', mask: 'scramble', description: 'Bearer token' },
  { id: 'jwt', category: 'apiKeys', pattern: '\\beyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b', mask: 'scramble', description: 'JWT' },
  { id: 'generic-secret', category: 'apiKeys', pattern: '\\b(?:api[_-]?key|secret|token|password|passwd|pwd)\\b\\s*[:=]\\s*[\"\']?[A-Za-z0-9\\-._~+/]{16,}[\"\']?', mask: 'scramble', description: 'Generic secret assignment' },
  { id: 'email', category: 'personalNames', pattern: '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b', mask: 'scramble', description: 'Email address' },
  { id: 'phone', category: 'addressesPlaces', pattern: '\\b(?:\\+?\\d{1,3}[\\s.-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}\\b', mask: 'scramble', description: 'Phone number' },
  { id: 'street-address', category: 'addressesPlaces', pattern: '\\b\\d{1,5}\\s+[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,3}\\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\\.?\\b', mask: 'random-word', description: 'Street address' },
  { id: 'postal-code', category: 'addressesPlaces', pattern: '\\b\\d{5}(?:-\\d{4})?\\b|\\b[A-Z]\\d[A-Z][ -]?\\d[A-Z]\\d\\b', mask: 'scramble', description: 'Postal code' },
  { id: 'institution', category: 'addressesPlaces', pattern: '\\b[A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+){0,4}\\s+(?:University|College|Institute|School|Academy|Hospital|Company|Inc|LLC|Ltd|GmbH)\\b', mask: 'random-word', description: 'Institution/workplace' },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildActiveRules(config: SoteriaConfig): Rule[] {
  const rules: Rule[] = [];
  if (config.categories.apiKeys.enabled) {
    rules.push(...BUILTIN_RULES.filter((r) => r.category === 'apiKeys'));
  }
  if (config.categories.personalNames.enabled) {
    rules.push(...BUILTIN_RULES.filter((r) => r.category === 'personalNames'));
    for (const name of config.customNames) {
      const n = name.trim();
      if (!n) continue;
      rules.push({
        id: `name:${n.toLowerCase()}`,
        category: 'personalNames',
        pattern: `\\b${escapeRegex(n)}\\b`,
        literal: false,
        caseInsensitive: true,
        mask: 'random-word',
      });
    }
  }
  if (config.categories.addressesPlaces.enabled) {
    rules.push(...BUILTIN_RULES.filter((r) => r.category === 'addressesPlaces'));
    for (const place of config.customPlaces) {
      const p = place.trim();
      if (!p) continue;
      rules.push({
        id: `place:${p.toLowerCase()}`,
        category: 'addressesPlaces',
        pattern: escapeRegex(p),
        literal: false,
        caseInsensitive: true,
        mask: 'random-word',
      });
    }
  }
  for (const r of config.customPatterns) {
    if (r?.pattern?.trim()) rules.push({ ...r, mask: r.mask ?? 'inherit' });
  }
  return dedupeRules(rules);
}

function dedupeRules(rules: Rule[]): Rule[] {
  const seen = new Set<string>();
  const out: Rule[] = [];
  for (const r of rules) {
    const k = `${r.category}|${r.literal ? 'L' : 'R'}|${r.pattern}|${r.caseInsensitive ?? true}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
