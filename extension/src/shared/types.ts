export type MaskMode = 'blur' | 'scramble' | 'random-word';

export interface Rule {
  id: string;
  category: string;
  pattern: string;
  literal?: boolean;
  caseInsensitive?: boolean;
  mask?: MaskMode | 'inherit';
  description?: string;
}

export interface PlatformPreset {
  id: string;
  name: string;
  hostPatterns: string[];
  selectors: string[];
  enabled: boolean;
}

export interface CategoryConfig {
  enabled: boolean;
}

export interface SoteriaConfig {
  version: 1;
  enabled: boolean;
  maskMode: MaskMode;
  categories: {
    apiKeys: CategoryConfig;
    personalNames: CategoryConfig;
    addressesPlaces: CategoryConfig;
    socialMedia: CategoryConfig;
  };
  customNames: string[];
  customPlaces: string[];
  customPatterns: Rule[];
  disabledSites: string[];
  platformPresets: Record<string, PlatformPreset>;
}

export interface ScanInput {
  id: string;
  text: string;
}

export interface ScanMatch {
  start: number;
  end: number;
  replacement: string;
  ruleId: string;
  category: string;
}

export interface ScanResult {
  id: string;
  text: string;
  matches: ScanMatch[];
}

export const DEFAULT_CUSTOM_NAMES = ['Yassine', 'Roa', 'Elias', 'Amina', 'Noah', 'Maya'];
