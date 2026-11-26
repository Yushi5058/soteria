import { getConfig, observeConfig } from '../shared/storage';
import { buildActiveRules } from '../shared/rules';
import { ensureEngine, setRules, scanBatch, clearEngineSession } from './engine';
import type { SoteriaConfig, ScanInput, ScanResult, MaskMode } from '../shared/types';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'OPTION']);
const ATTRS = ['aria-label', 'title', 'alt', 'placeholder'] as const;

const processedText = new WeakSet<Text>();
const processedAttr = new WeakMap<Element, Set<string>>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();
const trackedAttrElements = new Set<Element>();
const maskedImages = new WeakSet<HTMLImageElement>();
const MAX_BATCH_CHARS = 12000;
const MAX_BATCH_ITEMS = 300;

let config: SoteriaConfig | null = null;
let activeSelectors: string[] = [];
let pendingNodes = new Set<Node>();
let flushTimer: number | null = null;
let observer: MutationObserver | null = null;
let idCounter = 1;

const nextId = () => String(idCounter++);

function hostMatches(host: string, entry: string): boolean {
  const e = entry.toLowerCase().trim();
  if (!e) return false;
  return host === e || host.endsWith('.' + e);
}

function siteDisabled(cfg: SoteriaConfig): boolean {
  const host = location.hostname.toLowerCase();
  const mode = cfg.siteMode || 'blocklist';
  if (mode === 'allowlist') {
    const allow = cfg.allowedSites || [];
    return allow.length > 0 ? !allow.some((e) => hostMatches(host, e)) : false;
  }
  return (cfg.disabledSites || []).some((e) => hostMatches(host, e));
}

async function main() {
  config = await getConfig();
  observeConfig(onConfigChange);
  if (!config.enabled || siteDisabled(config)) return;
  await boot();
}

async function boot() {
  if (!config?.enabled || siteDisabled(config)) return;
  const ok = await ensureEngine();
  if (!ok) {
    console.warn('[Soteria] WASM engine unavailable');
    return;
  }
  applyConfig(config);
  startObserver();
  scheduleFlush([document.documentElement]);
}

function onConfigChange(next: SoteriaConfig) {
  const prev = config;
  config = next;
  const disabled = !next.enabled || siteDisabled(next);
  if (disabled) {
    stopObserver();
    unmaskAll();
    return;
  }
  const changed = !prev ||
    prev.maskMode !== next.maskMode ||
    prev.siteMode !== next.siteMode ||
    JSON.stringify(buildActiveRules(prev)) !== JSON.stringify(buildActiveRules(next)) ||
    JSON.stringify(getSelectors(prev)) !== JSON.stringify(getSelectors(next)) ||
    JSON.stringify(prev.disabledSites || []) !== JSON.stringify(next.disabledSites || []) ||
    JSON.stringify(prev.allowedSites || []) !== JSON.stringify(next.allowedSites || []);

  if (changed) {
    clearEngineSession();
    unmaskAll();
  }
  void boot();
  if (changed) scheduleFlush([document.documentElement]);
}

function applyConfig(cfg: SoteriaConfig) {
  setRules(buildActiveRules(cfg));
  activeSelectors = getSelectors(cfg);
  document.documentElement.setAttribute('data-soteria-mode', cfg.maskMode);
}

function getSelectors(cfg: SoteriaConfig): string[] {
  if (!cfg.categories.socialMedia.enabled) return [];
  const host = location.hostname;
  const sels: string[] = [];
  for (const p of Object.values(cfg.platformPresets)) {
    if (!p.enabled) continue;
    if (p.hostPatterns.some((h) => host === h || host.endsWith('.' + h))) sels.push(...p.selectors);
  }
  return [...new Set(sels)].filter(Boolean);
}

function startObserver() {
  if (observer || !document.documentElement) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') {
        if (m.target.nodeType === Node.TEXT_NODE) {
          const t = m.target as Text;
          processedText.delete(t);
          pendingNodes.add(t);
        }
      } else if (m.type === 'attributes' && m.target instanceof Element) {
        processedAttr.get(m.target)?.delete(m.attributeName || '');
        pendingNodes.add(m.target);
      } else {
        m.addedNodes.forEach((n) => pendingNodes.add(n));
      }
    }
    scheduleFlush();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
  pendingNodes.clear();
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
}

function scheduleFlush(initial?: Node[]) {
  initial?.forEach((n) => pendingNodes.add(n));
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    const run = () => { void flush(); };
    if ('requestIdleCallback' in window) (window as any).requestIdleCallback(run, { timeout: 500 });
    else requestAnimationFrame(run);
  }, 50);
}

