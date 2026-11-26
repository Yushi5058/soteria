// src/shared/default-config.json
var default_config_default = {
  version: 1,
  enabled: true,
  maskMode: "random-word",
  siteMode: "blocklist",
  categories: {
    apiKeys: { enabled: true },
    personalNames: { enabled: true },
    addressesPlaces: { enabled: true },
    socialMedia: { enabled: true }
  },
  customNames: ["Yassine", "Roa", "Elias", "Amina", "Noah", "Maya"],
  customPlaces: ["Springfield High School", "Acme University", "123 Main Street"],
  customPatterns: [],
  disabledSites: [],
  allowedSites: [],
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
function isSiteMode(v) {
  return v === "blocklist" || v === "allowlist";
}
function normalizeConfig(input) {
  const d = DEFAULT_CONFIG;
  const c = input && typeof input === "object" ? input : {};
  const cfg = {
    version: 1,
    enabled: typeof c.enabled === "boolean" ? c.enabled : d.enabled,
    maskMode: isMaskMode(c.maskMode) ? c.maskMode : d.maskMode,
    siteMode: isSiteMode(c.siteMode) ? c.siteMode : d.siteMode ?? "blocklist",
    categories: {
      apiKeys: { enabled: c.categories?.apiKeys?.enabled ?? d.categories.apiKeys.enabled },
      personalNames: { enabled: c.categories?.personalNames?.enabled ?? d.categories.personalNames.enabled },
      addressesPlaces: { enabled: c.categories?.addressesPlaces?.enabled ?? d.categories.addressesPlaces.enabled },
      socialMedia: { enabled: c.categories?.socialMedia?.enabled ?? d.categories.socialMedia.enabled }
    },
    customNames: sanitizeStringArray(c.customNames, d.customNames),
    customPlaces: sanitizeStringArray(c.customPlaces, d.customPlaces),
    customPatterns: sanitizeRules(c.customPatterns),
    disabledSites: sanitizeStringArray(c.disabledSites, d.disabledSites ?? []),
    allowedSites: sanitizeStringArray(c.allowedSites, d.allowedSites ?? []),
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
function validateConfigShape(input) {
  const errors = [];
  if (!input || typeof input !== "object") return { ok: false, errors: ["Config must be a JSON object"] };
  const c = input;
  if (c.version !== 1) errors.push("version must be 1");
  if (typeof c.enabled !== "boolean") errors.push("enabled must be boolean");
  if (!isMaskMode(c.maskMode)) errors.push("maskMode must be blur|scramble|random-word");
  const cats = ["apiKeys", "personalNames", "addressesPlaces", "socialMedia"];
  if (!c.categories || typeof c.categories !== "object") errors.push("categories must be object");
  for (const k of cats) {
    if (typeof c.categories?.[k]?.enabled !== "boolean") errors.push(`categories.${k}.enabled must be boolean`);
  }
  for (const k of ["customNames", "customPlaces"]) {
    if (!Array.isArray(c[k]) || c[k].some((x) => typeof x !== "string")) errors.push(`${k} must be string[]`);
  }
  if (!Array.isArray(c.customPatterns)) errors.push("customPatterns must be array");
  else c.customPatterns.forEach((r, i) => {
    if (!r || typeof r !== "object") {
      errors.push(`customPatterns[${i}] must be object`);
      return;
    }
    if (typeof r.id !== "string" || !r.id) errors.push(`customPatterns[${i}].id required`);
    if (typeof r.category !== "string" || !r.category) errors.push(`customPatterns[${i}].category required`);
    if (typeof r.pattern !== "string" || !r.pattern) errors.push(`customPatterns[${i}].pattern required`);
  });
  if (c.siteMode !== void 0 && !isSiteMode(c.siteMode)) errors.push("siteMode must be blocklist|allowlist");
  if (c.disabledSites !== void 0 && (!Array.isArray(c.disabledSites) || c.disabledSites.some((x) => typeof x !== "string"))) {
    errors.push("disabledSites must be string[]");
  }
  if (c.allowedSites !== void 0 && (!Array.isArray(c.allowedSites) || c.allowedSites.some((x) => typeof x !== "string"))) {
    errors.push("allowedSites must be string[]");
  }
  if (!c.platformPresets || typeof c.platformPresets !== "object") errors.push("platformPresets must be object");
  if (errors.length) return { ok: false, errors };
  return { ok: true, config: normalizeConfig(c) };
}

// src/shared/storage.ts
var api = globalThis.chrome;
async function getConfig() {
  if (!api?.storage?.local) return structuredClone(DEFAULT_CONFIG);
  const raw = await api.storage.local.get(STORAGE_KEY);
  return normalizeConfig(raw[STORAGE_KEY]);
}
async function setConfig(config2) {
  if (!api?.storage?.local) return;
  await api.storage.local.set({ [STORAGE_KEY]: config2 });
}

// src/options/options.ts
var $ = (id) => document.getElementById(id);
var config;
async function init() {
  config = await getConfig();
  bind();
  render();
}
function bind() {
  ["apiKeys", "personalNames", "addressesPlaces", "socialMedia"].forEach((k) => {
    $(`cat-${k}`).addEventListener("change", async (e) => {
      config.categories[k].enabled = e.target.checked;
      await persist("Saved category settings.");
      renderPlatforms();
    });
  });
  $("maskMode").addEventListener("change", async (e) => {
    config.maskMode = e.target.value;
    await persist("Saved masking mode.");
  });
  $("saveNames").addEventListener("click", async () => {
    config.customNames = parseList($("customNames").value);
    await persist(`Saved ${config.customNames.length} custom names.`);
  });
  $("savePlaces").addEventListener("click", async () => {
    config.customPlaces = parseList($("customPlaces").value);
    await persist(`Saved ${config.customPlaces.length} custom places/institutions.`);
  });
  $("siteMode").addEventListener("change", async (e) => {
    config.siteMode = e.target.value;
    await persist("Saved site mode.");
  });
  $("saveSites").addEventListener("click", async () => {
    config.disabledSites = parseList($("disabledSites").value).map(normalizeHost).filter(Boolean);
    config.allowedSites = parseList($("allowedSites").value).map(normalizeHost).filter(Boolean);
    await persist(`Saved site scope (${config.siteMode}).`);
    render();
  });
  $("exportBtn").addEventListener("click", exportConfig);
  $("importInput").addEventListener("change", importConfig);
  $("resetBtn").addEventListener("click", resetDefaults);
}
function render() {
  ["apiKeys", "personalNames", "addressesPlaces", "socialMedia"].forEach((k) => {
    $(`cat-${k}`).checked = config.categories[k].enabled;
  });
  $("maskMode").value = config.maskMode;
  $("customNames").value = config.customNames.join("\n");
  $("customPlaces").value = config.customPlaces.join("\n");
  $("siteMode").value = config.siteMode || "blocklist";
  $("disabledSites").value = (config.disabledSites || []).join("\n");
  $("allowedSites").value = (config.allowedSites || []).join("\n");
  renderPlatforms();
}
function renderPlatforms() {
  const root = $("platforms");
  root.innerHTML = "";
  for (const p of Object.values(config.platformPresets)) {
    const row = document.createElement("div");
    row.className = "platform";
    const name = document.createElement("span");
    name.textContent = p.name;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = p.enabled;
    cb.disabled = !config.categories.socialMedia.enabled;
    cb.addEventListener("change", async () => {
      config.platformPresets[p.id].enabled = cb.checked;
      await persist(`Saved ${p.name} setting.`);
    });
    row.append(name, cb);
    root.append(row);
  }
}
function parseList(text) {
  return [...new Set(text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
}
function normalizeHost(v) {
  const s = v.trim().toLowerCase();
  if (!s) return "";
  try {
    const url = s.includes("://") ? new URL(s) : new URL("https://" + s);
    return url.hostname.toLowerCase();
  } catch {
    return s.replace(/^\.+|\.+$/g, "");
  }
}
async function persist(msg) {
  await setConfig(config);
  setStatus(msg);
}
function setStatus(msg) {
  $("status").textContent = msg;
}
function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "soteria-config.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Exported config JSON.");
}
async function importConfig(e) {
  const input = e.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const res = validateConfigShape(parsed);
    if (!res.ok) {
      setStatus("Import failed:\n- " + res.errors.join("\n- "));
      return;
    }
    config = res.config;
    await setConfig(config);
    render();
    setStatus("Imported config successfully.");
  } catch (err) {
    setStatus("Import failed: invalid JSON.\n" + (err?.message || String(err)));
  } finally {
    input.value = "";
  }
}
async function resetDefaults() {
  config = structuredClone(DEFAULT_CONFIG);
  await setConfig(config);
  render();
  setStatus("Reset to default config.");
}
void init();
