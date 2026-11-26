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
        ".artdeco-entity-lockup__title",
        ".text-heading-xlarge",
        ".pv-text-details__left-panel h1",
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
        "div[role='rowheader'] span[dir='auto']",
        "header span[dir='auto']",
        "[data-testid='conversation-info-header-chat-title']",
        "[data-testid='cell-frame-title'] span",
        "[data-testid='conversation-panel-header'] span[title]",
        "div[data-testid='chat-list'] span[title]",
        "section div[role='button'] span[dir='auto']"
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

// src/popup/popup.ts
var $ = (id) => document.getElementById(id);
var enabled = $("enabled");
var maskMode = $("maskMode");
var catSocial = $("cat-socialMedia");
var platforms = $("platforms");
var openOptions = $("openOptions");
var status = $("status");
var siteToggle = $("siteToggle");
var siteHost = $("siteHost");
var config;
var currentHost = "";
async function init() {
  config = await getConfig();
  await resolveHost();
  render();
  enabled.addEventListener("change", async () => {
    config.enabled = enabled.checked;
    await save("Saved");
  });
  maskMode.addEventListener("change", async () => {
    config.maskMode = maskMode.value;
    await save("Saved");
  });
  catSocial.addEventListener("change", async () => {
    config.categories.socialMedia.enabled = catSocial.checked;
    await save("Saved");
    renderPlatforms();
  });
  siteToggle.addEventListener("click", async () => {
    if (!currentHost) return;
    if ((config.siteMode || "blocklist") === "allowlist") {
      const set = new Set(config.allowedSites || []);
      if (set.has(currentHost)) {
        set.delete(currentHost);
        await save("Removed from allowlist");
      } else {
        set.add(currentHost);
        await save("Added to allowlist");
      }
      config.allowedSites = [...set];
    } else {
      const set = new Set(config.disabledSites || []);
      if (set.has(currentHost)) {
        set.delete(currentHost);
        await save("Enabled on site");
      } else {
        set.add(currentHost);
        await save("Disabled on site");
      }
      config.disabledSites = [...set];
    }
    await setConfig(config);
    renderSite();
  });
  openOptions.addEventListener("click", () => globalThis.chrome.runtime.openOptionsPage());
}
async function resolveHost() {
  try {
    const api2 = globalThis.chrome;
    const [tab] = await api2.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || "");
    currentHost = url.hostname || "";
  } catch {
    currentHost = "";
  }
}
function render() {
  enabled.checked = config.enabled;
  maskMode.value = config.maskMode;
  catSocial.checked = config.categories.socialMedia.enabled;
  renderPlatforms();
  renderSite();
}
function renderSite() {
  siteHost.textContent = currentHost || "No active site";
  const mode = config.siteMode || "blocklist";
  if (!currentHost) {
    siteToggle.textContent = "Unavailable";
    siteToggle.disabled = true;
    return;
  }
  if (mode === "allowlist") {
    const allowed = (config.allowedSites || []).includes(currentHost);
    siteToggle.textContent = allowed ? "Remove from allowlist" : "Allow this site";
  } else {
    const disabled = (config.disabledSites || []).includes(currentHost);
    siteToggle.textContent = disabled ? "Enable here" : "Disable here";
  }
  siteToggle.disabled = false;
}
function renderPlatforms() {
  platforms.innerHTML = "";
  const entries = Object.values(config.platformPresets);
  for (const p of entries) {
    const row = document.createElement("div");
    row.className = "platform";
    const left = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = p.enabled;
    cb.disabled = !config.categories.socialMedia.enabled;
    cb.addEventListener("change", async () => {
      config.platformPresets[p.id].enabled = cb.checked;
      await save("Saved");
    });
    const span = document.createElement("span");
    span.textContent = p.name;
    left.append(cb, span);
    row.append(left);
    platforms.append(row);
  }
}
async function save(msg) {
  await setConfig(config);
  status.textContent = msg;
  setTimeout(() => {
    if (status.textContent === msg) status.textContent = "";
  }, 1200);
}
void init();