async function flush() {
  if (!config?.enabled) return;
  const nodes = Array.from(pendingNodes);
  pendingNodes.clear();
  if (nodes.length === 0) return;

  const textJobs: { id: string; node: Text; text: string }[] = [];
  const attrJobs: { id: string; el: Element; attr: string; text: string }[] = [];

  for (const node of nodes) collect(node, textJobs, attrJobs);
  for (const sel of activeSelectors) {
    try { document.querySelectorAll(sel).forEach((el) => collect(el, textJobs, attrJobs)); } catch {}
  }
  scanNameLikeText(textJobs);

  if (!textJobs.length && !attrJobs.length) return;

  const batch: ScanInput[] = [];
  for (const j of textJobs) batch.push({ id: `t:${j.id}`, text: j.text });
  for (const j of attrJobs) batch.push({ id: `a:${j.id}`, text: j.text });

  const byId = new Map<string, ScanResult>();
  for (let i = 0; i < batch.length;) {
    let chars = 0;
    const chunk: ScanInput[] = [];
    while (i < batch.length && chunk.length < MAX_BATCH_ITEMS) {
      const item = batch[i];
      const len = item.text.length;
      if (chunk.length && chars + len > MAX_BATCH_CHARS) break;
      chunk.push(item);
      chars += len;
      i++;
      if (chars >= MAX_BATCH_CHARS) break;
    }
    for (const r of scanBatch(chunk, config.maskMode)) byId.set(r.id, r);
  }

  for (const j of textJobs) {
    const r = byId.get(`t:${j.id}`);
    if (r?.matches.length) applyTextMask(j.node, r, config.maskMode);
  }
  for (const j of attrJobs) {
    const r = byId.get(`a:${j.id}`);
    if (r?.matches.length) applyAttrMask(j.el, j.attr, r.text);
  }
}

function collect(node: Node, textJobs: any[], attrJobs: any[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    maybeCollectText(node as Text, textJobs);
    return;
  }
  if (!(node instanceof Element)) return;
  if (SKIP_TAGS.has(node.tagName)) return;
  if (node.closest('[data-soteria-masked="1"]') || node.classList?.contains('soteria-mask')) return;

  maybeMaskImage(node);

  for (const attr of ATTRS) {
    const val = node.getAttribute(attr);
    if (!val?.trim()) continue;
    let set = processedAttr.get(node);
    if (!set) { set = new Set(); processedAttr.set(node, set); }
    if (set.has(attr)) continue;
    set.add(attr);
    attrJobs.push({ id: nextId(), el: node, attr, text: val });
  }

  if (node.shadowRoot) node.shadowRoot.childNodes.forEach((c) => collect(c, textJobs, attrJobs));
  node.childNodes.forEach((c) => collect(c, textJobs, attrJobs));
}

function maybeCollectText(node: Text, textJobs: any[]) {
  if (processedText.has(node)) return;
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName)) return;
  if (parent.closest('[data-soteria-masked="1"], .soteria-mask')) return;
  const text = node.nodeValue || '';
  if (!text.trim() || text.length < 2) { processedText.add(node); return; }
  processedText.add(node);
  textJobs.push({ id: nextId(), node, text });
}

