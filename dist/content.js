// src/shared/default-config.json
var default_config_default = {
  version: 1,
  enabled: true,
  maskMode: "random-word",
  categories: {
    apiKeys: { enabled: true },
    personalNames: { enabled: true },
    addressesPlaces: { enabled: true },
    socialMedia: { enabled: true }
  },
  customNames: ["Yassine", "Roa", "Elias", "Amina", "Noah", "Maya"],
  customPlaces: ["Springfield High School", "Acme University", "123 Main Street"],
  customPatterns: [],
  platformPresets: {
    youtube: {
      id: "youtube",
      name: "YouTube",
      enabled: true,
      hostPatterns: ["youtube.com", "youtu.be"],
      selectors: [
        "#channel-name",
        "ytd-channel-name",
        "#author-text",
        "#text.ytd-comment-view-model",
        "yt-formatted-string.ytd-channel-name",
        "#account-name",
        "#owner-sub-count"
      ]
    },
    instagram: {
      id: "instagram",
      name: "Instagram",
      enabled: true,
      hostPatterns: ["instagram.com"],
      selectors: [
        "header section a",
        "article header span",
        "div[role='dialog'] span[dir='auto']",
        "a[role='link'] span",
        "span._ap3a"
      ]
    },
    linkedin: {
      id: "linkedin",
      name: "LinkedIn",
      enabled: true,
      hostPatterns: ["linkedin.com"],
      selectors: [
        ".update-components-actor__name",
        ".msg-overlay-bubble-header__title",
        ".msg-s-message-group__name",
        ".profile-card-name",
        ".feed-shared-actor__name",
        "span[aria-hidden='true']"
      ]
    },
    whatsapp: {
      id: "whatsapp",
      name: "WhatsApp Web",
      enabled: true,
      hostPatterns: ["web.whatsapp.com"],
      selectors: [
        "span[title]",
        "div[role='rowheader'] span",
        "header span[dir='auto']",
        "[data-testid='conversation-info-header-chat-title']"
      ]
    },
    facebook: {
      id: "facebook",
      name: "Facebook",
      enabled: true,
      hostPatterns: ["facebook.com", "messenger.com"],
      selectors: [
        "h2 strong span",
        "a[role='link'] span[dir='auto']",
        "span.x193iq5w",
        "[aria-label='Chats'] span",
        "div[role='article'] h3"
      ]
    },
    x: {
      id: "x",
      name: "X (Twitter)",
      enabled: true,
      hostPatterns: ["x.com", "twitter.com"],
      selectors: [
        "div[data-testid='User-Name'] span",
        "a[role='link'] div[dir='ltr'] span",
        "[data-testid='DMDrawerHeader'] span",
        "[data-testid='conversation'] span",
        "span.username"
      ]
    }
  }
};

