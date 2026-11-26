import type { Rule, ScanInput, ScanResult, MaskMode } from '../shared/types';

let wasmReady: Promise<void> | null = null;
let initFn: ((input?: any) => Promise<any>) | null = null;
let initEngineFn: ((rulesJson: string) => void) | null = null;
let scanBatchFn: ((inputJson: string, mode: string) => string) | null = null;
let clearSessionFn: (() => void) | null = null;

const api = (globalThis as any).chrome;

export async function ensureEngine(): Promise<boolean> {
  if (scanBatchFn) return true;
  if (!wasmReady) wasmReady = load();
  try {
    await wasmReady;
    return !!scanBatchFn;
  } catch {
    return false;
  }
}

async function load(): Promise<void> {
  const base = api?.runtime?.getURL ? api.runtime.getURL('wasm/') : 'wasm/';
  // wasm-pack web target glue
  const jsUrl = base + 'soteria_engine.js';
  const wasmUrl = base + 'soteria_engine_bg.wasm';
  const mod: any = await import(/* @vite-ignore */ jsUrl);
  initFn = mod.default;
  initEngineFn = mod.init_engine;
  scanBatchFn = mod.scan_batch;
  clearSessionFn = mod.clear_session;
  await initFn!(wasmUrl);
}

export function setRules(rules: Rule[]): void {
  if (!initEngineFn) return;
  initEngineFn(JSON.stringify(rules.map((r) => ({
    id: r.id,
    category: r.category,
    pattern: r.pattern,
    literal: !!r.literal,
    case_insensitive: r.caseInsensitive !== false,
    mask: r.mask ?? 'inherit',
  }))));
}

export function clearEngineSession(): void {
  clearSessionFn?.();
}

export function scanBatch(inputs: ScanInput[], mode: MaskMode): ScanResult[] {
  if (!scanBatchFn || inputs.length === 0) return inputs.map((i) => ({ id: i.id, text: i.text, matches: [] }));
  try {
    const out = scanBatchFn(JSON.stringify(inputs), mode);
    return JSON.parse(out) as ScanResult[];
  } catch {
    return inputs.map((i) => ({ id: i.id, text: i.text, matches: [] }));
  }
}
