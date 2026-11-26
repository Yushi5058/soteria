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

// src/background/background.ts
var api2 = globalThis.chrome;
api2.runtime.onInstalled.addListener(async () => {
  const raw = await api2.storage.local.get(STORAGE_KEY);
  if (!raw[STORAGE_KEY]) {
    await api2.storage.local.set({ [STORAGE_KEY]: DEFAULT_CONFIG });
  } else {
    await api2.storage.local.set({ [STORAGE_KEY]: normalizeConfig(raw[STORAGE_KEY]) });
  }
});
api2.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "GET_CONFIG") {
      sendResponse({ ok: true, config: await getConfig() });
      return;
    }
    if (msg?.type === "PING") {
      sendResponse({ ok: true, pong: true });
      return;
    }
    sendResponse({ ok: false, error: "unknown message" });
  })();
  return true;
});