// src/shared/config.ts
var STORAGE_KEY = "soteriaConfig";
var DEFAULT_CONFIG = structuredClone(default_config_default);
function isMaskMode(v) {
  return v === "blur" || v === "scramble" || v === "random-word";
}
function normalizeConfig(input) {
  const d = DEFAULT_CONFIG;
  const c = input && typeof input === "object" ? input : {};
  const cfg = {
    version: 1,
    enabled: typeof c.enabled === "boolean" ? c.enabled : d.enabled,
    maskMode: isMaskMode(c.maskMode) ? c.maskMode : d.maskMode,
    categories: {
      apiKeys: { enabled: c.categories?.apiKeys?.enabled ?? d.categories.apiKeys.enabled },
      personalNames: { enabled: c.categories?.personalNames?.enabled ?? d.categories.personalNames.enabled },
      addressesPlaces: { enabled: c.categories?.addressesPlaces?.enabled ?? d.categories.addressesPlaces.enabled },
      socialMedia: { enabled: c.categories?.socialMedia?.enabled ?? d.categories.socialMedia.enabled }
    },
    customNames: sanitizeStringArray(c.customNames, d.customNames),
    customPlaces: sanitizeStringArray(c.customPlaces, d.customPlaces),
    customPatterns: sanitizeRules(c.customPatterns),
    platformPresets: sanitizePlatforms(c.platformPresets, d.platformPresets)
  };
  return cfg;
}
function sanitizeStringArray(v, fallback) {
  if (!Array.isArray(v)) return [...fallback];
  const out = v.map((x) => String(x).trim()).filter(Boolean);
  return [...new Set(out)];
}
function sanitizeRules(v) {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r, i) => {
    if (!r || typeof r !== "object") return [];
    const rr = r;
    if (!rr.pattern || !String(rr.pattern).trim()) return [];
    const rule = {
      id: String(rr.id || `custom-${i}`),
      category: String(rr.category || "custom"),
      pattern: String(rr.pattern),
      literal: Boolean(rr.literal),
      caseInsensitive: rr.caseInsensitive !== false,
      mask: rr.mask === "blur" || rr.mask === "scramble" || rr.mask === "random-word" || rr.mask === "inherit" ? rr.mask : "inherit",
      description: rr.description ? String(rr.description) : void 0
    };
    return [rule];
  });
}
function sanitizePlatforms(v, fallback) {
  const base = structuredClone(fallback);
  if (!v || typeof v !== "object") return base;
  const obj = v;
  for (const [k, p] of Object.entries(obj)) {
    if (!p || typeof p !== "object") continue;
    base[k] = {
      id: String(p.id || k),
      name: String(p.name || base[k]?.name || k),
      enabled: typeof p.enabled === "boolean" ? p.enabled : base[k]?.enabled ?? true,
      hostPatterns: sanitizeStringArray(p.hostPatterns, base[k]?.hostPatterns ?? []),
      selectors: sanitizeStringArray(p.selectors, base[k]?.selectors ?? [])
    };
  }
  return base;
}

// src/shared/storage.ts
var api = globalThis.chrome;
async function getConfig() {
  if (!api?.storage?.local) return structuredClone(DEFAULT_CONFIG);
  const raw = await api.storage.local.get(STORAGE_KEY);
  return normalizeConfig(raw[STORAGE_KEY]);
}
function observeConfig(cb) {
  if (!api?.storage?.onChanged) return () => {
  };
  const listener = (changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    cb(normalizeConfig(changes[STORAGE_KEY].newValue));
  };
  api.storage.onChanged.addListener(listener);
  return () => api.storage.onChanged.removeListener(listener);
}