const NAMEISH_RE = /\b(?:\+?\d[\d\s().-]{7,}\d|[A-ZÀ-ÖØ-Ý][\p{L}'’-]{1,}(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’-]{1,}){0,2})\b/gu;

function likelyNameContext(el: Element): boolean {
  const hint = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.className || ''} ${(el.getAttribute('data-testid') || '')}`.toLowerCase();
  return /(name|author|user|profile|contact|sender|participant|member|conversation|chat|account|title)/.test(hint) || !!el.closest('header, [role="rowheader"], [data-testid*="name"], [data-testid*="author"], [data-testid*="conversation"], [data-testid*="chat"], [class*="name"], [class*="author"], [class*="user"]');
}

function scanNameLikeText(textJobs: { id: string; node: Text; text: string }[]) {
  if (!config?.categories.socialMedia.enabled) return;
  // Heuristic pass: mask obvious name/phone tokens in social/contact contexts (WhatsApp unknown numbers, group labels).
  const seen = new Set<Text>(textJobs.map((j) => j.node));
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node as Text;
    if (seen.has(t) || processedText.has(t)) continue;
    const parent = t.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest('[data-soteria-masked="1"], .soteria-mask')) continue;
    if (!likelyNameContext(parent)) continue;
    const text = t.nodeValue || '';
    if (!text.trim() || text.length > 120) continue;
    if (!NAMEISH_RE.test(text)) continue;
    NAMEISH_RE.lastIndex = 0;
    processedText.add(t);
    textJobs.push({ id: nextId(), node: t, text });
  }
}

function applyTextMask(node: Text, result: ScanResult, mode: MaskMode) {
  const parent = node.parentElement;
  if (!parent || !node.isConnected || SKIP_TAGS.has(parent.tagName)) return;
  if (parent.closest('.soteria-mask')) return;

  const text = node.nodeValue || '';
  const matches = result.matches
    .filter((m) => m.end <= text.length && m.start >= 0 && m.start < m.end)
    .sort((a, b) => a.start - b.start);
  if (!matches.length) return;

  const frag = document.createDocumentFragment();
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    if (m.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
    const span = document.createElement('span');
    span.className = `soteria-mask soteria-mask--${mode}`;
    span.setAttribute('data-soteria-masked', '1');
    span.setAttribute('data-soteria-category', m.category);
    span.setAttribute('data-soteria-original', text.slice(m.start, m.end));
    span.textContent = mode === 'blur'
      ? '•'.repeat(Math.max(4, Math.min([...text.slice(m.start, m.end)].length, 24)))
      : m.replacement;
    span.title = 'Hidden by Soteria';
    frag.appendChild(span);
    cursor = m.end;
  }
  if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
  parent.replaceChild(frag, node);
}

function applyAttrMask(el: Element, attr: string, maskedValue: string) {
  const current = el.getAttribute(attr);
  if (current == null) return;
  let map = originalAttrs.get(el);
  if (!map) { map = new Map(); originalAttrs.set(el, map); }
  if (!map.has(attr)) map.set(attr, current);
  trackedAttrElements.add(el);
  if (current !== maskedValue) el.setAttribute(attr, maskedValue);
}

function isLikelyProfileImage(img: HTMLImageElement): boolean {
  const src = (img.currentSrc || img.src || '').toLowerCase();
  if (!src || src.startsWith('data:') || src.endsWith('.svg')) return false;
  const alt = (img.alt || '').toLowerCase();
  const cls = (img.className || '').toString().toLowerCase();
  const id = (img.id || '').toLowerCase();
  const hint = `${alt} ${cls} ${id} ${src}`;
  const contextHint = (img.closest('[data-testid], [aria-label], header, [role="img"]')?.textContent || '').toLowerCase().slice(0, 120);
  const profileWords = /(profile|avatar|picture|photo|headshot|pfp|user|member|contact|person|account)/;
  const uiWords = /(icon|logo|emoji|badge|sticker|button|sprite)/;
  if (uiWords.test(hint)) return false;
  const rect = img.getBoundingClientRect();
  const sizeOk = rect.width >= 24 && rect.width <= 160 && rect.height >= 24 && rect.height <= 160;
  const ratio = rect.width / Math.max(1, rect.height);
  const ratioOk = ratio > 0.6 && ratio < 1.6;
  const hasHint = profileWords.test(hint) || profileWords.test(contextHint) || img.closest('[data-testid*="avatar"], [data-testid*="profile"], [class*="avatar"], [class*="profile"], img[alt*="profile" i]') != null;
  return sizeOk && ratioOk && hasHint;
}

function maybeMaskImage(el: Element) {
  if (!(el instanceof HTMLImageElement)) return;
  if (maskedImages.has(el)) return;
  if (!isLikelyProfileImage(el)) return;
  el.style.filter = 'blur(8px)';
  el.style.webkitFilter = 'blur(8px)';
  el.setAttribute('data-soteria-image-masked', '1');
  maskedImages.add(el);
}

function unmaskAll() {
  document.querySelectorAll('[data-soteria-masked="1"]').forEach((span) => {
    const orig = span.getAttribute('data-soteria-original');
    const replacement = document.createTextNode(orig ?? span.textContent ?? '');
    span.replaceWith(replacement);
  });
  document.querySelectorAll('[data-soteria-image-masked="1"]').forEach((img) => {
    const el = img as HTMLElement;
    el.style.filter = '';
    el.style.webkitFilter = '';
    el.removeAttribute('data-soteria-image-masked');
  });
  trackedAttrElements.forEach((el) => {
    const map = originalAttrs.get(el);
    if (!map) return;
    for (const [attr, val] of map.entries()) el.setAttribute(attr, val);
  });
  trackedAttrElements.clear();
}

void main().catch((e) => console.error('[Soteria] init failed', e));