// src/shared/rules.ts
var BUILTIN_RULES = [
  { id: "gh-token", category: "apiKeys", pattern: "\\bgh[pousr]_[A-Za-z0-9]{36,255}\\b", mask: "scramble", description: "GitHub token" },
  { id: "github-pat", category: "apiKeys", pattern: "\\bgithub_pat_[A-Za-z0-9_]{22,255}\\b", mask: "scramble", description: "GitHub fine-grained PAT" },
  { id: "stripe-live", category: "apiKeys", pattern: "\\bsk_live_[A-Za-z0-9]{16,}\\b", mask: "scramble", description: "Stripe live secret" },
  { id: "stripe-rk", category: "apiKeys", pattern: "\\brk_live_[A-Za-z0-9]{16,}\\b", mask: "scramble", description: "Stripe restricted key" },
  { id: "aws-akid", category: "apiKeys", pattern: "\\bAKIA[0-9A-Z]{16}\\b", mask: "scramble", description: "AWS access key id" },
  { id: "aws-secret", category: "apiKeys", pattern: "\\b(?:aws)?_?secret(?:_access)?_?key\\b\\s*[:=]\\s*[A-Za-z0-9/+=]{40}\\b", mask: "scramble", description: "AWS secret key assignment" },
  { id: "bearer", category: "apiKeys", pattern: "\\bBearer\\s+[A-Za-z0-9\\-._~+/]+=*\\b", mask: "scramble", description: "Bearer token" },
  { id: "jwt", category: "apiKeys", pattern: "\\beyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b", mask: "scramble", description: "JWT" },
  { id: "generic-secret", category: "apiKeys", pattern: `\\b(?:api[_-]?key|secret|token|password|passwd|pwd)\\b\\s*[:=]\\s*["']?[A-Za-z0-9\\-._~+/]{16,}["']?`, mask: "scramble", description: "Generic secret assignment" },
  { id: "email", category: "personalNames", pattern: "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b", mask: "scramble", description: "Email address" },
  { id: "phone", category: "addressesPlaces", pattern: "\\b(?:\\+?\\d{1,3}[\\s.-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}\\b", mask: "scramble", description: "Phone number" },
  { id: "street-address", category: "addressesPlaces", pattern: "\\b\\d{1,5}\\s+[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,3}\\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\\.?\\b", mask: "random-word", description: "Street address" },
  { id: "postal-code", category: "addressesPlaces", pattern: "\\b\\d{5}(?:-\\d{4})?\\b|\\b[A-Z]\\d[A-Z][ -]?\\d[A-Z]\\d\\b", mask: "scramble", description: "Postal code" },
  { id: "institution", category: "addressesPlaces", pattern: "\\b[A-Z][a-zA-Z&]+(?:\\s+[A-Z][a-zA-Z&]+){0,4}\\s+(?:University|College|Institute|School|Academy|Hospital|Company|Inc|LLC|Ltd|GmbH)\\b", mask: "random-word", description: "Institution/workplace" }
];
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildActiveRules(config2) {
  const rules = [];
  if (config2.categories.apiKeys.enabled) {
    rules.push(...BUILTIN_RULES.filter((r) => r.category === "apiKeys"));
  }
  if (config2.categories.personalNames.enabled) {
    rules.push(...BUILTIN_RULES.filter((r) => r.category === "personalNames"));
    for (const name of config2.customNames) {
      const n = name.trim();
      if (!n) continue;
      rules.push({
        id: `name:${n.toLowerCase()}`,
        category: "personalNames",
        pattern: `\\b${escapeRegex(n)}\\b`,
        literal: false,
        caseInsensitive: true,
        mask: "random-word"
      });
    }
  }
  if (config2.categories.addressesPlaces.enabled) {
    rules.push(...BUILTIN_RULES.filter((r) => r.category === "addressesPlaces"));
    for (const place of config2.customPlaces) {
      const p = place.trim();
      if (!p) continue;
      rules.push({
        id: `place:${p.toLowerCase()}`,
        category: "addressesPlaces",
        pattern: escapeRegex(p),
        literal: false,
        caseInsensitive: true,
        mask: "random-word"
      });
    }
  }
  for (const r of config2.customPatterns) {
    if (r?.pattern?.trim()) rules.push({ ...r, mask: r.mask ?? "inherit" });
  }
  return dedupeRules(rules);
}
function dedupeRules(rules) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const r of rules) {
    const k = `${r.category}|${r.literal ? "L" : "R"}|${r.pattern}|${r.caseInsensitive ?? true}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

// src/content/engine.ts
var wasmReady = null;
var initFn = null;
var initEngineFn = null;
var scanBatchFn = null;
var clearSessionFn = null;
var api2 = globalThis.chrome;
async function ensureEngine() {
  if (scanBatchFn) return true;
  if (!wasmReady) wasmReady = load();
  try {
    await wasmReady;
    return !!scanBatchFn;
  } catch {
    return false;
  }
}
async function load() {
  const base = api2?.runtime?.getURL ? api2.runtime.getURL("wasm/") : "wasm/";
  const jsUrl = base + "soteria_engine.js";
  const wasmUrl = base + "soteria_engine_bg.wasm";
  const mod = await import(
    /* @vite-ignore */
    jsUrl
  );
  initFn = mod.default;
  initEngineFn = mod.init_engine;
  scanBatchFn = mod.scan_batch;
  clearSessionFn = mod.clear_session;
  await initFn(wasmUrl);
}
function setRules(rules) {
  if (!initEngineFn) return;
  initEngineFn(JSON.stringify(rules.map((r) => ({
    id: r.id,
    category: r.category,
    pattern: r.pattern,
    literal: !!r.literal,
    case_insensitive: r.caseInsensitive !== false,
    mask: r.mask ?? "inherit"
  }))));
}
function clearEngineSession() {
  clearSessionFn?.();
}
function scanBatch(inputs, mode) {
  if (!scanBatchFn || inputs.length === 0) return inputs.map((i) => ({ id: i.id, text: i.text, matches: [] }));
  try {
    const out = scanBatchFn(JSON.stringify(inputs), mode);
    return JSON.parse(out);
  } catch {
    return inputs.map((i) => ({ id: i.id, text: i.text, matches: [] }));
  }
}

// src/content/content.ts
var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "OPTION"]);
var ATTRS = ["aria-label", "title", "alt", "placeholder"];
var processedText = /* @__PURE__ */ new WeakSet();
var processedAttr = /* @__PURE__ */ new WeakMap();
var originalAttrs = /* @__PURE__ */ new WeakMap();
var trackedAttrElements = /* @__PURE__ */ new Set();
var config = null;
var activeSelectors = [];
var pendingNodes = /* @__PURE__ */ new Set();
var flushTimer = null;
var observer = null;
var idCounter = 1;
var nextId = () => String(idCounter++);
async function main() {
  config = await getConfig();
  observeConfig(onConfigChange);
  if (!config.enabled) return;
  await boot();
}
async function boot() {
  if (!config?.enabled) return;
  const ok = await ensureEngine();
  if (!ok) {
    console.warn("[Soteria] WASM engine unavailable");
    return;
  }
  applyConfig(config);
  startObserver();
  scheduleFlush([document.documentElement]);
}
function onConfigChange(next) {
  const prev = config;
  config = next;
  if (!next.enabled) {
    stopObserver();
    unmaskAll();
    return;
  }
  const changed = !prev || prev.maskMode !== next.maskMode || JSON.stringify(buildActiveRules(prev)) !== JSON.stringify(buildActiveRules(next)) || JSON.stringify(getSelectors(prev)) !== JSON.stringify(getSelectors(next));
  if (changed) {
    clearEngineSession();
    unmaskAll();
  }
  void boot();
  if (changed) scheduleFlush([document.documentElement]);
}
function applyConfig(cfg) {
  setRules(buildActiveRules(cfg));
  activeSelectors = getSelectors(cfg);
  document.documentElement.setAttribute("data-soteria-mode", cfg.maskMode);
}
function getSelectors(cfg) {
  if (!cfg.categories.socialMedia.enabled) return [];
  const host = location.hostname;
  const sels = [];
  for (const p of Object.values(cfg.platformPresets)) {
    if (!p.enabled) continue;
    if (p.hostPatterns.some((h) => host === h || host.endsWith("." + h))) sels.push(...p.selectors);
  }
  return [...new Set(sels)].filter(Boolean);
}
function startObserver() {
  if (observer || !document.documentElement) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData") {
        if (m.target.nodeType === Node.TEXT_NODE) {
          const t = m.target;
          processedText.delete(t);
          pendingNodes.add(t);
        }
      } else if (m.type === "attributes" && m.target instanceof Element) {
        processedAttr.get(m.target)?.delete(m.attributeName || "");
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
    attributeFilter: [...ATTRS]
  });
}
function stopObserver() {
  observer?.disconnect();
  observer = null;
  pendingNodes.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
function scheduleFlush(initial) {
  initial?.forEach((n) => pendingNodes.add(n));
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    const run = () => {
      void flush();
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 500 });
    else requestAnimationFrame(run);
  }, 50);
}
async function flush() {
  if (!config?.enabled) return;
  const nodes = Array.from(pendingNodes);
  pendingNodes.clear();
  if (nodes.length === 0) return;
  const textJobs = [];
  const attrJobs = [];
  for (const node of nodes) collect(node, textJobs, attrJobs);
  for (const sel of activeSelectors) {
    try {
      document.querySelectorAll(sel).forEach((el) => collect(el, textJobs, attrJobs));
    } catch {
    }
  }
  if (!textJobs.length && !attrJobs.length) return;
  const batch = [];
  for (const j of textJobs) batch.push({ id: `t:${j.id}`, text: j.text });
  for (const j of attrJobs) batch.push({ id: `a:${j.id}`, text: j.text });
  const byId = new Map(scanBatch(batch, config.maskMode).map((r) => [r.id, r]));
  for (const j of textJobs) {
    const r = byId.get(`t:${j.id}`);
    if (r?.matches.length) applyTextMask(j.node, r, config.maskMode);
  }
  for (const j of attrJobs) {
    const r = byId.get(`a:${j.id}`);
    if (r?.matches.length) applyAttrMask(j.el, j.attr, r.text);
  }
}
function collect(node, textJobs, attrJobs) {
  if (node.nodeType === Node.TEXT_NODE) {
    maybeCollectText(node, textJobs);
    return;
  }
  if (!(node instanceof Element)) return;
  if (SKIP_TAGS.has(node.tagName)) return;
  if (node.closest('[data-soteria-masked="1"]') || node.classList?.contains("soteria-mask")) return;
  for (const attr of ATTRS) {
    const val = node.getAttribute(attr);
    if (!val?.trim()) continue;
    let set = processedAttr.get(node);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      processedAttr.set(node, set);
    }
    if (set.has(attr)) continue;
    set.add(attr);
    attrJobs.push({ id: nextId(), el: node, attr, text: val });
  }
  if (node.shadowRoot) node.shadowRoot.childNodes.forEach((c) => collect(c, textJobs, attrJobs));
  node.childNodes.forEach((c) => collect(c, textJobs, attrJobs));
}
function maybeCollectText(node, textJobs) {
  if (processedText.has(node)) return;
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName)) return;
  if (parent.closest('[data-soteria-masked="1"], .soteria-mask')) return;
  const text = node.nodeValue || "";
  if (!text.trim() || text.length < 2) {
    processedText.add(node);
    return;
  }
  processedText.add(node);
  textJobs.push({ id: nextId(), node, text });
}
function applyTextMask(node, result, mode) {
  const parent = node.parentElement;
  if (!parent || !node.isConnected || SKIP_TAGS.has(parent.tagName)) return;
  if (parent.closest(".soteria-mask")) return;
  const text = node.nodeValue || "";
  const matches = result.matches.filter((m) => m.end <= text.length && m.start >= 0 && m.start < m.end).sort((a, b) => a.start - b.start);
  if (!matches.length) return;
  const frag = document.createDocumentFragment();
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    if (m.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
    const span = document.createElement("span");
    span.className = `soteria-mask soteria-mask--${mode}`;
    span.setAttribute("data-soteria-masked", "1");
    span.setAttribute("data-soteria-category", m.category);
    span.setAttribute("data-soteria-original", text.slice(m.start, m.end));
    span.textContent = mode === "blur" ? "\u2022".repeat(Math.max(4, Math.min([...text.slice(m.start, m.end)].length, 24))) : m.replacement;
    span.title = "Hidden by Soteria";
    frag.appendChild(span);
    cursor = m.end;
  }
  if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
  parent.replaceChild(frag, node);
}
function applyAttrMask(el, attr, maskedValue) {
  const current = el.getAttribute(attr);
  if (current == null) return;
  let map = originalAttrs.get(el);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    originalAttrs.set(el, map);
  }
  if (!map.has(attr)) map.set(attr, current);
  trackedAttrElements.add(el);
  if (current !== maskedValue) el.setAttribute(attr, maskedValue);
}
function unmaskAll() {
  document.querySelectorAll('[data-soteria-masked="1"]').forEach((span) => {
    const orig = span.getAttribute("data-soteria-original");
    const replacement = document.createTextNode(orig ?? span.textContent ?? "");
    span.replaceWith(replacement);
  });
  trackedAttrElements.forEach((el) => {
    const map = originalAttrs.get(el);
    if (!map) return;
    for (const [attr, val] of map.entries()) el.setAttribute(attr, val);
  });
  trackedAttrElements.clear();
}
void main().catch((e) => console.error("[Soteria] init failed", e));
